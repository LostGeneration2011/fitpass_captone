import { Router } from 'express';
import { QRController } from '../controllers/qr.controller';
import { teacherOrAdmin } from '../middlewares/rbac';

const router = Router();

// POST /api/sessions/:id/start - Teacher starts session and generates QR (TEACHER/ADMIN only)
router.post('/sessions/:id/start', teacherOrAdmin(), QRController.startSession);

// POST /api/attendance/qr-checkin - Student check-in via QR scan (public, authenticated in controller)
router.post('/attendance/qr-checkin', QRController.qrCheckIn);

export default router;