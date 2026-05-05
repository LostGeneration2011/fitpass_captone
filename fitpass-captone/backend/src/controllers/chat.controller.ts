import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { prisma } from '../config/prisma';

const chatService = new ChatService();

export const editMessage = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const messageId = req.params.messageId;
    const { content } = req.body;
    if (!messageId || !content?.trim()) {
      return res.status(400).json({ error: 'Message ID and new content are required' });
    }
    const updated = await chatService.editMessage(user, messageId, content);
    // Broadcast edit event via WebSocket (ws thuáº§n)
    const wss = (global as any).wss;
    if (wss && updated) {
      const payload = JSON.stringify({
        type: 'chat.message.edit',
        threadId: updated.threadId,
        message: updated,
      });
      wss.clients.forEach((client: any) => {
        if (client.readyState === 1) {
          if (client.subscribedThreads?.has(updated.threadId) || client.user?.role === 'ADMIN') {
            client.send(payload);
          }
        }
      });
    }
    // Broadcast edit event via Socket.IO (web/admin)
    const io = (global as any).io;
    if (io && updated) {
      io.to(`thread_${updated.threadId}`).emit('chat.message.edit', { threadId: updated.threadId, message: updated });
      io.to('role_admin').emit('chat.message.edit', { threadId: updated.threadId, message: updated });
    }
    return res.json({ message: 'Message updated', data: updated });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};
export const markThreadAsRead = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const threadId = req.params.id;
    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }
    const result = await chatService.markThreadAsRead(user, threadId);

    // Broadcast chat.read so clients can update seen status in real-time
    const readPayload = {
      threadId,
      userId: user.id,
      fullName: user.fullName,
      lastReadAt: result.lastReadAt,
    };

    const io = (global as any).io;
    if (io) {
      io.to(`thread_${threadId}`).emit('chat.read', readPayload);
    }

    const wss = (global as any).wss;
    if (wss) {
      const wsMsg = JSON.stringify({ type: 'chat.read', ...readPayload });
      wss.clients.forEach((client: any) => {
        if (client.readyState === 1 && client.subscribedThreads?.has(threadId)) {
          client.send(wsMsg);
        }
      });
    }

    return res.json({ message: 'Thread marked as read', data: result });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};
export const listThreads = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const threads = await chatService.listThreadsForUser(user);
    return res.json(threads);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const createSupportThread = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const thread = await chatService.getOrCreateSupportThread(user);
    return res.status(201).json(thread);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const createClassThread = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    const thread = await chatService.getOrCreateClassThread(user, classId);
    return res.status(201).json(thread);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const listMessages = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const threadId = req.params.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 30, 1), 100);
    const before = req.query.before as string | undefined;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    const messages = await chatService.listMessages(user, threadId, limit, before);
    return res.json(messages);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const threadId = req.params.id;
    const { content, attachments } = req.body;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    const message = await chatService.sendMessage(user, threadId, content, attachments);

    // Emit real-time qua WebSocket thuáº§n (giá»¯ nguyĂªn)
    const wss = (global as any).wss;
    if (wss) {
      const payload = JSON.stringify({
        type: 'chat.message',
        threadId,
        message,
      });
      wss.clients.forEach((client: any) => {
        if (client.readyState === 1) {
          if (client.subscribedThreads?.has(threadId) || client.user?.role === 'ADMIN') {
            client.send(payload);
          }
        }
      });
    }

    // Emit real-time qua Socket.IO (fix cho admin web)
    const io = (global as any).io;
    if (io) {
      io.to(`thread_${threadId}`).emit('chat.message', { threadId, message });
      io.to('role_admin').emit('chat.message', { threadId, message });
    }

    return res.status(201).json(message);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const deleteThreadForStudent = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const threadId = req.params.id;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    const updated = await chatService.softDeleteThreadForStudent(user, threadId);
    // Broadcast thread delete event via Socket.IO (web/admin)
    const io = (global as any).io;
    if (io && updated) {
      io.to(`thread_${threadId}`).emit('chat.thread.delete', { threadId });
      io.to('role_admin').emit('chat.thread.delete', { threadId });
    }
    return res.json({ message: 'Thread hidden for student', data: updated });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const deleteMessageForStudent = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const messageId = req.params.messageId;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const updated = await chatService.softDeleteMessageForStudent(user, messageId);
    // Broadcast delete event via Socket.IO (web/admin)
    const io = (global as any).io;
    if (io && updated) {
      io.to(`thread_${updated.threadId}`).emit('chat.message.delete', { threadId: updated.threadId, messageId });
      io.to('role_admin').emit('chat.message.delete', { threadId: updated.threadId, messageId });
    }
    return res.json({ message: 'Message hidden for student', data: updated });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const deleteMessageAsAdmin = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const messageId = req.params.messageId;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const deleted = await chatService.hardDeleteMessageAsAdmin(user, messageId);
    // Broadcast delete event via Socket.IO (web/admin)
    const io = (global as any).io;
    if (io && deleted) {
      io.to(`thread_${deleted.threadId}`).emit('chat.message.delete', { threadId: deleted.threadId, messageId });
      io.to('role_admin').emit('chat.message.delete', { threadId: deleted.threadId, messageId });
    }
    return res.json({ message: 'Message deleted' });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

// GET /api/chat/threads/:id/members
export const listThreadMembers = async (req: Request, res: Response) => {
  try {
    const threadId = req.params.id;
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        student: { select: { id: true, fullName: true, email: true, role: true, avatar: true } },
        teacher: { select: { id: true, fullName: true, email: true, role: true, avatar: true } },
      },
    });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const members = [thread.student, thread.teacher].filter(Boolean);
    return res.json({ members });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/chat/messages/:id/revoke â€” revoke (soft-delete) a message
export const revokeMessage = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const messageId = req.params.id;
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    // Allow sender or admin to revoke
    if (message.senderId !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: '[Tin nháº¯n Ä‘Ă£ bá»‹ thu há»“i]',
        deletedByAdminAt: new Date(),
        deletedByAdminId: user.id,
      },
    });
    const io = (global as any).io;
    if (io) {
      io.to(`thread_${updated.threadId}`).emit('chat.message.revoke', { threadId: updated.threadId, messageId });
    }
    return res.json({ message: 'Message revoked', data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/chat/admin/threads/:id/lock â€” lock a thread (admin only)
export const lockThread = async (req: Request, res: Response) => {
  try {
    const threadId = req.params.id;
    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const updated = await prisma.chatThread.update({ where: { id: threadId }, data: { isLocked: true } });
    const io = (global as any).io;
    if (io) io.to(`thread_${threadId}`).emit('chat.thread.lock', { threadId, isLocked: true });
    return res.json({ message: 'Thread locked', data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/chat/admin/threads/:id/unlock â€” unlock a thread (admin only)
export const unlockThread = async (req: Request, res: Response) => {
  try {
    const threadId = req.params.id;
    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const updated = await prisma.chatThread.update({ where: { id: threadId }, data: { isLocked: false } });
    const io = (global as any).io;
    if (io) io.to(`thread_${threadId}`).emit('chat.thread.lock', { threadId, isLocked: false });
    return res.json({ message: 'Thread unlocked', data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteThreadAsAdmin = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const threadId = req.params.id;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    const deleted = await chatService.hardDeleteThreadAsAdmin(user, threadId);
    // Broadcast thread delete event via Socket.IO (web/admin)
    const io = (global as any).io;
    if (io && deleted) {
      io.to(`thread_${threadId}`).emit('chat.thread.delete', { threadId });
      io.to('role_admin').emit('chat.thread.delete', { threadId });
    }
    return res.json({ message: 'Thread deleted' });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};
