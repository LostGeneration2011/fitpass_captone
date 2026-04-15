import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { chatAPI } from '../../lib/api';
import { useThemeClasses } from '../../lib/theme';
import { useFocusEffect } from '@react-navigation/native';
import { addWebSocketMessageListener } from '../../lib/websocket';
import { getUser } from '../../lib/auth';

export default function TeacherContactScreen({ navigation }: any) {
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadByThread, setUnreadByThread] = useState<Record<string, number>>({});
  const currentUserIdRef = useRef<string | null>(null);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const res = await chatAPI.listThreads();
      setThreads(Array.isArray(res) ? res : []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải danh sách chat',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getUser().then((user) => {
      currentUserIdRef.current = user?.id || null;
    });
    loadThreads();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadThreads();

      const removeListener = addWebSocketMessageListener((data) => {
        if (data.type !== 'chat.message' || !data.threadId) return;

        setThreads((prev) => {
          const index = prev.findIndex((thread) => thread.id === data.threadId);
          if (index === -1) {
            loadThreads();
            return prev;
          }

          const nextThread = {
            ...prev[index],
            lastMessageAt: data.message?.createdAt || new Date().toISOString(),
            lastMessagePreview: data.message?.content || prev[index].lastMessagePreview,
          };

          const next = [...prev];
          next.splice(index, 1);
          next.unshift(nextThread);
          return next;
        });

        if (data.message?.senderId && data.message.senderId === currentUserIdRef.current) {
          return;
        }

        setUnreadByThread((prev) => ({
          ...prev,
          [data.threadId]: (prev[data.threadId] || 0) + 1,
        }));
      });

      return () => {
        removeListener();
      };
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={`${textSecondary} mt-4 text-lg font-medium`}>Đang tải liên hệ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <ScrollView
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadThreads(); }} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-6">
          <Text className={`text-2xl font-bold ${textPrimary}`}>Liên hệ</Text>
        </View>

        {threads.length === 0 ? (
          <View className={`${cardClass} rounded-xl p-6 border`}>
            <Text className={`${textSecondary} text-center`}>Chưa có cuộc hội thoại nào.</Text>
          </View>
        ) : (
          threads.map((thread) => {
            const isGroup = thread.type === 'CLASS_GROUP';
            const title = thread.type === 'SUPPORT'
              ? 'Hỗ trợ Admin'
              : isGroup
                ? `Nhóm lớp: ${thread.class?.name || 'Lớp học'}`
                : thread.class?.name || 'Chat lớp học';
            const subtitle = isGroup
              ? 'Nhắn tin nhóm lớp'
              : `Học viên: ${thread.student?.fullName || 'Chưa cập nhật'}`;

            return (
              <TouchableOpacity
                key={thread.id}
                className={`${cardClass} rounded-xl p-5 border mb-4`}
                onPress={() => {
                  setUnreadByThread((prev) => ({ ...prev, [thread.id]: 0 }));
                  navigation.navigate('ChatThread', { threadId: thread.id, title, threadType: thread.type });
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className={`${textPrimary} text-lg font-semibold`}>{title}</Text>
                    <Text className={`${textSecondary} text-sm mt-1`}>{subtitle}</Text>
                  </View>
                  <View className="items-end">
                    {(unreadByThread[thread.id] || 0) > 0 ? (
                      <View className="bg-red-500 min-w-5 h-5 px-1 rounded-full items-center justify-center mb-1">
                        <Text className="text-white text-[10px] font-bold">
                          {unreadByThread[thread.id] > 99 ? '99+' : unreadByThread[thread.id]}
                        </Text>
                      </View>
                    ) : null}
                    <Ionicons name="chatbubble-ellipses" size={22} color="#60A5FA" />
                  </View>
                </View>
                {thread.lastMessagePreview ? (
                  <Text className={`${textSecondary} text-sm mt-3`} numberOfLines={1}>
                    {thread.lastMessagePreview}
                  </Text>
                ) : (
                  <Text className={`${textMuted} text-sm mt-3`}>Chưa có tin nhắn</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
