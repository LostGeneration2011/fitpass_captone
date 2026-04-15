import { Router } from 'express';
import { 
  createSession, 
  getSessions, 
  getSessionById, 
  updateSessionStatus,
  updateSession,
  deleteSession 
} from '../controllers/session.controller';
import { verifyTeacherOwnsClass } from '../middlewares/verifyTeacherOwnsClass';
import { teacherOrAdmin } from '../middlewares/rbac';

const router = Router();

// POST /api/sessions - Create session (TEACHER/ADMIN only)
router.post('/', teacherOrAdmin(), createSession);

// GET /api/sessions - Get all sessions or by classId
// GET /api/sessions?classId=xxx - Get sessions by class
router.get('/', getSessions);

// GET /api/sessions/:id - Get session by ID
router.get('/:id', getSessionById);

// PATCH /api/sessions/:id/status - Update session status (TEACHER/ADMIN only)
router.patch('/:id/status', teacherOrAdmin(), updateSessionStatus);

// PATCH /api/sessions/:id - General update session (TEACHER/ADMIN only, requires teacher ownership of class)
router.patch('/:id', teacherOrAdmin(), updateSession);

// DELETE /api/sessions/:id - Delete session (TEACHER/ADMIN only, requires teacher ownership of class)
router.delete('/:id', teacherOrAdmin(), deleteSession);

export default router;
