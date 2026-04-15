import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fitpass_jwt_secret_key_2024';

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
      origin: "*", // Configure for production
      methods: ["GET", "POST"]
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

    // Join user to their role-based room
    socket.join(`role_${user.role.toLowerCase()}`);

    // Handle joining session room for real-time attendance
    socket.on('join_session', (data: { sessionId: string }) => {
      const { sessionId } = data;
      
      if (!sessionId) {
        socket.emit('error', { message: 'Session ID required' });
        return;
      }

      socket.join(`session_${sessionId}`);
      socket.emit('joined_session', { sessionId });
      console.log(`👥 ${user.fullName} joined session room: session_${sessionId}`);
    });

    // Handle leaving session room
    socket.on('leave_session', (data: { sessionId: string }) => {
      const { sessionId } = data;
      socket.leave(`session_${sessionId}`);
      socket.emit('left_session', { sessionId });
      console.log(`👋 ${user.fullName} left session room: session_${sessionId}`);
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
  });

  // Utility function to emit attendance updates
  const emitAttendanceUpdate = (sessionId: string, data: any) => {
    io.to(`session_${sessionId}`).emit('attendance:update', data);
  };

  console.log('🚀 WebSocket server initialized');

  return io;
}