import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

/**
 * GET /api/earnings/me - Teacher views their personal earnings summary
 * Shows: total hours taught, hourly rate, expected salary for current month
 */
export const getTeacherEarnings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user || user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Only teachers can access earnings' });
    }

    // Get current teacher with hourly rate
    const teacher = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        hourlyRate: true,
        classesTeaching: {
          select: {
            id: true,
            name: true,
            sessions: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
                status: true,
                _count: {
                  select: { attendances: true }
                }
              }
            }
          }
        },
        salaryRecords: {
          select: {
            id: true,
            month: true,
            year: true,
            totalHours: true,
            totalAmount: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 12 // Last 12 months
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Calculate total hours taught (only from DONE sessions)
    let totalHours = 0;
    let currentMonthHours = 0;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    teacher.classesTeaching.forEach((cls) => {
      cls.sessions.forEach((session) => {
        if (session.status === 'DONE') {
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);
          const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalHours += hours;

          // Check if session is in current month
          if (startTime.getMonth() + 1 === currentMonth && startTime.getFullYear() === currentYear) {
            currentMonthHours += hours;
          }
        }
      });
    });

    // Calculate expected salary
    const hourlyRate = teacher.hourlyRate || 0;
    const expectedSalaryThisMonth = currentMonthHours * hourlyRate;

    // Get last paid salary
    const lastPaidSalary = teacher.salaryRecords.find(
      (record) => record.status === 'PAID'
    );

    return res.json({
      teacher: {
        id: teacher.id,
        fullName: teacher.fullName,
        email: teacher.email,
        hourlyRate
      },
      earnings: {
        totalHoursTaught: Math.round(totalHours * 100) / 100,
        currentMonthHours: Math.round(currentMonthHours * 100) / 100,
        expectedSalaryThisMonth: Math.round(expectedSalaryThisMonth * 100) / 100,
        lastPaidAmount: lastPaidSalary?.totalAmount || 0,
        lastPaidDate: lastPaidSalary?.createdAt || null
      },
      salaryHistory: teacher.salaryRecords.map((record) => ({
        id: record.id,
        period: `${record.month}/${record.year}`,
        totalHours: record.totalHours,
        amount: record.totalAmount,
        status: record.status,
        date: record.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching teacher earnings:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/earnings/:teacherId - Admin/Teacher views specific teacher earnings
 */
export const getTeacherEarningsById = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const user = (req as any).user;

    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only teachers and admins can access earnings' });
    }

    // Only allow teacher to view own or admin to view any
    if (user.role === 'TEACHER' && user.id !== teacherId) {
      return res.status(403).json({ error: 'You can only view your own earnings' });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        fullName: true,
        email: true,
        hourlyRate: true,
        classesTeaching: {
          select: {
            id: true,
            name: true,
            sessions: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
                status: true,
                _count: {
                  select: { attendances: true }
                }
              }
            }
          }
        },
        salaryRecords: {
          select: {
            id: true,
            month: true,
            year: true,
            totalHours: true,
            totalAmount: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 12
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Calculate total hours
    let totalHours = 0;
    let currentMonthHours = 0;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    teacher.classesTeaching.forEach((cls) => {
      cls.sessions.forEach((session) => {
        if (session.status === 'DONE') {
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);
          const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalHours += hours;

          if (startTime.getMonth() + 1 === currentMonth && startTime.getFullYear() === currentYear) {
            currentMonthHours += hours;
          }
        }
      });
    });

    const hourlyRate = teacher.hourlyRate || 0;
    const expectedSalaryThisMonth = currentMonthHours * hourlyRate;
    const lastPaidSalary = teacher.salaryRecords.find((record) => record.status === 'PAID');

    return res.json({
      teacher: {
        id: teacher.id,
        fullName: teacher.fullName,
        email: teacher.email,
        hourlyRate
      },
      earnings: {
        totalHoursTaught: Math.round(totalHours * 100) / 100,
        currentMonthHours: Math.round(currentMonthHours * 100) / 100,
        expectedSalaryThisMonth: Math.round(expectedSalaryThisMonth * 100) / 100,
        lastPaidAmount: lastPaidSalary?.totalAmount || 0,
        lastPaidDate: lastPaidSalary?.createdAt || null
      },
      salaryHistory: teacher.salaryRecords.map((record) => ({
        id: record.id,
        period: `${record.month}/${record.year}`,
        totalHours: record.totalHours,
        amount: record.totalAmount,
        status: record.status,
        date: record.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching teacher earnings:', error);
    res.status(500).json({ error: error.message });
  }
};
