import { Request, Response } from 'express';
import { ReactionType } from '@prisma/client';
import { ClassFeedbackService } from '../services/classFeedback.service';

const classFeedbackService = new ClassFeedbackService();

export const getClassDetail = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    const user = req.user as Express.UserPayload | undefined;
    const detail = await classFeedbackService.getClassDetail(classId, user?.id);
    return res.json(detail);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getClassImages = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    const images = await classFeedbackService.getClassImages(classId);
    return res.json(images);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const addClassImage = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const { url, caption, order } = req.body;
    const user = req.user as Express.UserPayload;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    if (!url) {
      return res.status(400).json({ error: 'Image url is required' });
    }

    const parsedOrder = order === undefined ? undefined : Number(order);
    if (parsedOrder !== undefined && Number.isNaN(parsedOrder)) {
      return res.status(400).json({ error: 'Order must be a number' });
    }

    const created = await classFeedbackService.addClassImage({
      classId,
      url,
      caption,
      order: parsedOrder,
      user,
    });

    return res.status(201).json(created);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const deleteClassImage = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const imageId = req.params.imageId;
    const user = req.user as Express.UserPayload;

    if (!classId || !imageId) {
      return res.status(400).json({ error: 'Class ID and image ID are required' });
    }

    await classFeedbackService.deleteClassImage({
      classId,
      imageId,
      user,
    });

    return res.json({ message: 'Image deleted' });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};

export const getClassReviews = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 10, 1), 50);
    const sort = (req.query.sort as string) || 'newest';

    if (!['newest', 'highest', 'lowest'].includes(sort)) {
      return res.status(400).json({ error: 'Invalid sort option' });
    }

    const result = await classFeedbackService.listClassReviews({
      classId,
      page,
      limit,
      sort: sort as 'newest' | 'highest' | 'lowest',
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const upsertClassReview = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const { rating, comment } = req.body;
    const user = req.user as Express.UserPayload;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    if (rating === undefined) {
      return res.status(400).json({ error: 'Rating is required' });
    }

    const parsedRating = Number(rating);
    if (Number.isNaN(parsedRating)) {
      return res.status(400).json({ error: 'Rating must be a number' });
    }

    const review = await classFeedbackService.upsertReview({
      classId,
      studentId: user.id,
      rating: parsedRating,
      comment,
    });

    return res.status(201).json(review);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const setClassReaction = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const { type } = req.body;
    const user = req.user as Express.UserPayload;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    if (!type || !['LIKE', 'DISLIKE'].includes(type)) {
      return res.status(400).json({ error: 'Reaction type must be LIKE or DISLIKE' });
    }

    const reaction = await classFeedbackService.setReaction({
      classId,
      studentId: user.id,
      type: type as ReactionType,
    });

    return res.status(201).json(reaction);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const removeClassReaction = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const user = req.user as Express.UserPayload;
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    const result = await classFeedbackService.removeReaction({
      classId,
      studentId: user.id,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const replyToClassReview = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const reviewId = req.params.reviewId;
    const { replyText } = req.body;
    const user = req.user as Express.UserPayload;

    if (!classId || !reviewId) {
      return res.status(400).json({ error: 'Class ID and review ID are required' });
    }

    if (replyText !== null && replyText !== undefined && typeof replyText !== 'string') {
      return res.status(400).json({ error: 'replyText must be a string or null' });
    }

    const updated = await classFeedbackService.replyToReview({
      classId,
      reviewId,
      replyText: replyText ?? null,
      user,
    });

    return res.json(updated);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};
