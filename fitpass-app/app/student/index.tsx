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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getUser, User } from '../../lib/auth';
import { classAPI, enrollmentAPI, apiGet } from '../../lib/api';
import { refreshEmitter } from '../../lib/refreshEmitter';
import { useThemeClasses } from '../../lib/theme';

export default function StudentHomeScreen() {
  const navigation = useNavigation();
  const {
    isDark,
    screenClass,
    cardClass,
    panelClass,
    textPrimary,
    textSecondary,
    textMuted,
    textAccent,
  } = useThemeClasses();
  const cardBorder = isDark ? '#475569' : '#e2e8f0';

  const [user, setUser] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [userPackages, setUserPackages] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getNextSession = (enrollment: any) => {
    const sessions = Array.isArray(enrollment?.class?.sessions) ? enrollment.class.sessions : [];
    const now = Date.now();
    return sessions
      .filter((s: any) => new Date(s.startTime).getTime() > now)
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  };

  const formatSessionTime = (dateStr?: string) => {
    if (!dateStr) return 'Chưa có lịch mới';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Chưa có lịch mới';
    return d.toLocaleString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await getUser();
      setUser(currentUser);

      if (currentUser?.id) {
        // Load user packages and bookings
        const [packagesRes, bookingsRes] = await Promise.allSettled([
          apiGet('/user-packages').catch(() => ({ data: [] })),
          apiGet('/user-packages/bookings').catch(() => ({ data: [] })),
        ]);

        if (packagesRes.status === 'fulfilled') {
          setUserPackages(packagesRes.value?.data || []);
        } else {
          setUserPackages([]);
        }

        if (bookingsRes.status === 'fulfilled') {
          setRecentBookings(bookingsRes.value?.data?.slice(0, 3) || []);
        } else {
          setRecentBookings([]);
        }

        // Load enrollments
        try {
          const enrollmentsRes = await enrollmentAPI.getByStudent(currentUser.id);
          console.log('📅 Dashboard - Raw enrollments:', enrollmentsRes);
          const enrollmentsData = Array.isArray(enrollmentsRes)
            ? enrollmentsRes
            : (enrollmentsRes?.enrollments || enrollmentsRes?.data || []);
          console.log('📅 Dashboard - Parsed enrollments:', enrollmentsData.length);
          const filtered = enrollmentsData.filter((e: any) => {
            const enrollmentStudentId = e?.studentId || e?.userId || e?.student?.id || e?.user?.id;
            if (enrollmentStudentId && enrollmentStudentId !== currentUser.id) return false;

            const classStatus = String(e?.class?.status || '').toUpperCase();
            if (!classStatus) return true;
            return classStatus === 'APPROVED' || classStatus === 'ACTIVE';
          });
          console.log('📅 Dashboard - Filtered enrollments:', filtered.length);
          setEnrollments(filtered);
        } catch (enrollErr) {
          console.error('❌ Dashboard - Enrollment error:', enrollErr);
          setEnrollments([]);
        }
      } else {
        setUserPackages([]);
        setRecentBookings([]);
        setEnrollments([]);
      }
    } catch (error) {
      setUserPackages([]);
      setRecentBookings([]);
      setEnrollments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Listen for class enrollment updates
    const unsubscribe = refreshEmitter.onRefresh((screenName) => {
      if (screenName === 'classEnrollment' || screenName === 'packagePurchase' || screenName === 'sessionBooking' || !screenName) {
        loadData();
      }
    });
    return unsubscribe;
  }, []);

  // Auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Dashboard screen focused, refreshing data...');
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleScanQR = () => {
    navigation.navigate('Scanner' as never);
  };

  const handleViewClasses = () => {
    navigation.navigate('Classes' as never);
  };

  const handleSearchClasses = () => {
    navigation.navigate('BrowseClasses' as never);
  };

  const handleQuickEnroll = () => {
    navigation.navigate('BrowseClasses' as never);
  };

  const handleBookSessions = () => {
    navigation.navigate('BookSessions' as never);
  };

  const handleViewSchedule = () => {
    navigation.navigate('Schedule' as never);
  };

  const handleBuyPackages = () => {
    navigation.navigate('Packages' as never);
  };

  // Calculate stats
  const totalEnrollments = enrollments.length;
  const totalCredits = userPackages.reduce((total, pkg) => total + pkg.creditsLeft, 0);
  const todaysBookings = recentBookings.filter(booking => {
    const bookingDate = new Date(booking.session.startTime).toDateString();
    const today = new Date().toDateString();
    return bookingDate === today;
  }).length;
  const todaysClasses = enrollments.filter(enrollment => {
    // Check if there are sessions today for this class
    return enrollment.class?.sessions?.some((session: any) => {
      const sessionDate = new Date(session.startTime).toDateString();
      const today = new Date().toDateString();
      return sessionDate === today;
    });
  }).length;

  const sortedEnrollments = enrollments
    .slice()
    .sort((a, b) => {
      const nextA = getNextSession(a);
      const nextB = getNextSession(b);
      const timeA = nextA ? new Date(nextA.startTime).getTime() : Infinity;
      const timeB = nextB ? new Date(nextB.startTime).getTime() : Infinity;
      return timeA - timeB;
    });

  const enrollmentsWithUpcomingSessions = sortedEnrollments.filter((enrollment) => !!getNextSession(enrollment));
  const ongoingEnrollments = (enrollmentsWithUpcomingSessions.length > 0
    ? enrollmentsWithUpcomingSessions
    : sortedEnrollments
  ).slice(0, 2);
  const nextEnrollment = enrollmentsWithUpcomingSessions[0];
  const nextSession = nextEnrollment ? getNextSession(nextEnrollment) : null;

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-4"
               style={{
                 backgroundColor: '#3b82f6',
                 shadowColor: '#3b82f6',
                 shadowOffset: { width: 0, height: 6 },
                 shadowOpacity: 0.4,
                 shadowRadius: 12,
               }}>
            <ActivityIndicator size="large" color="white" />
          </View>
          <Text className={`${textSecondary} text-lg font-medium`}>Đang tải bảng điều khiển của bạn...</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 px-6 pt-6">
        {/* Header */}
        <View className="mb-8">
          <Text className={`text-3xl font-bold ${textPrimary} mb-2`}>
            Chào mừng bạn trở lại! 💪
          </Text>
          <Text className={`text-lg ${textAccent}`}>
            {user?.fullName || 'Học viên'}
          </Text>
          <View className="w-16 h-1 rounded-full mt-3" 
               style={{
                 backgroundColor: '#3b82f6',
                 shadowColor: '#3b82f6',
                 shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.5,
                 shadowRadius: 4,
               }} />
        </View>
        
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
        >
          <View className="space-y-6 pb-6">
            {/* Stats Overview */}
            <View className="flex-row">
              <View className={`${cardClass} rounded-2xl p-4 flex-1 mx-1`}
                   style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 6 },
                     shadowOpacity: 0.25,
                     shadowRadius: 10,
                     borderWidth: 1,
                     borderColor: cardBorder
                   }}>
                <Text className={`${textSecondary} text-xs font-medium`} numberOfLines={1}>Credits</Text>
                <Text className={`${textPrimary} text-2xl font-bold mt-1`} numberOfLines={1}>{totalCredits}</Text>
                <Ionicons name="card" size={18} color="#10b981" />
              </View>

              <View className={`${cardClass} rounded-2xl p-4 flex-1 mx-1`}
                   style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 6 },
                     shadowOpacity: 0.25,
                     shadowRadius: 10,
                     borderWidth: 1,
                     borderColor: cardBorder
                   }}>
                <Text className={`${textSecondary} text-xs font-medium`} numberOfLines={1}>Buổi hôm nay</Text>
                <Text className={`${textPrimary} text-2xl font-bold mt-1`} numberOfLines={1}>{todaysBookings}</Text>
                <Ionicons name="calendar" size={18} color="#3b82f6" />
              </View>

              <View className={`${cardClass} rounded-2xl p-4 flex-1 mx-1`}
                   style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 6 },
                     shadowOpacity: 0.25,
                     shadowRadius: 10,
                     borderWidth: 1,
                     borderColor: cardBorder
                   }}>
                <Text className={`${textSecondary} text-xs font-medium`} numberOfLines={1}>Lớp đang học</Text>
                <Text className={`${textPrimary} text-2xl font-bold mt-1`} numberOfLines={1}>{totalEnrollments}</Text>
                <Ionicons name="school" size={18} color="#8b5cf6" />
              </View>
            </View>

            {/* Quick Actions */}
            <View className={`${cardClass} rounded-2xl p-6`}
                 style={{
                   shadowColor: '#000',
                   shadowOffset: { width: 0, height: 6 },
                   shadowOpacity: 0.3,
                   shadowRadius: 12,
                   borderWidth: 1,
                   borderColor: cardBorder
                 }}>
              <Text className={`text-xl font-bold ${textPrimary} mb-4`}>Hành động nhanh</Text>
              <View className="space-y-3">
                <View className="flex-row space-x-3">
                  <TouchableOpacity 
                    onPress={handleBookSessions}
                    className="flex-1 rounded-xl p-3 items-center"
                    style={{
                      backgroundColor: isDark ? '#2563eb' : '#3b82f6',
                      shadowColor: '#2563eb',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }}>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text className="text-white font-semibold mt-1 text-center text-sm" numberOfLines={1}>Đặt buổi mới</Text>
                    <Text className="text-white opacity-80 text-xs text-center" numberOfLines={1}>Linh hoạt bằng credits</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleViewSchedule}
                    className="flex-1 rounded-xl p-3 items-center"
                    style={{
                      backgroundColor: isDark ? '#059669' : '#10b981',
                      shadowColor: '#16a34a',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }}>
                    <Ionicons name="list" size={20} color="#fff" />
                    <Text className="text-white font-semibold mt-1 text-center text-sm" numberOfLines={1}>Xem lịch đã đặt</Text>
                    <Text className="text-white opacity-80 text-xs text-center" numberOfLines={1}>Theo dõi buổi sắp tới</Text>
                  </TouchableOpacity>
                </View>
                
                <View className="flex-row space-x-3">
                  <TouchableOpacity 
                    onPress={handleSearchClasses}
                    className={`${panelClass} flex-1 rounded-xl p-3 items-center`}
                    style={{
                      borderWidth: 1,
                      borderColor: cardBorder,
                    }}>
                    <Ionicons name="search" size={20} color={isDark ? '#f59e0b' : '#ea580c'} />
                    <Text className={`${textPrimary} font-semibold mt-1 text-center text-sm`} numberOfLines={1}>Khám phá lớp</Text>
                    <Text className={`${textSecondary} text-xs text-center`} numberOfLines={1}>Đăng ký truyền thống</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleBuyPackages}
                    className={`${panelClass} flex-1 rounded-xl p-3 items-center`}
                    style={{
                      borderWidth: 1,
                      borderColor: cardBorder,
                    }}>
                    <Ionicons name="card" size={20} color={isDark ? '#a855f7' : '#9333ea'} />
                    <Text className={`${textPrimary} font-semibold mt-1 text-center text-sm`} numberOfLines={1}>Mua gói tập</Text>
                    <Text className={`${textSecondary} text-xs text-center`} numberOfLines={1}>Bổ sung credits</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Upcoming Focus */}
            <View className={`${cardClass} rounded-2xl p-5`}
                 style={{
                   shadowColor: '#000',
                   shadowOffset: { width: 0, height: 6 },
                   shadowOpacity: 0.3,
                   shadowRadius: 12,
                   borderWidth: 1,
                   borderColor: cardBorder
                 }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className={`${textSecondary} text-sm font-medium`}>Việc sắp tới</Text>
                  <Text className={`${textPrimary} text-base font-bold mt-1`} numberOfLines={1}>
                    {nextEnrollment?.class?.name || 'Chưa có buổi học sắp tới'}
                  </Text>
                  <Text className={`${textMuted} text-sm mt-1`} numberOfLines={2}>
                    {nextSession ? formatSessionTime(nextSession.startTime) : 'Hãy đặt buổi mới để bắt đầu lịch học'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={nextSession ? handleViewSchedule : handleBookSessions}
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#3b82f6' }}
                >
                  <Text className="text-white font-semibold text-sm">{nextSession ? 'Xem lịch' : 'Đặt buổi'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ongoing Classes */}
            <View className={`${cardClass} rounded-2xl p-6`}
                 style={{
                   shadowColor: '#000',
                   shadowOffset: { width: 0, height: 6 },
                   shadowOpacity: 0.3,
                   shadowRadius: 12,
                   borderWidth: 1,
                   borderColor: cardBorder
                 }}>
              <Text className={`text-xl font-bold ${textPrimary} mb-4`}>Lớp đang diễn ra</Text>
              {ongoingEnrollments.length === 0 ? (
                <View className={`${panelClass} rounded-xl p-6 flex-row items-center justify-center`}>
                  <Ionicons name="calendar-outline" size={32} color="#06b6d4" />
                  <Text className={`${textAccent} ml-3 font-medium`}>Chưa có lớp đang diễn ra</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {ongoingEnrollments.map((enrollment: any) => {
                    const nextSession = getNextSession(enrollment);
                    const upcomingCount = Array.isArray(enrollment?.class?.sessions)
                      ? enrollment.class.sessions.filter((s: any) => new Date(s.startTime).getTime() > Date.now()).length
                      : 0;
                    const classStatus = String(enrollment?.class?.status || '').toUpperCase();
                    const badgeColor = classStatus === 'PENDING' ? '#eab308' : classStatus === 'REJECTED' ? '#ef4444' : '#16a34a';
                    const badgeText = classStatus === 'PENDING' ? 'Chờ duyệt' : classStatus === 'REJECTED' ? 'Từ chối' : 'Đang học';

                    return (
                      <View key={enrollment.id} className={`${panelClass} rounded-xl p-4`}
                           style={{
                             borderWidth: 1,
                             borderColor: cardBorder,
                             shadowColor: '#000',
                             shadowOffset: { width: 0, height: 2 },
                             shadowOpacity: 0.2,
                             shadowRadius: 4,
                           }}>
                        <View className="flex-row items-center mb-3">
                          <View className="p-3 rounded-xl mr-3"
                               style={{
                                 backgroundColor: '#3b82f6',
                                 shadowColor: '#3b82f6',
                                 shadowOffset: { width: 0, height: 2 },
                                 shadowOpacity: 0.4,
                                 shadowRadius: 4,
                               }}>
                            <Ionicons name="school" size={20} color="#fff" />
                          </View>
                          <View className="flex-1">
                            <Text className={`${textPrimary} font-bold text-base`} numberOfLines={2}>
                              {enrollment.class?.name || 'Lớp học'}
                            </Text>
                            <Text className={`${textSecondary} text-sm font-medium mt-1`} numberOfLines={1}>
                              {upcomingCount > 0 ? `${upcomingCount} buổi sắp tới` : 'Đang chờ lịch buổi mới'}
                            </Text>
                          </View>
                          <View className="px-4 py-2 rounded-full" style={{ backgroundColor: badgeColor }}>
                            <Text className="text-white text-sm font-bold text-center">{badgeText}</Text>
                          </View>
                        </View>

                        <View className={`${isDark ? 'bg-slate-600/60 border border-slate-500' : 'bg-slate-100 border border-slate-200'} rounded-lg p-3`}>
                          <Text className={`${isDark ? 'text-slate-200' : 'text-slate-700'} text-sm font-semibold`}>Buổi kế tiếp</Text>
                          <Text className={`${textPrimary} text-sm mt-1`}>{formatSessionTime(nextSession?.startTime)}</Text>
                        </View>
                      </View>
                    );
                  })}
                  
                  {enrollments.length > 2 && (
                    <TouchableOpacity 
                      onPress={handleViewClasses}
                      className={`${panelClass} rounded-xl p-4 items-center`}
                      style={{
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}>
                      <Text className={`${textSecondary} font-semibold`} numberOfLines={1}>
                        Xem tất cả {enrollments.length} lớp của tôi
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Achievement Section */}
            <View className="rounded-2xl p-6"
                 style={{
                   backgroundColor: isDark ? '#d97706' : '#f59e0b',
                   shadowColor: '#f59e0b',
                   shadowOffset: { width: 0, height: 4 },
                   shadowOpacity: 0.3,
                   shadowRadius: 8,
                 }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white font-bold text-lg">Tiếp tục như vậy! 🔥</Text>
                  <Text className="text-white opacity-90 mt-1">Bạn đang làm rất tốt tuần này</Text>
                </View>
                <View className="bg-white/20 p-3 rounded-full">
                  <Ionicons name="trophy" size={28} color="#fff" />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}