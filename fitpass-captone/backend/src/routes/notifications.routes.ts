import { Router } from 'express';

const router = Router();

// GET /api/notifications/unread/count - Get unread notification count for current user
router.get('/unread/count', async (req, res) => {
  // TODO: Lấy userId từ xác thực nếu có
  // const userId = req.user?.id;
  // Truy vấn DB để lấy số lượng thông báo chưa đọc của user
  // const count = await prisma.notification.count({ where: { userId, read: false } });
  // res.json({ count });

  // Tạm thời trả về 0 để FE không lỗi
  res.json({ count: 0 });
});

// GET /api/notifications - Get all notifications for current user
router.get('/', async (req, res) => {
  // TODO: Lấy userId từ xác thực nếu có
  // const userId = req.user?.id;
  // Truy vấn DB để lấy danh sách thông báo của user
  // const notifications = await prisma.notification.findMany({ where: { userId } });
  // res.json({ notifications });

  // Tạm thời trả về mảng rỗng để FE không lỗi
  res.json({ notifications: [] });
});

export default router;
