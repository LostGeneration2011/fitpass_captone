import { Router } from 'express';
import { adminOnly, teacherOrAdmin } from '../middlewares/rbac';
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
router.post('/', adminOnly(), createRoom);
router.put('/:id', adminOnly(), updateRoom);
router.delete('/:id', adminOnly(), deleteRoom);

// Room availability check (useful for session scheduling)
router.post('/check-availability', teacherOrAdmin(), checkRoomAvailability);

export default router;