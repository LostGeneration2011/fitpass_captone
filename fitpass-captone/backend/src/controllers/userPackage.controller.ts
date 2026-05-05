import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// Get user's packages
export const getUserPackages = async (req: Request, res: Response) => {
  try {
    const userId = req.userId; // From auth middleware
    const userRole = (req as any).user?.role; // Get user role

    console.log('🔍 Getting packages for userId:', userId, 'role:', userRole);

    // Admin can see all user packages, students see only their own
    const whereClause: any = userRole === 'ADMIN' ? {} : { userId };

    const userPackages = await prisma.userPackage.findMany({
      where: whereClause,
      include: {
        package: true,
        user: userRole === 'ADMIN' ? {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        } : false
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('🔍 Found userPackages count:', userPackages.length);

    // For students, filter out expired packages and only get active status
    let responsePackages = userPackages;
    if (userRole !== 'ADMIN') {
      responsePackages = userPackages.filter(up => {
        const isActive = up.status === 'ACTIVE';
        const notExpired = up.expiresAt ? new Date() < up.expiresAt : true;
        return isActive && notExpired;
      });
    }

    console.log('🔍 Final packages count:', responsePackages.length);

    res.json({
      success: true,
      data: responsePackages
    });
  } catch (error) {
    console.error('Get user packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy gói của người dùng'
    });
  }
};

// Purchase package
export const purchasePackage = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.body;
    const userId = req.userId; // From auth middleware

    console.log('📦 [PURCHASE] Starting package purchase for userId:', userId, 'packageId:', packageId);

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin packageId'
      });
    }

    // Get package info
    const package_ = await prisma.package.findUnique({
      where: { id: packageId }
    });

    if (!package_ || !package_.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy gói tập hoặc gói đã ngừng hoạt động'
      });
    }

    console.log('📦 [PURCHASE] Package found:', package_.name, 'price:', package_.price, 'credits:', package_.credits);

    // Calculate expiry date
    let expiresAt = null;
    if (package_.validDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + package_.validDays);
    }

    // Create user package record with PENDING status (will be activated after payment)
    const userPackage = await prisma.userPackage.create({
      data: {
        userId: userId || '',
        packageId,
        creditsLeft: 0, // Start with 0 credits, will be set after payment confirmation
        expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year if null
        status: 'SUSPENDED' // Start as SUSPENDED until payment is confirmed
      },
      include: {
        package: true
      }
    });

    console.log('📦 [PURCHASE] UserPackage created with SUSPENDED status and 0 credits:', userPackage.id);

    res.status(201).json({
      success: true,
      data: userPackage,
      message: 'Đã tạo đơn hàng, vui lòng thanh toán để kích hoạt'
    });
    return;
  } catch (error) {
    console.error('Purchase package error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi mua gói tập'
    });
    return;
  }
};

// Activate package after successful payment
export const activatePackage = async (req: Request, res: Response) => {
  try {
    const { userPackageId } = req.body;
    const userId = req.userId; // From auth middleware

    console.log('🔓 [ACTIVATE] Starting package activation for userPackageId:', userPackageId, 'userId:', userId);

    if (!userPackageId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin userPackageId'
      });
    }

    // Find the user package with package details
    const userPackage = await prisma.userPackage.findFirst({
      where: {
        id: userPackageId,
        userId: userId || ''
      },
      include: {
        package: true
      }
    });

    if (!userPackage) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy gói tập'
      });
    }

    console.log('🔓 [ACTIVATE] UserPackage found:', {
      id: userPackage.id,
      status: userPackage.status,
      creditsLeft: userPackage.creditsLeft,
      packageCredits: userPackage.package.credits
    });

    if (userPackage.status === 'ACTIVE') {
      return res.json({
        success: true,
        message: 'Gói tập đã được kích hoạt trước đó'
      });
    }

    // Activate the package and set proper credits from the package
    const updatedPackage = await prisma.userPackage.update({
      where: { id: userPackageId },
      data: { 
        status: 'ACTIVE',
        creditsLeft: userPackage.package.credits // Set credits from package when activating
      },
      include: {
        package: true
      }
    });

    console.log('🔓 [ACTIVATE] Package activated successfully:', {
      id: updatedPackage.id,
      status: updatedPackage.status,
      creditsLeft: updatedPackage.creditsLeft
    });

    res.json({
      success: true,
      data: updatedPackage,
      message: 'Đã kích hoạt gói tập thành công'
    });
    return;
  } catch (error) {
    console.error('Activate package error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kích hoạt gói tập'
    });
    return;
  }
};

// Use credits to book session
export const useCredits = async (req: Request, res: Response) => {
  try {
    const { sessionId, amount = 1 } = req.body;
    const userId = req.userId; // From auth middleware

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin sessionId'
      });
    }

    // Check if session exists and has capacity
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
        _count: {
          select: { bookings: true }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy session'
      });
    }

    // Check if user already booked this session
    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId: userId || '',
        sessionId: sessionId
      }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã book session này rồi'
      });
    }

    // Check session capacity
    const currentBookings = session._count.bookings;
    const capacity = session.class?.capacity || 0;
    
    if (currentBookings >= capacity) {
      return res.status(400).json({
        success: false,
        message: 'Session đã hết chỗ'
      });
    }

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const MAX_UPCOMING_BOOKINGS = 5;

      // Prevent booking the same session twice
      const existingBooking = await tx.booking.findFirst({
        where: {
          userId: userId || '',
          sessionId,
        },
      });

      if (existingBooking) {
        throw new Error('Bạn đã book buổi này rồi');
      }

      // Prevent time overlap with other bookings
      const overlapping = await tx.booking.findFirst({
        where: {
          userId: userId || '',
          session: {
            startTime: { lt: session.endTime },
            endTime: { gt: session.startTime },
          },
        },
        include: {
          session: true,
        },
      });

      if (overlapping) {
        throw new Error('Bạn đã có buổi khác trùng thời gian');
      }

      // Enforce maximum number of upcoming bookings
      const upcomingCount = await tx.booking.count({
        where: {
          userId: userId || '',
          session: {
            startTime: { gt: now },
          },
        },
      });

      if (upcomingCount >= MAX_UPCOMING_BOOKINGS) {
        throw new Error(`Bạn chỉ được giữ tối đa ${MAX_UPCOMING_BOOKINGS} buổi sắp diễn ra`);
      }

      // Find an active package with enough credits (handle null separately)
      const userPackage = await tx.userPackage.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          creditsLeft: { gte: amount }
        },
        orderBy: { expiresAt: 'asc' } // Use packages closest to expiry first
      });

      if (!userPackage) {
        throw new Error('Không đủ credits hoặc không có gói tập còn hiệu lực');
      }

      // Check if package is expired (skip if null = never expires)
      if (userPackage.expiresAt && userPackage.expiresAt <= new Date()) {
        throw new Error('Gói tập đã hết hạn');
      }

      // Deduct credits (unless unlimited)
      if (userPackage.creditsLeft > 0) {
        await tx.userPackage.update({
          where: { id: userPackage.id },
          data: { 
            creditsLeft: { decrement: amount }
          }
        });
      }

      // Create booking record
      const booking = await tx.booking.create({
        data: {
          userId: userId || '',
          sessionId: sessionId,
          userPackageId: userPackage.id,
          creditsUsed: amount
        }
      });

      return booking;
    });

    res.json({
      success: true,
      data: result,
      message: 'Đã book session thành công'
    });    return;
  } catch (error: any) {
    console.error('Use credits error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi server khi sử dụng credits'
    });
    return;
  }
};

// Cancel a booking and refund credits
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { bookingId } = req.params;

    if (!userId || !bookingId) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin'
      });
      return;
    }

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: true,
        userPackage: true
      }
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy booking'
      });
      return;
    }

    // Verify ownership
    if (booking.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Không có quyền hủy booking này'
      });
      return;
    }

    // Check if session has started (can't cancel after start)
    const now = new Date();
    if (booking.session.startTime <= now) {
      res.status(400).json({
        success: false,
        message: 'Không thể hủy buổi đã bắt đầu hoặc đã kết thúc'
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Delete booking
      await tx.booking.delete({
        where: { id: bookingId }
      });

      // Refund credits
      if (booking.userPackageId) {
        await tx.userPackage.update({
          where: { id: booking.userPackageId },
          data: {
            creditsLeft: { increment: booking.creditsUsed }
          }
        });
      }
    });

    res.json({
      success: true,
      message: 'Đã hủy booking và hoàn credit thành công'
    });
    return;
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi hủy booking'
    });
    return;
  }
};

// Get user's booking history
export const getBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId; // From auth middleware
    const { limit = 20, page = 1 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await prisma.booking.findMany({
      where: { userId: userId || '' },
      include: {
        session: {
          include: {
            class: {
              include: {
                teacher: true
              }
            },
            room: true
          }
        },
        userPackage: {
          include: {
            package: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });

    const total = await prisma.booking.count({
      where: { userId: userId || '' }
    });

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch sử đặt chỗ'
    });
  }
};

// Get available sessions for booking
export const getAvailableSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { startDate, endDate, limit } = req.query;
    
    console.log('🔍 getAvailableSessions called for userId:', userId);
    console.log('🔍 Query params:', { startDate, endDate });
    
    const whereClause: any = {
      status: { in: ['UPCOMING', 'ACTIVE'] }, // Allow both UPCOMING and ACTIVE sessions
      class: {
        status: 'APPROVED'
      }
    };

    const now = new Date();
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    let rangeStart = startDate ? new Date(startDate as string) : now;
    let rangeEnd = endDate ? new Date(endDate as string) : defaultEnd;

    if (Number.isNaN(rangeStart.getTime())) rangeStart = now;
    if (Number.isNaN(rangeEnd.getTime())) rangeEnd = defaultEnd;

    // Cap range to max 60 days to avoid huge payloads
    const maxEnd = new Date(rangeStart);
    maxEnd.setDate(maxEnd.getDate() + 60);
    if (rangeEnd > maxEnd) {
      rangeEnd = maxEnd;
    }

    whereClause.startTime = {
      gte: rangeStart,
      lte: rangeEnd
    };

    console.log('🔍 Where clause for sessions:', JSON.stringify(whereClause, null, 2));

    const takeLimit = Math.min(Number(limit) || 300, 1000);
    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        class: {
          include: {
            teacher: true
          }
        },
        room: true,
        _count: {
          select: {
            bookings: true
          }
        }
      },
      orderBy: { startTime: 'asc' },
      take: takeLimit
    });

    console.log('🔍 Found sessions count:', sessions.length);
    console.log('🔍 First few sessions:', sessions.slice(0, 2));

    // Get user's existing bookings to mark as booked
    const userBookings = await prisma.booking.findMany({
      where: { userId: userId || '' },
      select: { sessionId: true }
    });
    
    console.log('🔍 User bookings:', userBookings);
    
    const bookedSessionIds = userBookings.map(b => b.sessionId);

    const sessionsWithAvailability = sessions.map(session => ({
      ...session,
      isBooked: bookedSessionIds.includes(session.id),
      availableSlots: (session.class?.capacity || 0) - session._count.bookings
    }));

    console.log('🔍 Final sessions with availability count:', sessionsWithAvailability.length);

    res.json({
      success: true,
      data: sessionsWithAvailability
    });
  } catch (error) {
    console.error('Get available sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy sessions'
    });
  }
};

// Get detailed package status for debugging
export const getPackageStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.userId; // From auth middleware
    const userRole = (req as any).user?.role; // Get user role
    const { userPackageId } = req.params;

    console.log('📊 [STATUS] Getting package status for userId:', userId, 'role:', userRole, 'userPackageId:', userPackageId);

    // Admin can view any package, students can only view their own
    const whereClause: any = { id: userPackageId };
    if (userRole !== 'ADMIN') {
      whereClause.userId = userId || '';
    }

    const userPackage = await prisma.userPackage.findFirst({
      where: whereClause,
      include: {
        package: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        transactions: true,
        bookings: {
          include: {
            session: {
              include: {
                class: true
              }
            }
          }
        }
      }
    });

    if (!userPackage) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy gói tập'
      });
    }

    const statusInfo = {
      userPackage: {
        id: userPackage.id,
        status: userPackage.status,
        creditsLeft: userPackage.creditsLeft,
        expiresAt: userPackage.expiresAt,
        purchasedAt: userPackage.purchasedAt
      },
      user: userRole === 'ADMIN' ? {
        id: userPackage.user.id,
        fullName: userPackage.user.fullName,
        email: userPackage.user.email
      } : undefined,
      package: {
        name: userPackage.package.name,
        originalCredits: userPackage.package.credits,
        price: userPackage.package.price,
        validDays: userPackage.package.validDays
      },
      transactions: userPackage.transactions.map(t => ({
        id: t.id,
        status: t.status,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        paymentId: t.paymentId,
        createdAt: t.createdAt
      })),
      bookings: userPackage.bookings.map(b => ({
        id: b.id,
        creditsUsed: b.creditsUsed,
        sessionName: b.session.class?.name,
        createdAt: b.createdAt
      })),
      summary: {
        isExpired: userPackage.expiresAt ? new Date() > userPackage.expiresAt : false,
        isActive: userPackage.status === 'ACTIVE',
        hasPaymentCompleted: userPackage.transactions.some(t => t.status === 'COMPLETED'),
        totalBookings: userPackage.bookings.length,
        creditsUsed: userPackage.bookings.reduce((sum, b) => sum + b.creditsUsed, 0)
      }
    };

    console.log('📊 [STATUS] Package status info:', statusInfo);

    res.json({
      success: true,
      data: statusInfo
    });
    return;
  } catch (error) {
    console.error('Get package status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy trạng thái gói tập'
    });
    return;
  }
};