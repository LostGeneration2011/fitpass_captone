import express from 'express';
import { 
  createPayPalOrder, 
  capturePayPalPayment, 
  getPaymentStatus,
  testPayPalConnectionPublic,
  handlePayPalReturn,
  handlePayPalCancel,
  checkPayPalOrderStatus
} from '../controllers/payment.controller';
import { authMiddleware } from '../middlewares/auth';

const router = express.Router();

// Public test endpoint (no auth needed)
router.get('/test-paypal-public', testPayPalConnectionPublic);

// PayPal return/cancel handlers (no auth needed for redirect)
router.get('/success', handlePayPalReturn);
router.get('/cancel', handlePayPalCancel);

// All routes below require authentication
router.use(authMiddleware);

router.post('/paypal/create-order', createPayPalOrder);
router.post('/paypal/capture', capturePayPalPayment);
router.get('/paypal/status/:orderId', checkPayPalOrderStatus);
router.get('/status/:userPackageId', getPaymentStatus);

export default router;