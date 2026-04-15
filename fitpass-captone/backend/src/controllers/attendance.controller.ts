// POST /api/attendance/bulk
export const getAttendanceBulk = async (req: Request, res: Response) => {
  try {
    const { sessionIds } = req.body;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ error: "sessionIds must be a non-empty array" });
    }

    // Lấy tất cả attendance theo sessionIds
    const attendances = await prisma.attendance.findMany({
      where: {
        sessionId: {
          in: sessionIds
        }
      },
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
import { nonceStore } from "../utils/nonce-store";
import { prisma } from "../config/prisma";

const attendanceService = new AttendanceService();

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
        io.emit('attendance:checkin', {
          sessionId,
          classId: session.classId,
          studentId,
          studentName: student.fullName,
          status: status,
          timestamp: new Date().toISOString()
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
    // Get token from query (for GET) or body (for POST)
    // Support both 'token' and legacy 'payload' for backwards compatibility
    const tokenData = req.query.token || req.query.payload || req.body.token || req.body.payload;
    
    if (!tokenData) {
      return res.status(400).json({ error: "Missing token parameter" });
    }

    // Decode base64 token
    let payload;
    try {
      const decodedPayload = Buffer.from(tokenData as string, 'base64').toString('utf8');
      payload = JSON.parse(decodedPayload);
    } catch (error) {
      return res.status(400).json({ error: "Invalid QR token format" });
    }

    // Validate token structure
    const { sessionId, nonce, expiresAt } = payload;
    if (!sessionId || !nonce || !expiresAt) {
      return res.status(400).json({ error: "Invalid QR token structure" });
    }

    // Check if QR is expired
    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: "QR code expired" });
    }

    // Check if nonce already used
    if (nonceStore.isUsed(nonce)) {
      return res.status(400).json({ error: "QR already used" });
    }

    // Store nonce to prevent reuse
    nonceStore.store(nonce);

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
        io.emit('attendance:checkin', {
          sessionId,
          classId: session.classId,
          studentId: user.id,
          studentName: user.fullName || 'Unknown',
          status: 'PRESENT',
          timestamp: new Date().toISOString()
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

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

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

    const attendances = await attendanceService.getAttendanceByStudent(studentId as string);
    return res.json({ attendances });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
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
      
      const attendance = await attendanceService.updateAttendanceById(attendanceId, status as AttendanceStatus);
      return res.json({ message: "Attendance updated successfully", attendance });
    } else {
      // Format: PATCH /attendance with { sessionId, studentId, status }
      const { sessionId, studentId, status } = req.body;

      if (!sessionId || !studentId || !status) {
        return res.status(400).json({ error: "sessionId, studentId, and status are required" });
      }

      const attendance = await attendanceService.updateAttendance(sessionId, studentId, status as AttendanceStatus);
      return res.json({ message: "Attendance updated successfully", attendance });
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};