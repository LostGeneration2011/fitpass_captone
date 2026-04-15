import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sessionsAPI, classAPI, attendanceAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import { useWebSocket } from '../../lib/WebSocketProvider';
import { useFocusEffect } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useThemeClasses, useTheme } from '../../lib/theme';
import { addWebSocketMessageListener } from '../../lib/websocket';

interface AttendanceRecord {
  id: string;
  studentId: string;
  student?: { fullName: string; email: string };
  status: string;
  checkedInAt: string;
}

interface Session {
  id: string;
  classId: string;
  class?: { name: string; id: string };
  startTime: string;
  endTime: string;
  status: string;
}

export default function TeacherAttendanceScreen() {
  // Ensure theme context is loaded
  const { isDark: isDarkTheme } = useTheme();
  const route = useRoute();
  const routeSessionId = (route.params as any)?.sessionId;
  
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isConnected } = useWebSocket();
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [isDark]);

  const loadSessions = async () => {
    try {
      const user = await getUser();
      if (!user?.id || user.role !== 'TEACHER') {
        setLoading(false);
        return;
      }

      // Get all sessions
      const allSessions = await sessionsAPI.getAll();
      const sessionsArray = Array.isArray(allSessions) ? allSessions : (allSessions?.sessions || []);

      // Get all classes to filter by teacher
      const allClasses = await classAPI.getAll();
      const classesArray = Array.isArray(allClasses) ? allClasses : (allClasses?.classes || []);
      const teacherClassIds = classesArray
        .filter((c: any) => c.teacherId === user.id)
        .map((c: any) => c.id);

      // Filter sessions for teacher's classes
      const teacherSessions = sessionsArray.filter((s: any) =>
        teacherClassIds.includes(s.classId)
      );

      setSessions(teacherSessions);

      // Auto-select session from route param if provided, otherwise first session
      if (teacherSessions.length > 0) {
        const target = routeSessionId
          ? teacherSessions.find((s: any) => s.id === routeSessionId) || teacherSessions[0]
          : teacherSessions[0];
        setSelectedSession(target);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải danh sách buổi học',
      });
    } finally {
      setLoading(false);
    }
  };

  // Force re-render on theme change
  useEffect(() => {
    // This effect just depends on isDark to trigger re-renders
  }, [isDark]);

  const loadAttendance = useCallback(async () => {
    if (!selectedSession) return;

    try {
      const attendanceRecords = await attendanceAPI.getBySession(selectedSession.id);
      const recordsArray = Array.isArray(attendanceRecords)
        ? attendanceRecords
        : attendanceRecords?.attendances || [];
      setAttendance(recordsArray);
    } catch (error) {
      console.error('Error loading attendance:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải dữ liệu điểm danh',
      });
    }
  }, [selectedSession]);

  useEffect(() => {
    if (!isConnected || !selectedSession) return;

    const unsubscribe = addWebSocketMessageListener((message: any) => {
      const payload = message?.payload || message?.data || message;
      const messageSessionId = payload?.sessionId || payload?.session?.id;

      const isAttendanceMessage =
        message?.type === 'attendance_update' ||
        message?.event === 'attendance.update';

      if (!isAttendanceMessage || messageSessionId !== selectedSession.id) {
        return;
      }

      loadAttendance();

      if (payload?.studentName) {
        Toast.show({
          type: 'success',
          text1: `✓ ${payload.studentName}`,
          text2: 'Đã điểm danh',
          visibilityTime: 2000,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isConnected, selectedSession, loadAttendance]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [selectedSession]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedSession, isDark]);

  const stats = useMemo(() => {
    if (!attendance.length) {
      return { total: 0, present: 0, absent: 0, rate: 0 };
    }

    const present = attendance.filter((a) => a.status?.toUpperCase() === 'PRESENT').length;
    const absent = attendance.length - present;
    const rate = Math.round((present / attendance.length) * 100);

    return {
      total: attendance.length,
      present,
      absent,
      rate,
    };
  }, [attendance]);

  if (loading) {
    return (
      <SafeAreaView style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className={`${textSecondary} mt-2`}>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      key={`attend-theme-${isDark}-${forceUpdate}`}
      style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', flex: 1 }}>
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="p-6 border-b"
              style={{
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
              }}>
          <Text className={`${textPrimary} text-2xl font-bold`}>Điểm Danh</Text>
          <Text className={`${textSecondary} mt-1`}>Theo dõi học viên check-in</Text>
          {isConnected && (
            <View className="flex-row items-center mt-2">
              <View className="w-2 h-2 bg-green-500 rounded-full" />
              <Text className="text-green-400 text-xs ml-1">Kết nối real-time</Text>
            </View>
          )}
        </View>

        {/* Session Selector */}
        {sessions.length === 0 ? (
          <View className="p-6 items-center">
            <Ionicons name="calendar" size={48} color={isDark ? '#64748b' : '#94a3b8'} />
            <Text className={`${textSecondary} text-center mt-4`}>Không có buổi học nào</Text>
          </View>
        ) : (
          <>
            <View className="p-6 border-b" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              <Text className={`${textSecondary} mb-3`}>Chọn buổi học:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row gap-2"
              >
                {sessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={{
                      backgroundColor: selectedSession?.id === session.id ? '#2563eb' : (isDark ? '#1e293b' : '#ffffff'),
                      borderColor: selectedSession?.id === session.id ? '#1d4ed8' : (isDark ? '#475569' : '#e2e8f0'),
                    }}
                    className="px-4 py-3 rounded-xl border"
                    onPress={() => setSelectedSession(session)}
                  >
                    <Text className={`font-medium ${selectedSession?.id === session.id ? 'text-white' : textPrimary}`}>
                      {session.class?.name || 'Buổi học'}
                    </Text>
                    <Text className={`text-xs mt-1 ${selectedSession?.id === session.id ? 'text-blue-200' : textSecondary}`}>
                      {new Date(session.startTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Stats Cards */}
            {selectedSession && (
              <View className="p-6 gap-3">
                <View style={{ backgroundColor: '#2563eb' }} className="rounded-xl p-4">
                  <Text className="text-white text-sm opacity-80">Tổng</Text>
                  <Text className="text-white text-3xl font-bold">{stats.total}</Text>
                  <Text className="text-blue-100 text-xs mt-1">học viên đã đăng ký</Text>
                </View>

                <View className="flex-row gap-3">
                  <View style={{ backgroundColor: '#16a34a' }} className="flex-1 rounded-xl p-4">
                    <Text className="text-white text-sm opacity-80">Có mặt</Text>
                    <Text className="text-white text-2xl font-bold">{stats.present}</Text>
                    <Text className="text-green-100 text-xs mt-1">{stats.rate}%</Text>
                  </View>

                  <View style={{ backgroundColor: '#dc2626' }} className="flex-1 rounded-xl p-4">
                    <Text className="text-white text-sm opacity-80">Vắng</Text>
                    <Text className="text-white text-2xl font-bold">{stats.absent}</Text>
                    <Text className="text-red-100 text-xs mt-1">
                      {stats.total > 0 ? Math.round(((stats.absent / stats.total) * 100)) : 0}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Attendance List */}
            <View className="p-6">
              <Text className={`${textPrimary} text-lg font-bold mb-4`}>Danh sách học viên</Text>

              {attendance.length === 0 ? (
                <View 
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#475569' : '#e2e8f0',
                  }}
                  className="rounded-xl p-6 items-center border"
                >
                  <Ionicons name="person-outline" size={40} color={isDark ? '#64748b' : '#94a3b8'} />
                  <Text className={`${textSecondary} mt-3`}>Chưa có học viên check-in</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {attendance.map((record) => (
                    <View
                      key={record.id}
                      style={{
                        backgroundColor: record.status?.toUpperCase() === 'PRESENT' 
                          ? (isDark ? '#065f46' : '#ecfdf5')
                          : (isDark ? '#7f1d1d' : '#fef2f2'),
                        borderColor: record.status?.toUpperCase() === 'PRESENT'
                          ? '#16a34a'
                          : '#dc2626',
                      }}
                      className="p-4 rounded-lg flex-row items-center justify-between border"
                    >
                      <View className="flex-1">
                        <Text className={`${textPrimary} font-semibold`}>
                          {record.student?.fullName || 'Unknown'}
                        </Text>
                        <Text className={`${textMuted} text-sm`}>
                          {record.student?.email}
                        </Text>
                      </View>

                      <View className="items-end">
                        <View
                          style={{
                            backgroundColor: record.status?.toUpperCase() === 'PRESENT' ? '#16a34a' : '#dc2626',
                          }}
                          className="px-3 py-1 rounded-full"
                        >
                          <Text className="text-white text-xs font-bold">
                            {record.status?.toUpperCase() === 'PRESENT' ? 'CÓ MẶT' : 'VẮNG'}
                          </Text>
                        </View>
                        <Text className={`${textMuted} text-xs mt-2`}>
                          {new Date(record.checkedInAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
