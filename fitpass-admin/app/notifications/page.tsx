'use client';

import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Bell, Trash2, Check, Mail } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
  };
}

const NOTIFICATION_TYPES = {
  CLASS_APPROVED: { label: 'Lớp được phê duyệt', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  CLASS_REJECTED: { label: 'Lớp bị từ chối', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  ENROLLMENT_CONFIRMED: { label: 'Đăng ký xác nhận', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  ATTENDANCE_MARKED: { label: 'Điểm danh', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200' },
  PAYMENT_SUCCESS: { label: 'Thanh toán thành công', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  PAYMENT_FAILED: { label: 'Thanh toán thất bại', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  SALARY_READY: { label: 'Lương sẵn sàng', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  SESSION_UPCOMING: { label: 'Lớp sắp bắt đầu', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' },
  SESSION_REMINDER: { label: 'Nhắc nhở lớp', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200' },
  ENROLLMENT_CANCELLED: { label: 'Đăng ký bị hủy', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  REFUND_PROCESSED: { label: 'Hoàn tiền', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
  ADMIN_ALERT: { label: 'Cảnh báo', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
  GENERAL_NOTICE: { label: 'Thông báo chung', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedType, setSelectedType] = useState<string>('');
  const { showToast } = useToast();

  const emitUnreadCount = (count: number) => {
    window.dispatchEvent(
      new CustomEvent('notifications:unread-changed', {
        detail: { unreadCount: count },
      })
    );
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/notifications');
      const normalized = Array.isArray(data) ? data : data.data || [];
      setNotifications(normalized);
      emitUnreadCount(normalized.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      showToast('Không thể tải danh sách thông báo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiPatch(`/notifications/${id}/read`, {});
      setNotifications(prev => {
        const updated = prev.map(n => (n.id === id ? { ...n, isRead: true } : n));
        emitUnreadCount(updated.filter(n => !n.isRead).length);
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
      showToast('Không thể đánh dấu đã đọc', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/notifications/${id}`);
      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== id);
        emitUnreadCount(updated.filter(n => !n.isRead).length);
        return updated;
      });
      showToast('Đã xóa thông báo', 'success');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      showToast('Không thể xóa thông báo', 'error');
    }
  };

  const handleBroadcast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await apiPost('/notifications/broadcast', {
        type: formData.get('type'),
        title: formData.get('title'),
        body: formData.get('body'),
        targetRole: formData.get('targetRole'),
      });
      showToast('Thông báo đã được gửi thành công', 'success');
      (e.target as HTMLFormElement).reset();
      loadNotifications();
    } catch (error) {
      console.error('Failed to broadcast:', error);
      showToast('Gửi thông báo thất bại', 'error');
    }
  };

  const filteredNotifications = notifications
    .filter(n => (filter === 'unread' ? !n.isRead : true))
    .filter(n => (selectedType ? n.type === selectedType : true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 p-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Quản lý Thông báo</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Tổng cộng: {notifications.length} | Chưa đọc: {unreadCount}</p>
          </div>
        </div>
      </div>

      {/* Broadcast Form */}
      <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 mb-4 dark:text-gray-100">Gửi Thông báo cho Người dùng</h2>
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Loại Thông báo
              </label>
              <select
                name="type"
                required
                defaultValue="GENERAL_NOTICE"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="CLASS_APPROVED">Lớp được phê duyệt</option>
                <option value="CLASS_REJECTED">Lớp bị từ chối</option>
                <option value="ENROLLMENT_CONFIRMED">Đăng ký xác nhận</option>
                <option value="ATTENDANCE_MARKED">Điểm danh</option>
                <option value="PAYMENT_SUCCESS">Thanh toán thành công</option>
                <option value="PAYMENT_FAILED">Thanh toán thất bại</option>
                <option value="SALARY_READY">Lương sẵn sàng</option>
                <option value="SESSION_UPCOMING">Lớp sắp bắt đầu</option>
                <option value="ADMIN_ALERT">Cảnh báo</option>
                <option value="GENERAL_NOTICE">Thông báo chung</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
                Gửi tới
              </label>
              <select
                name="targetRole"
                defaultValue="ALL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="ALL">Tất cả Người dùng</option>
                <option value="ADMIN">Admin</option>
                <option value="TEACHER">Giáo viên</option>
                <option value="STUDENT">Học viên</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Tiêu đề
            </label>
            <input
              type="text"
              name="title"
              required
              maxLength={100}
              placeholder="Tiêu đề thông báo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Nội dung
            </label>
            <textarea
              name="body"
              required
              rows={3}
              maxLength={200}
              placeholder="Nội dung thông báo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition"
          >
            Gửi Thông báo
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md font-medium transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-md font-medium transition ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Chưa đọc ({unreadCount})
        </button>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">Tất cả Loại</option>
          {Object.entries(NOTIFICATION_TYPES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin">⏳</div>
            <p className="text-gray-600 text-sm mt-2 dark:text-gray-300">Đang tải...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center dark:bg-gray-800 dark:border dark:border-gray-700">
            <Bell className="h-12 w-12 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 text-lg dark:text-gray-300">Không có thông báo</p>
          </div>
        ) : (
          filteredNotifications.map(notification => {
            const typeInfo = NOTIFICATION_TYPES[notification.type as keyof typeof NOTIFICATION_TYPES] || 
                            NOTIFICATION_TYPES.GENERAL_NOTICE;
            return (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow p-4 border-l-4 dark:bg-gray-800 dark:border dark:border-gray-700 ${
                  notification.isRead ? 'border-gray-300 dark:border-gray-600' : 'border-blue-500 dark:border-blue-400'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      {!notification.isRead && (
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{notification.title}</h3>
                    <p className="text-gray-600 text-sm mt-1 dark:text-gray-300">{notification.body}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>Người dùng: {notification.user?.fullName || 'N/A'}</span>
                      <span>({notification.user?.email || 'N/A'})</span>
                      <span>{new Date(notification.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        title="Đánh dấu đã đọc"
                        className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded transition"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      title="Xóa"
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
