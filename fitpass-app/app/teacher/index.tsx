import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUser, User } from '../../lib/auth';
import { sessionsAPI, classAPI } from "../../lib/api";
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useThemeClasses } from '../../lib/theme';

interface TeacherDashboardStats {
  classesCount: number;
  todaySessions: number;
  attendanceRate: number;
  totalStudents: number;
  totalSessions: number;
  todaySessionsList: any[];
  teacherClasses: any[];
  pendingClassesCount: number;
}

export default function TeacherDashboard() {
  const TODAY_SESSIONS_PER_PAGE = 3;
  const navigation = useNavigation();
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();
  
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayPage, setTodayPage] = useState(1);

  const loadData = async () => {
    try {
      const currentUser = await getUser();
      setUser(currentUser);
      
      if (!currentUser?.id || currentUser.role !== 'TEACHER') {
        console.log('Invalid user or role:', currentUser);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [allSessions, allClasses] = await Promise.all([
        sessionsAPI.getAll(),
        classAPI.getAll(),
      ]);

      console.log("🔍 Dashboard - Sessions from API:", allSessions);
      console.log("🔍 Dashboard - Classes from API:", allClasses);
      console.log("🔍 Dashboard - Current user ID:", currentUser.id);

      // Filter teacher's classes - include both APPROVED and PENDING for debugging
      const allTeacherClasses = Array.isArray(allClasses) 
        ? allClasses.filter((c: any) => c.teacherId === currentUser.id)
        : [];
      
      const teacherClasses = allTeacherClasses.filter((c: any) => c.status === 'APPROVED');
      
      console.log("🔍 Dashboard - All teacher classes:", allTeacherClasses);
      console.log("🔍 Dashboard - Approved teacher classes:", teacherClasses);

      // Filter teacher's sessions - only for approved classes
      const teacherSessions = Array.isArray(allSessions) 
        ? allSessions.filter((s: any) => 
            teacherClasses.some((c: any) => c.id === s.classId)
          )
        : [];

      console.log("🔍 Dashboard - Teacher sessions:", teacherSessions);

      // Today's sessions
      const today = new Date().toDateString();
      const todaySessionsList = teacherSessions.filter((s: any) => {
        if (!s.startTime) return false;
        const sessionDate = new Date(s.startTime).toDateString();
        return sessionDate === today;
      });

      // Calculate total students across all classes
      const totalStudents = teacherClasses.reduce((total: number, cls: any) => {
        return total + (cls._count?.enrollments || 0);
      }, 0);

      // Calculate attendance rate from real data
      const totalSessions = teacherSessions.length;
      const completedSessions = teacherSessions.filter((s: any) => s.status === 'DONE').length;
      const attendanceRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      // Count pending classes for approval
      const pendingClassesCount = allTeacherClasses.filter((c: any) => c.status === 'PENDING').length;

      const dashboardStats: TeacherDashboardStats = {
        classesCount: teacherClasses.length,
        todaySessions: todaySessionsList.length,
        attendanceRate: attendanceRate,
        totalStudents: totalStudents,
        totalSessions: totalSessions,
        todaySessionsList,
        teacherClasses,
        pendingClassesCount,
      };

      setStats(dashboardStats);
      setTodayPage(1);
    } catch (error) {
      console.error('Error loading teacher dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateSession = () => {
    (navigation as any).navigate('Sessions');
  };

  const handleCreateQR = () => {
    (navigation as any).navigate('QR');
  };

  const handleManageStudents = () => {
    (navigation as any).navigate('Classes');
  };

  const handleViewStats = () => {
    if (!stats || stats.classesCount === 0) {
      Toast.show({
        type: 'info',
        text1: 'Thống kê',
        text2: 'Bạn cần có ít nhất một lớp học để xem thống kê',
        visibilityTime: 3000,
      });
      return;
    }
    
    const statsText = [
      `📚 Lớp học: ${stats.classesCount}`,
      `👥 Tổng học viên: ${stats.totalStudents}`,
      `📝 Tổng buổi học: ${stats.totalSessions}`,
      `📊 Tỷ lệ điểm danh: ${stats.attendanceRate}%`,
      `📅 Buổi học hôm nay: ${stats.todaySessions}`,
    ].join('\n');
    
    Toast.show({
      type: 'success',
      text1: 'Thống kê hiệu suất',
      text2: statsText,
      visibilityTime: 5000,
    });
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{
                  backgroundColor: '#3b82f6',
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}>
            <ActivityIndicator size="large" color="white" />
          </View>
          <Text className={`${textSecondary} text-lg font-medium`}>Đang tải bảng điều khiển...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || !user) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass} items-center justify-center`}>
        <Text className={`${textSecondary} text-lg font-medium`}>Không thể tải bảng điều khiển</Text>
      </SafeAreaView>
    );
  }

  const todayTotalPages = Math.max(1, Math.ceil(stats.todaySessionsList.length / TODAY_SESSIONS_PER_PAGE));
  const todayStartIndex = (todayPage - 1) * TODAY_SESSIONS_PER_PAGE;
  const todayPaginatedSessions = stats.todaySessionsList.slice(
    todayStartIndex,
    todayStartIndex + TODAY_SESSIONS_PER_PAGE
  );

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1">
        <ScrollView 
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="px-6 py-8">
            {/* Header */}
            <View className="mb-8">
              <Text className="text-cyan-400 text-base font-medium">Chào buổi sáng</Text>
              <Text className={`${textPrimary} text-3xl font-bold`}>
                {user?.fullName || "Giáo viên"}
              </Text>
              <View className="w-12 h-1 bg-blue-500 rounded-full mt-2" 
                   style={{
                     shadowColor: '#3b82f6',
                     shadowOffset: { width: 0, height: 2 },
                     shadowOpacity: 0.5,
                     shadowRadius: 4,
                   }} />
            </View>

            {/* Stats Cards Row 1 */}
            <View className="flex-row justify-between mb-4">
              <View className={`${cardClass} rounded-xl p-6 flex-1 mr-3`}
                   style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 4 },
                     shadowOpacity: 0.3,
                     shadowRadius: 8,
                     borderWidth: 1,
                     borderColor: isDark ? '#475569' : '#e2e8f0'
                   }}>
                <View className="bg-blue-600 p-3 rounded-lg mb-3 self-start"
                     style={{
                       shadowColor: '#3b82f6',
                       shadowOffset: { width: 0, height: 2 },
                       shadowOpacity: 0.4,
                       shadowRadius: 4,
                     }}>
                  <Ionicons name="school" size={24} color="#fff" />
                </View>
                <Text className={`${textPrimary} text-2xl font-bold`}>{stats.classesCount}</Text>
                <Text className={`${textSecondary} text-sm`}>Lớp đang hoạt động</Text>
              </View>
              
              <View className={`${cardClass} rounded-xl p-6 flex-1 ml-3`}
                   style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 4 },
                     shadowOpacity: 0.3,
                     shadowRadius: 8,
                     borderWidth: 1,
                     borderColor: isDark ? '#475569' : '#e2e8f0'
                   }}>
                <View className="bg-purple-600 p-3 rounded-lg mb-3 self-start"
                     style={{
                       shadowColor: '#8b5cf6',
                       shadowOffset: { width: 0, height: 2 },
                       shadowOpacity: 0.4,
                       shadowRadius: 4,
                     }}>
                  <Ionicons name="time" size={24} color="#fff" />
                </View>
                <Text className={`${textPrimary} text-2xl font-bold`}>{stats.todaySessions}</Text>
                <Text className={`${textSecondary} text-sm`}>Buổi học hôm nay</Text>
              </View>
            </View>

            {/* Stats Cards Row 2 */}
            <View className="flex-row justify-between mb-8">
              <View className={`${cardClass} rounded-xl p-6 flex-1 mr-3`}
                   style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 4 },
                     shadowOpacity: 0.3,
                     shadowRadius: 8,
                     borderWidth: 1,
                     borderColor: isDark ? '#475569' : '#e2e8f0'
                   }}>
                <View className="bg-green-600 p-3 rounded-lg mb-3 self-start"
                     style={{
                       shadowColor: '#16a34a',
                       shadowOffset: { width: 0, height: 2 },
                       shadowOpacity: 0.4,
                       shadowRadius: 4,
                     }}>
                  <Ionicons name="people" size={24} color="#fff" />
                </View>
                <Text className={`${textPrimary} text-2xl font-bold`}>{stats.totalStudents}</Text>
                <Text className={`${textSecondary} text-sm`}>Tổng học viên</Text>
              </View>
              
              <View className={`${cardClass} rounded-xl p-6 flex-1 ml-3`}
                   style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 4 },
                     shadowOpacity: 0.3,
                     shadowRadius: 8,
                     borderWidth: 1,
                     borderColor: isDark ? '#475569' : '#e2e8f0'
                   }}>
                <View className="bg-orange-600 p-3 rounded-lg mb-3 self-start"
                     style={{
                       shadowColor: '#ea580c',
                       shadowOffset: { width: 0, height: 2 },
                       shadowOpacity: 0.4,
                       shadowRadius: 4,
                     }}>
                  <Ionicons name="library" size={24} color="#fff" />
                </View>
                <Text className={`${textPrimary} text-2xl font-bold`}>{stats.totalSessions}</Text>
                <Text className={`${textSecondary} text-sm`}>Tổng buổi học</Text>
              </View>
            </View>

            {/* Attendance Rate */}
            <View className={`${cardClass} rounded-xl p-6 mb-8`}
                 style={{
                   shadowColor: '#000',
                   shadowOffset: { width: 0, height: 4 },
                   shadowOpacity: 0.3,
                   shadowRadius: 8,
                   borderWidth: 1,
                   borderColor: isDark ? '#475569' : '#e2e8f0'
                 }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`${textPrimary} text-lg font-semibold`}>Tỷ lệ điểm danh</Text>
                <View className="bg-yellow-500 p-2 rounded-lg"
                     style={{
                       shadowColor: '#eab308',
                       shadowOffset: { width: 0, height: 2 },
                       shadowOpacity: 0.4,
                       shadowRadius: 4,
                     }}>
                  <Ionicons name="analytics" size={20} color="#fff" />
                </View>
              </View>
              <View className="flex-row items-end">
                <Text className={`${textPrimary} text-3xl font-bold`}>{stats.attendanceRate}%</Text>
                <Text className="text-green-400 text-sm ml-2 mb-1 font-medium">+5% tuần này</Text>
              </View>
              <View className="bg-slate-700 h-3 rounded-full mt-3">
                <View 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full" 
                  style={{ 
                    width: `${stats.attendanceRate}%`,
                    shadowColor: '#eab308',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
                />
              </View>
            </View>

            {/* Today's Schedule */}
            <View className={`${cardClass} rounded-xl p-6 mb-8`}
                 style={{
                   shadowColor: '#000',
                   shadowOffset: { width: 0, height: 4 },
                   shadowOpacity: 0.3,
                   shadowRadius: 8,
                   borderWidth: 1,
                   borderColor: isDark ? '#475569' : '#e2e8f0'
                 }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`${textPrimary} text-lg font-semibold`}>Lịch trình hôm nay</Text>
                <Ionicons name="calendar" size={20} color="#3b82f6" />
              </View>
              
              {stats.todaySessionsList.length === 0 ? (
                <View className="rounded-lg p-6 items-center" style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9' }}>
                  <Ionicons name="calendar-clear" size={32} color={isDark ? '#94a3b8' : '#64748b'} />
                  <Text className={`${textSecondary} text-center mt-2 font-medium`}>
                    Không có buổi học nào trong hôm nay
                  </Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {todayPaginatedSessions.map((session: any) => (
                    <View key={session.id} className="rounded-lg p-4"
                         style={{
                           backgroundColor: isDark ? '#334155' : '#f1f5f9',
                           borderWidth: 1,
                           borderColor: isDark ? '#475569' : '#cbd5e1',
                           shadowColor: '#000',
                           shadowOffset: { width: 0, height: 2 },
                           shadowOpacity: 0.2,
                           shadowRadius: 4,
                         }}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className={`${textPrimary} font-semibold`}>
                            {session.class?.name || "Buổi học"}
                          </Text>
                          <Text className="text-blue-400 text-sm mt-1 font-medium">
                            {new Date(session.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                        <View className="bg-green-600 px-3 py-1 rounded-full"
                             style={{
                               shadowColor: '#16a34a',
                               shadowOffset: { width: 0, height: 2 },
                               shadowOpacity: 0.3,
                               shadowRadius: 4,
                             }}>
                          <Text className="text-white text-xs font-bold">Đang diễn ra</Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {todayTotalPages > 1 ? (
                    <View className="flex-row items-center justify-between mt-2">
                      <TouchableOpacity
                        onPress={() => setTodayPage((prev) => Math.max(1, prev - 1))}
                        disabled={todayPage === 1}
                        className="px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: todayPage === 1
                            ? (isDark ? '#1e293b' : '#e2e8f0')
                            : '#3b82f6',
                        }}
                      >
                        <Text className="text-white text-xs font-semibold">Trước</Text>
                      </TouchableOpacity>

                      <Text className={`${textSecondary} text-sm`}>
                        Trang {todayPage}/{todayTotalPages}
                      </Text>

                      <TouchableOpacity
                        onPress={() => setTodayPage((prev) => Math.min(todayTotalPages, prev + 1))}
                        disabled={todayPage === todayTotalPages}
                        className="px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: todayPage === todayTotalPages
                            ? (isDark ? '#1e293b' : '#e2e8f0')
                            : '#3b82f6',
                        }}
                      >
                        <Text className="text-white text-xs font-semibold">Sau</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            {/* Pending Classes Approval */}
            {stats.pendingClassesCount > 0 && (
              <View className="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-xl p-6 mb-8 border-l-4 border-yellow-500"
                   style={{
                     shadowColor: '#eab308',
                     shadowOffset: { width: 0, height: 4 },
                     shadowOpacity: 0.3,
                     shadowRadius: 8,
                     borderWidth: 1,
                     borderColor: '#b45309'
                   }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <View className="bg-yellow-500 p-3 rounded-lg mr-4"
                         style={{
                           shadowColor: '#eab308',
                           shadowOffset: { width: 0, height: 2 },
                           shadowOpacity: 0.4,
                           shadowRadius: 4,
                         }}>
                      <Ionicons name="warning" size={24} color="#fff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-lg font-semibold">Chờ phê duyệt</Text>
                      <Text className="text-yellow-200 text-sm mt-1">
                        Bạn có {stats.pendingClassesCount} lớp đang chờ phê duyệt từ quản trị viên
                      </Text>
                    </View>
                  </View>
                  <View className="bg-yellow-500 px-3 py-1 rounded-full"
                       style={{
                         shadowColor: '#eab308',
                         shadowOffset: { width: 0, height: 2 },
                         shadowOpacity: 0.4,
                         shadowRadius: 4,
                       }}>
                    <Text className="text-white text-lg font-bold">{stats.pendingClassesCount}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => (navigation as any).navigate('Classes')}
                  className="bg-yellow-600 rounded-lg p-3 flex-row items-center justify-center"
                  style={{
                    shadowColor: '#b45309',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 4,
                  }}>
                  <Ionicons name="list" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">Xem lớp học</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Actions */}
            <View className={`${cardClass} rounded-xl p-6`}
                 style={{
                   shadowColor: '#000',
                   shadowOffset: { width: 0, height: 4 },
                   shadowOpacity: 0.3,
                   shadowRadius: 8,
                   borderWidth: 1,
                   borderColor: isDark ? '#475569' : '#e2e8f0'
                 }}>
              <Text className={`${textPrimary} text-lg font-semibold mb-4`}>Các hành động nhanh</Text>
              <View className="space-y-3">
                <TouchableOpacity 
                  onPress={handleCreateSession}
                  className="bg-blue-600 rounded-lg p-4 flex-row items-center justify-between"
                                style={{
                                  shadowColor: '#3b82f6',
                                  shadowOffset: { width: 0, height: 3 },
                                  shadowOpacity: 0.3,
                                  shadowRadius: 6,
                                }}>
                  <View className="flex-row items-center">
                    <Ionicons name="add-circle" size={24} color="#fff" />
                    <View className="ml-3">
                      <Text className="text-white font-semibold">Tạo buổi học</Text>
                      <Text className="text-blue-200 text-sm">Bắt đầu một buổi học mới</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleCreateQR}
                  className="rounded-lg p-4 flex-row items-center justify-between"
                                style={{
                                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                                  borderWidth: 1,
                                  borderColor: isDark ? '#475569' : '#cbd5e1',
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.2,
                                  shadowRadius: 4,
                                }}>
                  <View className="flex-row items-center">
                    <Ionicons name="qr-code" size={24} color="#8b5cf6" />
                    <View className="ml-3">
                      <Text className={`${textPrimary} font-semibold`}>Tạo mã QR</Text>
                      <Text className={`${textSecondary} text-sm`}>Cho học viên điểm danh</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8b5cf6" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleManageStudents}
                  className="rounded-lg p-4 flex-row items-center justify-between"
                                style={{
                                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                                  borderWidth: 1,
                                  borderColor: isDark ? '#475569' : '#cbd5e1',
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.2,
                                  shadowRadius: 4,
                                }}>
                  <View className="flex-row items-center">
                    <Ionicons name="people" size={24} color="#3b82f6" />
                    <View className="ml-3">
                      <Text className={`${textPrimary} font-semibold`}>Quản lý học viên</Text>
                      <Text className={`${textSecondary} text-sm`}>Xem và quản lý đăng ký</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleViewStats}
                  className="rounded-lg p-4 flex-row items-center justify-between"
                                style={{
                                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                                  borderWidth: 1,
                                  borderColor: isDark ? '#475569' : '#cbd5e1',
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.2,
                                  shadowRadius: 4,
                                }}>
                  <View className="flex-row items-center">
                    <Ionicons name="stats-chart" size={24} color="#10b981" />
                    <View className="ml-3">
                      <Text className={`${textPrimary} font-semibold`}>Xem thống kê</Text>
                      <Text className={`${textSecondary} text-sm`}>Thống kê hiệu suất lớp học</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#10b981" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}