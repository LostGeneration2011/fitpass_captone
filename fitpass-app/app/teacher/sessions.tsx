import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, SafeAreaView, Alert, Pressable } from "react-native";
import { getUser } from "../../lib/auth";
import { sessionsAPI, classAPI } from "../../lib/api";
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useThemeClasses } from '../../lib/theme';

export default function TeacherSessionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as any) || {};
  const { classId, className } = params;

  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getUser();

      if (!user || user.role !== "TEACHER") {
        setError("Vai trò người dùng không hợp lệ. Vui lòng đăng nhập lại với tư cách GIÁO VIÊN.");
        setLoading(false);
        return;
      }

      // Load all sessions and filter appropriately
      const [allSessions, allClasses] = await Promise.all([
        sessionsAPI.getAll(),
        classAPI.getAll(),
      ]);
      
      console.log("🔍 Sessions - All sessions:", allSessions);
      console.log("🔍 Sessions - All classes:", allClasses);
      console.log("🔍 Sessions - ClassId from params:", classId);

      // Get teacher's classes
      const teacherClasses = Array.isArray(allClasses) 
        ? allClasses.filter((c: any) => c.teacherId === user.id)
        : [];

      // Filter sessions
      let filteredSessions;
      if (classId) {
        // If classId provided, show only sessions for that class
        filteredSessions = Array.isArray(allSessions) 
          ? allSessions.filter((s: any) => s.classId === classId)
          : [];
      } else {
        // If no classId, show all teacher's sessions
        filteredSessions = Array.isArray(allSessions) 
          ? allSessions.filter((s: any) => 
              teacherClasses.some((c: any) => c.id === s.classId)
            )
          : [];
      }

      console.log("🔍 Sessions - Filtered sessions:", filteredSessions);
      setSessions(filteredSessions);
    } catch (e: any) {
      console.log("[TeacherSessions] Error loading sessions:", e);
      setError(e?.message ?? "Không thể tải các buổi học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [classId]);

  const handleOpenQR = (session: any) => {
    (navigation as any).navigate('QR', {
      sessionId: session.id,
      className: session.class?.name || className || '',
      startTime: session.startTime
    });
  };

  const handleDeleteSession = (session: any) => {
    Alert.alert(
      'Xóa buổi học',
      `Bạn chắc chắn muốn xóa buổi học "${session.class?.name}" vào lúc ${new Date(session.startTime).toLocaleString()}?`,
      [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        {
          text: 'Xóa',
          onPress: async () => {
            try {
              setDeleting(session.id);
              await sessionsAPI.delete(session.id);
              
              // Remove from list
              setSessions(sessions.filter(s => s.id !== session.id));
              
              Toast.show({
                type: 'success',
                text1: 'Thành công',
                text2: 'Buổi học đã được xóa',
              });
            } catch (error: any) {
              console.error('Error deleting session:', error);
              Toast.show({
                type: 'error',
                text1: 'Lỗi',
                text2: error?.response?.data?.error || 'Không thể xóa buổi học',
              });
            } finally {
              setDeleting(null);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);

    const timeLabel = `${start.toLocaleDateString()} ${start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const statusUpper = item.status?.toUpperCase?.() || "";

    return (
      <Pressable
        className="p-4 mb-3 rounded-xl"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#e2e8f0',
        }}
        onPress={() => (navigation as any).navigate('SessionDetail', { id: item.id })}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className={`${textPrimary} font-semibold mb-1`}>
              {item.class?.name || className || "Buổi học"}
            </Text>
            <Text className={`${textSecondary} mb-2`}>{timeLabel}</Text>
          </View>
          
          {(statusUpper === "UPCOMING" || statusUpper === "PENDING") && (
            <TouchableOpacity
              onPress={() => handleDeleteSession(item)}
              disabled={deleting === item.id}
              className="ml-2"
            >
              {deleting === item.id ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash" size={20} color="#ef4444" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <View 
            className="px-3 py-1 rounded-full"
            style={{
              backgroundColor: 
                statusUpper === "ACTIVE"
                  ? "#16a34a" 
                  : statusUpper === "UPCOMING"
                  ? "#3b82f6"
                  : isDark ? '#475569' : '#cbd5e1'
            }}
          >
            <Text className="text-xs font-medium text-white">
              {item.status}
            </Text>
          </View>
        </View>

        {(statusUpper === "ACTIVE" || statusUpper === "UPCOMING") && (
          <TouchableOpacity
            onPress={() => handleOpenQR(item)}
            className="py-3 rounded-lg items-center flex-row justify-center"
            style={{
              backgroundColor: '#3b82f6',
            }}
          >
            <Ionicons name="qr-code" size={18} color="#fff" />
            <Text className="text-white font-semibold ml-2">
              QR Điểm Danh
            </Text>
          </TouchableOpacity>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass} justify-center items-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className={`${textSecondary} mt-2`}>Đang tải các buổi học...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass} justify-center items-center p-4`}>
        <Text className="text-red-400 mb-2 text-lg font-semibold">Lỗi</Text>
        <Text className={`${textSecondary} text-center`}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!sessions.length) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass} justify-center items-center p-4`}>
        <Text className={`${textSecondary} text-center`}>
          Chưa có buổi học nào được lên lịch cho lớp này.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 p-4">
        <Text className={`${textPrimary} text-xl font-bold mb-4`}>
          {classId ? className || "Buổi học lớp" : "Tất cả buổi học của tôi"}
        </Text>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}