import { ChatThreadType, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';

export class ChatService {
  private async ensureThreadAccessible(threadId: string, user: { id: string; role: UserRole }) {
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { class: { select: { teacherId: true } } },
    });

    if (!thread) {
      throw new Error('Chat thread not found');
    }

    if (user.role === UserRole.ADMIN) return thread;

    if (user.role === UserRole.STUDENT && thread.studentId === user.id) {
      if (thread.deletedByStudentAt) {
        const err = new Error('Chat thread not found');
        (err as any).status = 404;
        throw err;
      }
      return thread;
    }

    if (user.role === UserRole.TEACHER && thread.teacherId === user.id) return thread;

    const err = new Error('Insufficient permissions');
    (err as any).status = 403;
    throw err;
  }

  async listThreadsForUser(user: { id: string; role: UserRole }) {
    if (user.role === UserRole.ADMIN) {
      return prisma.chatThread.findMany({
        include: {
          class: { select: { id: true, name: true } },
          student: { select: { id: true, fullName: true, email: true } },
          teacher: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
      });
    }

    if (user.role === UserRole.TEACHER) {
      return prisma.chatThread.findMany({
        where: { teacherId: user.id },
        include: {
          class: { select: { id: true, name: true } },
          student: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
      });
    }

    return prisma.chatThread.findMany({
      where: { studentId: user.id, deletedByStudentAt: null },
      include: {
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async softDeleteThreadForStudent(user: { id: string; role: UserRole }, threadId: string) {
    if (user.role !== UserRole.STUDENT) {
      const err = new Error('Only students can delete chat threads');
      (err as any).status = 403;
      throw err;
    }

    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new Error('Chat thread not found');

    if (thread.studentId !== user.id) {
      const err = new Error('Unauthorized');
      (err as any).status = 403;
      throw err;
    }

    return prisma.chatThread.update({
      where: { id: threadId },
      data: {
        deletedByStudentAt: new Date(),
        deletedByStudentId: user.id,
      },
    });
  }

  async getOrCreateSupportThread(user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.STUDENT) {
      const err = new Error('Only students can open support chat');
      (err as any).status = 403;
      throw err;
    }

    const existing = await prisma.chatThread.findFirst({
      where: {
        type: ChatThreadType.SUPPORT,
        studentId: user.id,
      },
    });

    if (existing) {
      if (existing.deletedByStudentAt) {
        return prisma.chatThread.update({
          where: { id: existing.id },
          data: { deletedByStudentAt: null, deletedByStudentId: null },
        });
      }
      return existing;
    }

    return prisma.chatThread.create({
      data: {
        type: ChatThreadType.SUPPORT,
        studentId: user.id,
        createdById: user.id,
      },
    });
  }

  async getOrCreateClassThread(user: { id: string; role: UserRole }, classId: string) {
    if (user.role !== UserRole.STUDENT) {
      const err = new Error('Only students can start class chat');
      (err as any).status = 403;
      throw err;
    }

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new Error('Class not found');
    if (!cls.teacherId) {
      throw new Error('Class has no assigned teacher');
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { classId, studentId: user.id },
      select: { id: true },
    });

    if (!enrollment) {
      const err = new Error('Only enrolled students can chat with teacher');
      (err as any).status = 403;
      throw err;
    }

    const existing = await prisma.chatThread.findFirst({
      where: {
        type: ChatThreadType.CLASS,
        classId,
        studentId: user.id,
      },
    });

    if (existing) {
      if (existing.deletedByStudentAt) {
        return prisma.chatThread.update({
          where: { id: existing.id },
          data: { deletedByStudentAt: null, deletedByStudentId: null },
        });
      }
      return existing;
    }

    return prisma.chatThread.create({
      data: {
        type: ChatThreadType.CLASS,
        classId,
        studentId: user.id,
        teacherId: cls.teacherId || null,
        createdById: user.id,
      },
    });
  }

  async listMessages(user: { id: string; role: UserRole }, threadId: string, limit = 30, before?: string) {
    await this.ensureThreadAccessible(threadId, user);

    const where: any = { threadId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    if (user.role === UserRole.STUDENT) {
      where.deletedByStudentAt = null;
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    return messages.reverse();
  }

  async sendMessage(user: { id: string; role: UserRole }, threadId: string, content: string) {
    if (!content?.trim()) {
      throw new Error('Message content is required');
    }

    await this.ensureThreadAccessible(threadId, user);

    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        senderId: user.id,
        senderRole: user.role,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: content.trim().slice(0, 120),
      },
    });

    return message;
  }

  async softDeleteMessageForStudent(user: { id: string; role: UserRole }, messageId: string) {
    if (user.role !== UserRole.STUDENT) {
      const err = new Error('Only students can soft-delete messages');
      (err as any).status = 403;
      throw err;
    }

    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');

    const thread = await this.ensureThreadAccessible(message.threadId, user);
    if (thread.studentId !== user.id) {
      const err = new Error('Unauthorized');
      (err as any).status = 403;
      throw err;
    }

    return prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        deletedByStudentAt: new Date(),
        deletedByStudentId: user.id,
      },
    });
  }

  async hardDeleteMessageAsAdmin(user: { id: string; role: UserRole }, messageId: string) {
    if (user.role !== UserRole.ADMIN) {
      const err = new Error('Only admin can delete messages');
      (err as any).status = 403;
      throw err;
    }

    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        deletedByAdminAt: new Date(),
        deletedByAdminId: user.id,
      },
    });

    return prisma.chatMessage.delete({ where: { id: messageId } });
  }

  async hardDeleteThreadAsAdmin(user: { id: string; role: UserRole }, threadId: string) {
    if (user.role !== UserRole.ADMIN) {
      const err = new Error('Only admin can delete threads');
      (err as any).status = 403;
      throw err;
    }

    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new Error('Chat thread not found');

    return prisma.chatThread.delete({ where: { id: threadId } });
  }
}
