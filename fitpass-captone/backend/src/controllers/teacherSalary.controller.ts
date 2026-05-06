import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';

// GET /api/teachers/salary-overview - Simple salary overview based on completed sessions
export const getTeachersSalaryOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== getTeachersSalaryOverview called ===');
    
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' }, // Use string instead of enum
      include: {
        classesTeaching: {
          include: {
            sessions: {
              where: {
                status: 'DONE' // Only completed sessions
              }
            }
          }
        }
      }
    });

    console.log('Found teachers:', teachers.length);

    // Get all paid salary records once
    const allPaidRecords = await prisma.salaryRecord.findMany({
      where: { status: 'PAID' }
    });

    // Calculate simple salary data for each teacher
    const teachersWithStats = teachers.map((teacher) => {
      console.log(`Processing teacher: ${teacher.fullName}`);
      
      // Calculate total hours from all completed sessions
      let totalHours = 0;
      let totalSessions = 0;

      teacher.classesTeaching.forEach(cls => {
        console.log(`  Class: ${cls.name}, Sessions: ${cls.sessions.length}`);
        cls.sessions.forEach(session => {
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);
          const sessionHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalHours += sessionHours;
          totalSessions++;
          console.log(`    Session: ${sessionHours}h`);
        });
      });

      // Calculate earnings
      const hourlyRate = teacher.hourlyRate || 0;
      const totalEarnings = totalHours * hourlyRate;
      const salaryOwed = teacher.salaryOwed || 0;

      // Calculate total paid amount for this teacher
      const teacherPaidRecords = allPaidRecords.filter(record => record.teacherId === teacher.id);
      const totalPaid = teacherPaidRecords.reduce((sum, record) => sum + record.totalAmount, 0);
      const unpaidAmount = Math.max(0, totalEarnings - totalPaid);

      const result = {
        id: teacher.id,
        fullName: teacher.fullName,
        email: teacher.email,
        hourlyRate,
        totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
        totalEarnings,
        totalSessions,
        salaryOwed,
        unpaidAmount, // Calculate actual unpaid amount based on paid records
        classesCount: teacher.classesTeaching.length
      };
      
      console.log(`  Result:`, result);
      return result;
    });

    console.log('Sending response:', teachersWithStats);
    res.json(teachersWithStats);
  } catch (error) {
    console.error('=== Error in getTeachersSalaryOverview ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ message: 'Error fetching teacher salary overview' });
  }
};

// GET /api/teachers/monthly-payroll - Monthly breakdown
export const getMonthlyPayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    
    // Default to current month if not specified
    const now = new Date();
    const targetMonth = month ? parseInt(month as string) : now.getMonth();
    const targetYear = year ? parseInt(year as string) : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      include: {
        classesTeaching: {
          include: {
            sessions: {
              where: {
                status: 'DONE',
                startTime: {
                  gte: startDate,
                  lte: endDate
                }
              }
            }
          }
        }
      }
    });

    const monthlyData = teachers.map((teacher) => {
      // Calculate hours for the specific month
      let monthlyHours = 0;
      let monthlySessions = 0;

      teacher.classesTeaching.forEach(cls => {
        cls.sessions.forEach(session => {
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);
          const sessionHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          monthlyHours += sessionHours;
          monthlySessions++;
        });
      });

      const hourlyRate = teacher.hourlyRate || 0;
      const monthlyEarnings = monthlyHours * hourlyRate;

      return {
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        monthlyHours: Math.round(monthlyHours * 10) / 10,
        monthlyEarnings,
        hourlyRate,
        sessionsCount: monthlySessions,
        month: targetMonth + 1, // 1-based month
        year: targetYear,
        status: 'UNPAID' as const // Default status for new clean data
      };
    });

    res.json(monthlyData);
  } catch (error) {
    console.error('Error fetching monthly payroll:', error);
    res.status(500).json({ message: 'Error fetching monthly payroll' });
  }
};

// POST /api/salary/teachers/pay - Pay teacher salary (simplified)
export const payTeacherSalary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, amount, paymentMethod, note } = req.body;

    console.log('Pay teacher salary request:', { teacherId, amount, paymentMethod, note });

    if (!teacherId || !amount) {
      res.status(400).json({ message: 'Teacher ID and amount are required' });
      return;
    }

    // Find teacher
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId }
    });

    if (!teacher || teacher.role !== 'TEACHER') {
      res.status(404).json({ message: 'Teacher not found' });
      return;
    }

    // Get admin from JWT token if available, fallback to first admin
    const adminId = (req as any).user?.id;
    const adminUser = adminId
      ? await prisma.user.findUnique({ where: { id: adminId } })
      : await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Find all PENDING salary records for this teacher and mark them PAID
    const pendingRecords = await prisma.salaryRecord.findMany({
      where: { teacherId, status: 'PENDING' }
    });

    let salaryRecord: any;

    if (pendingRecords.length > 0) {
      // Mark all pending records as PAID
      await prisma.salaryRecord.updateMany({
        where: { teacherId, status: 'PENDING' },
        data: {
          status: 'PAID',
          paidDate: new Date(),
          paidBy: adminUser?.id || null,
          paymentMethod: paymentMethod || 'Bank Transfer',
          paymentNote: note || `Thanh toán lương`
        }
      });
      // Return the most recent one for the response
      salaryRecord = pendingRecords[0]
        ? await prisma.salaryRecord.findUnique({ where: { id: pendingRecords[0].id } })
        : null;
      console.log(`✅ Marked ${pendingRecords.length} PENDING record(s) as PAID for teacher ${teacherId}`);
    } else {
      // No pending records — create a manual payment record
      salaryRecord = await prisma.salaryRecord.create({
        data: {
          teacherId,
          month: currentMonth,
          year: currentYear,
          totalHours: 0,
          hourlyRate: teacher.hourlyRate || 50000,
          totalAmount: amount,
          status: 'PAID',
          paidDate: new Date(),
          paidBy: adminUser?.id || null,
          paymentMethod: paymentMethod || 'Bank Transfer',
          paymentNote: note || `Thanh toán lương thủ công`
        }
      });
      console.log(`✅ Created manual PAID record for teacher ${teacherId} (no pending records found)`);
    }

    // Calculate total paid amount for this teacher after the payment
    const allPaidRecords = await prisma.salaryRecord.findMany({
      where: {
        teacherId,
        status: 'PAID'
      }
    });
    const totalPaid = allPaidRecords.reduce((sum, record) => sum + record.totalAmount, 0);

    // Calculate total earnings from sessions to determine what should be owed
    const teacherWithSessions = await prisma.user.findUnique({
      where: { id: teacherId },
      include: {
        classesTeaching: {
          include: {
            sessions: {
              where: { status: 'DONE' }
            }
          }
        }
      }
    });

    let totalEarnings = 0;
    if (teacherWithSessions) {
      teacherWithSessions.classesTeaching.forEach(cls => {
        cls.sessions.forEach(session => {
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);
          const sessionHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalEarnings += sessionHours * (teacher.hourlyRate || 50000);
        });
      });
    }

    // Update teacher's salary owed to reflect accurate amount
    const newSalaryOwed = Math.max(0, totalEarnings - totalPaid);
    await prisma.user.update({
      where: { id: teacherId },
      data: {
        salaryOwed: newSalaryOwed
      }
    });

    console.log('Salary payment successful:', salaryRecord);

    res.json({ 
      message: 'Thanh toán lương thành công',
      salaryRecord 
    });
  } catch (error: any) {
    console.error('Error paying teacher salary:', error);
    res.status(500).json({ 
      message: 'Lỗi thanh toán lương',
      error: error.message 
    });
  }
};

// PATCH /api/teachers/:id/hourly-rate - Update teacher hourly rate
export const updateTeacherHourlyRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { hourlyRate } = req.body;

    if (!hourlyRate || hourlyRate < 0) {
      res.status(400).json({ message: 'Invalid hourly rate' });
      return;
    }

    console.log(`🔄 Cập nhật lương giáo viên ${id}: ${hourlyRate.toLocaleString()} VND/giờ`);

    // BƯỚC 1: Cập nhật hourly rate
    const teacher = await prisma.user.update({
      where: { 
        id,
        role: 'TEACHER' 
      },
      data: { hourlyRate }
    });

    // BƯỚC 2: Tính lại tổng lương phải trả dựa trên mức lương mới
    const teacherWithSessions = await prisma.user.findUnique({
      where: { id },
      include: {
        classesTeaching: {
          include: {
            sessions: {
              where: { status: 'DONE' } // Chỉ tính sessions đã hoàn thành
            }
          }
        }
      }
    });

    if (teacherWithSessions) {
      // Tính tổng giờ từ tất cả sessions đã hoàn thành
      let totalHours = 0;
      teacherWithSessions.classesTeaching.forEach(cls => {
        cls.sessions.forEach(session => {
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);
          const sessionHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalHours += sessionHours;
        });
      });

      console.log(`📊 Tổng giờ dạy: ${totalHours} giờ`);

      // Tính tổng lương phải trả với mức lương mới
      const newTotalEarnings = totalHours * hourlyRate;
      console.log(`💰 Lương phải trả mới: ${totalHours} × ${hourlyRate.toLocaleString()} = ${newTotalEarnings.toLocaleString()} VND`);

      // Tính tổng đã thanh toán
      const paidRecords = await prisma.salaryRecord.findMany({
        where: {
          teacherId: id,
          status: 'PAID'
        }
      });
      const totalPaid = paidRecords.reduce((sum, record) => sum + record.totalAmount, 0);

      // Tính lương chưa trả = tổng phải trả - đã trả
      const newSalaryOwed = Math.max(0, newTotalEarnings - totalPaid);
      console.log(`🔢 Lương chưa trả: ${newTotalEarnings.toLocaleString()} - ${totalPaid.toLocaleString()} = ${newSalaryOwed.toLocaleString()} VND`);

      // BƯỚC 3: Cập nhật salaryOwed với giá trị mới
      await prisma.user.update({
        where: { id },
        data: { salaryOwed: newSalaryOwed }
      });

      res.json({ 
        message: 'Cập nhật lương thành công - Đã tính lại số tiền phải trả',
        teacher: {
          id: teacher.id,
          fullName: teacher.fullName,
          hourlyRate: teacher.hourlyRate,
          totalHours: Math.round(totalHours * 10) / 10,
          newTotalEarnings,
          totalPaid,
          newSalaryOwed
        }
      });
    } else {
      res.json({ 
        message: 'Hourly rate updated successfully',
        teacher: {
          id: teacher.id,
          fullName: teacher.fullName,
          hourlyRate: teacher.hourlyRate
        }
      });
    }
  } catch (error) {
    console.error('Error updating hourly rate:', error);
    res.status(500).json({ message: 'Error updating hourly rate' });
  }
};

// PATCH /api/teachers/:id/salary-owed - Update teacher salary owed
export const updateTeacherSalaryOwed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { salaryOwed } = req.body;

    if (salaryOwed < 0) {
      res.status(400).json({ message: 'Salary owed cannot be negative' });
      return;
    }

    const teacher = await prisma.user.update({
      where: { 
        id,
        role: 'TEACHER' 
      },
      data: { salaryOwed: salaryOwed || 0 }
    });

    res.json({ 
      message: 'Salary owed updated successfully',
      teacher: {
        id: teacher.id,
        fullName: teacher.fullName,
        salaryOwed: teacher.salaryOwed
      }
    });
  } catch (error) {
    console.error('Error updating salary owed:', error);
    res.status(500).json({ message: 'Error updating salary owed' });
  }
};

export const getTeacherPaymentHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId } = req.params;
    const records = await prisma.salaryRecord.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: records });
  } catch (error) {
    console.error('Error fetching teacher payment history:', error);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
};

export default {
  getTeachersSalaryOverview,
  getMonthlyPayroll,
  payTeacherSalary,
  updateTeacherHourlyRate,
  updateTeacherSalaryOwed,
  getTeacherPaymentHistory,
};