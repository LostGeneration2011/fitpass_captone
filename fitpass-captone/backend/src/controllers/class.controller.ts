import { Request, Response } from "express";
import { ClassService } from "../services/class.service";
import { prisma } from '../config/prisma';

const classService = new ClassService();

export const createClass = async (req: Request, res: Response) => {
  try {
    console.log('Creating class with data:', req.body);
    const user = (req as any).user;
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const duration = Number(req.body?.duration);
    const capacity = req.body?.capacity === undefined ? undefined : Number(req.body.capacity);
    
    if (!rawName || !req.body.duration) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        required: ["name", "duration"],
        received: req.body 
      });
    }

    if (!Number.isInteger(duration) || duration <= 0 || duration > 600) {
      return res.status(400).json({ error: 'Duration must be an integer between 1 and 600 minutes' });
    }

    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity <= 0 || capacity > 500)) {
      return res.status(400).json({ error: 'Capacity must be an integer between 1 and 500' });
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

    req.body.name = rawName;
    req.body.duration = duration;
    if (capacity !== undefined) {
      req.body.capacity = capacity;
    }

    // Teachers can only create classes owned by themselves.
    if (user?.role === 'TEACHER') {
      req.body.teacherId = user.id;
    }

    if (user?.role === 'ADMIN' && !req.body.teacherId) {
      return res.status(400).json({ error: 'teacherId is required when admin creates a class' });
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
    const role = user?.role;

    if (role === 'STUDENT' && status && status !== 'APPROVED') {
      return res.status(403).json({ error: 'Students can only query approved classes' });
    }

    if (teacherId && user?.role === 'TEACHER' && teacherId !== user.id) {
      return res.status(403).json({ error: 'You can only view your own classes' });
    }

    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    if (parsedStartDate && Number.isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ error: 'Invalid startDate' });
    }

    if (parsedEndDate && Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ error: 'Invalid endDate' });
    }

    let effectiveTeacherId = teacherId;
    if (role === 'TEACHER' && !effectiveTeacherId) {
      effectiveTeacherId = user.id;
    }

    const approvedOnly = role === 'STUDENT' ? true : approved === 'true';

    let classes;
    // If any filter present, use flexible search
    if (status || approved || type || level || startDate || endDate || effectiveTeacherId) {
      classes = await classService.searchClasses({
        status: status as any,
        approvedOnly,
        type: type as any,
        level: level as any,
        teacherId: effectiveTeacherId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      });
    } else {
      // Default: all classes
      classes = await classService.getAllClasses();
      if (role === 'STUDENT') {
        classes = classes.filter((item: any) => item.status === 'APPROVED');
      }
    }

    if (effectiveTeacherId) {
      classes = classes.filter((item: any) => item.teacherId === effectiveTeacherId);
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
      const notification = await prisma.notification.create({
        data: {
          userId: approved.teacherId,
          title: 'Lớp học được phê duyệt',
          body: `Lớp "${approved.name}" đã được admin phê duyệt.`,
          type: 'CLASS_APPROVED',
        },
      });
      const io = (global as any).io;
      if (io) {
        io.to(`user_${approved.teacherId}`).emit('notification', {
          eventId: `notification:${notification.id}`,
          notificationId: notification.id,
          userId: approved.teacherId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          createdAt: notification.createdAt,
          data: notification.data,
        });
      }
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
      const notification = await prisma.notification.create({
        data: {
          userId: rejected.teacherId,
          title: 'Lớp học bị từ chối',
          body: `Lớp "${rejected.name}" đã bị từ chối${rejectionReason ? ': ' + rejectionReason : '.'} `,
          type: 'CLASS_REJECTED',
        },
      });
      const io = (global as any).io;
      if (io) {
        io.to(`user_${rejected.teacherId}`).emit('notification', {
          eventId: `notification:${notification.id}`,
          notificationId: notification.id,
          userId: rejected.teacherId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          createdAt: notification.createdAt,
          data: notification.data,
        });
      }
    }

    return res.json({ message: "Class rejected", class: rejected });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const user = (req as any).user;
    
    if (!classId) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    const cls = await classService.getClassById(classId);

    if (!cls) return res.status(404).json({ error: "Class not found" });

    const isAdmin = user?.role === 'ADMIN';
    const isOwnerTeacher = user?.role === 'TEACHER' && cls.teacherId === user.id;

    if (cls.status !== 'APPROVED' && !isAdmin && !isOwnerTeacher) {
      return res.status(403).json({ error: 'You do not have access to this class' });
    }

    if (!isAdmin && !isOwnerTeacher) {
      const safeClass = {
        ...cls,
        enrollments: [],
      };
      return res.json(safeClass);
    }

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

    const body = req.body || {};
    const hasName = body.name !== undefined;
    const hasDuration = body.duration !== undefined;
    const hasCapacity = body.capacity !== undefined;

    if (hasName) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return res.status(400).json({ error: 'name must be a non-empty string' });
      }
      body.name = body.name.trim();
    }

    if (hasDuration) {
      const duration = Number(body.duration);
      if (!Number.isInteger(duration) || duration <= 0 || duration > 600) {
        return res.status(400).json({ error: 'duration must be an integer between 1 and 600 minutes' });
      }
      body.duration = duration;
    }

    if (hasCapacity) {
      const capacity = Number(body.capacity);
      if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 500) {
        return res.status(400).json({ error: 'capacity must be an integer between 1 and 500' });
      }
      body.capacity = capacity;
    }

    if (user?.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({
        where: { id },
        select: { teacherId: true, status: true }
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

      // Teacher edits must be re-reviewed to keep moderation workflow consistent.
      if (classData.status !== 'PENDING' && Object.keys(body).length > 0) {
        body.status = 'PENDING';
        body.rejectionReason = null;
      }
    }
    
    const updated = await classService.updateClass(id, body);
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
