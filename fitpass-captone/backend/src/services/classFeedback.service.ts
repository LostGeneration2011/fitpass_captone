import { EnrollmentStatus, ReactionType, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';

type CacheEntry<T> = { data: T; expiresAt: number };
const CLASS_DETAIL_TTL_MS = 30_000;
const classDetailCache = new Map<string, CacheEntry<any>>();

interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ClassFeedbackService {
  private async ensureClassExists(classId: string) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, teacherId: true },
    });

    if (!cls) {
      throw new Error('Class not found');
    }

    return cls;
  }

  private async ensureStudentCanInteract(studentId: string, classId: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        classId,
        studentId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new Error('Chỉ học viên đã đăng ký lớp mới được đánh giá hoặc thả cảm xúc');
    }

    const completedAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        session: {
          classId,
          status: 'DONE',
        },
      },
      select: { id: true },
    });

    if (!completedAttendance) {
      throw new Error('Chỉ học viên đã điểm danh và buổi học đã hoàn thành mới được đánh giá hoặc thả cảm xúc');
    }
  }

  private ensureTeacherOrAdmin(user: { id: string; role: UserRole }, teacherId: string | null) {
    if (!user) {
      const err = new Error('Authentication required');
      (err as any).status = 401;
      throw err;
    }

    if (user.role === UserRole.ADMIN) return;

    if (user.role === UserRole.TEACHER && teacherId && user.id === teacherId) return;

    const err = new Error('Insufficient permissions');
    (err as any).status = 403;
    throw err;
  }

  async getClassDetail(classId: string, studentId?: string) {
    const cacheKey = `class:${classId}`;
    const cached = classDetailCache.get(cacheKey);
    let baseDetail = cached && cached.expiresAt > Date.now() ? cached.data : null;

    if (!baseDetail) {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        select: {
          id: true,
          name: true,
          description: true,
          duration: true,
          teacher: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatar: true,
              teacherBio: true,
              teacherExperienceYears: true,
              teacherSpecialties: true,
            },
          },
        },
      });

      if (!classData) {
        throw new Error('Class not found');
      }

      const [ratingSummary, reactionSummary] = await Promise.all([
        this.getClassRatingSummary(classId),
        this.getClassReactionSummary(classId),
      ]);

      baseDetail = {
        ...classData,
        ratingSummary,
        reactionSummary,
      };

      classDetailCache.set(cacheKey, {
        data: baseDetail,
        expiresAt: Date.now() + CLASS_DETAIL_TTL_MS,
      });
    }

    const [myReview, myReaction] = await Promise.all([
      studentId
        ? prisma.classReview.findUnique({
            where: { classId_studentId: { classId, studentId } },
          })
        : Promise.resolve(null),
      studentId
        ? prisma.classReaction.findUnique({
            where: { classId_studentId: { classId, studentId } },
          })
        : Promise.resolve(null),
    ]);

    return {
      ...baseDetail,
      myReview,
      myReaction,
    };
  }

  async getClassImages(classId: string) {
    await this.ensureClassExists(classId);

    return prisma.classImage.findMany({
      where: { classId },
      orderBy: { order: 'asc' },
    });
  }

  async addClassImage(params: {
    classId: string;
    url: string;
    caption?: string;
    order?: number;
    user: { id: string; role: UserRole };
  }) {
    const { classId, url, caption, order, user } = params;
    const cls = await this.ensureClassExists(classId);
    this.ensureTeacherOrAdmin(user, cls.teacherId);

    return prisma.classImage.create({
      data: {
        classId,
        url,
        caption,
        order: order ?? 0,
      },
    });
  }

  async deleteClassImage(params: {
    classId: string;
    imageId: string;
    user: { id: string; role: UserRole };
  }) {
    const { classId, imageId, user } = params;
    const cls = await this.ensureClassExists(classId);
    this.ensureTeacherOrAdmin(user, cls.teacherId);

    const existingImage = await prisma.classImage.findFirst({
      where: { id: imageId, classId },
      select: { id: true },
    });

    if (!existingImage) {
      throw new Error('Class image not found');
    }

    return prisma.classImage.delete({ where: { id: imageId } });
  }

  async getClassRatingSummary(classId: string) {
    const aggregate = await prisma.classReview.aggregate({
      where: { classId, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const grouped = await prisma.classReview.groupBy({
      by: ['rating'],
      where: { classId, isHidden: false },
      _count: { _all: true },
    });

    const ratingGroups = grouped as Array<{ rating: number; _count: { _all: number } }>;

    const breakdown = [1, 2, 3, 4, 5].map((rating) => {
      const found = ratingGroups.find((item) => item.rating === rating);
      return { rating, count: found?._count._all ?? 0 };
    });

    return {
      average: aggregate._avg.rating ?? 0,
      count: aggregate._count._all,
      breakdown,
    };
  }

  async getClassReactionSummary(classId: string) {
    const grouped = await prisma.classReaction.groupBy({
      by: ['type'],
      where: { classId },
      _count: { _all: true },
    });

    const reactionGroups = grouped as Array<{ type: ReactionType; _count: { _all: number } }>;

    const likeCount = reactionGroups.find((item) => item.type === ReactionType.LIKE)?._count._all ?? 0;
    const dislikeCount = reactionGroups.find((item) => item.type === ReactionType.DISLIKE)?._count._all ?? 0;

    return {
      likeCount,
      dislikeCount,
    };
  }

  async listClassReviews(params: {
    classId: string;
    page: number;
    limit: number;
    sort: 'newest' | 'highest' | 'lowest';
  }): Promise<PaginationResult<any>> {
    const { classId, page, limit, sort } = params;

    await this.ensureClassExists(classId);

    const orderBy =
      sort === 'highest'
        ? { rating: 'desc' as const }
        : sort === 'lowest'
          ? { rating: 'asc' as const }
          : { createdAt: 'desc' as const };

    const [total, data] = await Promise.all([
      prisma.classReview.count({ where: { classId, isHidden: false } }),
      prisma.classReview.findMany({
        where: { classId, isHidden: false },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: { select: { id: true, fullName: true, avatar: true } },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async upsertReview(params: {
    classId: string;
    studentId: string;
    rating: number;
    comment?: string;
  }) {
    const { classId, studentId, rating, comment } = params;

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await this.ensureClassExists(classId);
    await this.ensureStudentCanInteract(studentId, classId);

    return prisma.classReview.upsert({
      where: { classId_studentId: { classId, studentId } },
      update: { rating, comment, isHidden: false, moderationReason: null, moderatedAt: null, moderatedBy: null },
      create: { classId, studentId, rating, comment },
    });
  }

  async listReviewsForModeration(params: {
    page: number;
    limit: number;
    status?: 'visible' | 'hidden' | 'all';
    search?: string;
    classId?: string;
    teacherId?: string;
    sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
  }): Promise<PaginationResult<any>> {
    const { page, limit, status, search, classId, teacherId, sort } = params;

    const where: any = {};

    if (status && status !== 'all') {
      where.isHidden = status === 'hidden';
    }

    if (classId) {
      where.classId = classId;
    }

    if (teacherId) {
      where.class = { teacherId };
    }

    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
        { class: { name: { contains: search, mode: 'insensitive' } } },
        { student: { fullName: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { class: { teacher: { fullName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const orderBy =
      sort === 'highest'
        ? { rating: 'desc' as const }
        : sort === 'lowest'
          ? { rating: 'asc' as const }
          : sort === 'oldest'
            ? { createdAt: 'asc' as const }
            : { createdAt: 'desc' as const };

    const [total, data] = await Promise.all([
      prisma.classReview.count({ where }),
      prisma.classReview.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              teacher: { select: { id: true, fullName: true, email: true } },
            },
          },
          student: { select: { id: true, fullName: true, email: true, avatar: true } },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async moderateReview(params: {
    reviewId: string;
    isHidden: boolean;
    moderationReason?: string;
    moderatedBy?: string;
  }) {
    const { reviewId, isHidden, moderationReason, moderatedBy } = params;

    const existing = await prisma.classReview.findUnique({ where: { id: reviewId } });
    if (!existing) {
      throw new Error('Review not found');
    }

    return prisma.classReview.update({
      where: { id: reviewId },
      data: {
        isHidden,
        moderationReason: moderationReason || null,
        moderatedAt: new Date(),
        moderatedBy: moderatedBy || null,
      },
    });
  }

  async replyToReview(params: {
    classId: string;
    reviewId: string;
    replyText: string | null;
    user: { id: string; role: UserRole };
  }) {
    const { classId, reviewId, replyText, user } = params;

    const cls = await this.ensureClassExists(classId);
    this.ensureTeacherOrAdmin(user, cls.teacherId);

    const review = await prisma.classReview.findFirst({
      where: { id: reviewId, classId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    return prisma.classReview.update({
      where: { id: reviewId },
      data: {
        replyText: replyText?.trim() || null,
        repliedAt: replyText?.trim() ? new Date() : null,
        repliedBy: replyText?.trim() ? user.id : null,
      },
    });
  }

  async setReaction(params: {
    classId: string;
    studentId: string;
    type: ReactionType;
  }) {
    const { classId, studentId, type } = params;

    await this.ensureClassExists(classId);
    await this.ensureStudentCanInteract(studentId, classId);

    return prisma.classReaction.upsert({
      where: { classId_studentId: { classId, studentId } },
      update: { type },
      create: { classId, studentId, type },
    });
  }

  async removeReaction(params: { classId: string; studentId: string }) {
    const { classId, studentId } = params;

    await this.ensureClassExists(classId);

    await prisma.classReaction.deleteMany({
      where: { classId, studentId },
    });

    return { message: 'Reaction removed' };
  }
}
