import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * Middleware để kiểm tra quyền admin cho business logic endpoints
 * Middleware to check admin permissions for business logic endpoints
 */
// eslint-disable-next-line consistent-return
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ admin mới có quyền truy cập chức năng này'
    });
  }
  
  return next();
};

/**
 * Middleware để validate class ID
 * Middleware to validate class ID
 */
// eslint-disable-next-line consistent-return
export const validateClassId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID là bắt buộc'
      });
    }
    
    const classExists = await prisma.class.findUnique({
      where: { id: classId }
    });
    
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }
    
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra lớp học'
    });
  }
};

/**
 * Middleware để validate enrollment ID
 * Middleware to validate enrollment ID
 */
// eslint-disable-next-line consistent-return
export const validateEnrollmentId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { enrollmentId } = req.params;
    
    if (!enrollmentId) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID là bắt buộc'
      });
    }
    
    const enrollmentExists = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: true,
        class: true
      }
    });
    
    if (!enrollmentExists) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký'
      });
    }
    
    // Check if user has permission to access this enrollment
    const currentUser = (req as any).user;
    if (currentUser.role !== 'ADMIN' && 
        currentUser.id !== enrollmentExists.userId && 
        currentUser.id !== enrollmentExists.studentId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập đăng ký này'
      });
    }
    
    // Attach enrollment to request for use in route handlers
    (req as any).enrollment = enrollmentExists;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra đăng ký'
    });
  }
};

/**
 * Middleware để validate refund reason
 * Middleware to validate refund reason
 */
// eslint-disable-next-line consistent-return
export const validateRefundReason = (req: Request, res: Response, next: NextFunction) => {
  const { reason } = req.body;
  
  const validReasons = ['STUDENT_QUIT', 'CLASS_CANCELLED', 'SYSTEM_ERROR'];
  
  if (!reason || !validReasons.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: `Lý do refund không hợp lệ. Các lý do hợp lệ: ${validReasons.join(', ')}`
    });
  }
  
  return next();
};

/**
 * Middleware để validate enrollment data
 * Middleware to validate enrollment data
 */
// eslint-disable-next-line consistent-return
export const validateEnrollmentData = (req: Request, res: Response, next: NextFunction) => {
  const { userId, classId, userPackageId } = req.body;
  
  if (!userId || !classId || !userPackageId) {
    return res.status(400).json({
      success: false,
      message: 'userId, classId và userPackageId là bắt buộc'
    });
  }
  
  return next();
};

/**
 * Middleware để validate transfer data
 * Middleware to validate transfer data
 */
// eslint-disable-next-line consistent-return
export const validateTransferData = (req: Request, res: Response, next: NextFunction) => {
  const { newClassId } = req.body;
  
  if (!newClassId) {
    return res.status(400).json({
      success: false,
      message: 'newClassId là bắt buộc để chuyển lớp'
    });
  }
  
  return next();
};

/**
 * Middleware để validate month/year parameters
 * Middleware to validate month/year parameters
 */
// eslint-disable-next-line consistent-return
export const validateMonthYear = (req: Request, res: Response, next: NextFunction) => {
  const { year, month } = req.params;
  
  if (!year || !month) {
    res.status(400).json({
      success: false,
      message: 'Năm và tháng là bắt buộc'
    });
    return;
  }
  
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  
  if (isNaN(yearNum) || isNaN(monthNum)) {
    return res.status(400).json({
      success: false,
      message: 'Năm và tháng phải là số'
    });
  }
  
  if (yearNum < 2020 || yearNum > 2030) {
    return res.status(400).json({
      success: false,
      message: 'Năm không hợp lệ'
    });
  }
  
  if (monthNum < 1 || monthNum > 12) {
    return res.status(400).json({
      success: false,
      message: 'Tháng phải từ 1-12'
    });
  }
  
  return next();
};

/**
 * Middleware để rate limiting cho business logic endpoints
 * Middleware for rate limiting business logic endpoints
 */
export const businessLogicRateLimit = (() => {
  const requests = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_REQUESTS = 100; // Max requests per window

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!requests.has(ip)) {
      requests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }
    
    const userData = requests.get(ip);
    
    if (now > userData.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return next();
    }
    
    if (userData.count >= MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
      });
    }
    
    userData.count++;
    next();
  };
})();