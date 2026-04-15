import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { QRUtils } from '../utils/qr';
import { AttendanceService } from '../services/attendance.service';

const attendanceService = new AttendanceService();

export class QRController {
  // POST /api/sessions/:id/start - Teacher starts session and gets QR
  static async startSession(req: Request, res: Response) {
    try {
      const { id: sessionId } = req.params;
      const user = (req as any).user;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      // Check if session exists
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          class: {
            include: {
              teacher: { select: { id: true, fullName: true } }
            }
          }
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if user is teacher of this class (if role is TEACHER)
      if (user.role === 'TEACHER' && session.class.teacherId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to start this session' });
      }

      // Update session status to ACTIVE
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'ACTIVE' }
      });

      // Generate QR token
      const qrToken = QRUtils.generateQRToken(sessionId);

      console.log(`Session ${sessionId} started by ${user.fullName}`);

      return res.json({
        message: 'Session started successfully',
        sessionId: sessionId,
        qr: qrToken,
        expiresIn: '5 minutes',
        class: {
          name: session.class.name,
          teacher: session.class.teacher?.fullName
        }
      });
    } catch (error: any) {
      console.error('Error starting session:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // POST /api/attendance/qr-checkin - Student check-in via QR
  static async qrCheckIn(req: Request, res: Response) {
    try {
      const { qrToken } = req.body;
      const user = (req as any).user;

      if (!qrToken) {
        return res.status(400).json({ error: 'QR token is required' });
      }

      // Verify QR token
      let qrPayload;
      try {
        qrPayload = QRUtils.verifyQRToken(qrToken);
      } catch (error: any) {
        return res.status(400).json({ error: error.message });
      }

      const { sessionId } = qrPayload;

      // Check if session exists and is active
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          class: { select: { id: true, name: true } }
        }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Session is not active' });
      }

      // Check if student is enrolled in the class
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_classId: {
            studentId: user.id,
            classId: session.classId
          }
        }
      });

      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this class' });
      }

      // Auto check-in via attendance service
      const attendance = await attendanceService.checkIn(sessionId, user.id, 'PRESENT');

      console.log(`QR Check-in: Student ${user.fullName} checked into session ${sessionId}`);

      // Emit WebSocket event (will be handled by WebSocket module)
      const io = (global as any).io;
      if (io) {
        io.to(`session_${sessionId}`).emit('attendance:update', {
          studentId: user.id,
          studentName: user.fullName,
          sessionId: sessionId,
          status: 'PRESENT',
          checkedInAt: new Date(),
          type: 'qr_checkin'
        });
      }

      return res.json({
        message: 'Check-in successful via QR',
        sessionId: sessionId,
        studentId: user.id,
        studentName: user.fullName,
        class: session.class.name,
        checkedInAt: attendance.checkedInAt
      });
    } catch (error: any) {
      console.error('Error QR check-in:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}