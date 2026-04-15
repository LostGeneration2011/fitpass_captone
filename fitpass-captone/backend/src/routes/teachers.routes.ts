import { Router } from 'express';
import { getTeacherProfile, updateTeacherProfile } from '../controllers/teacherProfile.controller';
import { teacherOnly } from '../middlewares/rbac';

const router = Router();

// PATCH /api/teachers/me/profile - Update teacher profile
router.patch('/me/profile', teacherOnly(), updateTeacherProfile);

// GET /api/teachers/:id/profile - Get teacher profile with classes, images, and summaries
router.get('/:id/profile', getTeacherProfile);

export default router;
