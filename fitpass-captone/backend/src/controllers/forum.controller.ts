import { Request, Response } from 'express';
import { ReactionType } from '@prisma/client';
import { prisma } from '../config/prisma';

function getUserPayload(req: Request) {
  return (req.user as Express.UserPayload | undefined) || undefined;
}

function canParticipateInCommunity(role?: string) {
  return role === 'STUDENT' || role === 'TEACHER';
}

// Get forum posts (feed)
export async function getPosts(req: Request, res: Response) {
  const limit = Number(req.query.limit) || 10;
  const cursor = req.query.cursor as string | undefined;
  const currentUserId = (req.user as Express.UserPayload | undefined)?.id;
  const posts = await prisma.forumPost.findMany({
    where: {
      moderationStatus: 'APPROVED',
      isHidden: false,
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, fullName: true, avatar: true, role: true } },
      images: true,
      _count: { select: { comments: true, reactions: true } },
      reactions: true,
    },
  });

  const normalizedPosts = posts.map((post) => {
    const summary = post.reactions.reduce((acc, reaction) => {
      acc[reaction.type] = (acc[reaction.type] || 0) + 1;
      return acc;
    }, {} as Record<ReactionType, number>);

    const myReaction = currentUserId
      ? post.reactions.find((reaction) => reaction.userId === currentUserId)?.type || null
      : null;

    return {
      ...post,
      reactionSummary: summary,
      myReaction,
    };
  });

  res.json(normalizedPosts);
}

// Create a new forum post
export async function createPost(req: Request, res: Response) {
  const { content, imageUrls } = req.body;
  const user = getUserPayload(req);
  const userId = user?.id ?? '';
  if (!canParticipateInCommunity(user?.role)) {
    return res.status(403).json({ error: 'Only students and teachers can create forum posts' });
  }
  if (!userId || !content) return res.status(400).json({ error: 'Missing data' });
  const post = await prisma.forumPost.create({
    data: {
      content,
      authorId: userId,
      moderationStatus: 'PENDING',
      images: { create: (imageUrls || []).map((url: string, i: number) => ({ url, order: i })) },
    },
    include: { images: true, author: true },
  });
  res.json(post);
}

// Get post detail
export async function getPostDetail(req: Request, res: Response) {
  const { id } = req.params;
  const post = await prisma.forumPost.findUnique({
    where: { id, moderationStatus: 'APPROVED', isHidden: false },
    include: {
      author: { select: { id: true, fullName: true, avatar: true, role: true } },
      images: true,
      comments: {
        include: { author: { select: { id: true, fullName: true, avatar: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      reactions: true,
    },
  });
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
}

// Delete post
export async function deletePost(req: Request, res: Response) {
  const { id } = req.params;
  const userId = (req.user as Express.UserPayload | undefined)?.id;
  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post || post.authorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumPost.delete({ where: { id } });
  res.json({ success: true });
}

// Update post
export async function updatePost(req: Request, res: Response) {
  const { id } = req.params;
  const { content, imageUrls } = req.body;
  const userId = (req.user as Express.UserPayload | undefined)?.id;
  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post || post.authorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const updated = await prisma.forumPost.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
      ...(imageUrls !== undefined && {
        images: {
          deleteMany: {},
          create: imageUrls.map((url: string, i: number) => ({ url, order: i })),
        },
      }),
    },
    include: { images: true, author: true },
  });
  res.json(updated);
}

// Add comment
export async function addComment(req: Request, res: Response) {
  const { id } = req.params;
  const { content } = req.body;
  const user = getUserPayload(req);
  const userId = user?.id ?? '';
  if (!canParticipateInCommunity(user?.role)) {
    return res.status(403).json({ error: 'Only students and teachers can comment in forum' });
  }
  if (!userId || !content || !id) return res.status(400).json({ error: 'Missing data' });
  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post || post.isHidden || post.moderationStatus !== 'APPROVED') {
    return res.status(404).json({ error: 'Forum post is not available for commenting' });
  }
  const comment = await prisma.forumComment.create({
    data: { content, postId: id, authorId: userId },
    include: { author: true },
  });
  res.json(comment);
}

// Edit comment
export async function editComment(req: Request, res: Response) {
  const { id } = req.params;
  const { content } = req.body;
  const userId = (req.user as Express.UserPayload | undefined)?.id ?? '';
  if (!id) return res.status(400).json({ error: 'Missing comment id' });
  const comment = await prisma.forumComment.findUnique({ where: { id } });
  if (!comment || comment.authorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const updated = await prisma.forumComment.update({ where: { id }, data: { content } });
  res.json(updated);
}

// Delete comment
export async function deleteComment(req: Request, res: Response) {
  const { id } = req.params;
  const userId = (req.user as Express.UserPayload | undefined)?.id;
  const comment = await prisma.forumComment.findUnique({ where: { id } });
  if (!comment || comment.authorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumComment.delete({ where: { id } });
  res.json({ success: true });
}

// Add reaction
export async function addReaction(req: Request, res: Response) {
  const { id } = req.params;
  const { type } = req.body;
  const user = getUserPayload(req);
  const userId = user?.id ?? '';
  if (!canParticipateInCommunity(user?.role)) {
    return res.status(403).json({ error: 'Only students and teachers can react in forum' });
  }
  if (!userId || !type || !id) return res.status(400).json({ error: 'Missing data' });
  if (!['LIKE', 'LOVE', 'WOW'].includes(String(type))) {
    return res.status(400).json({ error: 'Invalid reaction type' });
  }
  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post || post.isHidden || post.moderationStatus !== 'APPROVED') {
    return res.status(404).json({ error: 'Forum post is not available for reactions' });
  }

  // Keep one active reaction per user on each post.
  await prisma.forumReaction.deleteMany({
    where: { userId, postId: id, type: { not: type } },
  });

  const reaction = await prisma.forumReaction.upsert({
    where: { userId_postId_type: { userId, postId: id, type } },
    update: {},
    create: { userId, postId: id, type },
  });
  res.json(reaction);
}

// Remove reaction
export async function removeReaction(req: Request, res: Response) {
  const { id } = req.params;
  const { type } = req.body;
  const user = getUserPayload(req);
  const userId = user?.id ?? '';
  if (!canParticipateInCommunity(user?.role)) {
    return res.status(403).json({ error: 'Only students and teachers can react in forum' });
  }
  if (!userId || !id) return res.status(400).json({ error: 'Missing data' });
  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post || post.isHidden || post.moderationStatus !== 'APPROVED') {
    return res.status(404).json({ error: 'Forum post is not available for reactions' });
  }

  if (type) {
    await prisma.forumReaction.deleteMany({ where: { userId, postId: id, type } });
  } else {
    // Backward-compatible behavior for clients that remove without specifying type.
    await prisma.forumReaction.deleteMany({ where: { userId, postId: id } });
  }

  res.json({ success: true });
}

// Get user profile for forum
export async function getUserProfile(req: Request, res: Response) {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      avatar: true,
      role: true,
      createdAt: true,
      teacherBio: true,
      teacherExperienceYears: true,
      teacherSpecialties: true,
      teacherCertifications: true,
      teacherHighlights: true,
      teacherCoverImage: true,
      teacherGalleryImages: true,
    },
  });

  if (!user) return res.status(404).json({ error: 'Not found' });

  const [postCount, commentCount] = await Promise.all([
    prisma.forumPost.count({ where: { authorId: id, moderationStatus: 'APPROVED', isHidden: false } }),
    prisma.forumComment.count({ where: { authorId: id, isHidden: false } }),
  ]);

  if (user.role === 'TEACHER') {
    const [classes, totalClasses, totalReviews, reviewAgg, classReactions, recentReviews] = await Promise.all([
      prisma.class.findMany({
        where: { teacherId: id, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          classImages: {
            orderBy: { order: 'asc' },
            take: 1,
          },
          teacher: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
              role: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              sessions: true,
            },
          },
        },
      }),
      prisma.class.count({ where: { teacherId: id, status: 'APPROVED' } }),
      prisma.classReview.count({ where: { class: { teacherId: id }, isHidden: false } }),
      prisma.classReview.aggregate({
        where: { class: { teacherId: id }, isHidden: false },
        _avg: { rating: true },
      }),
      prisma.classReaction.groupBy({
        by: ['type'],
        where: { class: { teacherId: id } },
        _count: { _all: true },
      }),
      prisma.classReview.findMany({
        where: { class: { teacherId: id }, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          class: { select: { id: true, name: true } },
          student: { select: { id: true, fullName: true, avatar: true, role: true } },
        },
      }),
    ]);

    const likeCount = classReactions.find((item) => item.type === 'LIKE')?._count._all || 0;
    const dislikeCount = classReactions.find((item) => item.type === 'DISLIKE')?._count._all || 0;

    return res.json({
      profileType: user.role,
      user: {
        id: user.id,
        fullName: user.fullName,
        avatar: user.avatar,
        role: user.role,
        memberSince: user.createdAt,
      },
      forumActivity: { postCount, commentCount },
      teacherProfile: {
        bio: user.teacherBio,
        experienceYears: user.teacherExperienceYears,
        specialties: user.teacherSpecialties,
        certifications: user.teacherCertifications,
        highlights: user.teacherHighlights,
        coverImage: user.teacherCoverImage,
        galleryImages: user.teacherGalleryImages,
      },
      stats: {
        totalClasses,
        totalReviews,
        averageRating: reviewAgg._avg.rating || 0,
        likeCount,
        dislikeCount,
      },
      classes: classes.map((classItem) => ({
        id: classItem.id,
        name: classItem.name,
        description: classItem.description,
        createdAt: classItem.createdAt,
        classImage: classItem.classImages[0]
          ? { id: classItem.classImages[0].id, url: classItem.classImages[0].url }
          : null,
        teacher: classItem.teacher,
        totalSessions: classItem._count.sessions,
      })),
      recentReviews: recentReviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        replyText: review.replyText,
        repliedAt: review.repliedAt,
        createdAt: review.createdAt,
        class: review.class,
        student: review.student,
      })),
    });
  }

  if (user.role === 'STUDENT') {
    const [enrollments, reviewAgg, reviewCount, attendanceCount, recentReviews] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId: id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          class: {
            include: {
              teacher: {
                select: {
                  id: true,
                  fullName: true,
                  avatar: true,
                  role: true,
                },
              },
              classImages: {
                orderBy: { order: 'asc' },
                take: 1,
              },
              _count: {
                select: { sessions: true },
              },
            },
          },
        },
      }),
      prisma.classReview.aggregate({
        where: { studentId: id, isHidden: false },
        _avg: { rating: true },
      }),
      prisma.classReview.count({ where: { studentId: id, isHidden: false } }),
      prisma.attendance.count({ where: { studentId: id } }),
      prisma.classReview.findMany({
        where: { studentId: id, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              teacher: { select: { id: true, fullName: true, avatar: true, role: true } },
            },
          },
        },
      }),
    ]);

    return res.json({
      profileType: user.role,
      user: {
        id: user.id,
        fullName: user.fullName,
        avatar: user.avatar,
        role: user.role,
        memberSince: user.createdAt,
      },
      forumActivity: { postCount, commentCount },
      stats: {
        totalClasses: enrollments.length,
        attendedSessions: attendanceCount,
        reviewCount,
        averageReviewRating: reviewAgg._avg.rating || 0,
      },
      classes: enrollments.map((enrollment) => ({
        id: enrollment.class.id,
        name: enrollment.class.name,
        description: enrollment.class.description,
        createdAt: enrollment.class.createdAt,
        enrollmentStatus: enrollment.status,
        classImage: enrollment.class.classImages[0]
          ? { id: enrollment.class.classImages[0].id, url: enrollment.class.classImages[0].url }
          : null,
        teacher: enrollment.class.teacher,
        totalSessions: enrollment.class._count.sessions,
      })),
      recentReviews: recentReviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        replyText: review.replyText,
        repliedAt: review.repliedAt,
        createdAt: review.createdAt,
        class: review.class,
        teacher: review.class.teacher,
      })),
    });
  }

  return res.json({
    profileType: user.role,
    user: {
      id: user.id,
      fullName: user.fullName,
      avatar: user.avatar,
      role: user.role,
      memberSince: user.createdAt,
    },
    forumActivity: { postCount, commentCount },
    stats: {
      postCount,
      commentCount,
    },
    classes: [],
    recentReviews: [],
  });
}
