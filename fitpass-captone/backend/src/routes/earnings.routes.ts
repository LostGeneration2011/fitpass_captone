import { Router } from 'express';
import { getTeacherEarnings, getTeacherEarningsById } from '../controllers/earnings.controller';
import { teacherOnly } from '../middlewares/rbac';

const router = Router();

// GET /api/earnings/me - Current teacher views own earnings (TEACHER only)
router.get('/me', teacherOnly(), getTeacherEarnings);

// GET /api/earnings/:teacherId - View specific teacher earnings (TEACHER/ADMIN, controlled in controller)
router.get('/:teacherId', getTeacherEarningsById);

export default router;
