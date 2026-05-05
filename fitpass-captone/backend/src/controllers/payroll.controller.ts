import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// GET /api/payroll - Get all salary records
export const getAllPayrolls = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, month, year } = req.query;
    
    const where: any = {};
    
    if (status && typeof status === 'string') {
      where.status = status;
    }
    
    if (month && year && typeof month === 'string' && typeof year === 'string') {
      where.month = parseInt(month);
      where.year = parseInt(year);
    }

    const payrolls = await prisma.salaryRecord.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        paidByAdmin: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(payrolls);
  } catch (error: any) {
    console.error('Error fetching payrolls:', error);
    res.status(500).json({ 
      message: 'Lỗi khi tải danh sách bảng lương',
      error: error.message 
    });
  }
};

// POST /api/payroll/generate - Generate monthly payroll for all teachers
export const generateMonthlyPayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      res.status(400).json({ 
        message: 'Tháng và năm là bắt buộc' 
      });
      return;
    }

    // Check if payroll already exists for this month
    const existingPayrolls = await prisma.salaryRecord.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year)
      }
    });

    let isUpdate = false;
    if (existingPayrolls.length > 0) {
      // Delete existing payroll records to regenerate with current data
      await prisma.salaryRecord.deleteMany({
        where: {
          month: parseInt(month),
          year: parseInt(year)
        }
      });
      isUpdate = true;
      console.log(`🔄 Regenerating payroll for ${month}/${year} - deleted ${existingPayrolls.length} existing records`);
    }

    // Get all teachers
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      include: {
        classesTeaching: true
      }
    });

    // Calculate salary for each teacher for the specified month
    const payrollRecords = [];
    
    for (const teacher of teachers) {
      // Get sessions taught by this teacher in the specified month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const sessions = await prisma.session.findMany({
        where: {
          class: {
            teacherId: teacher.id
          },
          status: 'DONE',
          startTime: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          class: true
        }
      });

      // Calculate total hours taught
      const totalHours = sessions.reduce((sum, session) => {
        return sum + (session.class.duration / 60); // Convert minutes to hours
      }, 0);

      // Calculate total amount
      const hourlyRate = teacher.hourlyRate || 0;
      const totalAmount = totalHours * hourlyRate;

      // Only create salary record if teacher taught some sessions
      if (totalHours > 0) {
        payrollRecords.push({
          teacherId: teacher.id,
          month: parseInt(month),
          year: parseInt(year),
          totalHours: Number(totalHours.toFixed(2)),
          hourlyRate: hourlyRate,
          totalAmount: Number(totalAmount.toFixed(2)),
          status: 'PENDING'
        });
      }
    }

    // Create all salary records
    if (payrollRecords.length > 0) {
      await prisma.salaryRecord.createMany({
        data: payrollRecords
      });
    }

    res.json({
      message: isUpdate 
        ? `Đã cập nhật bảng lương tháng ${month}/${year} thành công` 
        : `Đã tạo bảng lương tháng ${month}/${year} thành công`,
      recordsCreated: payrollRecords.length,
      isUpdate
    });
  } catch (error: any) {
    console.error('Error generating monthly payroll:', error);
    res.status(500).json({ 
      message: 'Lỗi khi tạo bảng lương',
      error: error.message 
    });
  }
};

// PATCH /api/payroll/:id/status - Update payroll status  
export const updatePayrollStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentMethod, paymentNote } = req.body;

    console.log('=== Update payroll status debug ===');
    console.log('Request params:', { id });
    console.log('Request body:', { paymentStatus, paymentMethod, paymentNote });
    console.log('User from token:', req.user);

    // Use 'status' field to match database schema
    const status = paymentStatus || req.body.status;

    if (!['PENDING', 'PAID', 'CANCELLED'].includes(status)) {
      console.log('Invalid status:', status);
      res.status(400).json({ 
        message: 'Trạng thái không hợp lệ. Phải là PENDING, PAID hoặc CANCELLED' 
      });
      return;
    }

    // Check if record exists first
    const payroll = await prisma.salaryRecord.findUnique({
      where: { id }
    });

    if (!payroll) {
      console.log('Payroll record not found:', id);
      res.status(404).json({ 
        message: 'Không tìm thấy bản ghi lương' 
      });
      return;
    }

    console.log('Found payroll record:', payroll);

    // Prepare update data using correct schema fields
    const updateData: any = {
      status, // Use 'status' field from schema
      paymentMethod: paymentMethod || 'Manual Payment',
      paymentNote: paymentNote || 'Trả lương thủ công'
    };

    // Set paidDate when marking as PAID
    if (status === 'PAID') {
      updateData.paidDate = new Date();
      
      // Add paidBy if we have admin info
      const adminId = req.user?.id;
      if (adminId) {
        updateData.paidBy = adminId;
      }
    } else {
      updateData.paidDate = null;
      updateData.paidBy = null;
    }

    console.log('Update data:', updateData);

    const updatedPayroll = await prisma.salaryRecord.update({
      where: { id },
      data: updateData,
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        paidByAdmin: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    console.log('Updated payroll successfully:', updatedPayroll);

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái thanh toán thành công`,
      data: updatedPayroll
    });
  } catch (error: any) {
    console.error('=== Error updating payroll status ===');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    });
    
    res.status(500).json({ 
      message: 'Lỗi khi cập nhật trạng thái thanh toán',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// DELETE /api/payroll/:id - Delete payroll record
export const deletePayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payroll = await prisma.salaryRecord.findUnique({
      where: { id }
    });

    if (!payroll) {
      res.status(404).json({ 
        message: 'Không tìm thấy bản ghi lương' 
      });
      return;
    }

    // Only allow deletion of PENDING payrolls
    if (payroll.status === 'PAID') {
      res.status(400).json({ 
        message: 'Không thể xóa bảng lương đã thanh toán' 
      });
      return;
    }

    await prisma.salaryRecord.delete({
      where: { id }
    });

    res.json({
      message: 'Đã xóa bản ghi lương thành công'
    });
  } catch (error: any) {
    console.error('Error deleting payroll:', error);
    res.status(500).json({ 
      message: 'Lỗi khi xóa bản ghi lương',
      error: error.message 
    });
  }
};