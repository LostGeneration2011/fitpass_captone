import { Router } from 'express';
import * as forumController from '../controllers/forum.controller';
import { authMiddleware } from '../middlewares/auth';
import { forumMediaUpload, uploadMedia as forumUploadMedia } from '../controllers/forumMedia.controller';
import * as forumModeration from '../controllers/forumModeration.controller';

const router = Router();

// Forum posts
router.get('/posts', forumController.getPosts);
router.post('/posts', authMiddleware, forumController.createPost);
router.get('/posts/:id', forumController.getPostDetail);
router.delete('/posts/:id', authMiddleware, forumController.deletePost);

// Forum comments
router.post('/posts/:id/comments', authMiddleware, forumController.addComment);
router.put('/comments/:id', authMiddleware, forumController.editComment);
router.delete('/comments/:id', authMiddleware, forumController.deleteComment);

// Forum reactions
router.post('/posts/:id/reactions', authMiddleware, forumController.addReaction);
router.delete('/posts/:id/reactions', authMiddleware, forumController.removeReaction);

// Forum media upload
router.post('/media/upload', authMiddleware, forumMediaUpload.single('file'), forumUploadMedia);

// Forum user profile
router.get('/users/:id/profile', forumController.getUserProfile);

// Forum report & moderation
router.post('/posts/:id/report', authMiddleware, forumModeration.reportPost);
router.post('/comments/:id/report', authMiddleware, forumModeration.reportComment);
router.patch('/posts/:id/hide', authMiddleware, forumModeration.hidePost);
router.patch('/comments/:id/hide', authMiddleware, forumModeration.hideComment);

export default router;
