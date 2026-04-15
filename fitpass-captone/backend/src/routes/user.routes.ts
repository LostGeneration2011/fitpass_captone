import { Router } from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/user.controller';
import { adminOnly } from '../middlewares/rbac';

const router = Router();

// GET /api/users - Get all users (ADMIN only)
router.get('/', adminOnly(), getAllUsers);

// GET /api/users/:id - Get user by ID (ADMIN only)
router.get('/:id', adminOnly(), getUserById);

// POST /api/users - Create new user (ADMIN only)
router.post('/', adminOnly(), createUser);

// PATCH /api/users/:id - Update user (ADMIN only)
router.patch('/:id', adminOnly(), updateUser);

// DELETE /api/users/:id - Delete user (ADMIN only)
router.delete('/:id', adminOnly(), deleteUser);

export default router;
