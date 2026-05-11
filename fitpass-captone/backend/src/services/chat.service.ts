
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

  async editMessage(user: { id: string; role: UserRole }, messageId: string, content: string) {
    if (!content?.trim()) throw new Error('Message content is required');
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');
    // Only sender can edit their own messages (no admin edit of others' messages for audit trail)
    if (message.senderId !== user.id) {
      const err = new Error('Unauthorized - only message sender can edit');
      (err as any).status = 403;
      throw err;
    }
    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { content: content.trim() },
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    });
    return updated;
  }

  async markThreadAsRead(user: { id: string; role: UserRole }, threadId: string) {
    await this.ensureThreadAccessible(threadId, user);
    // Upsert ChatThreadRead
    const result = await prisma.chatThreadRead.upsert({
      where: {
        threadId_userId: {
          threadId,
          userId: user.id,
        },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        threadId,
        userId: user.id,
        lastReadAt: new Date(),
      },
    });
    return result;
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

  async getOrCreateClassGroupThread(user: { id: string; role: UserRole }, classId: string) {
    if (user.role !== UserRole.STUDENT && user.role !== UserRole.TEACHER) {
      const err = new Error('Only students and teachers can access class group chat');
      (err as any).status = 403;
      throw err;
    }

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new Error('Class not found');

    // Student must be enrolled
    if (user.role === UserRole.STUDENT) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { classId, studentId: user.id },
        select: { id: true },
      });
      if (!enrollment) {
        const err = new Error('Only enrolled students can access class group chat');
        (err as any).status = 403;
        throw err;
      }
    }

    // Teacher must be the class teacher
    if (user.role === UserRole.TEACHER && cls.teacherId !== user.id) {
      const err = new Error('Only class teacher can access class group chat');
      (err as any).status = 403;
      throw err;
    }

    const existing = await prisma.chatThread.findFirst({
      where: {
        type: ChatThreadType.CLASS_GROUP,
        classId,
      },
    });

    if (existing) {
      return existing;
    }

    // Create new group thread (only once per class)
    return prisma.chatThread.create({
      data: {
        type: ChatThreadType.CLASS_GROUP,
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
      select: {
        id: true,
        threadId: true,
        senderId: true,
        senderRole: true,
        content: true,
        attachments: true,
        createdAt: true,
        deletedByStudentAt: true,
        deletedByAdminAt: true,
        replyToId: true,
        mentionedUserIds: true,
        sender: { select: { id: true, fullName: true, role: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, fullName: true } },
            attachments: true,
          },
        },
      },
    });

    return messages.reverse();
  }

  async sendMessage(user: { id: string; role: UserRole; fullName?: string }, threadId: string, content: string, attachments?: any[], replyToId?: string, mentionUserIds?: string[]) {
    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      throw new Error('Message content or attachments are required');
    }

    const thread = await this.ensureThreadAccessible(threadId, user);

    // Verify replyToId exists if provided
    if (replyToId) {
      const replyMessage = await prisma.chatMessage.findUnique({ where: { id: replyToId } });
      if (!replyMessage) {
        throw new Error('Replied message not found');
      }
      if (replyMessage.threadId !== threadId) {
        throw new Error('Replied message is not in this thread');
      }
    }

    // Validate and filter mentions by thread membership
    let processedMentions: string[] = [];
    if (Array.isArray(mentionUserIds) && mentionUserIds.length > 0) {
      const mentionCandidates = Array.from(new Set(mentionUserIds.filter(Boolean))).filter((id) => id !== user.id);

      const allowedMentionUserIds = new Set<string>();
      if (thread.type === ChatThreadType.CLASS_GROUP && thread.classId) {
        const enrolled = await prisma.enrollment.findMany({
          where: { classId: thread.classId },
          select: { studentId: true },
        });
        enrolled.forEach((e) => allowedMentionUserIds.add(e.studentId));
        if (thread.teacherId) allowedMentionUserIds.add(thread.teacherId);
      } else {
        if (thread.studentId) allowedMentionUserIds.add(thread.studentId);
        if (thread.teacherId) allowedMentionUserIds.add(thread.teacherId);
      }

      const allowedMentions = mentionCandidates.filter((id) => allowedMentionUserIds.has(id));
      if (allowedMentions.length > 0) {
        const mentionUsers = await prisma.user.findMany({
          where: {
            id: { in: allowedMentions },
            notificationEnabled: true,
          },
          select: { id: true },
        });
        processedMentions = mentionUsers.map((u) => u.id);
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        senderId: user.id,
        senderRole: user.role,
        content: content?.trim() || '',
        replyToId: replyToId || undefined,
        mentionedUserIds: processedMentions.length > 0 ? processedMentions : undefined,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, fullName: true } },
            attachments: true,
          },
        },
      },
    });

    const preview = content?.trim()
      ? content.trim().slice(0, 120)
      : attachments && attachments.length > 0
        ? `[${attachments[0].type === 'IMAGE' ? 'Hình ảnh' : 'Tệp đính kèm'}]`
        : '';

    await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: preview,
      },
    });

    if (processedMentions.length > 0) {
      const senderName = user.fullName || 'Một người dùng';
      const shortPreview = preview || '[Tin nhắn mới]';
      await prisma.notification.createMany({
        data: processedMentions.map((mentionedUserId) => ({
          userId: mentionedUserId,
          title: 'Bạn được nhắc đến trong chat',
          body: `${senderName} đã nhắc bạn: ${shortPreview}`,
          type: 'CHAT_MENTION',
          data: {
            threadId,
            messageId: message.id,
            senderId: user.id,
          },
        })),
      });
    }

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
    // Check if user is the sender of the message (not just the thread's student)
    if (message.senderId !== user.id) {
      const err = new Error('You can only delete your own messages');
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
