import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// eslint-disable-next-line consistent-return
export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId; // From authenticateToken middleware
    console.log('🔒 Admin check - userId:', userId);
    console.log('🔒 Admin check - req.user:', req.user);
    
    if (!userId) {
      console.log('❌ Admin check failed: No userId');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    console.log('🔒 Admin check - user found:', user ? `${user.email} (${user.role})` : 'not found');

    if (!user || user.role !== 'ADMIN') {
      console.log('❌ Admin check failed: User not admin');
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập'
      });
    }

    console.log('✅ Admin check passed for:', user.email);
    return next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra quyền admin'
    });
  }
};