import { editMessage, markThreadAsRead, listThreadMembers, revokeMessage, lockThread, unlockThread } from '../controllers/chat.controller';
import { chatMediaUpload, uploadChatMedia } from '../controllers/chatMedia.controller';
import { Router } from 'express';
import {
  listThreads,
  createSupportThread,
  createClassThread,
  listMessages,
  sendMessage,
  deleteThreadForStudent,
  deleteMessageForStudent,
  deleteThreadAsAdmin,
  deleteMessageAsAdmin,
} from '../controllers/chat.controller';
import { adminOnly, studentOnly } from '../middlewares/rbac';

const router = Router();

// Edit message (PUT and PATCH for compatibility)
router.put('/messages/:messageId', editMessage);
router.patch('/messages/:messageId', editMessage);
// Mark thread as read
router.post('/threads/:id/read', markThreadAsRead);

// Threads
router.get('/threads', listThreads);
router.post('/threads/support', createSupportThread);
router.post('/threads/class', createClassThread);

// Messages
router.get('/threads/:id/messages', listMessages);
router.post('/threads/:id/messages', sendMessage);

// Thread deletion (student soft delete)
router.delete('/threads/:id', studentOnly(), deleteThreadForStudent);

// Thread deletion (admin hard delete)
router.delete('/admin/threads/:id', adminOnly(), deleteThreadAsAdmin);

// Admin: lock/unlock threads
router.post('/admin/threads/:id/lock', adminOnly(), lockThread);
router.post('/admin/threads/:id/unlock', adminOnly(), unlockThread);

// Thread members
router.get('/threads/:id/members', listThreadMembers);

// Message deletion
router.delete('/messages/:messageId', studentOnly(), deleteMessageForStudent);
router.delete('/admin/messages/:messageId', adminOnly(), deleteMessageAsAdmin);

// Revoke a message
router.post('/messages/:id/revoke', revokeMessage);

// Media upload
router.post('/media', chatMediaUpload.single('file'), uploadChatMedia);

export default router;
