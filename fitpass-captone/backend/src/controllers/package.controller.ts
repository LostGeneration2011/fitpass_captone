import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all packages
export const getPackages = async (req: Request, res: Response) => {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách gói'
    });
  }
};

// Get package by ID
export const getPackageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const package_ = await prisma.package.findUnique({
      where: { id }
    });

    if (!package_) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy gói tập'
      });
      return;
    }

    res.json({
      success: true,
      data: package_
    });
  } catch (error) {
    console.error('Get package by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin gói'
    });
  }
};

// Create package (Admin only)
export const createPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, credits, validDays } = req.body;

    // Validation
    if (!name || !price || !credits || !validDays) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
      return;
    }

    const package_ = await prisma.package.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        credits: parseInt(credits),
        validDays: parseInt(validDays)
      }
    });

    res.status(201).json({
      success: true,
      data: package_,
      message: 'Tạo gói tập thành công'
    });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo gói tập'
    });
  }
};

// Update package (Admin only)
export const updatePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, credits, validDays, isActive } = req.body;

    const package_ = await prisma.package.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(credits && { credits: parseInt(credits) }),
        ...(validDays && { validDays: parseInt(validDays) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });

    res.json({
      success: true,
      data: package_,
      message: 'Cập nhật gói tập thành công'
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật gói tập'
    });
  }
};

// Delete package (Admin only)
export const deletePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    await prisma.package.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Xóa gói tập thành công'
    });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa gói tập'
    });
  }
};

// Get all packages for admin (không filter isActive)
export const getAllPackagesForAdmin = async (req: Request, res: Response) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { price: 'asc' }
    });
    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Get all packages (admin) error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách gói (admin)'
    });
  }
};