import express from 'express';
import * as transactionsController from '../controllers/transactions.controller';
import { adminOnly } from '../middlewares/rbac';

const router = express.Router();

// Transaction routes - ADMIN only
router.get('/', adminOnly(), transactionsController.getAllTransactions);
router.get('/stats', adminOnly(), transactionsController.getTransactionStats);
router.get('/:id', adminOnly(), transactionsController.getTransactionById);
router.patch('/:id', adminOnly(), transactionsController.updateTransactionStatus);

export default router;