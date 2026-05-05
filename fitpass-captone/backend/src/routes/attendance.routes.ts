import { Router } from 'express';
import { 
  checkIn, 
  qrCheckIn,
  getAttendanceBySession, 
  getAttendanceByClass, 
  getAttendanceByStudent, 
  updateAttendance,
  getAttendanceBulk,
  getAllAttendanceForAdmin
} from '../controllers/attendance.controller';
import { teacherOrAdmin, adminOnly } from '../middlewares/rbac';

const router = Router();

// POST /api/attendance/bulk - Get attendance for multiple sessionIds
router.post('/bulk', getAttendanceBulk);

// GET /api/attendance/admin/all - Admin: get all attendance records
router.get('/admin/all', adminOnly(), getAllAttendanceForAdmin);

// POST /api/attendance/check-in - Check in attendance (TEACHER/ADMIN only)
router.post('/check-in', teacherOrAdmin(), checkIn);

// QR-based check-in endpoint (STUDENT can use) - supports both GET and POST
router.get('/checkin', qrCheckIn);
router.post('/checkin', qrCheckIn);

// GET /api/attendance/session/:sessionId - Get attendance by session (alternative route)
router.get('/session/:sessionId', (req, res) => {
  req.query.sessionId = req.params.sessionId;
  return getAttendanceBySession(req, res);
});

// PATCH /api/attendance/:id - Update attendance by id (TEACHER/ADMIN only)
router.patch('/:id', teacherOrAdmin(), updateAttendance);

// GET /api/attendance?sessionId=xxx - Get attendance by session
// GET /api/attendance?classId=xxx - Get attendance by class  
// GET /api/attendance?studentId=xxx - Get attendance by student
router.get('/', (req, res) => {
  if (req.query.sessionId) {
    return getAttendanceBySession(req, res);
  } else if (req.query.classId) {
    return getAttendanceByClass(req, res);
  } else if (req.query.studentId) {
    return getAttendanceByStudent(req, res);
  } else {
    return res.status(400).json({ error: "One of sessionId, classId, or studentId is required" });
  }
});

// PATCH /api/attendance - Update attendance (ADMIN only)
router.patch('/', teacherOrAdmin(), updateAttendance);

export default router;
