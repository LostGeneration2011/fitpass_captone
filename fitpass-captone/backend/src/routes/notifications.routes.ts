import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authMiddleware } from '../middlewares/auth';
import { adminOnly } from '../middlewares/rbac';

const router = Router();

const VALID_TARGET_ROLES = new Set(['ALL', 'ADMIN', 'TEACHER', 'STUDENT']);
const VALID_NOTIFICATION_TYPES = new Set([
  'CLASS_APPROVED',
  'CLASS_REJECTED',
  'ENROLLMENT_CONFIRMED',
  'ATTENDANCE_MARKED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'SALARY_READY',
  'SESSION_UPCOMING',
  'SESSION_REMINDER',
  'ENROLLMENT_CANCELLED',
  'REFUND_PROCESSED',
  'ADMIN_ALERT',
  'GENERAL_NOTICE',
  'CHAT',
  'CHAT_MENTION',
  'INFO',
]);

const BROADCAST_WINDOW_MS = 60 * 1000;
const BROADCAST_MAX_PER_WINDOW = 6;
const broadcastRequestTimestamps = new Map<string, number[]>();

function isBroadcastRateLimited(adminId?: string) {
  if (!adminId) return true;

  const now = Date.now();
  const previous = broadcastRequestTimestamps.get(adminId) || [];
  const recent = previous.filter((ts) => now - ts <= BROADCAST_WINDOW_MS);

  if (recent.length >= BROADCAST_MAX_PER_WINDOW) {
    broadcastRequestTimestamps.set(adminId, recent);
    return true;
  }

  recent.push(now);
  broadcastRequestTimestamps.set(adminId, recent);
  return false;
}

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
    const { title, body, type = 'INFO', targetRole = 'ALL', data } = req.body;
    const adminId = req.user?.id;

    if (isBroadcastRateLimited(adminId)) {
      return res.status(429).json({ message: 'Too many broadcast requests. Please wait and try again.' });
    }

    if (typeof title !== 'string' || typeof body !== 'string') {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const sanitizedTitle = title.trim();
    const sanitizedBody = body.trim();
    const normalizedType = String(type).toUpperCase();
    const normalizedTargetRole = String(targetRole).toUpperCase();

    if (!sanitizedTitle || !sanitizedBody) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    if (sanitizedTitle.length > 100 || sanitizedBody.length > 200) {
      return res.status(400).json({ message: 'Title or body exceeds allowed length' });
    }

    if (!VALID_NOTIFICATION_TYPES.has(normalizedType)) {
      return res.status(400).json({ message: 'Invalid notification type' });
    }

    if (!VALID_TARGET_ROLES.has(normalizedTargetRole)) {
      return res.status(400).json({ message: 'Invalid target role' });
    }

    const userWhere: any = {};
    if (normalizedTargetRole !== 'ALL') {
      userWhere.role = normalizedTargetRole;
    }

    const users = await prisma.user.findMany({ where: userWhere, select: { id: true } });

    if (users.length === 0) {
      return res.json({ message: 'No users matched target role', count: 0 });
    }

    const createdNotifications = await prisma.$transaction(
      users.map((u) =>
        prisma.notification.create({
          data: {
            userId: u.id,
            title: sanitizedTitle,
            body: sanitizedBody,
            type: normalizedType,
            data: data ?? undefined,
          },
          select: {
            id: true,
            userId: true,
            type: true,
            title: true,
            body: true,
            data: true,
            createdAt: true,
          },
        })
      )
    );

    const io = (global as any).io;
    if (io) {
      createdNotifications.forEach((notification) => {
        io.to(`user_${notification.userId}`).emit('notification', {
          eventId: `notification:${notification.id}`,
          notificationId: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          createdAt: notification.createdAt,
        });
      });
    }

    res.json({ message: `Broadcast sent to ${users.length} users` });
  } catch (err) {
    res.status(500).json({ message: 'Error sending broadcast' });
  }
});

export default router;


