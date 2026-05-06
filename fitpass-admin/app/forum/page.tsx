"use client";

import { useEffect, useRef, useState } from "react";
import { forumModerationAPI } from "@/lib/api";

const getForumImageUrl = (url: string): string => {
  if (!url) return '';
  let fullUrl = url;
  if (!url.startsWith('http')) {
    const cachedApiUrl = typeof window !== 'undefined' ? localStorage.getItem('fitpass_api_url') : null;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
      cachedApiUrl ||
      (typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api'
        : typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3001/api');
    const baseUrl = apiUrl.replace(/\/?api$/, '');
    fullUrl = `${baseUrl}${url}`;
  }
  // Route through proxy to bypass ngrok browser warning
  if (fullUrl.includes('ngrok')) {
    return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
};

type ForumImage = {
  id: string;
  url: string;
  order: number;
};

type ForumPost = {
  id: string;
  content: string;
  moderationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  moderationNote?: string | null;
  moderatedAt?: string | null;
  isHidden: boolean;
  hiddenReason?: string | null;
  createdAt: string;
  images?: ForumImage[];
  author?: {
    id: string;
    fullName: string;
    role: string;
  };
  _count?: {
    comments?: number;
    reactions?: number;
  };
};

type ForumComment = {
  id: string;
  content: string;
  isHidden: boolean;
  hiddenReason?: string | null;
  createdAt: string;
  author?: {
    id: string;
    fullName: string;
    role: string;
  };
};

type ForumReport = {
  id: string;
  reason: string;
  detail?: string | null;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  targetType: string;
  reporter?: {
    id: string;
    fullName: string;
    role: string;
  };
  reviewer?: {
    id: string;
    fullName: string;
  } | null;
  post?: {
    id: string;
    content: string;
    author?: { fullName: string };
  } | null;
  comment?: {
    id: string;
    content: string;
    author?: { fullName: string };
  } | null;
};

export default function ForumModerationPage() {
  const [activeTab, setActiveTab] = useState<"posts" | "reports">("posts");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [postVisibilityFilter, setPostVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [moderationFilter, setModerationFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "all">("PENDING");
  const [showHiddenOnlyComments, setShowHiddenOnlyComments] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reports, setReports] = useState<ForumReport[]>([]);
  const [reportFilter, setReportFilter] = useState<"all" | "PENDING" | "REVIEWED" | "DISMISSED">("all");
  const [reportActionKey, setReportActionKey] = useState<string | null>(null);
  const [detailPanelHighlighted, setDetailPanelHighlighted] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const detailHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPosts = async (opts?: { append?: boolean; cursor?: string | null }) => {
    const append = opts?.append === true;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await forumModerationAPI.listPosts({
        limit: 30,
        cursor: opts?.cursor || undefined,
        status: moderationFilter,
      });
      const nextPosts = Array.isArray(res?.data) ? res.data : [];

      setPosts((prev) => {
        if (!append) return nextPosts;
        const merged = [...prev, ...nextPosts];
        const dedup = new Map((Array.isArray(merged) ? merged : []).map((item) => [item.id, item]));
        return Array.from(dedup.values());
      });

      setNextCursor(res?.paging?.nextCursor || null);
      setHasNextPage(Boolean(res?.paging?.hasNextPage));

      if (!append && selectedPostId && !nextPosts.some((post: ForumPost) => post.id === selectedPostId)) {
        setSelectedPostId(null);
        setComments([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không tải được forum");
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadPostDetail = async (postId: string) => {
    setSelectedPostId(postId);
    setComments([]);
    setDetailLoading(true);
    try {
      const res = await forumModerationAPI.getPostDetail(postId);
      setComments(Array.isArray(res?.data?.comments) ? res.data.comments : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không tải được chi tiết bài viết");
    } finally {
      setDetailLoading(false);
    }
  };

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await forumModerationAPI.listReports({
        status: reportFilter === "all" ? undefined : reportFilter,
        limit: 50,
      });
      setReports(Array.isArray(res?.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không tải được danh sách báo cáo");
    } finally {
      setReportsLoading(false);
    }
  };

  const reviewReport = async (reportId: string, action: "REVIEWED" | "DISMISSED", hideContent?: boolean) => {
    setError("");
    setReportActionKey(`report:${reportId}`);
    try {
      const reviewNote = action === "REVIEWED" && hideContent ? 
        window.prompt("Ghi chú cho báo cáo này (tùy chọn):") ?? undefined : 
        undefined;
      
      await forumModerationAPI.reviewReport(reportId, {
        action,
        hideContent,
        reviewNote: reviewNote?.trim() || undefined,
      });
      
      await loadReports();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không xử lý được báo cáo");
    } finally {
      setReportActionKey(null);
    }
  };

  useEffect(() => {
    if (activeTab === "posts") {
      loadPosts();
    }
  }, [activeTab, moderationFilter]);

  useEffect(() => {
    loadReports();
  }, [reportFilter]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadReports();
    }, 20000);

    return () => clearInterval(intervalId);
  }, [reportFilter]);

  useEffect(() => {
    if (activeTab !== "posts" || !selectedPostId) return;

    const timerId = setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setDetailPanelHighlighted(true);

      if (detailHighlightTimeoutRef.current) {
        clearTimeout(detailHighlightTimeoutRef.current);
      }

      detailHighlightTimeoutRef.current = setTimeout(() => {
        setDetailPanelHighlighted(false);
      }, 1400);
    }, 50);

    return () => clearTimeout(timerId);
  }, [activeTab, selectedPostId]);

  useEffect(() => {
    return () => {
      if (detailHighlightTimeoutRef.current) {
        clearTimeout(detailHighlightTimeoutRef.current);
      }
    };
  }, []);

  const pendingReportCount = reports.filter((report) => report.status === "PENDING").length;

  const normalizedSearch = searchKeyword.trim().toLowerCase();

  const filteredPosts = posts.filter((post) => {
    const matchesVisibility =
      postVisibilityFilter === "all" ||
      (postVisibilityFilter === "hidden" && post.isHidden) ||
      (postVisibilityFilter === "visible" && !post.isHidden);

    if (!matchesVisibility) return false;

    if (!normalizedSearch) return true;

    const authorName = (post.author?.fullName || "").toLowerCase();
    const content = (post.content || "").toLowerCase();
    return authorName.includes(normalizedSearch) || content.includes(normalizedSearch);
  });

  const filteredComments = showHiddenOnlyComments ? comments.filter((comment) => comment.isHidden) : comments;

  const selectedPost = selectedPostId ? posts.find((post) => post.id === selectedPostId) || null : null;

  const refreshPostsAndDetail = async (postIdForDetail?: string) => {
    await loadPosts();
    const targetPostId = postIdForDetail || selectedPostId;
    if (targetPostId) {
      await loadPostDetail(targetPostId);
    }
  };

  const togglePostVisibility = async (post: ForumPost) => {
    setError("");
    setActionLoadingKey(`post:${post.id}`);
    try {
      if (post.isHidden) {
        await forumModerationAPI.unhidePost(post.id);
      } else {
        const reasonInput = window.prompt("Lý do ẩn bài (tùy chọn):");
        if (reasonInput === null) {
          return;
        }
        const reason = reasonInput.trim() || undefined;
        await forumModerationAPI.hidePost(post.id, reason);
      }
      await refreshPostsAndDetail(post.id);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không cập nhật được trạng thái bài");
    } finally {
      setActionLoadingKey(null);
    }
  };

  const reviewPost = async (post: ForumPost, action: "approve" | "reject") => {
    setError("");
    setActionLoadingKey(`review:${post.id}`);
    try {
      let reason: string | undefined;
      if (action === "reject") {
        const reasonInput = window.prompt("Lý do từ chối bài viết (tuỳ chọn):");
        if (reasonInput === null) return;
        reason = reasonInput.trim() || undefined;
      }

      await forumModerationAPI.reviewPost(post.id, action, reason);
      await refreshPostsAndDetail();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không duyệt được bài viết");
    } finally {
      setActionLoadingKey(null);
    }
  };

  const toggleCommentVisibility = async (comment: ForumComment) => {
    setError("");
    setActionLoadingKey(`comment:${comment.id}`);
    try {
      if (comment.isHidden) {
        await forumModerationAPI.unhideComment(comment.id);
      } else {
        const reasonInput = window.prompt("Lý do ẩn bình luận (tùy chọn):");
        if (reasonInput === null) {
          return;
        }
        const reason = reasonInput.trim() || undefined;
        await forumModerationAPI.hideComment(comment.id, reason);
      }
      await refreshPostsAndDetail();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không cập nhật được trạng thái bình luận");
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || !hasNextPage || loadingMore) return;
    await loadPosts({ append: true, cursor: nextCursor });
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Forum Moderation</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "posts"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Bài viết
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "reports"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Báo cáo ({reports.length}){pendingReportCount > 0 ? ` • Chờ xử lý: ${pendingReportCount}` : ""}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              onClick={() => activeTab === "posts" ? refreshPostsAndDetail() : loadReports()}
            >
              Làm mới
            </button>
          </div>
        </div>

        {activeTab === "posts" && (
        <>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tác giả hoặc nội dung bài..."
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <select
            value={postVisibilityFilter}
            onChange={(e) => setPostVisibilityFilter(e.target.value as "all" | "visible" | "hidden")}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả bài viết</option>
            <option value="visible">Chỉ bài đang hiển thị</option>
            <option value="hidden">Chỉ bài đang ẩn</option>
          </select>

          <select
            value={moderationFilter}
            onChange={(e) => setModerationFilter(e.target.value as "PENDING" | "APPROVED" | "REJECTED" | "all")}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="all">Tất cả trạng thái</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center md:justify-end">
            Hiển thị {filteredPosts.length}/{posts.length} bài
          </div>
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-gray-500">Đang tải...</div>
        ) : (
          <div className="space-y-3">
            {(Array.isArray(filteredPosts) ? filteredPosts : []).map((post) => (
              <div key={post.id} className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-black dark:text-white">
                      {post.author?.fullName || "Thành viên"}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString("vi-VN")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${post.isHidden ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`}>
                      {post.isHidden ? "Đang ẩn" : "Hiển thị"}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      post.moderationStatus === "PENDING"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        : post.moderationStatus === "REJECTED"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    }`}>
                      {post.moderationStatus === "PENDING"
                        ? "Chờ duyệt"
                        : post.moderationStatus === "REJECTED"
                        ? "Đã từ chối"
                        : "Đã duyệt"}
                    </span>
                    <button
                      className={`px-3 py-1 rounded ${selectedPostId === post.id ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
                      onClick={() => loadPostDetail(post.id)}
                    >
                      Chi tiết
                    </button>
                    <button
                      disabled={actionLoadingKey === `post:${post.id}`}
                      className={`px-3 py-1 rounded text-white ${post.isHidden ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                      onClick={() => togglePostVisibility(post)}
                    >
                      {actionLoadingKey === `post:${post.id}` ? "Đang xử lý..." : post.isHidden ? "Bỏ ẩn" : "Ẩn"}
                    </button>
                    {post.moderationStatus === "PENDING" && (
                      <>
                        <button
                          disabled={actionLoadingKey === `review:${post.id}`}
                          className="px-3 py-1 rounded text-white bg-blue-600 hover:bg-blue-700"
                          onClick={() => reviewPost(post, "approve")}
                        >
                          {actionLoadingKey === `review:${post.id}` ? "Đang xử lý..." : "Duyệt"}
                        </button>
                        <button
                          disabled={actionLoadingKey === `review:${post.id}`}
                          className="px-3 py-1 rounded text-white bg-orange-600 hover:bg-orange-700"
                          onClick={() => reviewPost(post, "reject")}
                        >
                          {actionLoadingKey === `review:${post.id}` ? "Đang xử lý..." : "Từ chối"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</div>
                {post.images && post.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Array.isArray(post.images) ? post.images : []).map((image) => {
                      const resolvedUrl = getForumImageUrl(image.url);
                      // For the href link, use the original URL or the resolved one (not proxy)
                      const hrefUrl = image.url.startsWith('http') ? image.url : getForumImageUrl(image.url);
                      return (
                        <a
                          key={image.id}
                          href={hrefUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-md overflow-hidden border border-gray-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolvedUrl}
                            alt="forum post"
                            className="w-full h-24 object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </a>
                      );
                    })}
                  </div>
                )}
                {post.isHidden && post.hiddenReason && (
                  <div className="mt-2 text-xs text-red-700">Lý do ẩn: {post.hiddenReason}</div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  💬 {post._count?.comments || 0} • ❤️ {post._count?.reactions || 0}
                </div>
              </div>
            ))}
            {filteredPosts.length === 0 && (
              <div className="text-gray-500">Không có bài viết phù hợp bộ lọc.</div>
            )}

            {hasNextPage && (
              <div className="pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-60"
                >
                  {loadingMore ? "Đang tải thêm..." : "Tải thêm bài viết"}
                </button>
              </div>
            )}
          </div>
        )}
        </>
        )}

        {activeTab === "reports" && (
        <>
        <div className="mb-4">
          <select
            value={reportFilter}
            onChange={(e) => setReportFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-2"
          >
            <option value="all">Tất cả báo cáo</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="REVIEWED">Đã xử lý</option>
            <option value="DISMISSED">Đã bỏ qua</option>
          </select>
          <span className="text-sm text-gray-600 ml-2">Tổng cộng: {reports.length}</span>
        </div>

        {error && (
          <div className="alert mb-4 rounded-lg border border-danger bg-danger bg-opacity-10 px-4 py-3 text-danger">
            {error}
          </div>
        )}

        {reportsLoading ? (
          <div className="py-10 text-center text-gray-500">Đang tải...</div>
        ) : reports.length === 0 ? (
          <div className="py-10 text-center text-gray-500">Không có báo cáo.</div>
        ) : (
          <div className="space-y-3">
            {(Array.isArray(reports) ? reports : []).map((report) => (
              <div key={report.id} className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="font-medium text-black dark:text-white">
                      {report.reporter?.fullName || "Thành viên"} báo cáo
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {report.targetType === "POST" ? "Bài viết" : "Bình luận"} • Lý do: <span className="font-medium">{report.reason}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(report.createdAt).toLocaleString("vi-VN")}</div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    report.status === "PENDING" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
                    report.status === "REVIEWED" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
                    "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}>
                    {report.status === "PENDING" ? "Chờ xử lý" : report.status === "REVIEWED" ? "Đã xử lý" : "Đã bỏ qua"}
                  </span>
                </div>

                {report.detail && (
                  <div className="mb-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 p-2 rounded">
                    <strong>Mô tả:</strong> {report.detail}
                  </div>
                )}

                <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800/60 rounded text-sm">
                  <div className="font-medium text-gray-900 mb-1">
                    {report.targetType}: {report.post?.author?.fullName || report.comment?.author?.fullName || "Thành viên"}
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap line-clamp-2">
                    {report.post?.content || report.comment?.content}
                  </div>
                </div>

                {report.status !== "PENDING" && (
                  <div className="mb-2 text-xs text-gray-600">
                    <strong>Xử lý bởi:</strong> {report.reviewer?.fullName || "N/A"} • {report.reviewedAt ? new Date(report.reviewedAt).toLocaleString("vi-VN") : "N/A"}
                    {report.reviewNote && <div className="mt-1"><strong>Ghi chú:</strong> {report.reviewNote}</div>}
                  </div>
                )}

                {report.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      disabled={reportActionKey === `report:${report.id}`}
                      onClick={() => reviewReport(report.id, "REVIEWED", true)}
                      className="px-3 py-1 rounded text-white bg-red-600 hover:bg-red-700 text-sm"
                    >
                      {reportActionKey === `report:${report.id}` ? "Đang xử lý..." : "Ẩn + Xác nhận"}
                    </button>
                    <button
                      disabled={reportActionKey === `report:${report.id}`}
                      onClick={() => reviewReport(report.id, "DISMISSED")}
                      className="px-3 py-1 rounded text-gray-800 bg-gray-300 hover:bg-gray-400 text-sm"
                    >
                      {reportActionKey === `report:${report.id}` ? "Đang xử lý..." : "Bỏ qua"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>

      {activeTab === "posts" && selectedPostId && (
        <div
          ref={detailPanelRef}
          className={`card transition-all duration-500 ${detailPanelHighlighted ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""}`}
        >
          <div className="card-header">
            <h3 className="card-title">Bình luận của bài đang chọn</h3>
            <div className="flex items-center gap-2">
              <button
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${showHiddenOnlyComments ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
                onClick={() => setShowHiddenOnlyComments((prev) => !prev)}
              >
                {showHiddenOnlyComments ? "Đang lọc bình luận ẩn" : "Chỉ bình luận ẩn"}
              </button>
              <button
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => {
                  setSelectedPostId(null);
                  setComments([]);
                }}
              >
                Đóng chi tiết
              </button>
            </div>
          </div>

          {selectedPost && (
            <div className="mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedPost.author?.fullName || "Thành viên"}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{selectedPost.content}</div>
              <div className="text-xs text-gray-500 mt-2">{new Date(selectedPost.createdAt).toLocaleString("vi-VN")}</div>
            </div>
          )}

          <div className="space-y-3">
            {detailLoading ? (
              <div className="text-gray-500">Đang tải bình luận...</div>
            ) : filteredComments.length === 0 ? (
              <div className="text-gray-500">Chưa có bình luận.</div>
            ) : (
              (Array.isArray(filteredComments) ? filteredComments : []).map((comment) => (
                <div key={comment.id} className="rounded-lg border border-stroke p-3 dark:border-strokedark">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-black dark:text-white">{comment.author?.fullName || "Thành viên"}</div>
                      <div className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString("vi-VN")}</div>
                    </div>
                    <button
                      disabled={actionLoadingKey === `comment:${comment.id}`}
                      className={`px-3 py-1 rounded text-white ${comment.isHidden ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                      onClick={() => toggleCommentVisibility(comment)}
                    >
                      {actionLoadingKey === `comment:${comment.id}` ? "Đang xử lý..." : comment.isHidden ? "Bỏ ẩn" : "Ẩn"}
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</div>
                  {comment.isHidden && comment.hiddenReason && (
                    <div className="mt-2 text-xs text-red-700">Lý do ẩn: {comment.hiddenReason}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
