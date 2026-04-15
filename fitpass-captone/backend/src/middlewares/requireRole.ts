import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes((req as any).user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
}
