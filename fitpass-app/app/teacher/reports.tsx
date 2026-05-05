import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getUser } from '../../lib/auth';
import { classAPI, sessionsAPI, enrollmentAPI } from '../../lib/api';
import Toast from 'react-native-toast-message';
import { useThemeClasses } from '../../lib/theme';

interface ReportData {
  totalClasses: number;
  totalSessions: number;
  totalStudents: number;
  completedSessions: number;
  pendingClasses: number;
  activeClasses: number;
  avgStudentsPerClass: number;
  monthlyStats: {
    sessions: number;
    students: number;
  };
  classBreakdown: Array<{
    id: string;
    name: string;
    status: string;
    studentCount: number;
    sessionCount: number;
  }>;
}

export default function TeacherReportsScreen() {
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [reportData, setReportData] = useState<ReportData>({
    totalClasses: 0,
    totalSessions: 0,
    totalStudents: 0,
    completedSessions: 0,
    pendingClasses: 0,
    activeClasses: 0,
    avgStudentsPerClass: 0,
    monthlyStats: { sessions: 0, students: 0 },
    classBreakdown: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const loadReportData = async () => {
    try {
      const currentUser = await getUser();
      if (!currentUser?.id || currentUser.role !== 'TEACHER') {
        throw new Error('Unauthorized access');
      }

      const [classesRes, sessionsRes, enrollmentsRes] = await Promise.all([
        classAPI.getAll(),
        sessionsAPI.getAll(),
        enrollmentAPI.getAll(),
      ]);

      const allClasses = Array.isArray(classesRes) ? classesRes : classesRes?.data || [];
      const allSessions = Array.isArray(sessionsRes) ? sessionsRes : sessionsRes?.data || [];
      const allEnrollments = Array.isArray(enrollmentsRes) ? enrollmentsRes : enrollmentsRes?.data || [];

      // Filter teacher's data
      const teacherClasses = allClasses.filter((c: any) => c.teacherId === currentUser.id);
      const teacherSessions = allSessions.filter((s: any) =>
        teacherClasses.some((c: any) => c.id === s.classId)
      );

      // Calculate class breakdown with student counts
      const classBreakdown = teacherClasses.map((cls: any) => {
        const classEnrollments = allEnrollments.filter((e: any) => e.classId === cls.id);
        const classSessions = teacherSessions.filter((s: any) => s.classId === cls.id);
        
        return {
          id: cls.id,
          name: cls.name,
          status: cls.status,
          studentCount: classEnrollments.length,
          sessionCount: classSessions.length,
        };
      });

      // Calculate monthly stats (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlySessionsCount = teacherSessions.filter((s: any) => {
        const sessionDate = new Date(s.startTime);
        return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
      }).length;

      // Unique students count
      const allStudentIds = new Set();
      allEnrollments.forEach((e: any) => {
        if (teacherClasses.some((c: any) => c.id === e.classId)) {
          allStudentIds.add(e.studentId);
        }
      });

      setReportData({
        totalClasses: teacherClasses.length,
        totalSessions: teacherSessions.length,
        totalStudents: allStudentIds.size,
        completedSessions: teacherSessions.filter((s: any) => s.status === 'DONE').length,
        pendingClasses: teacherClasses.filter((c: any) => c.status === 'PENDING').length,
        activeClasses: teacherClasses.filter((c: any) => c.status === 'APPROVED').length,
        avgStudentsPerClass: teacherClasses.length > 0 ? Math.round(allStudentIds.size / teacherClasses.length) : 0,
        monthlyStats: {
          sessions: monthlySessionsCount,
          students: allStudentIds.size,
        },
        classBreakdown,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải báo cáo',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const StatCard = ({ icon, label, value, color, description }: any) => (
    <View style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0' }} className="rounded-2xl p-4 flex-1 mx-2 mb-4 border">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={24} color={color} />
        <Text className={`${textPrimary} font-bold text-2xl ml-3`}>{value}</Text>
      </View>
      <Text className={`${textSecondary} text-sm font-medium mb-1`}>{label}</Text>
      {description && (
        <Text className={`${textMuted} text-xs`}>{description}</Text>
      )}
    </View>
  );

  const getClassStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#10b981';
      case 'PENDING': return '#f59e0b';
      case 'REJECTED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getClassStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'PENDING': return 'Chờ duyệt';
      case 'REJECTED': return 'Bị từ chối';
      default: return 'Không rõ';
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
          <Text className={`${textPrimary} text-xl font-bold`}>Báo cáo hoạt động</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          className="flex-1 p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Overview Stats */}
          <Text className={`${textPrimary} text-lg font-semibold mb-4`}>Tổng quan</Text>
          <View className="flex-row flex-wrap mb-6">
            <StatCard
              icon="school"
              label="Tổng lớp học"
              value={reportData.totalClasses}
              color="#3b82f6"
              description={`${reportData.activeClasses} đã duyệt, ${reportData.pendingClasses} chờ duyệt`}
            />
            <StatCard
              icon="calendar"
              label="Tổng buổi học"
              value={reportData.totalSessions}
              color="#10b981"
              description={`${reportData.completedSessions} đã hoàn thành`}
            />
          </View>

          <View className="flex-row flex-wrap mb-6">
            <StatCard
              icon="people"
              label="Tổng học viên"
              value={reportData.totalStudents}
              color="#f59e0b"
              description={`Trung bình ${reportData.avgStudentsPerClass} học viên/lớp`}
            />
            <StatCard
              icon="trending-up"
              label="Tháng này"
              value={reportData.monthlyStats.sessions}
              color="#8b5cf6"
              description="Buổi học đã tổ chức"
            />
          </View>

          {/* Class Breakdown */}
          <Text className={`${textPrimary} text-lg font-semibold mb-4`}>Chi tiết từng lớp</Text>
          {reportData.classBreakdown.length > 0 ? (
            reportData.classBreakdown.map((cls) => (
              <View key={cls.id} style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0' }} className="rounded-xl p-4 mb-3 border">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`${textPrimary} font-semibold text-lg flex-1`}>{cls.name}</Text>
                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: getClassStatusColor(cls.status) }}
                  >
                    <Text className="text-white text-xs font-medium">
                      {getClassStatusText(cls.status)}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="people" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text className={`${textSecondary} text-sm ml-1`}>
                      {cls.studentCount} học viên
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <Ionicons name="calendar" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text className={`${textSecondary} text-sm ml-1`}>
                      {cls.sessionCount} buổi học
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0' }} className="rounded-xl p-6 items-center border">
              <Ionicons name="document-text" size={48} color={isDark ? '#64748b' : '#94a3b8'} />
              <Text className={`${textSecondary} text-center mt-2`}>
                Chưa có dữ liệu lớp học
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}