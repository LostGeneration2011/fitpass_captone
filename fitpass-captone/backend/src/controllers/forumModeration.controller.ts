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
