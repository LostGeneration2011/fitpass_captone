import { ReactionType, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';

type CacheEntry<T> = { data: T; expiresAt: number };
const TEACHER_PROFILE_TTL_MS = 30_000;
const teacherProfileCache = new Map<string, CacheEntry<any>>();

export class TeacherProfileService {
  async getTeacherProfile(teacherId: string) {
    const cacheKey = `teacher:${teacherId}`;
    const cached = teacherProfileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId, role: UserRole.TEACHER },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatar: true,
        teacherBio: true,
        teacherExperienceYears: true,
        teacherSpecialties: true,
        teacherCertifications: true,
        teacherHighlights: true,
        teacherCoverImage: true,
        teacherGalleryImages: true,
        createdAt: true,
      },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const classes = await prisma.class.findMany({
      where: { teacherId, status: 'APPROVED' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        classImages: {
          orderBy: { order: 'asc' },
          take: 1,
          select: { id: true, url: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const classIds = classes.map((cls) => cls.id);
    const ratingMap = new Map<string, { average: number; count: number; breakdown: Array<{ rating: number; count: number }> }>();
    const reactionMap = new Map<string, { likeCount: number; dislikeCount: number }>();

    if (classIds.length > 0) {
      const ratingAgg = await prisma.classReview.groupBy({
        by: ['classId'],
        where: { classId: { in: classIds }, isHidden: false },
        _avg: { rating: true },
        _count: { _all: true },
      });

      ratingAgg.forEach((item) => {
        ratingMap.set(item.classId, {
          average: item._avg.rating ?? 0,
          count: item._count._all,
          breakdown: [],
        });
      });

      const reactionAgg = await prisma.classReaction.groupBy({
        by: ['classId', 'type'],
        where: { classId: { in: classIds } },
        _count: { _all: true },
      });

      reactionAgg.forEach((item) => {
        const current = reactionMap.get(item.classId) || { likeCount: 0, dislikeCount: 0 };
        if (item.type === ReactionType.LIKE) current.likeCount = item._count._all;
        if (item.type === ReactionType.DISLIKE) current.dislikeCount = item._count._all;
        reactionMap.set(item.classId, current);
      });
    }

    const classDetails = classes.map((cls) => ({
      ...cls,
      ratingSummary: ratingMap.get(cls.id) || { average: 0, count: 0, breakdown: [] },
      reactionSummary: reactionMap.get(cls.id) || { likeCount: 0, dislikeCount: 0 },
    }));

    const [ratingSummary, reactionSummary] = await Promise.all([
      this.getTeacherRatingSummary(teacherId),
      this.getTeacherReactionSummary(teacherId),
    ]);

    const profile = {
      teacher,
      ratingSummary,
      reactionSummary,
      classes: classDetails,
    };

    teacherProfileCache.set(cacheKey, {
      data: profile,
      expiresAt: Date.now() + TEACHER_PROFILE_TTL_MS,
    });

    return profile;
  }

  private async getClassRatingSummary(classId: string) {
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

  private async getClassReactionSummary(classId: string) {
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

  private async getTeacherRatingSummary(teacherId: string) {
    const aggregate = await prisma.classReview.aggregate({
      where: { class: { teacherId }, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const grouped = await prisma.classReview.groupBy({
      by: ['rating'],
      where: { class: { teacherId }, isHidden: false },
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

  private async getTeacherReactionSummary(teacherId: string) {
    const grouped = await prisma.classReaction.groupBy({
      by: ['type'],
      where: { class: { teacherId } },
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

  async updateTeacherProfile(
    user: { id: string; role: UserRole },
    data: {
      fullName?: string;
      avatar?: string;
      teacherBio?: string | null;
      teacherExperienceYears?: number | null;
      teacherSpecialties?: string[];
      teacherCertifications?: string[];
      teacherHighlights?: string[];
      teacherCoverImage?: string | null;
      teacherGalleryImages?: string[];
    },
  ) {
    if (user.role !== UserRole.TEACHER) {
      const err = new Error('Only teachers can update profile');
      (err as any).status = 403;
      throw err;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: data.fullName,
        avatar: data.avatar,
        teacherBio: data.teacherBio ?? null,
        teacherExperienceYears: data.teacherExperienceYears ?? null,
        teacherSpecialties: data.teacherSpecialties ?? [],
        teacherCertifications: data.teacherCertifications ?? [],
        teacherHighlights: data.teacherHighlights ?? [],
        teacherCoverImage: data.teacherCoverImage ?? null,
        teacherGalleryImages: data.teacherGalleryImages ?? [],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatar: true,
        teacherBio: true,
        teacherExperienceYears: true,
        teacherSpecialties: true,
        teacherCertifications: true,
        teacherHighlights: true,
        teacherCoverImage: true,
        teacherGalleryImages: true,
      },
    });

    return updated;
  }
}
