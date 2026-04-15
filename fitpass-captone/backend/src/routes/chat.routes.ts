import { editMessage } from '../controllers/chat.controller';
// Edit message
router.put('/messages/:messageId', editMessage);
import { markThreadAsRead } from '../controllers/chat.controller';
// Mark thread as read
router.post('/threads/:id/read', markThreadAsRead);
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

// Message deletion
router.delete('/messages/:messageId', studentOnly(), deleteMessageForStudent);
router.delete('/admin/messages/:messageId', adminOnly(), deleteMessageAsAdmin);

export default router;
