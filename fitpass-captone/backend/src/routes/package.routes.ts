import express from 'express';
import { 
  getPackages, 
  getPackageById, 
  createPackage, 
  updatePackage, 
  deletePackage, 
  getAllPackagesForAdmin
} from '../controllers/package.controller';
import { adminOnly } from '../middlewares/rbac';
import { authMiddleware } from '../middlewares/auth';

const router = express.Router();

// Public routes
router.get('/', getPackages);
router.get('/:id', getPackageById);

// Admin only routes
router.post('/', adminOnly(), createPackage);
router.patch('/:id', adminOnly(), updatePackage);
router.put('/:id', adminOnly(), updatePackage);
router.delete('/:id', adminOnly(), deletePackage);

// Admin: lấy tất cả gói tập (kể cả không active)
router.get('/admin/all', authMiddleware, adminOnly(), getAllPackagesForAdmin);

export default router;