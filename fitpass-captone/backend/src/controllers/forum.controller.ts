import { Request, Response } from 'express';
import { PrismaClient, ReactionType } from '@prisma/client';

const prisma = new PrismaClient();

// Get forum posts (feed)
export async function getPosts(req: Request, res: Response) {
  const limit = Number(req.query.limit) || 10;
  const cursor = req.query.cursor as string | undefined;
  const posts = await prisma.forumPost.findMany({
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
  res.json(posts);
}

// Create a new forum post
export async function createPost(req: Request, res: Response) {
  const { content, imageUrls } = req.body;
  const userId = req.user?.id;
  if (!userId || !content) return res.status(400).json({ error: 'Missing data' });
  const post = await prisma.forumPost.create({
    data: {
      content,
      authorId: userId,
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
    where: { id },
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
  const userId = req.user?.id;
  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post || post.authorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumPost.delete({ where: { id } });
  res.json({ success: true });
}

// Add comment
export async function addComment(req: Request, res: Response) {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;
  if (!userId || !content) return res.status(400).json({ error: 'Missing data' });
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
  const userId = req.user?.id;
  const comment = await prisma.forumComment.findUnique({ where: { id } });
  if (!comment || comment.authorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const updated = await prisma.forumComment.update({ where: { id }, data: { content } });
  res.json(updated);
}

// Delete comment
export async function deleteComment(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;
  const comment = await prisma.forumComment.findUnique({ where: { id } });
  if (!comment || comment.authorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumComment.delete({ where: { id } });
  res.json({ success: true });
}

// Add reaction
export async function addReaction(req: Request, res: Response) {
  const { id } = req.params;
  const { type } = req.body;
  const userId = req.user?.id;
  if (!userId || !type) return res.status(400).json({ error: 'Missing data' });
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
  const userId = req.user?.id;
  if (!userId || !type) return res.status(400).json({ error: 'Missing data' });
  await prisma.forumReaction.delete({ where: { userId_postId_type: { userId, postId: id, type } } });
  res.json({ success: true });
}

// Get user profile for forum
export async function getUserProfile(req: Request, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, fullName: true, avatar: true, role: true },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
}
