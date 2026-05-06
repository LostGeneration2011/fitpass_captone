import { prisma } from "../config/prisma";
import { SessionStatus } from "@prisma/client";
import { RoomService } from "./room.service";

const roomService = new RoomService();

export class SessionService {
  // POST /api/sessions
  async createSession(classId: string, startTime: Date, endTime: Date, roomId?: string) {
    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!existingClass) {
      throw new Error("Class not found");
    }

    // Validate time
    if (startTime >= endTime) {
      throw new Error("Start time must be before end time");
    }

    if (startTime < new Date()) {
      throw new Error("Start time must be in the future");
    }

    // Check room availability if roomId is provided
    if (roomId) {
      await roomService.checkRoomAvailability(roomId, startTime, endTime);
    }

    return await prisma.session.create({
      data: {
        classId,
        startTime,
        endTime,
        roomId,
        status: 'UPCOMING'
      },
      include: {
        class: { select: { id: true, name: true, description: true } },
        room: { select: { id: true, name: true, capacity: true } }
      }
    });
  }

  // GET /api/sessions?classId=xxx
  async getSessionsByClass(classId: string) {
    return await prisma.session.findMany({
      where: { classId },
      include: {
        class: { 
          select: { 
            id: true, 
            name: true, 
            description: true,
            teacher: { select: { id: true, fullName: true } }
          } 
        },
        room: { select: { id: true, name: true, capacity: true } },
        _count: { select: { attendances: true } }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  // GET /api/sessions
  async getAllSessions() {
    return await prisma.session.findMany({
      include: {
        class: { 
          select: { 
            id: true, 
            name: true, 
            description: true,
            teacher: { select: { id: true, fullName: true } }
          } 
        },
        room: { select: { id: true, name: true, capacity: true } },
        _count: { select: { attendances: true } }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  async getSessionsByTeacher(teacherId: string) {
    return await prisma.session.findMany({
      where: {
        class: {
          teacherId,
        },
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true,
            teacher: { select: { id: true, fullName: true } }
          }
        },
        room: { select: { id: true, name: true, capacity: true } },
        _count: { select: { attendances: true } }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  // GET /api/sessions/:id
  async getSessionById(id: string) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, description: true } },
        room: { select: { id: true, name: true, capacity: true, equipment: true } },
        attendances: {
          include: {
            student: { select: { id: true, fullName: true, email: true } }
          }
        }
      }
    });

    if (!session) {
      throw new Error("Session not found");
    }

    return session;
  }

  // PATCH session status
  async updateSessionStatus(id: string, status: SessionStatus) {
    const existingSession = await prisma.session.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            teacher: true
          }
        }
      }
    });

    if (!existingSession) {
      throw new Error("Session not found");
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: { status },
      include: {
        class: { 
          select: { 
            id: true, 
            name: true, 
            description: true,
            duration: true,
            teacher: {
              select: {
                id: true,
                fullName: true,
                hourlyRate: true
              }
            }
          } 
        }
      }
    });

    // SessionPayment logic removed - now using simple payroll system

    return updatedSession;
  }

  // PATCH session - full update
  async updateSession(id: string, data: {
    classId?: string;
    teacherId?: string; 
    roomId?: string;
    startTime?: string;
    endTime?: string;
    status?: SessionStatus;
  }) {
    console.log('🔄 [SESSION_SERVICE] Updating session:', id, 'with data:', data);

    const existingSession = await prisma.session.findUnique({
      where: { id }
    });

    if (!existingSession) {
      throw new Error("Session not found");
    }

    // Validate class exists if classId is provided
    if (data.classId) {
      const classExists = await prisma.class.findUnique({
        where: { id: data.classId }
      });
      if (!classExists) {
        throw new Error("Class not found");
      }
    }

    // Validate teacher exists if teacherId is provided  
    if (data.teacherId) {
      const teacherExists = await prisma.user.findUnique({
        where: { id: data.teacherId, role: 'TEACHER' }
      });
      if (!teacherExists) {
        throw new Error("Teacher not found");
      }
    }

    // Validate room exists if roomId is provided
    if (data.roomId) {
      const roomExists = await prisma.room.findUnique({
        where: { id: data.roomId }
      });
      if (!roomExists) {
        throw new Error("Room not found");
      }
    }

    // Validate time constraints
    if (data.startTime && data.endTime) {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);
      if (endTime <= startTime) {
        throw new Error("End time must be after start time");
      }
    }

    const updateData: any = {};
    if (data.classId !== undefined) updateData.classId = data.classId;
    if (data.roomId !== undefined) updateData.roomId = data.roomId;
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.status !== undefined) updateData.status = data.status;

    console.log('🔄 [SESSION_SERVICE] Final update data:', updateData);

    const updatedSession = await prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        class: { 
          select: { 
            id: true, 
            name: true, 
            description: true,
            duration: true,
            teacher: {
              select: {
                id: true,
                fullName: true
              }
            }
          } 
        },
        room: {
          select: {
            id: true,
            name: true,
            capacity: true
          }
        }
      }
    });

    console.log('✅ [SESSION_SERVICE] Session updated successfully:', updatedSession.id);
    return updatedSession;
  }

  // DELETE session
  async deleteSession(id: string) {
    const existingSession = await prisma.session.findUnique({
      where: { id },
      include: { _count: { select: { attendances: true } } }
    });

    if (!existingSession) {
      throw new Error("Session not found");
    }

    if (existingSession._count.attendances > 0) {
      throw new Error("Cannot delete session with attendance records");
    }

    return await prisma.session.delete({
      where: { id }
    });
  }
}