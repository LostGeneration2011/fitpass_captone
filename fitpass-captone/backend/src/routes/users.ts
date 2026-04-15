import { Router } from 'express';
import { getAllUsers, getUserById, updateUser } from '../controllers/user.controller';
import { adminOnly } from '../middlewares/rbac';

const router = Router();

// ADMIN only access to user management
router.get('/', adminOnly(), getAllUsers);
router.get('/:id', adminOnly(), getUserById);
router.put('/:id', adminOnly(), updateUser);

export default router;
