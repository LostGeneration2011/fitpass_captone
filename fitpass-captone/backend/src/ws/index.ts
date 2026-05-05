
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => { throw new Error('JWT_SECRET environment variable is required'); })();

// Helper to get allowed origins from env
function getAllowedOrigins() {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  }
  return ['http://localhost:3000'];
}

interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export default function setupWebSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Store io globally for use in controllers
  (global as any).io = io;

  // Middleware for socket authentication
  io.use((socket: Socket, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new Error('No token provided');
      }

      const payload = jwt.verify(token, JWT_SECRET) as any;
      (socket as AuthenticatedSocket).user = {
        id: payload.id || payload.userId,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName
      };

      next();
    } catch (error) {
      console.error('WebSocket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as AuthenticatedSocket).user;
    console.log(`🔌 User ${user.fullName} (${user.role}) connected to WebSocket`);

    // Join user to their role-based room and personal room
    socket.join(`role_${user.role.toLowerCase()}`);
    socket.join(`user_${user.id}`);


    // --- CHAT REAL-TIME LOGIC ---
    // Join chat thread room
    socket.on('join_thread', (data: { threadId: string }) => {
      const { threadId } = data;
      if (!threadId) {
        socket.emit('error', { message: 'Thread ID required' });
        return;
      }
      socket.join(`thread_${threadId}`);
      socket.emit('joined_thread', { threadId });
      console.log(`💬 ${user.fullName} joined chat thread: thread_${threadId}`);
      // Emit to admin socket itself for confirmation
      socket.emit('info', { message: `[BACKEND] Joined thread_${threadId}` });
    });

    // Leave chat thread room
    socket.on('leave_thread', (data: { threadId: string }) => {
      const { threadId } = data;
      socket.leave(`thread_${threadId}`);
      socket.emit('left_thread', { threadId });
      console.log(`💬 ${user.fullName} left chat thread: thread_${threadId}`);
      socket.emit('info', { message: `[BACKEND] Left thread_${threadId}` });
    });

    // Handle typing indicator
    socket.on('chat.typing', (data: { threadId: string, isTyping: boolean }) => {
      const { threadId, isTyping } = data;
      if (!threadId) return;
      // Broadcast to all other users in the thread except sender
      socket.to(`thread_${threadId}`).emit('chat.typing', {
        userId: user.id,
        fullName: user.fullName,
        isTyping,
        threadId
      });
    });

    // Handle receiving chat message from client (optional, if you want to support sending via socket.io)
    // (giữ nguyên logic cũ)
    socket.on('chat_message', async (data: { threadId: string, content: string }) => {
      const { threadId, content } = data;
      if (!threadId || !content?.trim()) {
        socket.emit('error', { message: 'Thread ID and content required' });
        return;
      }
      // Save message to DB (reuse chatService if possible)
      try {
        const { ChatService } = await import('../services/chat.service');
        const chatService = new ChatService();
        const message = await chatService.sendMessage(
          { id: user.id, role: user.role as UserRole },
          threadId,
          content
        );
        // Emit to all in thread
        io.to(`thread_${threadId}`).emit('chat.message', { threadId, message });
        // Optionally: emit to admin room
        io.to('role_admin').emit('chat.message', { threadId, message });
      } catch (err) {
        console.error('Error sending chat message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle teacher requesting current attendance for a session
    socket.on('get_session_attendance', async (data: { sessionId: string }) => {
      try {
        if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        const { sessionId } = data;
        
        // Import prisma here to avoid circular dependencies
        const { prisma } = await import('../config/prisma');
        
        const attendances = await prisma.attendance.findMany({
          where: { sessionId },
          include: {
            student: { select: { id: true, fullName: true, email: true } }
          },
          orderBy: { checkedInAt: 'desc' }
        });

        socket.emit('session_attendance', {
          sessionId,
          attendances: attendances.map(att => ({
            studentId: att.studentId,
            studentName: att.student.fullName,
            studentEmail: att.student.email,
            status: att.status,
            checkedInAt: att.checkedInAt
          }))
        });
      } catch (error) {
        console.error('Error getting session attendance:', error);
        socket.emit('error', { message: 'Failed to get attendance' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User ${user.fullName} disconnected from WebSocket`);
    });

    // --- END CHAT LOGIC ---
  });

  // Utility function to emit attendance updates
  const emitAttendanceUpdate = (sessionId: string, data: any) => {
    io.to(`session_${sessionId}`).emit('attendance:update', data);
  };

  console.log('🚀 WebSocket server initialized');

  return io;
}