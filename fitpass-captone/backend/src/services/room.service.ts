import { prisma } from "../config/prisma";
import { RoomStatus } from "@prisma/client";

export class RoomService {
  // GET /api/rooms
  async getAllRooms() {
    return await prisma.room.findMany({
      include: {
        _count: { select: { sessions: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  // GET /api/rooms/:id
  async getRoomById(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        sessions: {
          include: {
            class: { select: { id: true, name: true, teacher: { select: { fullName: true } } } }
          },
          orderBy: { startTime: 'asc' }
        }
      }
    });

    if (!room) {
      throw new Error("Room not found");
    }

    return room;
  }

  // POST /api/rooms
  async createRoom(data: any) {
    const { name, description, capacity, equipment, status } = data;

    if (!name || !capacity) {
      throw new Error("Room name and capacity are required");
    }

    if (capacity < 1) {
      throw new Error("Room capacity must be at least 1");
    }

    // Check for duplicate room name
    const existingRoom = await prisma.room.findFirst({
      where: { name }
    });

    if (existingRoom) {
      throw new Error("Room with this name already exists");
    }

    return await prisma.room.create({
      data: {
        name,
        description,
        capacity: parseInt(capacity),
        equipment,
        status: status || 'AVAILABLE'
      }
    });
  }

  // PUT /api/rooms/:id
  async updateRoom(id: string, data: any) {
    const { name, description, capacity, equipment, status } = data;

    const existingRoom = await prisma.room.findUnique({
      where: { id }
    });

    if (!existingRoom) {
      throw new Error("Room not found");
    }

    // Check for duplicate name (excluding current room)
    if (name && name !== existingRoom.name) {
      const duplicateRoom = await prisma.room.findFirst({
        where: { 
          name,
          id: { not: id }
        }
      });

      if (duplicateRoom) {
        throw new Error("Room with this name already exists");
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (equipment !== undefined) updateData.equipment = equipment;
    if (status !== undefined) updateData.status = status;

    return await prisma.room.update({
      where: { id },
      data: updateData
    });
  }

  // DELETE /api/rooms/:id
  async deleteRoom(id: string) {
    const existingRoom = await prisma.room.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true } } }
    });

    if (!existingRoom) {
      throw new Error("Room not found");
    }

    if (existingRoom._count.sessions > 0) {
      throw new Error("Cannot delete room that has scheduled sessions");
    }

    return await prisma.room.delete({
      where: { id }
    });
  }

  // GET /api/rooms/schedule?date=YYYY-MM-DD
  async getRoomSchedule(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    return await prisma.room.findMany({
      include: {
        sessions: {
          where: {
            AND: [
              { startTime: { gte: startOfDay } },
              { endTime: { lte: endOfDay } }
            ]
          },
          include: {
            class: { 
              select: { 
                id: true, 
                name: true, 
                teacher: { select: { id: true, fullName: true } } 
              } 
            }
          },
          orderBy: { startTime: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  // Check room availability for scheduling with detailed response
  async checkRoomAvailability(roomId: string, startTime: Date, endTime: Date, excludeSessionId?: string) {
    const conflictingSession = await prisma.session.findFirst({
      where: {
        roomId,
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        OR: [
          // New session starts during existing session
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          // New session ends during existing session
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          // New session completely contains existing session
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      },
      include: {
        class: { select: { name: true } }
      }
    });

    if (conflictingSession) {
      throw new Error(`Room is already booked from ${conflictingSession.startTime.toLocaleString()} to ${conflictingSession.endTime.toLocaleString()} for class "${conflictingSession.class.name}"`);
    }

    return true;
  }

  /**
   * Get available time slots for a room on a specific date
   * Returns list of available 1-hour slots
   */
  async getAvailableSlots(roomId: string, date: Date, slotDurationMinutes: number = 60) {
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      throw new Error('Room not found');
    }

    // Get sessions for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await prisma.session.findMany({
      where: {
        roomId,
        AND: [
          { startTime: { gte: startOfDay } },
          { endTime: { lte: endOfDay } }
        ]
      },
      orderBy: { startTime: 'asc' }
    });

    // Business hours: 6 AM to 10 PM
    const businessHourStart = 6;
    const businessHourEnd = 22;

    const availableSlots: { start: Date; end: Date }[] = [];
    let currentTime = new Date(date);
    currentTime.setHours(businessHourStart, 0, 0, 0);

    while (currentTime.getHours() < businessHourEnd) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);

      // Check if slot conflicts with any session
      const hasConflict = sessions.some(session => 
        (session.startTime < slotEnd && session.endTime > currentTime)
      );

      if (!hasConflict) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(slotEnd)
        });
      }

      currentTime.setMinutes(currentTime.getMinutes() + slotDurationMinutes);
    }

    return availableSlots;
  }

  /**
   * Get room occupancy for a date
   */
  async getRoomOccupancy(roomId: string, date: Date) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        sessions: {
          where: {
            startTime: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lte: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
            }
          },
          include: {
            class: { select: { id: true, name: true } }
          },
          orderBy: { startTime: 'asc' }
        }
      }
    });

    if (!room) {
      throw new Error('Room not found');
    }

    return {
      roomId: room.id,
      roomName: room.name,
      date: date.toISOString().split('T')[0],
      occupancy: room.sessions,
      totalCapacity: room.capacity
    };
  }
}