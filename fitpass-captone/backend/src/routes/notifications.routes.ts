import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middlewares/auth';
import { adminOnly } from '../middlewares/rbac';

const router = Router();
const prisma = new PrismaClient();

// GET /api/notifications/unread/count
router.get('/unread/count', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notification count' });
  }
});

// GET /api/notifications — returns { data: Notification[] }
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    // Return { data: [...] } to match admin normalization: data.data || []
    res.json({ data: notifications });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// PATCH /api/notifications/read-all — must come before /:id to avoid conflict
router.patch('/read-all', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (result.count === 0) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const deleted = await prisma.notification.deleteMany({ where: { id, userId } });
    if (deleted.count === 0) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// POST /api/notifications/broadcast — admin only
// Accepts: { type, title, body, targetRole? }
// targetRole: 'ALL' | 'ADMIN' | 'TEACHER' | 'STUDENT'
router.post('/broadcast', authMiddleware, adminOnly(), async (req: any, res) => {
  try {
    const { title, body, type = 'INFO', targetRole, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const userWhere: any = {};
    if (targetRole && targetRole !== 'ALL') {
      userWhere.role = targetRole;
    }

    const users = await prisma.user.findMany({ where: userWhere, select: { id: true } });
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        title,
        body,
        type,
        data: data ?? undefined,
      })),
    });
    res.json({ message: `Broadcast sent to ${users.length} users` });
  } catch (err) {
    res.status(500).json({ message: 'Error sending broadcast' });
  }
});

export default router;


