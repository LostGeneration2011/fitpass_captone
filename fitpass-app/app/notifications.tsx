import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { notificationAPI } from '../lib/api';
import { useTheme } from '../lib/theme';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

const NOTIFICATION_TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  CLASS_APPROVED: { color: '#10b981', icon: '✅', label: 'Lớp được phê duyệt' },
  CLASS_REJECTED: { color: '#ef4444', icon: '❌', label: 'Lớp bị từ chối' },
  ENROLLMENT_CONFIRMED: { color: '#3b82f6', icon: '📝', label: 'Đăng ký xác nhận' },
  ATTENDANCE_MARKED: { color: '#06b6d4', icon: '✓', label: 'Điểm danh' },
  PAYMENT_SUCCESS: { color: '#10b981', icon: '💰', label: 'Thanh toán thành công' },
  PAYMENT_FAILED: { color: '#ef4444', icon: '⚠️', label: 'Thanh toán thất bại' },
  SALARY_READY: { color: '#f59e0b', icon: '💵', label: 'Lương sẵn sàng' },
  SESSION_UPCOMING: { color: '#8b5cf6', icon: '⏰', label: 'Lớp sắp bắt đầu' },
  SESSION_REMINDER: { color: '#06b6d4', icon: '🔔', label: 'Nhắc nhở lớp' },
  ENROLLMENT_CANCELLED: { color: '#ef4444', icon: '🚫', label: 'Đăng ký bị hủy' },
  REFUND_PROCESSED: { color: '#10b981', icon: '↩️', label: 'Hoàn tiền' },
  ADMIN_ALERT: { color: '#ef4444', icon: '⚠️', label: 'Cảnh báo' },
  GENERAL_NOTICE: { color: '#6b7280', icon: '📢', label: 'Thông báo chung' },
};

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const backgroundColor = colors.bg.primary;
  const primaryColor = colors.button.primary;
  const primaryTextColor = colors.text.primary;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const [notifs, unreadData] = await Promise.all([
        notificationAPI.getAll(100),
        notificationAPI.getUnreadCount(),
      ]);

      const normalizedNotifs = Array.isArray(notifs) ? notifs : notifs.data || [];
      setNotifications(normalizedNotifs);
      setUnreadCount(unreadData?.data?.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      const intervalId = setInterval(() => {
        loadNotifications(true);
      }, 15000);

      return () => {
        clearInterval(intervalId);
      };
    }, [loadNotifications])
  );

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationAPI.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diff = now.getTime() - notifDate.getTime();

    // Less than 1 minute
    if (diff < 60000) return 'Vừa xong';
    
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    
    // Less than 1 day
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    
    // Less than 1 week
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;
    
    // Format date
    return notifDate.toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const config = NOTIFICATION_TYPE_CONFIG[item.type] || NOTIFICATION_TYPE_CONFIG.GENERAL_NOTICE;

    return (
      <TouchableOpacity
        onPress={() => !item.isRead && handleMarkAsRead(item.id)}
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.isRead
              ? isDark
                ? '#1f2937'
                : '#f9fafb'
              : isDark
              ? '#374151'
              : '#eff6ff',
            borderLeftColor: config.color,
            borderLeftWidth: 4,
          },
        ]}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <View style={styles.titleWithIcon}>
              <Text style={styles.icon}>{config.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.notificationType,
                    {
                      color: config.color,
                      fontWeight: item.isRead ? '400' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {config.label}
                </Text>
                <Text
                  style={[
                    styles.notificationTitle,
                    {
                      color: isDark ? '#f3f4f6' : '#111827',
                      fontWeight: item.isRead ? '400' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </View>
              {!item.isRead && (
                <View
                  style={[
                    styles.unreadIndicator,
                    { backgroundColor: config.color },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.notificationTime,
                { color: isDark ? '#9ca3af' : '#6b7280' },
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>
          </View>

          <Text
            style={[
              styles.notificationBody,
              { color: isDark ? '#d1d5db' : '#374151' },
            ]}
            numberOfLines={2}
          >
            {item.body}
          </Text>

          <View style={styles.notificationActions}>
            {!item.isRead && (
              <TouchableOpacity
                onPress={() => handleMarkAsRead(item.id)}
                style={[
                  styles.actionButton,
                  { backgroundColor: config.color + '20' },
                ]}
              >
                <Text style={[styles.actionText, { color: config.color }]}>
                  Đánh dấu đã đọc
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => handleDeleteNotification(item.id)}
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
                },
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  { color: isDark ? '#f3f4f6' : '#374151' },
                ]}
              >
                Xóa
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderBottomColor: isDark ? '#374151' : '#e5e7eb',
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: primaryTextColor }]}>
            Thông báo
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: primaryColor }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={[styles.markAllButton, { color: primaryColor }]}>
              Đánh dấu tất cả đã đọc
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateIcon]}>📭</Text>
          <Text style={[styles.emptyStateText, { color: primaryTextColor }]}>
            Không có thông báo
          </Text>
          <Text
            style={[
              styles.emptyStateSubtext,
              { color: isDark ? '#9ca3af' : '#6b7280' },
            ]}
          >
            Bạn sẽ nhận được thông báo khi có hoạt động mới
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
              tintColor={primaryColor}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  markAllButton: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  listContent: {
    padding: 12,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationContent: {
    padding: 12,
  },
  notificationHeader: {
    marginBottom: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  notificationType: {
    fontSize: 12,
    marginBottom: 2,
  },
  notificationTitle: {
    fontSize: 14,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationTime: {
    fontSize: 11,
    marginTop: 4,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
  },
});
