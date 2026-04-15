import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { notificationAPI } from '../api';

export interface NotificationData {
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useNotifications = (): NotificationData => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await notificationAPI.getUnreadCount();
      const count = response?.data?.unreadCount || 0;
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Refresh every 30 seconds in the background
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    unreadCount,
    isLoading,
    error,
    refresh,
  };
};

// Hook for listening to real-time notifications via WebSocket
export const useRealtimeNotifications = (callback?: (notification: any) => void) => {
  useEffect(() => {
    // This would be implemented when WebSocket support is added
    // For now, we use polling via useNotifications
    return () => {};
  }, [callback]);
};
