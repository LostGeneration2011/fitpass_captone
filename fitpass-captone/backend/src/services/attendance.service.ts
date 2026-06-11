import { prisma } from "../config/prisma";
import { AttendanceStatus, Prisma } from "@prisma/client";

export class AttendanceService {
  // POST check-in
  async checkIn(sessionId: string, studentId: string, status: AttendanceStatus = 'PRESENT') {
    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true }
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const now = new Date();
    if (session.endTime <= now) {
      if (session.status !== 'DONE') {
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'DONE' },
        });
      }
      throw new Error("Session has already ended");
    }

    // Check if student is enrolled in the class
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId: session.classId
        }
      }
    });

    if (!enrollment) {
      throw new Error("Student is not enrolled in this class");
    }

    // Enforce business rule: students must have a booking for this session.
    const booking = await prisma.booking.findUnique({
      where: {
        userId_sessionId: {
          userId: studentId,
          sessionId,
        },
      },
    });

    if (!booking) {
      throw new Error("Student has not booked this session");
    }

    // Idempotent check-in with race-safe fallback.
    try {
      return await prisma.attendance.create({
        data: { sessionId, studentId, status },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          session: { select: { id: true, startTime: true, endTime: true } }
        }
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return await prisma.attendance.update({
          where: {
            sessionId_studentId: { sessionId, studentId }
          },
          data: { status, checkedInAt: new Date() },
          include: {
            student: { select: { id: true, fullName: true, email: true } },
            session: { select: { id: true, startTime: true, endTime: true } }
          }
        });
      }
      throw error;
    }
  }

  // GET attendance by class/session
  async getAttendanceBySession(sessionId: string) {
    return await prisma.attendance.findMany({
      where: { sessionId },
      include: {
        student: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { checkedInAt: 'desc' }
    });
  }

  async getAttendanceByClass(classId: string) {
    return await prisma.attendance.findMany({
      where: {
        session: { classId }
      },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        session: { select: { id: true, startTime: true, endTime: true } }
      },
      orderBy: { checkedInAt: 'desc' }
    });
  }

  // GET history by student
  async getAttendanceByStudent(studentId: string) {
    return await prisma.attendance.findMany({
      where: { studentId },
      include: {
        session: { 
          select: { 
            id: true, 
            startTime: true, 
            endTime: true, 
            class: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { checkedInAt: 'desc' }
    });
  }

  // Update mistake (admin only)
  async updateAttendance(sessionId: string, studentId: string, status: AttendanceStatus) {
    const existing = await prisma.attendance.findUnique({
      where: {
        sessionId_studentId: { sessionId, studentId }
      }
    });

    if (!existing) {
      throw new Error("Attendance record not found");
    }

    return await prisma.attendance.update({
      where: {
        sessionId_studentId: { sessionId, studentId }
      },
      data: { status },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        session: { select: { id: true, startTime: true, endTime: true } }
      }
    });
  }

  // Update by attendance ID
  async updateAttendanceById(id: string, status: AttendanceStatus) {
    const existing = await prisma.attendance.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error("Attendance record not found");
    }

    return await prisma.attendance.update({
      where: { id },
      data: { status },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        session: { select: { id: true, startTime: true, endTime: true } }
      }
    });
  }

  // Get session by ID (for QR validation)
  async getSessionById(sessionId: string) {
    return await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: true
      }
    });
  }

  // Get enrollment by student and class (for QR validation)
  async getEnrollmentByStudentAndClass(studentId: string, classId: string) {
    return await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId
        }
      }
    });
  }

  async getBookingByUserAndSession(userId: string, sessionId: string) {
    return await prisma.booking.findUnique({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
    });
  }
}