export const editMessage = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const messageId = req.params.messageId;
    const { content } = req.body;
    if (!messageId || !content?.trim()) {
      return res.status(400).json({ error: 'Message ID and new content are required' });
    }
    const updated = await chatService.editMessage(user, messageId, content);
    // Optionally, broadcast edit event via WebSocket
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
    return res.json({ message: 'Thread marked as read', data: result });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};
import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';

const chatService = new ChatService();

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
    const { content } = req.body;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    const message = await chatService.sendMessage(user, threadId, content);

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

    await chatService.hardDeleteMessageAsAdmin(user, messageId);
    return res.json({ message: 'Message deleted' });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const deleteThreadAsAdmin = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const threadId = req.params.id;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    await chatService.hardDeleteThreadAsAdmin(user, threadId);
    return res.json({ message: 'Thread deleted' });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};
