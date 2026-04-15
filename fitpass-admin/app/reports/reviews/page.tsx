"use client";

import { useEffect, useMemo, useState } from "react";
import { reviewModerationAPI } from "@/lib/api";

export default function ReviewModerationPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<"all" | "visible" | "hidden">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const normalizeReviewsPayload = (payload: any) => {
    if (!payload) {
      return { rows: [], currentPage: 1, maxPages: 1 };
    }

    const nested = payload?.data;
    const rows =
      (Array.isArray(payload?.data) && payload.data) ||
      (Array.isArray(payload) && payload) ||
      (Array.isArray(nested?.data) && nested.data) ||
      (Array.isArray(nested?.reviews) && nested.reviews) ||
      (Array.isArray(payload?.reviews) && payload.reviews) ||
      [];

    const paging = payload?.pagination || nested?.pagination || {};
    return {
      rows,
      currentPage: paging?.page,
      maxPages: paging?.totalPages,
    };
  };

  const fetchReviews = async (
    nextPage = 1,
    filters?: Partial<{
      status: "all" | "visible" | "hidden";
      sort: "newest" | "oldest" | "highest" | "lowest";
      search: string;
    }>
  ) => {
    const nextFilters = {
      status,
      sort,
      search,
      ...filters,
    };

    setLoading(true);
    setError("");
    try {
      const res = await reviewModerationAPI.list({
        page: nextPage,
        limit: 20,
        status: nextFilters.status,
        sort: nextFilters.sort,
        search: nextFilters.search || undefined,
      });

      const normalized = normalizeReviewsPayload(res);
      setReviews(normalized.rows);
      setPage(normalized.currentPage || nextPage);
      setTotalPages(normalized.maxPages || 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [status, sort]);

  const handleResetFilters = () => {
    setStatus('all');
    setSort('newest');
    setSearch('');
    fetchReviews(1, { status: 'all', sort: 'newest', search: '' });
  };

  const handleModerate = async (id: string, isHidden: boolean) => {
    try {
      setActionLoading(id);
      await reviewModerationAPI.moderate(id, { isHidden, moderationReason: isHidden ? "Ẩn do vi phạm" : "Hiển thị lại" });
      await fetchReviews(page);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to update review");
    } finally {
      setActionLoading(null);
    }
  };

  const tableRows = useMemo(() => reviews || [], [reviews]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">🛡️ Kiểm duyệt đánh giá</h1>
        <p className="text-gray-600 dark:text-gray-400">Ẩn/hiện review để đảm bảo chất lượng nội dung</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bộ lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả</option>
              <option value="visible">Đang hiển thị</option>
              <option value="hidden">Đang ẩn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sắp xếp</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="highest">Điểm cao</option>
              <option value="lowest">Điểm thấp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tìm kiếm</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên lớp, giáo viên, học viên..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => fetchReviews(1)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Áp dụng
            </button>
            <button
              onClick={handleResetFilters}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-100 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lớp học</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Giáo viên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Học viên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nội dung</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    Không có đánh giá phù hợp
                  </td>
                </tr>
              ) : (
                tableRows.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/70">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{review.class?.name || "N/A"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(review.createdAt).toLocaleDateString("vi-VN")}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{review.class?.teacher?.fullName || "N/A"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{review.class?.teacher?.email || ""}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{review.student?.fullName || "N/A"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{review.student?.email || ""}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        ⭐ {review.rating}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{review.comment || "(Không có bình luận)"}</p>
                      {review.replyText ? (
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-2 line-clamp-2">
                          ↳ Phản hồi GV: {review.replyText}
                        </p>
                      ) : null}
                      {review.isHidden ? (
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">Đang ẩn</p>
                      ) : (
                        <p className="text-xs text-green-600 dark:text-green-300 mt-1">Đang hiển thị</p>
                      )}
                      {review.moderationReason ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lý do: {review.moderationReason}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {review.isHidden ? (
                        <button
                          onClick={() => handleModerate(review.id, false)}
                          disabled={actionLoading === review.id}
                          className="px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                        >
                          {actionLoading === review.id ? "Đang xử lý" : "Hiển thị"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleModerate(review.id, true)}
                          disabled={actionLoading === review.id}
                          className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                        >
                          {actionLoading === review.id ? "Đang xử lý" : "Ẩn"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Trang {page} / {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => page > 1 && fetchReviews(page - 1)}
              disabled={page <= 1}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Trước
            </button>
            <button
              onClick={() => page < totalPages && fetchReviews(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
