import { prisma } from "../config/prisma";
import { AttendanceStatus } from "@prisma/client";

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

    // Check if already checked in
    const existing = await prisma.attendance.findUnique({
      where: {
        sessionId_studentId: { sessionId, studentId }
      }
    });

    if (existing) {
      // Update existing attendance
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

    // Create new attendance record
    return await prisma.attendance.create({
      data: { sessionId, studentId, status },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        session: { select: { id: true, startTime: true, endTime: true } }
      }
    });
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
}