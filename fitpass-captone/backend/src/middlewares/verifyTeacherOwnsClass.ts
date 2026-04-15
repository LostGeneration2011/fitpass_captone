import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * Middleware to verify that authenticated teacher owns the class
 * Expects req.params.classId and req.user.id (from auth middleware)
 * If teacher doesn't own the class, returns 403 Forbidden
 */
export const verifyTeacherOwnsClass = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { classId } = req.params;

    if (!user || user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teachers can access this resource' });
    }

    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    // Fetch class and check ownership
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, teacherId: true }
    });

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (classData.teacherId !== user.id) {
      return res.status(403).json({ error: 'You do not own this class' });
    }

    // Attach classData to request for use in controller
    (req as any).classData = classData;

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
