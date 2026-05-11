// POST /api/attendance/bulk
export const getAttendanceBulk = async (req: Request, res: Response) => {
  try {
    const { sessionIds } = req.body;
    const user = (req as any).user;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ error: "sessionIds must be a non-empty array" });
    }

    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only teachers and admins can access bulk attendance' });
    }

    const where: any = {
      sessionId: { in: sessionIds },
    };

    if (user.role === 'TEACHER') {
      where.session = { class: { teacherId: user.id } };
    }

    // Lấy tất cả attendance theo sessionIds
    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        session: { select: { id: true, startTime: true, endTime: true } }
      }
    });

    return res.json({ attendances });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
import { Request, Response } from "express";
import { AttendanceService } from "../services/attendance.service";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { QRUtils } from "../utils/qr";

const attendanceService = new AttendanceService();

async function assertTeacherOwnsSession(user: any, sessionId: string) {
  if (user?.role !== 'TEACHER') return;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { class: { select: { teacherId: true } } }
  });

  if (!session || session.class.teacherId !== user.id) {
    const err: any = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
}

async function assertTeacherOwnsAttendance(user: any, attendanceId: string) {
  if (user?.role !== 'TEACHER') return;

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { session: { select: { class: { select: { teacherId: true } } } } }
  });

  if (!attendance || attendance.session.class.teacherId !== user.id) {
    const err: any = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
}

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { sessionId, studentId, status = 'PRESENT' } = req.body;
    const user = (req as any).user;

    if (!sessionId || !studentId) {
      return res.status(400).json({ error: "sessionId and studentId are required" });
    }

    // Validate: TEACHER/ADMIN can check in anyone, but we validate in this context
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Only teachers and admins can perform manual check-in" });
    }

    await assertTeacherOwnsSession(user, sessionId);

    const attendance = await attendanceService.checkIn(sessionId, studentId, status as AttendanceStatus);
    
    // Emit real-time attendance event
    const io = (global as any).io;
    if (io) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { class: { select: { id: true, name: true } } }
      });
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, fullName: true }
      });
      
      if (session && student) {
        const payload = {
          sessionId,
          classId: session.classId,
          studentId,
          studentName: student.fullName,
          status: status,
          timestamp: new Date().toISOString()
        };

        io.to(`session_${sessionId}`).emit('attendance:checkin', payload);
        io.to('role_admin').emit('attendance:checkin', payload);
        io.to(`session_${sessionId}`).emit('attendance:new', {
          id: attendance.id,
          sessionId,
          studentId,
          student: { fullName: student.fullName, email: null },
          status,
          checkedInAt: attendance.checkedInAt,
        });
      }
    }
    
    return res.status(201).json({ message: "Check-in successful", attendance });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// QR-based checkin endpoint (standardized to use 'token' parameter)
export const qrCheckIn = async (req: Request, res: Response) => {
  try {
    // Accept only server-signed JWT QR token.
    const tokenData = req.query.token || req.body.token;
    
    if (!tokenData) {
      return res.status(400).json({ error: "Missing token parameter" });
    }

    // Verify signed JWT token issued by QRUtils.generateQRToken.
    let payload;
    try {
      payload = QRUtils.verifyQRToken(tokenData as string);
    } catch (error) {
      return res.status(400).json({ error: "Invalid or expired QR token" });
    }

    const { sessionId } = payload as { sessionId?: string };
    if (!sessionId) {
      return res.status(400).json({ error: "Invalid QR token payload" });
    }

    // Get authenticated user (student)
    const user = (req as any).user;
    if (!user || user.role !== 'STUDENT') {
      return res.status(403).json({ error: "Only students can check in" });
    }

    // Validate session exists and is active/upcoming
    const session = await attendanceService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.status !== 'ACTIVE' && session.status !== 'UPCOMING') {
      return res.status(400).json({ error: "Session is not active or upcoming" });
    }

    // Check if student is enrolled in the class
    const enrollment = await attendanceService.getEnrollmentByStudentAndClass(user.id, session.classId);
    if (!enrollment) {
      return res.status(403).json({ error: "You are not enrolled in this class" });
    }

    // Create attendance record
    const attendance = await attendanceService.checkIn(sessionId, user.id, 'PRESENT');
    
    // Emit real-time attendance event via WebSocket
    const io = (global as any).io;
    if (io) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { class: { select: { id: true, name: true } } }
      });
      
      if (session) {
        const payload = {
          sessionId,
          classId: session.classId,
          studentId: user.id,
          studentName: user.fullName || 'Unknown',
          status: 'PRESENT',
          timestamp: new Date().toISOString()
        };
        io.to(`session_${sessionId}`).emit('attendance:checkin', payload);
        io.to('role_admin').emit('attendance:checkin', payload);
        io.to(`session_${sessionId}`).emit('attendance:new', {
          id: attendance.id,
          sessionId,
          studentId: user.id,
          student: { fullName: user.fullName || 'Unknown', email: user.email || null },
          status: 'PRESENT',
          checkedInAt: attendance.checkedInAt,
        });
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: "Checked in successfully", 
      data: { sessionId, studentId: user.id }
    });

  } catch (err: any) {
    console.error('QR CheckIn Error:', err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

export const getAttendanceBySession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    const user = (req as any).user;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    if (user?.role === 'STUDENT') {
      const session = await prisma.session.findUnique({ where: { id: sessionId as string }, select: { classId: true } });
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const enrollment = await prisma.enrollment.findFirst({
        where: { classId: session.classId, studentId: user.id },
        select: { id: true },
      });
      if (!enrollment) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const attendances = await prisma.attendance.findMany({
        where: { sessionId: sessionId as string, studentId: user.id },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          session: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
      });
      return res.json({ attendances });
    }

    await assertTeacherOwnsSession(user, sessionId as string);

    const attendances = await attendanceService.getAttendanceBySession(sessionId as string);
    return res.json({ attendances });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getAttendanceByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;

    if (!classId) {
      return res.status(400).json({ error: "classId is required" });
    }

    const user = (req as any).user;
    if (user?.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findFirst({
        where: { classId: classId as string, studentId: user.id },
        select: { id: true },
      });

      if (!enrollment) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const attendances = await prisma.attendance.findMany({
        where: {
          studentId: user.id,
          session: { classId: classId as string },
        },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          session: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
      });
      return res.json({ attendances });
    }

    if (user?.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({
        where: { id: classId as string },
        select: { teacherId: true }
      });

      if (!classData || classData.teacherId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const attendances = await attendanceService.getAttendanceByClass(classId as string);
    return res.json({ attendances });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getAttendanceByStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    const user = (req as any).user;
    if (user?.role === 'STUDENT' && studentId !== user.id) {
      return res.status(403).json({ error: 'Students can only view their own attendance' });
    }

    if (user?.role === 'TEACHER') {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: studentId as string, class: { teacherId: user.id } },
        select: { classId: true },
      });

      if (enrollments.length === 0) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const classIds = enrollments.map((e) => e.classId);
      const attendances = await prisma.attendance.findMany({
        where: {
          studentId: studentId as string,
          session: { classId: { in: classIds } },
        },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          session: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
      });
      return res.json({ attendances });
    }

    const attendances = await attendanceService.getAttendanceByStudent(studentId as string);
    return res.json({ attendances });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// GET /api/attendance/admin/all — admin only, returns all attendance records
export const getAllAttendanceForAdmin = async (req: Request, res: Response) => {
  try {
    const { sessionId, classId, studentId, page, limit } = req.query;
    const take = limit ? parseInt(limit as string, 10) : 100;
    const skip = page ? (parseInt(page as string, 10) - 1) * take : 0;

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (classId) where.session = { classId };
    if (studentId) where.studentId = studentId;

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        session: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    return res.json({ attendances });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    // Support both route formats: /attendance/:id and /attendance with body params
    const attendanceId = req.params.id;
    const user = (req as any).user;
    
    if (attendanceId) {
      // Format: PATCH /attendance/:id with { status }
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }

      await assertTeacherOwnsAttendance(user, attendanceId);
      
      const attendance = await attendanceService.updateAttendanceById(attendanceId, status as AttendanceStatus);
      const io = (global as any).io;
      if (io) {
        io.to(`session_${attendance.session.id}`).emit('attendance:updated', {
          id: attendance.id,
          sessionId: attendance.session.id,
          studentId: attendance.studentId,
          student: { fullName: attendance.student.fullName, email: attendance.student.email },
          status: attendance.status,
          checkedInAt: attendance.checkedInAt,
        });
      }
      return res.json({ message: "Attendance updated successfully", attendance });
    } else {
      // Format: PATCH /attendance with { sessionId, studentId, status }
      const { sessionId, studentId, status } = req.body;

      if (!sessionId || !studentId || !status) {
        return res.status(400).json({ error: "sessionId, studentId, and status are required" });
      }

      await assertTeacherOwnsSession(user, sessionId);

      const attendance = await attendanceService.updateAttendance(sessionId, studentId, status as AttendanceStatus);
      const io = (global as any).io;
      if (io) {
        io.to(`session_${attendance.session.id}`).emit('attendance:updated', {
          id: attendance.id,
          sessionId: attendance.session.id,
          studentId: attendance.studentId,
          student: { fullName: attendance.student.fullName, email: attendance.student.email },
          status: attendance.status,
          checkedInAt: attendance.checkedInAt,
        });
      }
      return res.json({ message: "Attendance updated successfully", attendance });
    }
  } catch (err: any) {
    const status = err?.status || 400;
    return res.status(status).json({ error: err.message });
  }
};