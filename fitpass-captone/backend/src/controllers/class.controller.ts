import { Request, Response } from "express";
import { ClassService } from "../services/class.service";
import { prisma } from '../config/prisma';

const classService = new ClassService();

export const createClass = async (req: Request, res: Response) => {
  try {
    console.log('Creating class with data:', req.body);
    const user = (req as any).user;
    
    if (!req.body.name || !req.body.duration) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        required: ["name", "duration"],
        received: req.body 
      });
    }

    // Validate type and level when provided, otherwise set safe defaults.
    const validTypes = ['YOGA', 'CARDIO', 'STRENGTH', 'DANCE', 'PILATES', 'OTHER'];
    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];

    if (req.body.type && !validTypes.includes(req.body.type)) {
      return res.status(400).json({ 
        error: "Invalid type", 
        validTypes 
      });
    }

    if (req.body.level && !validLevels.includes(req.body.level)) {
      return res.status(400).json({ 
        error: "Invalid level", 
        validLevels 
      });
    }

    if (!req.body.type) {
      req.body.type = 'OTHER';
    }

    if (!req.body.level) {
      req.body.level = 'ALL_LEVELS';
    }

    // Teachers can only create classes owned by themselves.
    if (user?.role === 'TEACHER') {
      req.body.teacherId = user.id;
    }

    const created = await classService.createClass(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating class:', err);
    return res.status(400).json({ error: err.message, details: err });
  }
};

export const getAllClasses = async (req: Request, res: Response) => {
  try {
    const { status, approved, type, level, startDate, endDate, teacherId } = req.query as Record<string, string | undefined>;
    const user = (req as any).user;

    if (teacherId && user?.role === 'TEACHER' && teacherId !== user.id) {
      return res.status(403).json({ error: 'You can only view your own classes' });
    }

    let classes;
    // If any filter present, use flexible search
    if (status || approved || type || level || startDate || endDate) {
      classes = await classService.searchClasses({
        status: status as any,
        approvedOnly: approved === 'true',
        type: type as any,
        level: level as any,
        teacherId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    } else {
      // Default: all classes
      classes = await classService.getAllClasses();
    }

    if (teacherId) {
      classes = classes.filter((item: any) => item.teacherId === teacherId);
    }

    return res.json(classes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Admin approve class
export const approveClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    const approved = await classService.approveClass(id);

    // Notify teacher
    if (approved.teacherId) {
      await prisma.notification.create({
        data: {
          userId: approved.teacherId,
          title: 'Lớp học được phê duyệt',
          body: `Lớp "${approved.name}" đã được admin phê duyệt.`,
          type: 'CLASS_APPROVED',
        },
      });
      const io = (global as any).io;
      if (io) io.to(`user_${approved.teacherId}`).emit('notification', { type: 'CLASS_APPROVED' });
    }

    return res.json({ message: "Class approved successfully", class: approved });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// Admin reject class
export const rejectClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { rejectionReason } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    const rejected = await classService.rejectClass(id, rejectionReason);

    // Notify teacher
    if (rejected.teacherId) {
      await prisma.notification.create({
        data: {
          userId: rejected.teacherId,
          title: 'Lớp học bị từ chối',
          body: `Lớp "${rejected.name}" đã bị từ chối${rejectionReason ? ': ' + rejectionReason : '.'} `,
          type: 'CLASS_REJECTED',
        },
      });
      const io = (global as any).io;
      if (io) io.to(`user_${rejected.teacherId}`).emit('notification', { type: 'CLASS_REJECTED' });
    }

    return res.json({ message: "Class rejected", class: rejected });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    
    if (!classId) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    const cls = await classService.getClassById(classId);

    if (!cls) return res.status(404).json({ error: "Class not found" });

    return res.json(cls);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const user = (req as any).user;
    
    if (!id) {
      return res.status(400).json({ error: "Class ID is required" });
    }

    if (user?.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({
        where: { id },
        select: { teacherId: true }
      });

      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (classData.teacherId !== user.id) {
        return res.status(403).json({ error: 'You do not own this class' });
      }

      // Teachers cannot reassign class ownership.
      if (req.body?.teacherId !== undefined) {
        delete req.body.teacherId;
      }
    }
    
    const updated = await classService.updateClass(id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    await classService.deleteClass(id);
    return res.json({ message: "Class deleted" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
