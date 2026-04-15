import { Router } from 'express';
import { adminOnly } from '../middlewares/rbac';
import { listClassReviewsForModeration, moderateClassReview } from '../controllers/classReviewAdmin.controller';

const router = Router();

// GET /api/admin/class-reviews - List reviews for moderation
router.get('/class-reviews', adminOnly(), listClassReviewsForModeration);

// PATCH /api/admin/class-reviews/:id/moderate - Hide or unhide a review
router.patch('/class-reviews/:id/moderate', adminOnly(), moderateClassReview);

export default router;
