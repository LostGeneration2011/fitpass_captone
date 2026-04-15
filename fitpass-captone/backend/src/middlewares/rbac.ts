import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// Middleware cho phân quyền role-based
export function requireRole(allowedRoles: UserRole[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
}

// Convenience functions
export const adminOnly = () => requireRole([UserRole.ADMIN]);
export const teacherOnly = () => requireRole([UserRole.TEACHER]);
export const studentOnly = () => requireRole([UserRole.STUDENT]);
export const teacherOrAdmin = () => requireRole([UserRole.TEACHER, UserRole.ADMIN]);
export const allRoles = () => requireRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);

// Owner = Admin (gộp luôn như yêu cầu)
export const ownerOnly = () => requireRole([UserRole.ADMIN]);