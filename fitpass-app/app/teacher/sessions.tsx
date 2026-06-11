import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Pressable,
  TextInput,
  ScrollView,
  SectionList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUser } from "../../lib/auth";
import { sessionsAPI, classAPI } from "../../lib/api";
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useThemeClasses } from '../../lib/theme';

const FILTER_STORAGE_KEY = 'teacher_sessions_filters_v1';
const STATUS_FILTERS = ['ALL', 'UPCOMING', 'ACTIVE', 'DONE', 'PENDING'] as const;
type SessionStatusFilter = (typeof STATUS_FILTERS)[number];

export default function TeacherSessionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as any) || {};
  const { classId, className } = params;

  const {
    isDark,
    screenClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<SessionStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const hydrateFilters = async () => {
      try {
        if (classId) {
          setSelectedClassId(classId);
          setFiltersHydrated(true);
          return;
        }

        const stored = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
        if (!stored) {
          setFiltersHydrated(true);
          return;
        }

        const parsed = JSON.parse(stored);
        if (typeof parsed?.selectedClassId === 'string') {
          setSelectedClassId(parsed.selectedClassId);
        }
        if (typeof parsed?.selectedStatus === 'string' && STATUS_FILTERS.includes(parsed.selectedStatus)) {
          setSelectedStatus(parsed.selectedStatus as SessionStatusFilter);
        }
        if (typeof parsed?.searchQuery === 'string') {
          setSearchQuery(parsed.searchQuery);
        }
      } catch (storageError) {
        console.log('[TeacherSessions] Unable to hydrate filters:', storageError);
      } finally {
        setFiltersHydrated(true);
      }
    };

    hydrateFilters();
  }, [classId]);

  useEffect(() => {
    if (!filtersHydrated) return;

    AsyncStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        selectedClassId,
        selectedStatus,
        searchQuery,
      })
    ).catch((storageError) => {
      console.log('[TeacherSessions] Unable to persist filters:', storageError);
    });
  }, [selectedClassId, selectedStatus, searchQuery, filtersHydrated]);

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
        sessionsAPI.getAll(user.id),
        classAPI.getAll(user.id),
      ]);
      
      console.log("🔍 Sessions - All sessions:", allSessions);
      console.log("🔍 Sessions - All classes:", allClasses);
      console.log("🔍 Sessions - ClassId from params:", classId);

      // Get teacher's classes
      const teacherClasses = Array.isArray(allClasses) 
        ? allClasses.filter((c: any) => c.teacherId === user.id)
        : [];

      const teacherSessionList = Array.isArray(allSessions)
        ? allSessions.filter((s: any) => teacherClasses.some((c: any) => c.id === s.classId))
        : [];

      console.log("🔍 Sessions - Filtered sessions:", teacherSessionList);
      setTeacherClasses(teacherClasses);
      setAllSessions(teacherSessionList);
    } catch (e: any) {
      console.log("[TeacherSessions] Error loading sessions:", e);
      setError(e?.message ?? "Không thể tải các buổi học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSessions();
    }, [])
  );

  useEffect(() => {
    if (!filtersHydrated || !classId) return;
    setSelectedClassId(classId);
  }, [classId, filtersHydrated]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return allSessions
      .filter((session) => {
        if (selectedClassId !== 'ALL' && session.classId !== selectedClassId) {
          return false;
        }

        const statusUpper = session.status?.toUpperCase?.() || '';
        if (selectedStatus !== 'ALL' && statusUpper !== selectedStatus) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const classLabel = (session.class?.name || '').toLowerCase();
        const dateLabel = new Date(session.startTime).toLocaleDateString().toLowerCase();
        return classLabel.includes(normalizedQuery) || dateLabel.includes(normalizedQuery);
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allSessions, selectedClassId, selectedStatus, searchQuery]);

  const sections = useMemo(() => {
    const grouped = new Map<string, { title: string; classId: string; data: any[] }>();

    filteredSessions.forEach((session) => {
      const sessionClassId = session.classId || 'unknown';
      const current = grouped.get(sessionClassId);

      if (current) {
        current.data.push(session);
        return;
      }

      grouped.set(sessionClassId, {
        title: session.class?.name || className || 'Lớp không xác định',
        classId: sessionClassId,
        data: [session],
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  }, [filteredSessions, className]);

  const totalSessionCount = filteredSessions.length;

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
              setAllSessions((prev) => prev.filter((s) => s.id !== session.id));
              
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

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 p-4">
        <Text className={`${textPrimary} text-xl font-bold mb-4`}>
          Buổi học của tôi
        </Text>

        <View
          className="mb-4 rounded-xl p-3"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#e2e8f0',
          }}
        >
          <View
            className="mb-3 flex-row items-center rounded-lg px-3"
            style={{
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#e2e8f0',
            }}
          >
            <Ionicons name="search" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            <TextInput
              className={`${textPrimary} flex-1 py-2 px-2`}
              placeholder="Tìm lớp hoặc ngày học..."
              placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Text className={`${textMuted} text-xs mb-2`}>Lọc theo lớp</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row items-center">
              <TouchableOpacity
                className="mr-2 rounded-full px-3 py-2"
                style={{
                  backgroundColor: selectedClassId === 'ALL' ? '#2563eb' : isDark ? '#334155' : '#e2e8f0',
                }}
                onPress={() => setSelectedClassId('ALL')}
              >
                <Text className={selectedClassId === 'ALL' ? 'text-white text-xs font-semibold' : `${textSecondary} text-xs`}>
                  Tất cả lớp
                </Text>
              </TouchableOpacity>

              {teacherClasses.map((teacherClass: any) => {
                const active = selectedClassId === teacherClass.id;
                return (
                  <TouchableOpacity
                    key={teacherClass.id}
                    className="mr-2 rounded-full px-3 py-2"
                    style={{
                      backgroundColor: active ? '#2563eb' : isDark ? '#334155' : '#e2e8f0',
                    }}
                    onPress={() => setSelectedClassId(teacherClass.id)}
                  >
                    <Text className={active ? 'text-white text-xs font-semibold' : `${textSecondary} text-xs`}>
                      {teacherClass.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Text className={`${textMuted} text-xs mb-2`}>Lọc theo trạng thái</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row items-center">
              {STATUS_FILTERS.map((status) => {
                const active = selectedStatus === status;
                const label = status === 'ALL' ? 'Tất cả' : status;
                return (
                  <TouchableOpacity
                    key={status}
                    className="mr-2 rounded-full px-3 py-2"
                    style={{
                      backgroundColor: active ? '#16a34a' : isDark ? '#334155' : '#e2e8f0',
                    }}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text className={active ? 'text-white text-xs font-semibold' : `${textSecondary} text-xs`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderWidth: 1, borderColor: isDark ? '#475569' : '#cbd5e1' }}
                onPress={() => {
                  setSelectedClassId(classId || 'ALL');
                  setSelectedStatus('ALL');
                  setSearchQuery('');
                }}
              >
                <Text className={`${textSecondary} text-xs`}>Đặt lại</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        <Text className={`${textSecondary} mb-3`}>
          {sections.length} lớp, {totalSessionCount} buổi học
        </Text>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View
              className="mb-2 mt-1 rounded-lg px-3 py-2"
              style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }}
            >
              <Text className={`${textPrimary} font-semibold`}>
                {section.title} ({section.data.length})
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-10">
              <Text className={`${textSecondary} text-center`}>
                Không có buổi học phù hợp với bộ lọc hiện tại.
              </Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}