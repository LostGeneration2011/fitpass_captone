import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fitpass_jwt_secret_key_2024';

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
    console.log('🔐 Auth middleware - payload:', { id: payload.id || payload.userId, email: payload.email, role: payload.role });
    
    (req as any).user = {
      id: payload.id || payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    };
    req.userId = payload.id || payload.userId; // For payment controllers
    
    console.log('✅ Auth success - userId:', req.userId, 'role:', (req as any).user.role);
    return next();
  } catch (err) {
    console.log('❌ Auth failed: Invalid token -', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Alias for backward compatibility
export const authenticateToken = authMiddleware;
