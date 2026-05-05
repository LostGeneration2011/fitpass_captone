import { prisma } from '../config/prisma';

export class ClassViabilityService {
  /**
   * Kiểm tra tính khả thi kinh tế của lớp học
   * Check the economic viability of a class
   */
  static async checkClassViability(classId: string) {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { 
            user: true,
            userPackage: {
              include: {
                package: true
              }
            }
          }
        },
        sessions: true
      }
    });

    if (!classData) {
      throw new Error('Lớp học không tồn tại');
    }

    const currentStudents = classData.enrollments.length;
    const minRequired = classData.minStudents;
    const maxAllowed = classData.maxStudents;

    // Tính giá trung bình từ các packages của students đã đăng ký
    const packagePrices = classData.enrollments
      .map(e => e.userPackage?.package?.price)
      .filter(price => price !== null && price !== undefined) as number[];
    
    const averagePrice = packagePrices.length > 0 
      ? packagePrices.reduce((sum, price) => sum + price, 0) / packagePrices.length
      : 100; // Default price nếu không có data

    // Kiểm tra số lượng tối thiểu
    const isViable = currentStudents >= minRequired;
    
    // Tính toán giá điều chỉnh
    let adjustedPrice = averagePrice;
    if (currentStudents < minRequired) {
      // Tăng giá nếu không đủ học viên
      adjustedPrice = averagePrice * classData.priceAdjustment;
    }

    return {
      isViable,
      currentStudents,
      minRequired,
      maxAllowed,
      originalPrice: averagePrice,
      adjustedPrice,
      recommendation: this.getRecommendation(currentStudents, minRequired, maxAllowed || classData.capacity)
    };
  }

  /**
   * Đưa ra khuyến nghị cho lớp học
   * Provide recommendations for the class
   */
  private static getRecommendation(current: number, min: number, max?: number) {
    if (current < min) {
      return {
        action: 'INCREASE_MARKETING',
        message: `Cần tuyển thêm ${min - current} học viên để đảm bảo khả thi`,
        urgency: 'HIGH'
      };
    }
    
    if (max && current > max) {
      return {
        action: 'LIMIT_ENROLLMENT',
        message: 'Lớp học đã đầy, cần hạn chế đăng ký',
        urgency: 'MEDIUM'
      };
    }

    return {
      action: 'MAINTAIN',
      message: 'Lớp học có số lượng học viên phù hợp',
      urgency: 'LOW'
    };
  }

  /**
   * Tự động điều chỉnh lớp học không khả thi
   * Automatically adjust non-viable classes
   */
  static async autoAdjustClass(classId: string) {
    const viability = await this.checkClassViability(classId);
    
    if (!viability.isViable) {
      // Ghi log điều chỉnh
      console.log(`Lớp ${classId} không đủ học viên tối thiểu. Giá gốc: ${viability.originalPrice}, Giá điều chỉnh: ${viability.adjustedPrice}`);
      
      return {
        adjusted: true,
        newPrice: viability.adjustedPrice,
        reason: 'Không đủ số lượng học viên tối thiểu'
      };
    }

    return {
      adjusted: false,
      reason: 'Lớp học đã khả thi'
    };
  }

  /**
   * Lấy báo cáo tổng quan về tất cả lớp học
   * Get overview report of all classes
   */
  static async getOverallReport() {
    const classes = await prisma.class.findMany({
      include: {
        enrollments: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    const report = {
      total: classes.length,
      viable: 0,
      nonViable: 0,
      atRisk: 0,
      details: [] as any[]
    };

    for (const cls of classes) {
      const viability = await this.checkClassViability(cls.id);
      
      if (viability.isViable) {
        report.viable++;
      } else {
        report.nonViable++;
      }

      if (viability.currentStudents < viability.minRequired * 1.2) {
        report.atRisk++;
      }

      report.details.push({
        classId: cls.id,
        className: cls.name,
        ...viability
      });
    }

    return report;
  }
}