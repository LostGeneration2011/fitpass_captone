import { Router } from 'express';
import { 
  getAllEnrollments,
  createEnrollment, 
  getEnrollmentsByClass, 
  getEnrollmentsByStudent, 
  deleteEnrollment,
  updateEnrollmentNote,
  getEnrollmentById,
  getClassCapacityInfo
} from '../controllers/enrollment.controller';
import { adminOnly, teacherOrAdmin } from '../middlewares/rbac';

const router = Router();

// POST /api/enrollments - Create enrollment (STUDENT/TEACHER/ADMIN can enroll, validation in controller)
router.post('/', createEnrollment);

// GET /api/enrollments/:id - Get enrollment by ID
router.get('/:id', getEnrollmentById);

// PATCH /api/enrollments/:id/note - Update progress notes (teacher only)
router.patch('/:id/note', updateEnrollmentNote);

// GET /api/enrollments/class/:classId/capacity - Get class capacity info
router.get('/class/:classId/capacity', getClassCapacityInfo);

// GET /api/enrollments - Get all enrollments (ADMIN only) or filtered by classId/studentId
router.get('/', (req, res) => {
  if (req.query.classId) {
    return getEnrollmentsByClass(req, res);
  } else if (req.query.studentId) {
    return getEnrollmentsByStudent(req, res);
  } else {
    // Get all enrollments - ADMIN only
    const middleware = adminOnly();
    return middleware(req, res, () => getAllEnrollments(req, res));
  }
});

// DELETE /api/enrollments - Unenroll (ADMIN or STUDENT unenrolling themselves)
router.delete('/', deleteEnrollment);

export default router;
