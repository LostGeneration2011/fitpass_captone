import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// Report a forum post
export async function reportPost(req: Request, res: Response) {
  const { id } = req.params;
  const { reason, detail } = req.body;
  const userId = (req.user as Express.UserPayload | undefined)?.id;
  if (!userId || !reason) return res.status(400).json({ error: 'Missing data' });
  await prisma.forumPost.update({
    where: { id },
    data: {
      // For demo: store reports as JSON array in a field (or create a new model for production)
      reports: { push: { userId, reason, detail, createdAt: new Date() } },
    },
  });
  res.json({ success: true });
}

// Report a forum comment
export async function reportComment(req: Request, res: Response) {
  const { id } = req.params;
  const { reason, detail } = req.body;
  const userId = (req.user as Express.UserPayload | undefined)?.id;
  if (!userId || !reason) return res.status(400).json({ error: 'Missing data' });
  await prisma.forumComment.update({
    where: { id },
    data: {
      reports: { push: { userId, reason, detail, createdAt: new Date() } },
    },
  });
  res.json({ success: true });
}

// Hide/unhide post (admin only)
export async function hidePost(req: Request, res: Response) {
  const { id } = req.params;
  const { hide } = req.body;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumPost.update({ where: { id }, data: { isHidden: !!hide } });
  res.json({ success: true });
}

// Hide/unhide comment (admin only)
export async function hideComment(req: Request, res: Response) {
  const { id } = req.params;
  const { hide } = req.body;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumComment.update({ where: { id }, data: { isHidden: !!hide } });
  res.json({ success: true });
}

// Lấy danh sách report cho admin
export async function getAdminReports(req: Request, res: Response) {
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  // Lấy tất cả post có report (filter bằng JS do Prisma không hỗ trợ not: [] cho Json[])
  const posts = (await prisma.forumPost.findMany({
    select: {
      id: true,
      content: true,
      authorId: true,
      createdAt: true,
      reports: true,
      isHidden: true,
    },
    orderBy: { createdAt: 'desc' },
  })).filter(post => Array.isArray(post.reports) && post.reports.length > 0);

  // Lấy tất cả comment có report (filter bằng JS)
  const comments = (await prisma.forumComment.findMany({
    select: {
      id: true,
      content: true,
      authorId: true,
      postId: true,
      createdAt: true,
      reports: true,
      isHidden: true,
    },
    orderBy: { createdAt: 'desc' },
  })).filter(comment => Array.isArray(comment.reports) && comment.reports.length > 0);

  res.json({ posts, comments });
}

// Lấy tất cả bài viết trên forum cho admin (kể cả bài ẩn)
export async function getAllPostsForAdmin(req: Request, res: Response) {
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  try {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const limit = Number(req.query.limit) || 30;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    const where = status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)
      ? { moderationStatus: status as 'PENDING' | 'APPROVED' | 'REJECTED' }
      : undefined;

    const posts = await prisma.forumPost.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true, role: true, email: true } },
        comments: true,
        reactions: true,
        images: true,
      },
    });

    const hasNextPage = posts.length > limit;
    const data = hasNextPage ? posts.slice(0, limit) : posts;
    const nextCursor = hasNextPage ? data[data.length - 1]?.id : null;

    res.json({
      success: true,
      data,
      paging: {
        hasNextPage,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('Get all forum posts (admin) error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách bài viết forum' });
  }
}

export async function getAdminPostDetail(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, fullName: true, avatar: true, role: true, email: true } },
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

export async function reviewPostModeration(req: Request, res: Response) {
  const { id } = req.params;
  const { action, reason } = req.body;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  if (!id || !action || !['approve', 'reject'].includes(String(action).toLowerCase())) {
    return res.status(400).json({ error: 'Invalid moderation action' });
  }

  const moderationStatus = String(action).toLowerCase() === 'approve' ? 'APPROVED' : 'REJECTED';

  await prisma.forumPost.update({
    where: { id },
    data: {
      moderationStatus,
      moderationNote: reason || null,
      moderatedAt: new Date(),
      isHidden: moderationStatus === 'REJECTED' ? true : false,
    },
  });

  res.json({ success: true, moderationStatus });
}

// Unhide a forum post (admin only)
export async function unhidePost(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumPost.update({ where: { id }, data: { isHidden: false } });
  res.json({ success: true });
}

// Unhide a forum comment (admin only)
export async function unhideComment(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumComment.update({ where: { id }, data: { isHidden: false } });
  res.json({ success: true });
}

// Review a report (admin only) — action: 'hide' | 'unhide' | 'dismiss'
export async function reviewReport(req: Request, res: Response) {
  const { id } = req.params;
  const { action, contentType, reviewNote } = req.body;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  try {
    if (!action || !contentType) {
      return res.status(400).json({ error: 'action and contentType are required' });
    }

    if (contentType === 'post') {
      if (action === 'hide') {
        await prisma.forumPost.update({ where: { id }, data: { isHidden: true } });
      } else if (action === 'unhide') {
        await prisma.forumPost.update({ where: { id }, data: { isHidden: false } });
      } else if (action === 'dismiss') {
        await prisma.forumPost.update({ where: { id }, data: { reports: [] } });
      }
    } else if (contentType === 'comment') {
      if (action === 'hide') {
        await prisma.forumComment.update({ where: { id }, data: { isHidden: true } });
      } else if (action === 'unhide') {
        await prisma.forumComment.update({ where: { id }, data: { isHidden: false } });
      } else if (action === 'dismiss') {
        await prisma.forumComment.update({ where: { id }, data: { reports: [] } });
      }
    } else {
      return res.status(400).json({ error: 'contentType must be post or comment' });
    }

    res.json({ success: true, action, reviewNote });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
