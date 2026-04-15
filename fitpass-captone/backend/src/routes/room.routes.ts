import { Router } from 'express';
import { requireRole } from '../middlewares/requireRole';
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  getRoomSchedule,
  checkRoomAvailability
} from '../controllers/room.controller';

const router = Router();

// All routes here are already protected by authMiddleware in app.ts

// Public routes (read-only for teachers/students to see room info)
router.get('/', getRooms);
router.get('/schedule', getRoomSchedule);
router.get('/:id', getRoomById);

// Admin-only routes
router.post('/', requireRole(['ADMIN']), createRoom);
router.put('/:id', requireRole(['ADMIN']), updateRoom);
router.delete('/:id', requireRole(['ADMIN']), deleteRoom);

// Room availability check (useful for session scheduling)
router.post('/check-availability', requireRole(['ADMIN', 'TEACHER']), checkRoomAvailability);

export default router;