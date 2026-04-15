// Business Logic Implementation for FitPass Economic Model

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { ClassViabilityService } from '../services/ClassViabilityService';
import { RefundService } from '../services/RefundService';
import { EnrollmentService } from '../services/enrollment.service';
import { 
  requireAdmin,
  validateClassId,
  validateEnrollmentId,
  validateRefundReason,
  validateEnrollmentData,
  validateTransferData,
  validateMonthYear,
  businessLogicRateLimit
} from '../middlewares/businessLogicMiddleware';

const prisma = new PrismaClient();
const router = express.Router();
const enrollmentService = new EnrollmentService();

// Apply rate limiting to all business logic routes
router.use(businessLogicRateLimit);

/**
 * Endpoint để kiểm tra tính khả thi kinh tế của lớp học
 * Endpoint to check economic viability of classes
 */
router.get('/classes/:classId/viability', validateClassId, async (req, res) => {
  try {
    const { classId } = req.params;
    const viability = await ClassViabilityService.checkClassViability(classId!);
    
    res.json({
      success: true,
      data: viability
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi kiểm tra khả thi'
    });
  }
});

/**
 * Endpoint để lấy báo cáo tổng quan về tất cả lớp học
 * Endpoint to get overall report of all classes
 */
router.get('/classes/viability/report', requireAdmin, async (req, res) => {
  try {
    const report = await ClassViabilityService.getOverallReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo báo cáo'
    });
  }
});

/**
 * Endpoint để tính toán refund
 * Endpoint to calculate refund
 */
router.post('/enrollments/:enrollmentId/calculate-refund', validateEnrollmentId, validateRefundReason, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { reason } = req.body;
    
    const refundData = await RefundService.calculateRefund(enrollmentId!, reason);
    
    res.json({
      success: true,
      data: refundData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi tính toán refund'
    });
  }
});

/**
 * Endpoint để xử lý refund
 * Endpoint to process refund
 */
router.post('/enrollments/:enrollmentId/process-refund', requireAdmin, validateEnrollmentId, validateRefundReason, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { reason } = req.body;
    
    const result = await RefundService.processRefund(enrollmentId!, reason);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi xử lý refund'
    });
  }
});

/**
 * Endpoint để đăng ký lớp học với validation
 * Endpoint to enroll in class with validation
 */
router.post('/enrollments/enroll', validateEnrollmentData, async (req, res) => {
  try {
    const { userId, classId, userPackageId } = req.body;
    
    const result = await enrollmentService.enrollInClassWithCredit(userId, classId, userPackageId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi đăng ký lớp học'
    });
  }
});

/**
 * Endpoint để hủy đăng ký
 * Endpoint to cancel enrollment
 */
router.post('/enrollments/:enrollmentId/cancel', validateEnrollmentId, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { reason } = req.body;
    
    const result = await enrollmentService.cancelEnrollment(enrollmentId!, reason);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi hủy đăng ký'
    });
  }
});

/**
 * Endpoint để chuyển lớp
 * Endpoint to transfer class
 * TODO: Implement transferClass method
 */
/*
router.post('/enrollments/:enrollmentId/transfer', validateEnrollmentId, validateTransferData, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { newClassId } = req.body;
    
    const result = await enrollmentService.transferClass(enrollmentId!, newClassId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi chuyển lớp'
    });
  }
});

/**
 * Endpoint để lấy thống kê enrollment
 * Endpoint to get enrollment statistics
 * TODO: Implement getEnrollmentStats method
 */
/*
router.get('/enrollments/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await enrollmentService.getEnrollmentStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê'
    });
  }
});
*/

/**
 * Endpoint để lấy danh sách enrollments có nguy cơ cao
 * Endpoint to get high-risk enrollments
 * TODO: Implement getHighRiskEnrollments method
 */
/*
router.get('/enrollments/high-risk', requireAdmin, async (req, res) => {
  try {
    const highRisk = await enrollmentService.getHighRiskEnrollments();
    
    res.json({
      success: true,
      data: highRisk
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách nguy cơ cao'
    });
  }
});
*/

/**
 * Endpoint để lấy báo cáo refund hàng tháng
 * Endpoint to get monthly refund report
 */
router.get('/refunds/monthly/:year/:month', requireAdmin, validateMonthYear, async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const report = await RefundService.getMonthlyRefundReport(parseInt(year!), parseInt(month!));
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo báo cáo refund'
    });
  }
});

/**
 * Endpoint để tự động điều chỉnh giá lớp học
 * Endpoint to auto-adjust class pricing
 */
router.post('/classes/:classId/auto-adjust', requireAdmin, validateClassId, async (req, res) => {
  try {
    const { classId } = req.params;
    
    const result = await ClassViabilityService.autoAdjustClass(classId!);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi điều chỉnh lớp học'
    });
  }
});

export default router;