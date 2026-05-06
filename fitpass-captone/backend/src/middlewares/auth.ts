import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => { throw new Error('JWT_SECRET environment variable is required'); })();

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {

  // Ưu tiên lấy token từ header, nếu không có thì lấy từ cookie
  let token: string | undefined;
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies && req.cookies.fitpass_token) {
    token = req.cookies.fitpass_token;
  }

  console.log('🔐 Auth middleware - authHeader:', authHeader);
  console.log('🔐 Auth middleware - token:', token ? `${token.substring(0, 10)}...` : 'no token');

  if (!token) {
    console.log('❌ Auth failed: No token provided');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const resolvedUserId = payload.id || payload.userId || payload.sub;
    const resolvedRole = typeof payload.role === 'string' ? payload.role.toUpperCase() : payload.role;

    console.log('🔐 Auth middleware - payload:', { id: resolvedUserId, email: payload.email, role: resolvedRole });

    if (!resolvedUserId && !payload.email) {
      console.log('❌ Auth failed: Invalid token payload');
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const resolveUser = async () => {
      const byId = resolvedUserId
        ? await prisma.user.findUnique({
            where: { id: resolvedUserId },
            select: { id: true, email: true, fullName: true, role: true },
          })
        : null;

      if (byId) return byId;

      if (payload.email) {
        const byEmail = await prisma.user.findUnique({
          where: { email: payload.email },
          select: { id: true, email: true, fullName: true, role: true },
        });
        if (byEmail) {
          console.log('⚠️ Auth fallback: token user id not found, resolved by email:', byEmail.email);
          return byEmail;
        }
      }

      return null;
    };

    resolveUser()
      .then((dbUser) => {
        if (!dbUser) {
          console.log('❌ Auth failed: User no longer exists in database');
          return res.status(401).json({ message: 'User not found' });
        }

        (req as any).user = {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          fullName: dbUser.fullName,
        };
        req.userId = dbUser.id; // For payment controllers

        console.log('✅ Auth success - userId:', req.userId, 'role:', (req as any).user.role);
        return next();
      })
      .catch((lookupError) => {
        console.log('❌ Auth failed: User lookup error -', lookupError);
        return res.status(500).json({ message: 'Authentication lookup failed' });
      });
  } catch (err) {
    console.log('❌ Auth failed: Invalid token -', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Alias for backward compatibility
export const authenticateToken = authMiddleware;
