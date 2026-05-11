import { prisma } from "../config/prisma";

export class ClassService {
  async createClass(data: any) {
    console.log('ClassService: Creating class with data:', data);
    
    const allowed = ["name", "description", "capacity", "duration", "teacherId", "type", "level"];

    const filtered: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }

    console.log('ClassService: Filtered data:', filtered);

    if (!filtered.name || typeof filtered.name !== 'string' || !filtered.name.trim()) {
      throw new Error("Class name is required.");
    }
    if (!filtered.duration) throw new Error("Class duration is required.");

    filtered.name = filtered.name.trim();

    const duration = Number(filtered.duration);
    if (!Number.isInteger(duration) || duration <= 0 || duration > 600) {
      throw new Error('Class duration must be an integer between 1 and 600 minutes');
    }
    filtered.duration = duration;

    if (filtered.capacity !== undefined) {
      const capacity = Number(filtered.capacity);
      if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 500) {
        throw new Error('Capacity must be an integer between 1 and 500');
      }
      filtered.capacity = capacity;
    }

    // Validate teacherId if provided
    if (filtered.teacherId) {
      const teacher = await prisma.user.findUnique({
        where: { 
          id: filtered.teacherId,
          role: 'TEACHER' 
        }
      });
      if (!teacher) {
        throw new Error("Invalid teacher ID or user is not a teacher");
      }
    } else {
      // If no teacherId provided, set to null
      filtered.teacherId = null;
    }

    try {
      const result = await prisma.class.create({
        data: {
          ...filtered,
          capacity: filtered.capacity || 20,
          status: 'PENDING', // Default to pending approval
        },
        include: {
          teacher: { select: { id: true, fullName: true, email: true } }
        }
      });
      
      console.log('ClassService: Created class with PENDING status:', result);
      return result;
    } catch (prismaError: any) {
      console.error('ClassService: Prisma error:', prismaError);
      throw new Error(`Database error: ${prismaError.message}`);
    }
  }

  async getAllClasses() {
    return prisma.class.findMany({
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Flexible search with optional filters: status, type, level, startDate, endDate, approvedOnly
  async searchClasses(filters: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    type?: 'YOGA' | 'CARDIO' | 'STRENGTH' | 'DANCE' | 'PILATES' | 'OTHER';
    level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
    teacherId?: string;
    startDate?: Date;
    endDate?: Date;
    approvedOnly?: boolean;
  }) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.approvedOnly) {
      where.status = 'APPROVED';
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.level) {
      where.level = filters.level;
    }

    if (filters.teacherId) {
      where.teacherId = filters.teacherId;
    }

    if (filters.startDate || filters.endDate) {
      const timeFilter: any = {};
      if (filters.startDate) timeFilter.gte = filters.startDate;
      if (filters.endDate) timeFilter.lte = filters.endDate;
      where.sessions = {
        some: {
          startTime: timeFilter,
        },
      };
    }

    return prisma.class.findMany({
      where,
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get classes by status (for admin)
  async getClassesByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return prisma.class.findMany({
      where: { status },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get only approved classes (for public viewing)
  async getApprovedClasses() {
    return prisma.class.findMany({
      where: { status: 'APPROVED' },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Admin approve class
  async approveClass(id: string) {
    const existingClass = await prisma.class.findUnique({ where: { id } });
    if (!existingClass) {
      throw new Error("Class not found");
    }

    if (existingClass.status !== 'PENDING') {
      throw new Error("Only pending classes can be approved");
    }

    return prisma.class.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } }
      }
    });
  }

  // Admin reject class
  async rejectClass(id: string, rejectionReason?: string) {
    const existingClass = await prisma.class.findUnique({ where: { id } });
    if (!existingClass) {
      throw new Error("Class not found");
    }

    if (existingClass.status !== 'PENDING') {
      throw new Error("Only pending classes can be rejected");
    }

    return prisma.class.update({
      where: { id },
      data: { 
        status: 'REJECTED',
        rejectionReason: rejectionReason || 'No reason provided'
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } }
      }
    });
  }

  async getClassById(id: string) {
    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        sessions: true,
        enrollments: {
          include: {
            student: { select: { id: true, fullName: true, email: true } }
          }
        },
        _count: { select: { enrollments: true, sessions: true } }
      }
    });

    if (!classData) {
      throw new Error("Class not found");
    }

    return classData;
  }

  async updateClass(id: string, data: any) {
    const allowed = ["name", "description", "capacity", "duration", "type", "level", "teacherId", "status", "rejectionReason"];

    const filtered: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }

    const existingClass = await prisma.class.findUnique({ where: { id } });
    if (!existingClass) {
      throw new Error("Class not found");
    }

    if (filtered.name !== undefined) {
      if (typeof filtered.name !== 'string' || !filtered.name.trim()) {
        throw new Error('Class name must be a non-empty string');
      }
      filtered.name = filtered.name.trim();
    }

    if (filtered.duration !== undefined) {
      const duration = Number(filtered.duration);
      if (!Number.isInteger(duration) || duration <= 0 || duration > 600) {
        throw new Error('Class duration must be an integer between 1 and 600 minutes');
      }
      filtered.duration = duration;
    }

    if (filtered.capacity !== undefined) {
      const capacity = Number(filtered.capacity);
      if (!Number.isInteger(capacity) || capacity <= 0 || capacity > 500) {
        throw new Error('Capacity must be an integer between 1 and 500');
      }
      filtered.capacity = capacity;
    }

    if (filtered.teacherId !== undefined) {
      if (filtered.teacherId === null || filtered.teacherId === '') {
        filtered.teacherId = null;
      } else {
        const teacher = await prisma.user.findFirst({
          where: {
            id: filtered.teacherId,
            role: 'TEACHER',
          },
          select: { id: true },
        });
        if (!teacher) {
          throw new Error('Invalid teacherId');
        }
      }
    }

    return prisma.class.update({
      where: { id },
      data: filtered,
      include: {
        teacher: { select: { id: true, fullName: true, email: true } }
      }
    });
  }

  async deleteClass(id: string) {
    const existingClass = await prisma.class.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true, sessions: true } } }
    });

    if (!existingClass) {
      throw new Error("Class not found");
    }

    if (existingClass._count.enrollments > 0 || existingClass._count.sessions > 0) {
      throw new Error("Cannot delete class with enrollments or sessions");
    }

    return prisma.class.delete({ where: { id } });
  }
}
