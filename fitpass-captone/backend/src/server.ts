import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { prisma } from './config/prisma';
import app from './app';
import setupWebSocket from './ws';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Create HTTP server for WebSocket integration (required for both dev and production)
const server = createServer(app);

// Setup Socket.IO WebSocket
setupWebSocket(server);

// Setup simple WebSocket server on /ws path
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

(global as any).wss = wss;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => { throw new Error('JWT_SECRET environment variable is required'); })();

{

  wss.on('connection', (ws: any) => {
    console.log('🔌 Simple WebSocket client connected');
    ws.user = null;
    ws.subscribedThreads = new Set<string>();
    
    ws.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📨 WebSocket message:', data);
        
        if (data.type === 'auth') {
          try {
            const payload = jwt.verify(data.token, JWT_SECRET) as any;
            ws.user = {
              id: payload.id || payload.userId,
              email: payload.email,
              role: payload.role,
              fullName: payload.fullName,
            };
            ws.send(JSON.stringify({
              type: 'auth_success',
              message: 'Authentication successful',
              user: ws.user,
            }));
          } catch (err) {
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Authentication failed',
            }));
          }
        }

        if (data.type === 'chat.join') {
          const { threadId } = data;
          if (!ws.user || !threadId) {
            ws.send(JSON.stringify({ type: 'chat.error', message: 'Unauthorized or missing threadId' }));
            return;
          }

          prisma.chatThread.findUnique({
            where: { id: threadId },
            select: { id: true, studentId: true, teacherId: true },
          }).then((thread: any) => {
            if (!thread) {
              ws.send(JSON.stringify({ type: 'chat.error', message: 'Thread not found' }));
              return;
            }

            if (ws.user.role !== 'ADMIN' && ws.user.role !== 'STUDENT' && ws.user.role !== 'TEACHER') {
              ws.send(JSON.stringify({ type: 'chat.error', message: 'Unauthorized' }));
              return;
            }

            if (ws.user.role === 'STUDENT' && thread.studentId !== ws.user.id) {
              ws.send(JSON.stringify({ type: 'chat.error', message: 'Unauthorized' }));
              return;
            }

            if (ws.user.role === 'TEACHER' && thread.teacherId !== ws.user.id) {
              ws.send(JSON.stringify({ type: 'chat.error', message: 'Unauthorized' }));
              return;
            }

            ws.subscribedThreads.add(threadId);
            ws.send(JSON.stringify({ type: 'chat.joined', threadId }));
          }).catch(() => {
            ws.send(JSON.stringify({ type: 'chat.error', message: 'Failed to join thread' }));
          });
        }

        if (data.type === 'chat.leave') {
          const { threadId } = data;
          if (threadId) {
            ws.subscribedThreads.delete(threadId);
            ws.send(JSON.stringify({ type: 'chat.left', threadId }));
          }
        }

        // Typing indicator: broadcast to all clients in thread (except sender)
        if (data.type === 'chat.typing') {
          const { threadId } = data;
          if (!ws.user || !threadId) return;
          wss.clients.forEach((client: any) => {
            if (
              client !== ws &&
              client.readyState === 1 &&
              client.subscribedThreads?.has(threadId)
            ) {
              client.send(
                JSON.stringify({
                  type: 'chat.typing',
                  threadId,
                  userId: ws.user.id,
                  fullName: ws.user.fullName,
                })
              );
            }
          });
        }

        if (data.type === 'chat.send') {
          const { threadId, content } = data;
          if (!ws.user || !threadId || !content) {
            ws.send(JSON.stringify({ type: 'chat.error', message: 'Missing threadId or content' }));
            return;
          }

          prisma.chatThread.findUnique({
            where: { id: threadId },
            select: { id: true, studentId: true, teacherId: true },
          }).then(async (thread: any) => {
            if (!thread) {
              ws.send(JSON.stringify({ type: 'chat.error', message: 'Thread not found' }));
              return;
            }

            if (ws.user.role === 'STUDENT' && thread.studentId !== ws.user.id) {
              ws.send(JSON.stringify({ type: 'chat.error', message: 'Unauthorized' }));
              return;
            }

            if (ws.user.role === 'TEACHER' && thread.teacherId !== ws.user.id) {
              ws.send(JSON.stringify({ type: 'chat.error', message: 'Unauthorized' }));
              return;
            }

            const messageRecord = await prisma.chatMessage.create({
              data: {
                threadId,
                senderId: ws.user.id,
                senderRole: ws.user.role,
                content: String(content).trim(),
              },
              include: {
                sender: { select: { id: true, fullName: true, role: true } },
              },
            });

            await prisma.chatThread.update({
              where: { id: threadId },
              data: {
                lastMessageAt: new Date(),
                lastMessagePreview: String(content).trim().slice(0, 120),
              },
            });

            const payload = JSON.stringify({
              type: 'chat.message',
              threadId,
              message: messageRecord,
            });

            wss.clients.forEach((client: any) => {
              if (client.readyState === 1) {
                if (client.subscribedThreads?.has(threadId) || client.user?.role === 'ADMIN') {
                  client.send(payload);
                }
              }
            });
          }).catch(() => {
            ws.send(JSON.stringify({ type: 'chat.error', message: 'Failed to send message' }));
          });
        }
      } catch (error) {
        console.log('📨 WebSocket raw message:', message.toString());
      }
    });

    ws.on('close', () => {
      console.log('🔌 Simple WebSocket client disconnected');
    });

    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'welcome', 
      message: 'Connected to FitPass WebSocket' 
    }));
  });
  
  server.listen(Number(PORT), () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.IO WebSocket ready`);
    console.log(`🔗 Simple WebSocket ready at /ws`);
  });
}

// For Vercel
module.exports = app;
