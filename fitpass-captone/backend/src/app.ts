import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import passport from './config/passport';
import authRouter from './routes/auth';
import userRouter from './routes/user.routes';
import classesRouter from './routes/classes.routes';
import teachersRouter from './routes/teachers.routes';
import sessionsRouter from './routes/sessions.routes';
import enrollmentsRouter from './routes/enrollments.routes';
import attendanceRouter from './routes/attendance.routes';
import qrRouter from './routes/qr.routes';
import packageRouter from './routes/package.routes';
import userPackageRouter from './routes/userPackage.routes';
import paymentRouter from './routes/payment.routes';
import salaryRouter from './routes/salary.routes';
import earningsRouter from './routes/earnings.routes';
import transactionsRouter from './routes/transactions.routes';
import roomRouter from './routes/room.routes';
import businessLogicRouter from './routes/businessLogic';
import classReviewAdminRouter from './routes/classReviewAdmin.routes';
import chatRouter from './routes/chat.routes';
import notificationsRouter from './routes/notifications.routes';
import forumRouter from './routes/forum.routes';
import { authMiddleware } from './middlewares/auth';
import { errorHandler } from './middlewares/errorHandler';
import { healthCheck } from './controllers/health.controller';

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images served from backend
  contentSecurityPolicy: false // disabled: API only, no HTML except OAuth pages
}));

// Gzip compression
app.use(compression());

// Cookie parser for httpOnly cookies
app.use(cookieParser());

// Auth rate limiter: 20 requests per 15 minutes per IP
const authRateLimit = (() => {
  const store = new Map<string, { count: number; resetTime: number }>();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX = 20;
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.ip ?? req.socket.remoteAddress) || 'unknown';
    const now = Date.now();
    const entry = store.get(ip);
    if (!entry || now > entry.resetTime) {
      store.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }
    if (entry.count >= MAX) {
      return res.status(429).json({ message: 'Too many requests, please try again later.' });
    }
    entry.count++;
    return next();
  };
})();

// Initialize Passport
app.use(passport.initialize());

// Custom morgan setup - skip OPTIONS requests in development
app.use(morgan('dev', {
  skip: (req, res) => {
    // Skip logging OPTIONS requests and successful health checks
    return req.method === 'OPTIONS' || 
           (req.originalUrl === '/api/health' && res.statusCode < 400);
  }
}));

// Dynamic CORS config using ALLOWED_ORIGINS env variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:3001',
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'User-Agent',
    'X-Forwarded-Proto',
    'Cache-Control',
    'Pragma'
  ]
}));

// Middleware to handle ngrok/proxy headers
app.use((req, res, next) => {
  if (false) { // disabled verbose logging in all environments
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Morgan already configured above - remove duplicate

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint (no auth required)
app.get('/api/health', healthCheck);

// Root route
app.get('/', (_req, res) => {
  res.json({ 
    name: 'FitPass API', 
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*',
      static: '/user-reset-password.html'
    }
  });
});

// health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes — rate-limited
app.use('/api/auth', authRateLimit, authRouter);

// Package routes (public access for viewing packages)
app.use('/api/packages', packageRouter);

// Protected routes with RBAC will be handled in individual route files
app.use('/api/users', authMiddleware, userRouter);
app.use('/api/classes', authMiddleware, classesRouter);
app.use('/api/teachers', authMiddleware, teachersRouter);
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/enrollments', authMiddleware, enrollmentsRouter);
app.use('/api/attendance', authMiddleware, attendanceRouter);
app.use('/api/qr', authMiddleware, qrRouter);
app.use('/api/user-packages', authMiddleware, userPackageRouter);
app.use('/api/payment', authMiddleware, paymentRouter);
app.use('/api/salary', authMiddleware, salaryRouter);
app.use('/api/earnings', authMiddleware, earningsRouter);
app.use('/api/transactions', authMiddleware, transactionsRouter);
app.use('/api/rooms', authMiddleware, roomRouter);
app.use('/api/business', authMiddleware, businessLogicRouter);
app.use('/api/admin', authMiddleware, classReviewAdminRouter);
app.use('/api/chat', authMiddleware, chatRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/forum', authMiddleware, forumRouter);

// Error handler must be last
app.use(errorHandler);

export default app;
