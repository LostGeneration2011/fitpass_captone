import { prisma } from '../config/prisma';

export class RefundService {
  /**
   * Tính toán refund khi học viên rời khỏi lớp học
   * Calculate refund when student leaves a class
   */
  static async calculateRefund(enrollmentId: string, reason: 'STUDENT_QUIT' | 'CLASS_CANCELLED' | 'SYSTEM_ERROR') {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: true,
        class: {
          include: {
            sessions: true
          }
        },
        userPackage: {
          include: {
            package: true
          }
        }
      }
    });

    if (!enrollment) {
      throw new Error('Không tìm thấy đăng ký');
    }

    // Tính số buổi đã học và còn lại
    const totalSessions = enrollment.class.sessions.length;
    const attendedSessions = await prisma.attendance.count({
      where: {
        enrollment: { id: enrollmentId },
        status: 'PRESENT'
      }
    });
    const remainingSessions = totalSessions - attendedSessions;

    // Tính toán refund dựa trên loại package và lý do
    let refundAmount = 0;
    let creditsToRefund = 0;
    
    if (!enrollment.userPackage) {
      throw new Error('Không tìm thấy package của học viên');
    }
    
    const packageData = enrollment.userPackage.package;
    
    if (reason === 'CLASS_CANCELLED') {
      // Hoàn trả 100% nếu lớp bị hủy
      refundAmount = (remainingSessions / totalSessions) * packageData.price;
      creditsToRefund = remainingSessions;
    } else if (reason === 'STUDENT_QUIT') {
      // Áp dụng tỷ lệ refund từ package
      const baseRefund = (remainingSessions / totalSessions) * packageData.price;
      refundAmount = baseRefund * packageData.refundRate;
      
      // Trừ penalty nếu có
      const penalty = baseRefund * packageData.penaltyRate;
      refundAmount = Math.max(0, refundAmount - penalty);
      
      creditsToRefund = Math.floor(remainingSessions * packageData.refundRate);
    }

    return {
      enrollment: {
        id: enrollment.id,
        studentName: enrollment.user?.fullName || 'N/A',
        className: enrollment.class.name
      },
      calculation: {
        totalSessions,
        attendedSessions,
        remainingSessions,
        refundRate: packageData.refundRate,
        penaltyRate: packageData.penaltyRate
      },
      refund: {
        amount: Math.round(refundAmount),
        credits: creditsToRefund,
        reason
      }
    };
  }

  /**
   * Thực hiện refund và cập nhật database
   * Process refund and update database
   */
  static async processRefund(enrollmentId: string, reason: 'STUDENT_QUIT' | 'CLASS_CANCELLED' | 'SYSTEM_ERROR') {
    const refundData = await this.calculateRefund(enrollmentId, reason);
    
    try {
      await prisma.$transaction(async (tx: any) => {
        // Cập nhật trạng thái enrollment
        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: { 
            status: 'CANCELLED',
            cancelledAt: new Date(),
            refundAmount: refundData.refund.amount
          }
        });

        // Cập nhật credits trong UserPackage
        if (refundData.refund.credits > 0) {
          const enrollment = await tx.enrollment.findUnique({
            where: { id: enrollmentId },
            include: { userPackage: true }
          });

          if (enrollment?.userPackage) {
            await tx.userPackage.update({
              where: { id: enrollment.userPackage.id },
              data: {
                usedCredits: {
                  decrement: refundData.refund.credits
                }
              }
            });
          }
        }

        // Ghi log transaction
        // eslint-disable-next-line no-console
        console.log(`Processed refund for enrollment ${enrollmentId}: ${refundData.refund.amount} VND, ${refundData.refund.credits} credits`);
      });

      return {
        success: true,
        refundData,
        message: `Đã xử lý hoàn tiền: ${refundData.refund.amount} VND và ${refundData.refund.credits} credits`
      };

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error processing refund:', error);
      throw new Error('Lỗi khi xử lý hoàn tiền');
    }
  }

  /**
   * Lấy danh sách các refund đang chờ xử lý
   * Get list of pending refunds
   */
  static async getPendingRefunds() {
    const cancelledEnrollments = await prisma.enrollment.findMany({
      where: {
        status: 'CANCELLED',
        refundProcessed: { not: true }
      },
      include: {
        user: true,
        class: true
      }
    });

    return cancelledEnrollments.map((enrollment: any) => ({
      id: enrollment.id,
      studentName: enrollment.user?.fullName || 'N/A',
      studentEmail: enrollment.user?.email || 'N/A',
      className: enrollment.class.name,
      refundAmount: enrollment.refundAmount,
      cancelledAt: enrollment.cancelledAt,
      waitingDays: enrollment.cancelledAt 
        ? Math.floor((new Date().getTime() - enrollment.cancelledAt.getTime()) / (1000 * 3600 * 24))
        : 0
    }));
  }

  /**
   * Báo cáo thống kê refund theo tháng
   * Monthly refund statistics report
   */
  static async getMonthlyRefundReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const refunds = await prisma.enrollment.findMany({
      where: {
        status: 'CANCELLED',
        cancelledAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        class: true,
        user: true
      }
    });

    const totalRefundAmount = refunds.reduce((sum: number, enrollment: any) => sum + (enrollment.refundAmount || 0), 0);
    const refundsByReason = refunds.reduce((acc: any, enrollment: any) => {
      // Note: Cần thêm field reason vào schema nếu muốn track chi tiết
      acc.total += 1;
      return acc;
    }, { total: 0 });

    return {
      period: `${month}/${year}`,
      summary: {
        totalRefunds: refunds.length,
        totalAmount: totalRefundAmount,
        averageRefund: refunds.length > 0 ? totalRefundAmount / refunds.length : 0
      },
      details: refunds.map((enrollment: any) => ({
        studentName: enrollment.user?.fullName || 'N/A',
        className: enrollment.class.name,
        amount: enrollment.refundAmount,
        date: enrollment.cancelledAt
      }))
    };
  }
}