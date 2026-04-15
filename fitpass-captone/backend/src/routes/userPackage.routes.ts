import express from 'express';
import { 
  getUserPackages, 
  purchasePackage, 
  useCredits, 
  getBookings,
  getAvailableSessions,
  activatePackage,
  getPackageStatus,
  cancelBooking
} from '../controllers/userPackage.controller';
import { authMiddleware } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getUserPackages);
router.get('/status/:userPackageId', getPackageStatus);
router.post('/purchase', purchasePackage);
router.post('/activate', activatePackage);
router.post('/use-credits', useCredits);
router.delete('/bookings/:bookingId', cancelBooking);
router.get('/bookings', getBookings);
router.get('/sessions', getAvailableSessions);

export default router;