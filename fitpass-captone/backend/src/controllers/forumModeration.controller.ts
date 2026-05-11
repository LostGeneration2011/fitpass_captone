import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

type JsonReport = {
  userId?: string;
  reason?: string;
  detail?: string;
  createdAt?: string;
  status?: string;
  reviewedAt?: string;
  reviewNote?: string | null;
  reviewedBy?: string;
};

const normalizeReportStatus = (report: JsonReport) => {
  const raw = String(report?.status || 'PENDING').toUpperCase();
  if (raw === 'REVIEWED' || raw === 'DISMISSED' || raw === 'PENDING') return raw;
  return 'PENDING';
};

const markReviewedReport = (
  reports: unknown,
  index: number | null,
  payload: { status: 'REVIEWED' | 'DISMISSED'; reviewedBy: string; reviewNote?: string }
) => {
  const current = Array.isArray(reports) ? ([...reports] as JsonReport[]) : [];
  const now = new Date().toISOString();

  const applyAt = (item: JsonReport = {}) => ({
    ...item,
    status: payload.status,
    reviewedAt: now,
    reviewedBy: payload.reviewedBy,
    reviewNote: payload.reviewNote || null,
  });

  if (index !== null && index >= 0 && index < current.length) {
    current[index] = applyAt(current[index] || {});
    return current;
  }

  // Backward-compatible fallback for legacy ids without report index.
  let updated = false;
  for (let i = 0; i < current.length; i += 1) {
    const existing = current[i] || {};
    if (normalizeReportStatus(existing) === 'PENDING') {
      current[i] = applyAt(existing);
      updated = true;
      break;
    }
  }

  if (!updated) {
    current.push(
      applyAt({
        reason: 'OTHER',
        detail: 'Reviewed from legacy report id',
        userId: undefined,
        createdAt: now,
      })
    );
  }

  return current;
};

// Report a forum post
export async function reportPost(req: Request, res: Response) {
  const { id } = req.params;
  const { reason, detail } = req.body;
  const userId = (req.user as Express.UserPayload | undefined)?.id;
  if (!userId || !reason) return res.status(400).json({ error: 'Missing data' });
  await prisma.forumPost.update({
    where: { id },
    data: {
      // For demo: store reports as JSON array in a field (or create a new model for production)
      reports: { push: { userId, reason, detail, createdAt: new Date() } },
    },
  });
  res.json({ success: true });
}

// Report a forum comment
export async function reportComment(req: Request, res: Response) {
  const { id } = req.params;
  const { reason, detail } = req.body;
  const userId = (req.user as Express.UserPayload | undefined)?.id;
  if (!userId || !reason) return res.status(400).json({ error: 'Missing data' });
  await prisma.forumComment.update({
    where: { id },
    data: {
      reports: { push: { userId, reason, detail, createdAt: new Date() } },
    },
  });
  res.json({ success: true });
}

// Hide/unhide post (admin only)
export async function hidePost(req: Request, res: Response) {
  const { id } = req.params;
  const { hide, reason } = req.body;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  const shouldHide = hide === undefined ? true : !!hide;
  await prisma.forumPost.update({
    where: { id },
    data: {
      isHidden: shouldHide,
      hiddenReason: shouldHide ? (reason || null) : null,
    },
  });
  res.json({ success: true });
}

// Hide/unhide comment (admin only)
export async function hideComment(req: Request, res: Response) {
  const { id } = req.params;
  const { hide, reason } = req.body;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  const shouldHide = hide === undefined ? true : !!hide;
  await prisma.forumComment.update({
    where: { id },
    data: {
      isHidden: shouldHide,
      hiddenReason: shouldHide ? (reason || null) : null,
    },
  });
  res.json({ success: true });
}

// Lấy danh sách report cho admin
export async function getAdminReports(req: Request, res: Response) {
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  const statusFilter = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'ALL';
  const limit = Number(req.query.limit) || 50;

  // Lấy tất cả post có report (filter bằng JS do Prisma không hỗ trợ not: [] cho Json[])
  const posts = (await prisma.forumPost.findMany({
    select: {
      id: true,
      content: true,
      authorId: true,
      createdAt: true,
      reports: true,
      isHidden: true,
    },
    orderBy: { createdAt: 'desc' },
  })).filter(post => Array.isArray(post.reports) && post.reports.length > 0);

  // Lấy tất cả comment có report (filter bằng JS)
  const comments = (await prisma.forumComment.findMany({
    select: {
      id: true,
      content: true,
      authorId: true,
      postId: true,
      createdAt: true,
      reports: true,
      isHidden: true,
    },
    orderBy: { createdAt: 'desc' },
  })).filter(comment => Array.isArray(comment.reports) && comment.reports.length > 0);

  const reporterIds = new Set<string>();
  const reviewerIds = new Set<string>();

  posts.forEach((post) => {
    (post.reports as JsonReport[]).forEach((report) => {
      if (report?.userId) reporterIds.add(report.userId);
      if (report?.reviewedBy) reviewerIds.add(report.reviewedBy);
    });
  });
  comments.forEach((comment) => {
    (comment.reports as JsonReport[]).forEach((report) => {
      if (report?.userId) reporterIds.add(report.userId);
      if (report?.reviewedBy) reviewerIds.add(report.reviewedBy);
    });
  });

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set([...reporterIds, ...reviewerIds])) } },
    select: { id: true, fullName: true, role: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const postReports = posts.flatMap((post) =>
    (post.reports as JsonReport[]).map((report, index) => ({
      id: `post:${post.id}:${index}`,
      reason: report?.reason || 'OTHER',
      detail: report?.detail || null,
      status: normalizeReportStatus(report),
      createdAt: report?.createdAt || post.createdAt,
      reviewedAt: report?.reviewedAt || null,
      reviewNote: report?.reviewNote || null,
      targetType: 'POST',
      reporter: report?.userId
        ? {
            id: report.userId,
            fullName: userById.get(report.userId)?.fullName || 'Thành viên',
            role: userById.get(report.userId)?.role || 'STUDENT',
          }
        : null,
      reviewer: report?.reviewedBy
        ? {
            id: report.reviewedBy,
            fullName: userById.get(report.reviewedBy)?.fullName || 'Admin',
          }
        : null,
      post: {
        id: post.id,
        content: post.content,
      },
    }))
  );

  const commentReports = comments.flatMap((comment) =>
    (comment.reports as JsonReport[]).map((report, index) => ({
      id: `comment:${comment.id}:${index}`,
      reason: report?.reason || 'OTHER',
      detail: report?.detail || null,
      status: normalizeReportStatus(report),
      createdAt: report?.createdAt || comment.createdAt,
      reviewedAt: report?.reviewedAt || null,
      reviewNote: report?.reviewNote || null,
      targetType: 'COMMENT',
      reporter: report?.userId
        ? {
            id: report.userId,
            fullName: userById.get(report.userId)?.fullName || 'Thành viên',
            role: userById.get(report.userId)?.role || 'STUDENT',
          }
        : null,
      reviewer: report?.reviewedBy
        ? {
            id: report.reviewedBy,
            fullName: userById.get(report.reviewedBy)?.fullName || 'Admin',
          }
        : null,
      comment: {
        id: comment.id,
        content: comment.content,
      },
    }))
  );

  const mergedReports = [...postReports, ...commentReports]
    .filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  res.json({
    data: mergedReports,
    posts,
    comments,
  });
}

// Lấy tất cả bài viết trên forum cho admin (kể cả bài ẩn)
export async function getAllPostsForAdmin(req: Request, res: Response) {
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  try {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const limit = Number(req.query.limit) || 30;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    const where = status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)
      ? { moderationStatus: status as 'PENDING' | 'APPROVED' | 'REJECTED' }
      : undefined;

    const posts = await prisma.forumPost.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true, role: true, email: true } },
        comments: true,
        reactions: true,
        images: true,
      },
    });

    const hasNextPage = posts.length > limit;
    const data = hasNextPage ? posts.slice(0, limit) : posts;
    const nextCursor = hasNextPage ? data[data.length - 1]?.id : null;

    res.json({
      success: true,
      data,
      paging: {
        hasNextPage,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('Get all forum posts (admin) error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách bài viết forum' });
  }
}

export async function getAdminPostDetail(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, fullName: true, avatar: true, role: true, email: true } },
      images: true,
      comments: {
        include: { author: { select: { id: true, fullName: true, avatar: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      reactions: true,
    },
  });

  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
}

export async function reviewPostModeration(req: Request, res: Response) {
  const { id } = req.params;
  const { action, reason } = req.body;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  if (!id || !action || !['approve', 'reject'].includes(String(action).toLowerCase())) {
    return res.status(400).json({ error: 'Invalid moderation action' });
  }

  const moderationStatus = String(action).toLowerCase() === 'approve' ? 'APPROVED' : 'REJECTED';

  await prisma.forumPost.update({
    where: { id },
    data: {
      moderationStatus,
      moderationNote: reason || null,
      moderatedAt: new Date(),
      isHidden: moderationStatus === 'REJECTED' ? true : false,
    },
  });

  res.json({ success: true, moderationStatus });
}

// Unhide a forum post (admin only)
export async function unhidePost(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumPost.update({ where: { id }, data: { isHidden: false, hiddenReason: null } });
  res.json({ success: true });
}

// Unhide a forum comment (admin only)
export async function unhideComment(req: Request, res: Response) {
  const { id } = req.params;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  await prisma.forumComment.update({ where: { id }, data: { isHidden: false, hiddenReason: null } });
  res.json({ success: true });
}

// Review a report (admin only) — action: 'hide' | 'unhide' | 'dismiss'
export async function reviewReport(req: Request, res: Response) {
  const { id } = req.params;
  const { action, contentType, reviewNote, hideContent } = req.body;
  const user = req.user as Express.UserPayload | undefined;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  try {
    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    // Accept both legacy route params and new synthetic ids: post:<id>:<index>, comment:<id>:<index>
    const parsed = String(id).split(':');
    const parsedType = parsed.length >= 2 && (parsed[0] === 'post' || parsed[0] === 'comment') ? parsed[0] : null;
    const parsedTargetId = parsedType ? parsed[1] : id;
    const parsedReportIndex = parsedType && parsed.length >= 3 ? Number(parsed[2]) : null;
    const reportIndex = Number.isInteger(parsedReportIndex) ? (parsedReportIndex as number) : null;
    const normalizedContentType = typeof contentType === 'string' ? contentType.toLowerCase() : contentType;
    const targetType = normalizedContentType || parsedType;

    let normalizedAction = String(action).toLowerCase();
    if (action === 'REVIEWED') {
      normalizedAction = hideContent ? 'hide' : 'dismiss';
    }
    if (action === 'DISMISSED') {
      normalizedAction = 'dismiss';
    }

    if (!targetType || !['post', 'comment'].includes(targetType)) {
      return res.status(400).json({ error: 'contentType must be post or comment' });
    }

    if (targetType === 'post') {
      const post = await prisma.forumPost.findUnique({ where: { id: parsedTargetId }, select: { reports: true } });
      if (!post) return res.status(404).json({ error: 'Post not found' });

      const nextStatus = normalizedAction === 'dismiss' ? 'DISMISSED' : 'REVIEWED';
      const reviewedReports = markReviewedReport(post.reports, reportIndex, {
        status: nextStatus,
        reviewedBy: user.id,
        reviewNote,
      });

      if (normalizedAction === 'hide') {
        await prisma.forumPost.update({
          where: { id: parsedTargetId },
          data: {
            isHidden: true,
            hiddenReason: reviewNote || 'Đã ẩn sau khi xử lý báo cáo',
            reports: reviewedReports,
          },
        });
      } else if (normalizedAction === 'unhide') {
        await prisma.forumPost.update({
          where: { id: parsedTargetId },
          data: {
            isHidden: false,
            hiddenReason: null,
            reports: reviewedReports,
          },
        });
      } else if (normalizedAction === 'dismiss') {
        await prisma.forumPost.update({
          where: { id: parsedTargetId },
          data: { reports: reviewedReports },
        });
      }
    } else if (targetType === 'comment') {
      const comment = await prisma.forumComment.findUnique({ where: { id: parsedTargetId }, select: { reports: true } });
      if (!comment) return res.status(404).json({ error: 'Comment not found' });

      const nextStatus = normalizedAction === 'dismiss' ? 'DISMISSED' : 'REVIEWED';
      const reviewedReports = markReviewedReport(comment.reports, reportIndex, {
        status: nextStatus,
        reviewedBy: user.id,
        reviewNote,
      });

      if (normalizedAction === 'hide') {
        await prisma.forumComment.update({
          where: { id: parsedTargetId },
          data: {
            isHidden: true,
            hiddenReason: reviewNote || 'Đã ẩn sau khi xử lý báo cáo',
            reports: reviewedReports,
          },
        });
      } else if (normalizedAction === 'unhide') {
        await prisma.forumComment.update({
          where: { id: parsedTargetId },
          data: {
            isHidden: false,
            hiddenReason: null,
            reports: reviewedReports,
          },
        });
      } else if (normalizedAction === 'dismiss') {
        await prisma.forumComment.update({
          where: { id: parsedTargetId },
          data: { reports: reviewedReports },
        });
      }
    }

    res.json({ success: true, action: normalizedAction, reviewNote });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
