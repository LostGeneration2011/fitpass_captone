import express from 'express';
import * as teacherSalaryController from '../controllers/teacherSalary.controller';
import * as payrollController from '../controllers/payroll.controller';
import { adminOnly } from '../middlewares/rbac';

const router = express.Router();

// Teacher salary routes - ADMIN only
router.get('/teachers/salary-overview', adminOnly(), teacherSalaryController.getTeachersSalaryOverview);
router.get('/teachers/monthly-payroll', adminOnly(), teacherSalaryController.getMonthlyPayroll);
router.post('/teachers/pay', adminOnly(), teacherSalaryController.payTeacherSalary);
router.patch('/teachers/:id/hourly-rate', adminOnly(), teacherSalaryController.updateTeacherHourlyRate);
router.patch('/teachers/:id/salary-owed', adminOnly(), teacherSalaryController.updateTeacherSalaryOwed);

// Payroll routes (monthly batch payments) - ADMIN only
router.get('/payroll', adminOnly(), payrollController.getAllPayrolls);
router.post('/payroll/generate', adminOnly(), payrollController.generateMonthlyPayroll);
router.patch('/payroll/:id/status', adminOnly(), payrollController.updatePayrollStatus);
router.delete('/payroll/:id', adminOnly(), payrollController.deletePayroll);

export default router;