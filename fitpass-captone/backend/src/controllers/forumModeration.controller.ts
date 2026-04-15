import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    const posts = await prisma.forumPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true, role: true, email: true } },
        comments: true,
        reactions: true,
        images: true,
      },
    });
    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('Get all forum posts (admin) error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách bài viết forum' });
  }
}
