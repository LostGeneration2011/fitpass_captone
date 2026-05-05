import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// GET /api/transactions - Get all transactions with filters
export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, userId, page = '1', limit = '20' } = req.query;
    
    const where: any = {};
    
    if (status && typeof status === 'string') {
      where.status = status;
    }
    
    if (userId && typeof userId === 'string') {
      where.userId = userId;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          userPackage: {
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      message: 'Lỗi khi tải danh sách giao dịch',
      error: error.message 
    });
  }
};

// GET /api/transactions/:id - Get transaction by ID
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        userPackage: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      res.status(404).json({ message: 'Không tìm thấy giao dịch' });
      return;
    }

    res.json(transaction);
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ 
      message: 'Lỗi khi tải thông tin giao dịch',
      error: error.message 
    });
  }
};

// PATCH /api/transactions/:id - Update transaction status
export const updateTransactionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ 
        message: 'Trạng thái không hợp lệ. Phải là: ' + validStatuses.join(', ')
      });
      return;
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!transaction) {
      res.status(404).json({ message: 'Không tìm thấy giao dịch' });
      return;
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        userPackage: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      }
    });

    res.json({
      message: 'Cập nhật trạng thái giao dịch thành công',
      transaction: updatedTransaction
    });
  } catch (error: any) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ 
      message: 'Lỗi khi cập nhật trạng thái giao dịch',
      error: error.message 
    });
  }
};

// GET /api/transactions/stats - Get transaction statistics
export const getTransactionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [totalTransactions, completedTransactions, pendingTransactions, failedTransactions, totalRevenue] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.transaction.count({ where: { ...where, status: 'PENDING' } }),
      prisma.transaction.count({ where: { ...where, status: 'FAILED' } }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { amount: true }
      })
    ]);

    res.json({
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
      cancelledTransactions: totalTransactions - completedTransactions - pendingTransactions - failedTransactions,
      totalRevenue: totalRevenue._sum.amount || 0,
      successRate: totalTransactions > 0 ? ((completedTransactions / totalTransactions) * 100).toFixed(2) : '0.00'
    });
  } catch (error: any) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({ 
      message: 'Lỗi khi tải thống kê giao dịch',
      error: error.message 
    });
  }
};