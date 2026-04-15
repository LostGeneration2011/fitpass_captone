import { prisma } from "../config/prisma";

export class EnrollmentService {
  
  /**
   * Enroll in class with business logic validation (credit-based)
   * Đăng ký lớp học với validation business logic
   */
  async enrollInClassWithCredit(userId: string, classId: string, userPackageId: string) {
    // Check if class exists and has capacity
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: true } } }
    });

    if (!existingClass) {
      throw new Error("Class not found");
    }

    if (existingClass._count.enrollments >= existingClass.capacity) {
      throw new Error("Class is full");
    }

    // Check user package has credits
    const userPackage = await prisma.userPackage.findUnique({
      where: { id: userPackageId },
      include: { package: true }
    });

    if (!userPackage || userPackage.usedCredits >= userPackage.package.credits) {
      throw new Error('Gói tập đã hết credits');
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        classId,
        status: 'ACTIVE'
      }
    });

    if (existingEnrollment) {
      throw new Error('Already enrolled in this class');
    }

    try {
      const enrollment = await prisma.$transaction(async (tx) => {
        // Create enrollment
        const newEnrollment = await tx.enrollment.create({
          data: {
            studentId: userId,  // studentId is required, use the same userId
            userId,
            classId,
            userPackageId,
            status: 'ACTIVE'
          },
          include: {
            student: { select: { id: true, fullName: true, email: true } },
            class: { select: { id: true, name: true, description: true } },
            userPackage: {
              include: { package: true }
            }
          }
        });

        // Deduct credit immediately upon enrollment
        await tx.userPackage.update({
          where: { id: userPackageId },
          data: {
            usedCredits: {
              increment: 1
            }
          }
        });

        return newEnrollment;
      });

      return {
        success: true,
        enrollment,
        message: 'Enrolled successfully'
      };

    } catch (error) {
      console.error('Error enrolling in class:', error);
      throw new Error('Error when enrolling in class');
    }
  }
  async getAllEnrollments() {
    return await prisma.enrollment.findMany({
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true
          }
        },
        class: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                fullName: true
              }
            },
            sessions: {
              include: {
                room: true
              },
              orderBy: { startTime: 'asc' }
            },
            _count: { select: { enrollments: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get class capacity info: enrolled count, remaining slots, warning
   */
  async getClassCapacityInfo(classId: string) {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: true } } }
    });

    if (!classData) {
      throw new Error('Class not found');
    }

    const enrolledCount = classData._count.enrollments;
    const remainingSlots = classData.capacity - enrolledCount;
    const isFull = enrolledCount >= classData.capacity;
    const utilizationPercent = Math.round((enrolledCount / classData.capacity) * 100);

    return {
      classId,
      capacity: classData.capacity,
      enrolled: enrolledCount,
      remaining: remainingSlots,
      isFull,
      utilizationPercent,
      warning: utilizationPercent >= 80 ? 'Class is nearly full' : undefined
    };
  }

  // POST /api/enrollments - Student enroll in class (updated with credit logic)
  async createEnrollment(studentId: string, classId: string, userPackageId?: string) {
    // If userPackageId is provided, use credit-based enrollment
    if (userPackageId) {
      return await this.enrollInClassWithCredit(studentId, classId, userPackageId);
    }

    // Fallback to old logic for backward compatibility (free enrollment)
    // Check if class exists and has capacity
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: true } } }
    });

    if (!existingClass) {
      throw new Error("Class not found");
    }

    if (existingClass._count.enrollments >= existingClass.capacity) {
      throw new Error("Class is full");
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: { studentId, classId }
      }
    });

    if (existing) {
      throw new Error("Already enrolled in this class");
    }

    const enrollment = await prisma.enrollment.create({
      data: { 
        studentId, 
        classId,
        userPackageId: userPackageId || undefined,
        status: 'ACTIVE'
      },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        class: { select: { id: true, name: true, description: true } }
      }
    });

    return {
      success: true,
      enrollment,
      message: 'Enrolled successfully'
    };
  }

  // GET enrollments by class
  async getEnrollmentsByClass(classId: string) {
    return await prisma.enrollment.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // GET enrollments by student
  async getEnrollmentsByStudent(studentId: string) {
    return await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: { 
          select: { 
            id: true, 
            name: true, 
            description: true, 
            teacher: { select: { fullName: true } }
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // DELETE unenroll with credit refund logic
  async deleteEnrollment(studentId: string, classId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: { studentId, classId }
      },
      include: {
        userPackage: true
      }
    });

    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    try {
      await prisma.$transaction(async (tx) => {
        // If enrollment was paid with credits, refund the credit
        if (enrollment.userPackageId && enrollment.userPackage) {
          await tx.userPackage.update({
            where: { id: enrollment.userPackageId },
            data: {
              usedCredits: {
                decrement: 1
              }
            }
          });
        }

        // Delete the enrollment
        await tx.enrollment.delete({
          where: {
            studentId_classId: { studentId, classId }
          }
        });
      });

      return {
        success: true,
        message: 'Unenrolled successfully and credit refunded'
      };

    } catch (error) {
      console.error('Error during unenrollment:', error);
      throw new Error('Error when unenrolling from class');
    }
  }

  /**
   * Cancel enrollment with refund logic (business logic)
   */
  async cancelEnrollment(enrollmentId: string, reason: 'STUDENT_REQUEST' | 'CLASS_CANCELLED' | 'SYSTEM_ERROR' = 'STUDENT_REQUEST') {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: {
          include: { sessions: true }
        },
        userPackage: {
          include: { package: true }
        }
      }
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Cancel enrollment
        const cancelled = await tx.enrollment.update({
          where: { id: enrollmentId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date()
          }
        });

        // Refund credit if applicable
        if (enrollment.userPackageId && enrollment.userPackage) {
          await tx.userPackage.update({
            where: { id: enrollment.userPackageId },
            data: {
              usedCredits: {
                decrement: 1
              }
            }
          });
        }

        return cancelled;
      });

      return {
        success: true,
        enrollment: result,
        message: 'Enrollment cancelled and credit refunded'
      };

    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      throw new Error('Error when cancelling enrollment');
    }
  }

  /**
   * Update progress notes for student enrollment
   */
  async updateEnrollmentNote(enrollmentId: string, progressNotes: string, teacherId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { class: true }
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Verify teacher owns the class
    if (enrollment.class.teacherId !== teacherId) {
      throw new Error('You do not have permission to update notes for this enrollment');
    }

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressNotes: progressNotes.trim(),
        lastNoteAt: new Date(),
        notesUpdatedBy: teacherId
      },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        class: { select: { id: true, name: true } }
      }
    });

    return {
      success: true,
      enrollment: updated,
      message: 'Progress notes updated successfully'
    };
  }

  /**
   * Get enrollment with progress notes
   */
  async getEnrollmentById(enrollmentId: string) {
    return await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        class: { select: { id: true, name: true, description: true, teacher: { select: { id: true, fullName: true } } } },
        userPackage: { include: { package: true } }
      }
    });
  }
}