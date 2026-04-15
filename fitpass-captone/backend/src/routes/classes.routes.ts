import { Router } from 'express';
import { 
  createClass, 
  getAllClasses, 
  getClassById, 
  updateClass, 
  deleteClass,
  approveClass,
  rejectClass
} from '../controllers/class.controller';
import {
  addClassImage,
  deleteClassImage,
  getClassDetail,
  getClassImages,
  getClassReviews,
  replyToClassReview,
  removeClassReaction,
  setClassReaction,
  upsertClassReview
} from '../controllers/classFeedback.controller';
import { adminOnly, studentOnly, teacherOrAdmin } from '../middlewares/rbac';

const router = Router();

// POST /api/classes - Create class (will be PENDING status)
router.post('/', createClass);

// GET /api/classes - Get all classes (with optional filters)
// Query params: ?status=PENDING|APPROVED|REJECTED&approved=true
router.get('/', getAllClasses);

// GET /api/classes/:id/detail - Get class detail with images and summaries
router.get('/:id/detail', getClassDetail);

// Class images
router.get('/:id/images', getClassImages);
router.post('/:id/images', teacherOrAdmin(), addClassImage);
router.delete('/:id/images/:imageId', teacherOrAdmin(), deleteClassImage);

// Class reviews
router.get('/:id/reviews', getClassReviews);
router.post('/:id/reviews', studentOnly(), upsertClassReview);
router.patch('/:id/reviews/:reviewId/reply', teacherOrAdmin(), replyToClassReview);

// Class reactions
router.post('/:id/reactions', studentOnly(), setClassReaction);
router.delete('/:id/reactions', studentOnly(), removeClassReaction);

// GET /api/classes/:id - Get class by ID
router.get('/:id', getClassById);

// PATCH /api/classes/:id - Update class
router.patch('/:id', updateClass);

// PUT /api/classes/:id - Update class (alternative)
router.put('/:id', updateClass);

// DELETE /api/classes/:id - Delete class (ADMIN only)
router.delete('/:id', adminOnly(), deleteClass);

// Admin endpoints
// POST /api/classes/:id/approve - Admin approve class (ADMIN only)
router.post('/:id/approve', adminOnly(), approveClass);

// POST /api/classes/:id/reject - Admin reject class (with reason) (ADMIN only)
router.post('/:id/reject', adminOnly(), rejectClass);

export default router;
