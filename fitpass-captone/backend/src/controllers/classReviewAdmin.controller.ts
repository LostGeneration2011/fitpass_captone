import { Request, Response } from 'express';
import { ClassFeedbackService } from '../services/classFeedback.service';

const classFeedbackService = new ClassFeedbackService();

export const listClassReviewsForModeration = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    const status = (req.query.status as string) || 'all';
    const search = (req.query.search as string) || undefined;
    const classId = (req.query.classId as string) || undefined;
    const teacherId = (req.query.teacherId as string) || undefined;
    const sort = (req.query.sort as string) || 'newest';

    if (!['all', 'visible', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    if (!['newest', 'oldest', 'highest', 'lowest'].includes(sort)) {
      return res.status(400).json({ error: 'Invalid sort option' });
    }

    const result = await classFeedbackService.listReviewsForModeration({
      page,
      limit,
      status: status as 'all' | 'visible' | 'hidden',
      search,
      classId,
      teacherId,
      sort: sort as 'newest' | 'oldest' | 'highest' | 'lowest',
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const moderateClassReview = async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id;
    const { isHidden, moderationReason } = req.body;

    if (!reviewId) {
      return res.status(400).json({ error: 'Review ID is required' });
    }

    if (typeof isHidden !== 'boolean') {
      return res.status(400).json({ error: 'isHidden must be boolean' });
    }

    const updated = await classFeedbackService.moderateReview({
      reviewId,
      isHidden,
      moderationReason,
      moderatedBy: (req.user as Express.UserPayload | undefined)?.id ?? '',
    });

    return res.json({ message: 'Review updated', review: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
