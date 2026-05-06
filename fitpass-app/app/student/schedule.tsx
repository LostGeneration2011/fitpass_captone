import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getUser } from '../../lib/auth';
import { apiGet, apiDelete, enrollmentAPI } from '../../lib/api';
import { refreshEmitter } from '../../lib/refreshEmitter';
import { useThemeClasses } from '../../lib/theme';

interface BookedSession {
  id: string;
  session: {
    id: string;
    startTime: string;
    endTime: string;
    class: {
      id: string;
      name: string;
      teacher: {
        fullName: string;
      };
    };
    room?: {
      name: string;
    };
  };
  userPackage: {
    package: {
      name: string;
    };
  };
  createdAt: string;
}

interface EnrolledClass {
  id: string;
  class: {
    id: string;
    name: string;
    description: string;
    teacher: {
      fullName: string;
    };
    sessions?: Array<{
      id: string;
      startTime: string;
      endTime: string;
      status: string;
      room?: {
        name: string;
      };
    }>;
  };
}

export default function StudentScheduleScreen() {
  const navigation = useNavigation();
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();
  const [bookings, setBookings] = useState<BookedSession[]>([]);
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadSchedule = async () => {
    try {
      const user = await getUser();
      if (user?.id) {
        console.log('📅 Schedule - Loading data for user:', user.id);
        
        // Load both bookings and enrollments
        const [bookingsRes, enrollmentsRes] = await Promise.allSettled([
          apiGet('/user-packages/bookings').catch(err => {
            console.log('📅 Schedule - Bookings API error:', err);
            return { data: [] };
          }),
          enrollmentAPI.getByStudent(user.id).catch(err => {
            console.log('📅 Schedule - Enrollments API error:', err);
            return [];
          })
        ]);
        
        // Handle bookings
        if (bookingsRes.status === 'fulfilled') {
          const bookingsList = bookingsRes.value?.data || [];
          console.log('📅 Schedule - Bookings list:', bookingsList);
          console.log('📅 Schedule - Bookings count:', bookingsList.length);
          
          // Show all bookings (including past sessions) so the calendar displays classes for each day
          bookingsList.forEach((booking: BookedSession) => {
            console.log('📅 Schedule - Booking:', {
              id: booking.session.id,
              className: booking.session.class?.name,
              startTime: booking.session.startTime,
              now: new Date().toISOString()
            });
          });
          
          console.log('📅 Schedule - Total bookings count:', bookingsList.length);
          bookingsList.forEach(b => {
            console.log('✅ Booking:', b.session.class?.name, 'at', b.session.startTime);
          });
          setBookings(bookingsList);
        }
        
        // Handle enrollments
        if (enrollmentsRes.status === 'fulfilled') {
          const enrollmentsData = enrollmentsRes.value;
          console.log('📅 Schedule - Raw enrollments:', enrollmentsData);
          
          // Filter enrollments by current student and only approved classes
          const enrollmentsList = Array.isArray(enrollmentsData)
            ? enrollmentsData.filter((e: any) => {
                const enrollmentStudentId = e?.studentId || e?.userId || e?.student?.id || e?.user?.id;
                const sameStudent = !enrollmentStudentId || enrollmentStudentId === user.id;
                const classStatus = String(e?.class?.status || '').toUpperCase();
                const validStatus = !classStatus || classStatus === 'APPROVED' || classStatus === 'ACTIVE';

                console.log('📅 Schedule - Checking enrollment:', e.id, 'studentId:', enrollmentStudentId, 'sameStudent:', sameStudent, 'status:', classStatus || '(missing)');
                return sameStudent && validStatus;
              })
            : [];
          
          console.log('📅 Schedule - Filtered enrollments:', enrollmentsList.length);
          setEnrollments(enrollmentsList);
        }
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải thời khóa biểu',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchedule();
    
    // Listen for class enrollment and session booking updates
    const unsubscribe = refreshEmitter.onRefresh((screenName) => {
      console.log('🔄 Schedule screen received refresh event for:', screenName);
      if (screenName === 'classEnrollment' || screenName === 'sessionBooking' || !screenName) {
        console.log('🔄 Schedule screen refreshing data due to:', screenName || 'global refresh');
        // Only load data, don't trigger any new refresh events
        loadSchedule();
      }
    });
    
    return unsubscribe;
  }, []);

  // Auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Schedule screen focused, refreshing data...');
      loadSchedule();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancelLoading(bookingId);
    try {
      await apiDelete(`/user-packages/bookings/${bookingId}`);
      
      await loadSchedule();
      refreshEmitter.triggerRefresh('sessionBooking');
      
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đã hủy booking và hoàn credit',
        visibilityTime: 3000,
      });
    } catch (error: any) {
      let errorMessage = 'Không thể hủy booking';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        try {
          const parsed = JSON.parse(error.message);
          errorMessage = parsed.message || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setCancelLoading(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('vi-VN'),
      time: date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const groupBookingsByDate = (bookings: BookedSession[]) => {
    const grouped: { [date: string]: BookedSession[] } = {};
    
    bookings.forEach(booking => {
      const dateKey = formatDateTime(booking.session.startTime).date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });

    // Sort sessions within each date by time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => 
        new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime()
      );
    });

    return grouped;
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDateString = (year: number, month: number, day: number) => {
    return new Date(year, month, day).toLocaleDateString('vi-VN');
  };

  const bookingsByDate = useMemo(() => {
    const map: { [key: string]: BookedSession[] } = {};
    bookings.forEach(booking => {
      const date = new Date(booking.session.startTime);
      const key = date.toLocaleDateString('vi-VN');
      if (!map[key]) map[key] = [];
      map[key].push(booking);
    });
    return map;
  }, [bookings]);

  // Get all enrolled class sessions
  const enrolledSessionsByDate = useMemo(() => {
    const map: { [key: string]: Array<any> } = {};
    enrollments.forEach(enrollment => {
      enrollment.class?.sessions?.forEach((session: any) => {
        // Only show upcoming sessions
        if (new Date(session.startTime) > new Date()) {
          const date = new Date(session.startTime);
          const key = date.toLocaleDateString('vi-VN');
          if (!map[key]) map[key] = [];
          map[key].push({
            ...session,
            className: enrollment.class.name,
            teacher: enrollment.class.teacher,
            classId: enrollment.class.id,
            isEnrolledOnly: true,
          });
        }
      });
    });
    return map;
  }, [enrollments]);

  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toLocaleDateString('vi-VN');
    const bookedSessions = (bookingsByDate[dateStr] || []).sort((a, b) => 
      new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime()
    );
    const enrolledSessions = (enrolledSessionsByDate[dateStr] || []).sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    return { booked: bookedSessions, enrolled: enrolledSessions };
  };

  const hasSessionsOnDate = (date: Date) => {
    const dateStr = date.toLocaleDateString('vi-VN');
    const hasBooked = (bookingsByDate[dateStr]?.length || 0) > 0;
    const hasEnrolled = (enrolledSessionsByDate[dateStr]?.length || 0) > 0;
    return hasBooked || hasEnrolled;
  };

  const colorPalette = [
    { bg: 'bg-blue-500/25', text: 'text-blue-200' },
    { bg: 'bg-emerald-500/25', text: 'text-emerald-200' },
    { bg: 'bg-purple-500/25', text: 'text-purple-200' },
    { bg: 'bg-amber-500/25', text: 'text-amber-200' },
    { bg: 'bg-cyan-500/25', text: 'text-cyan-200' },
    { bg: 'bg-rose-500/25', text: 'text-rose-200' },
  ];

  const getColorForTitle = (title: string) => {
    let hash = 0;
    for (let i = 0; i < title.length; i += 1) {
      hash = (hash << 5) - hash + title.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % colorPalette.length;
    return colorPalette[idx];
  };

  const getSessionTitlesForDate = (date: Date) => {
    const dateStr = date.toLocaleDateString('vi-VN');
    const titles: Array<{ title: string; color: { bg: string; text: string } }> = [];
    (bookingsByDate[dateStr] || []).forEach((booking) => {
      const title = booking.session.class?.name || 'Lớp học';
      titles.push({ title, color: getColorForTitle(title) });
    });
    (enrolledSessionsByDate[dateStr] || []).forEach((session: any) => {
      const title = session.className || 'Lớp học';
      titles.push({ title, color: getColorForTitle(title) });
    });
    return titles;
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellWidth = (Dimensions.get('window').width - 40) / 7 - 4;

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View 
          key={`empty-${i}`} 
          style={{ width: cellWidth, height: cellWidth }}
          className="m-0.5"
        />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      cellDate.setHours(0, 0, 0, 0);
      const hasSessions = hasSessionsOnDate(cellDate);
      const sessionTitles = getSessionTitlesForDate(cellDate);
      const isSelected = selectedDate && 
        selectedDate.toLocaleDateString('vi-VN') === cellDate.toLocaleDateString('vi-VN');
      const isToday = cellDate.getTime() === today.getTime();

      days.push(
        <TouchableOpacity
          key={day}
          onPress={() => setSelectedDate(cellDate)}
          style={{ 
            width: cellWidth, 
            height: cellWidth * 1.35,
            marginHorizontal: 2,
            marginVertical: 2,
          }}
          activeOpacity={0.7}
        >
          <View
            className="flex-1 rounded-xl flex items-start justify-start relative overflow-hidden"
            style={{
              backgroundColor: isSelected 
                ? '#3b82f6' 
                : isDark ? '#020617' : '#ffffff',
              borderWidth: 1,
              borderColor: isSelected
                ? 'rgba(59,130,246,0.8)'
                : hasSessions
                ? (isDark ? 'rgba(148,163,184,0.35)' : 'rgba(59,130,246,0.3)')
                : (isDark ? 'rgba(148,163,184,0.15)' : 'rgba(203,213,225,0.4)'),
            }}
          >
            <View className="w-full px-1.5 pt-1">
              <Text 
                className="text-xs font-bold"
                style={{
                  fontSize: cellWidth > 50 ? 14 : 12,
                  fontWeight: '800',
                  color: isSelected 
                    ? '#ffffff' 
                    : isToday 
                    ? '#3b82f6' 
                    : hasSessions
                    ? (isDark ? '#93c5fd' : '#2563eb')
                    : (isDark ? '#cbd5e1' : '#64748b'),
                }}
              >
                {day}
              </Text>

              {sessionTitles.length > 0 && (
                <View className="mt-1 w-full">
                  {sessionTitles.slice(0, 3).map((item, idx) => (
                    <View
                      key={`${day}-title-${idx}`}
                      className="rounded-md px-1 py-0.5 mb-0.5"
                      style={{
                        backgroundColor: isSelected 
                          ? 'rgba(255,255,255,0.2)' 
                          : (isDark ? 'rgba(59,130,246,0.2)' : 'rgba(191,219,254,0.8)')
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-[9px] font-semibold"
                        style={{
                          fontSize: cellWidth > 50 ? 9 : 7,
                          color: isSelected ? '#ffffff' : (isDark ? '#93c5fd' : '#1e40af'),
                        }}
                      >
                        {item.title}
                      </Text>
                    </View>
                  ))}
                  {sessionTitles.length > 3 && (
                    <Text
                      className="text-[9px]"
                      style={{ 
                        fontSize: cellWidth > 50 ? 9 : 7,
                        color: isSelected ? 'rgba(255,255,255,0.9)' : (isDark ? '#94a3b8' : '#64748b'),
                      }}
                    >
                      +{sessionTitles.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </View>
            {isToday && (
              <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400" />
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={`${textSecondary} mt-4 text-lg font-medium`}>Đang tải thời khóa biểu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedBookings = groupBookingsByDate(bookings);

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 px-4 pt-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-1">
            <Text className={`text-3xl font-black ${textPrimary}`}>Lịch của tôi</Text>
            <Text className={`${textSecondary} text-xs mt-1`}>
              {bookings.length > 0 
                ? `Có ${bookings.length} buổi đã đặt` 
                : 'Chưa có buổi đã đặt'}
            </Text>
          </View>
          <View className={`${cardClass} rounded-full px-4 py-2`} style={{ borderWidth: 1, borderColor: isDark ? '#475569' : '#cbd5e1' }}>
            <Text className={`${textPrimary} text-xs font-bold`}>{currentMonth.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}</Text>
          </View>
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
          <View className="pb-6">
            {/* Month Navigation */}
            <View className={`flex-row justify-between items-center mb-4 ${cardClass} rounded-2xl p-3`}
              style={{
                borderWidth: 1,
                borderColor: isDark ? '#475569' : '#cbd5e1',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              <TouchableOpacity 
                onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 rounded-full"
                style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
              >
                <Ionicons name="chevron-back" size={20} color="#3b82f6" />
              </TouchableOpacity>
              
              <View className="items-center flex-1 px-4">
                <Text className={`${textPrimary} font-bold text-lg`}>
                  {currentMonth.toLocaleDateString('vi-VN', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 rounded-full"
                style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
              >
                <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <View className={`mb-6 ${cardClass} rounded-2xl p-4`}
              style={{
                borderWidth: 1,
                borderColor: isDark ? '#475569' : '#cbd5e1',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              {/* Day headers */}
              <View className="flex-row justify-around mb-3 pb-2" style={{ borderBottomWidth: 1, borderBottomColor: isDark ? '#475569' : '#cbd5e1' }}>
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, idx) => (
                  <Text key={idx} className={`${textSecondary} font-semibold text-xs w-1/7 text-center`}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar days grid - proper flex wrap */}
              <View className="flex-row flex-wrap">
                {renderCalendarDays()}
              </View>
            </View>

            {/* Selected date details */}
            {selectedDate && (
              <View className="space-y-4">
                <Text className={`${textPrimary} font-black text-lg px-2`}>
                  {selectedDate.toLocaleDateString('vi-VN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>

                {getSessionsForDate(selectedDate).booked.length === 0 && 
                 getSessionsForDate(selectedDate).enrolled.length === 0 ? (
                  <View className={`${cardClass} rounded-xl p-6 items-center`} style={{ borderWidth: 1, borderColor: isDark ? '#475569' : '#cbd5e1' }}>
                    <Ionicons name="calendar-outline" size={32} color={isDark ? '#64748b' : '#94a3b8'} />
                    <Text className={`${textSecondary} mt-3 text-center text-sm font-semibold`}>
                      Không có lịch học trong ngày này
                    </Text>
                  </View>
                ) : (
                  <View className="space-y-3">
                    {/* Booked Sessions */}
                    {getSessionsForDate(selectedDate).booked.map((booking, idx) => {
                      const startTime = formatDateTime(booking.session.startTime);
                      const endTime = formatDateTime(booking.session.endTime);
                      
                      return (
                        <View
                          key={`booked-${booking.id}`}
                          className={`${cardClass} rounded-2xl p-5 overflow-hidden`}
                          style={{
                            borderWidth: 1,
                            borderColor: isDark ? '#475569' : '#cbd5e1',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 6,
                          }}
                        >
                          {/* Top accent bar - Blue for booked */}
                          <View className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: '#3b82f6' }} />

                          <View className="flex-row justify-between items-start mb-4 mt-1">
                            <View className="flex-1">
                              <Text className={`text-xl font-black ${textPrimary} mb-1`}>
                                {booking.session.class.name}
                              </Text>
                              <View className="flex-row items-center">
                                <View className="w-1 h-1 bg-blue-400 rounded-full mr-2" />
                                <Text className={`${textSecondary} text-xs`}>Booked Session {idx + 1}</Text>
                              </View>
                            </View>
                            <View className="bg-green-600 px-4 py-1.5 rounded-full">
                              <Text className="text-white text-xs font-black">✓ ĐÃ ĐẶT</Text>
                            </View>
                          </View>
                          
                          <View className="space-y-3">
                            <View className="flex-row items-center rounded-lg px-3 py-2.5" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}>
                              <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                                <Ionicons name="time" size={16} color="#3b82f6" />
                              </View>
                              <Text className={`${textPrimary} text-sm`}>
                                <Text className="font-bold text-blue-500">{startTime.time}</Text>
                                <Text className={textMuted}> — </Text>
                                <Text className="font-bold text-blue-500">{endTime.time}</Text>
                              </Text>
                            </View>

                            <View className="flex-row items-center rounded-lg px-3 py-2.5" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}>
                              <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)' }}>
                                <Ionicons name="person" size={16} color="#a855f7" />
                              </View>
                              <Text className={`${textPrimary} text-sm flex-1`}>
                                {booking.session.class?.teacher?.fullName || 'Chưa có giáo viên'}
                              </Text>
                            </View>

                            {booking.session.room && (
                              <View className="flex-row items-center rounded-lg px-3 py-2.5" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}>
                                <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)' }}>
                                  <Ionicons name="location" size={16} color="#06b6d4" />
                                </View>
                                <Text className={`${textPrimary} text-sm flex-1`}>
                                  {booking.session.room.name}
                                </Text>
                              </View>
                            )}

                            {booking.userPackage?.package?.name && (
                              <View className="flex-row items-center rounded-lg px-3 py-2.5" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}>
                                <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                                  <Ionicons name="gift" size={16} color="#10b981" />
                                </View>
                                <Text className={`${textPrimary} text-sm flex-1`}>
                                  {booking.userPackage.package.name}
                                </Text>
                              </View>
                            )}

                            <View className="flex-row items-center gap-2 mt-2">
                              <TouchableOpacity
                                onPress={() => handleCancelBooking(booking.id)}
                                disabled={cancelLoading === booking.id}
                                activeOpacity={0.7}
                                className="bg-red-600/20 border border-red-600/50 rounded-lg px-3 py-2"
                              >
                                <View className="flex-row items-center justify-center">
                                  {cancelLoading === booking.id ? (
                                    <ActivityIndicator size="small" color="#ef4444" />
                                  ) : (
                                    <>
                                      <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                                      <Text className="text-red-400 text-xs font-bold ml-2">
                                        Hủy booking
                                      </Text>
                                    </>
                                  )}
                                </View>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => {
                                  if (booking.session.class?.id) {
                                    (navigation as any).navigate('ClassDetail', { classId: booking.session.class.id });
                                  }
                                }}
                                activeOpacity={0.7}
                                className="bg-blue-600/20 border border-blue-500/50 rounded-lg px-3 py-2"
                              >
                                <View className="flex-row items-center justify-center">
                                  <Ionicons name="information-circle-outline" size={16} color="#60a5fa" />
                                  <Text className="text-blue-300 text-xs font-bold ml-2">
                                    Xem chi tiết
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}

                    {/* Enrolled Class Sessions */}
                    {getSessionsForDate(selectedDate).enrolled.map((session, idx) => {
                      const startTime = formatDateTime(session.startTime);
                      const endTime = formatDateTime(session.endTime);
                      
                      return (
                        <View
                          key={`enrolled-${session.id}`}
                          className={`${cardClass} rounded-2xl p-5 overflow-hidden`}
                          style={{
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : 'rgba(251, 146, 60, 0.5)',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 6,
                          }}
                        >
                          {/* Top accent bar - Amber for enrolled */}
                          <View className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: '#f59e0b' }} />

                          <View className="flex-row justify-between items-start mb-4 mt-1">
                            <View className="flex-1">
                              <Text className={`text-xl font-black ${textPrimary} mb-1`}>
                                {session.className}
                              </Text>
                              <View className="flex-row items-center">
                                <View className="w-1 h-1 bg-amber-400 rounded-full mr-2" />
                                <Text className={`${textSecondary} text-xs`}>Enrolled Class Session</Text>
                              </View>
                            </View>
                            <View className="bg-amber-600 px-4 py-1.5 rounded-full">
                              <Text className="text-white text-xs font-black">📚 LỚP</Text>
                            </View>
                          </View>
                          
                          <View className="space-y-3">
                            <View className="flex-row items-center rounded-lg px-3 py-2.5" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}>
                              <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                                <Ionicons name="time" size={16} color="#f59e0b" />
                              </View>
                              <Text className={`${textPrimary} text-sm`}>
                                <Text className="font-bold text-amber-500">{startTime.time}</Text>
                                <Text className={textMuted}> — </Text>
                                <Text className="font-bold text-amber-500">{endTime.time}</Text>
                              </Text>
                            </View>

                            <View className="flex-row items-center rounded-lg px-3 py-2.5" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}>
                              <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)' }}>
                                <Ionicons name="person" size={16} color="#a855f7" />
                              </View>
                              <Text className={`${textPrimary} text-sm flex-1`}>
                                {session.teacher?.fullName || 'Chưa có giáo viên'}
                              </Text>
                            </View>

                            {session.room && (
                              <View className="flex-row items-center rounded-lg px-3 py-2.5" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}>
                                <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)' }}>
                                  <Ionicons name="location" size={16} color="#06b6d4" />
                                </View>
                                <Text className={`${textPrimary} text-sm flex-1`}>
                                  {session.room.name}
                                </Text>
                              </View>
                            )}

                            <TouchableOpacity
                              onPress={() => {
                                if (session.classId) {
                                  navigation.navigate('BookSessions' as never);
                                }
                              }}
                              activeOpacity={0.7}
                              className="rounded-lg px-4 py-3"
                              style={{
                                backgroundColor: isDark ? '#d97706' : '#f59e0b',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(251, 146, 60, 0.5)',
                              }}
                            >
                              <View className="flex-row items-center justify-center">
                                <Ionicons name="calendar-outline" size={16} color="white" />
                                <Text className="text-white text-sm font-bold ml-2">
                                  💡 Chưa đặt - Bấm để đặt ngay!
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Summary Stats */}
            {!selectedDate && (
              <View className="space-y-4">
                {/* Upcoming Sessions Summary */}
                {bookings.length > 0 || enrollments.length > 0 ? (
                  <View className={`${cardClass} rounded-2xl p-5`}
                    style={{
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(147, 197, 253, 0.5)',
                      shadowColor: '#3b82f6',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                    }}
                  >
                    <View className="flex-row items-center mb-4">
                      <View className="w-10 h-10 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: isDark ? 'rgba(37, 99, 235, 0.4)' : 'rgba(191, 219, 254, 0.8)' }}>
                        <Ionicons name="stats-chart" size={20} color="#3b82f6" />
                      </View>
                      <Text className={`${textPrimary} font-black text-lg`}>Thống kê</Text>
                    </View>
                    <View className="space-y-3">
                      <View className="flex-row justify-between items-center">
                        <Text className={`${textSecondary} text-sm`}>📅 Buổi đã đặt</Text>
                        <Text className="text-blue-500 font-black text-lg">{bookings.length}</Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className={`${textSecondary} text-sm`}>📚 Lớp đã đăng ký</Text>
                        <Text className="text-amber-500 font-black text-lg">{enrollments.length}</Text>
                      </View>
                      <View className="h-0.5 rounded-full" style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)' }} />
                      <Text className={`${textMuted} text-xs`}>
                        💡 Chọn ngày để xem chi tiết. Xanh = đã đặt, Cam = lớp đăng ký
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="space-y-4">
                    {/* Info banner */}
                    <View className="rounded-2xl p-4" style={{ backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(191, 219, 254, 0.5)', borderWidth: 1, borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(147, 197, 253, 0.5)' }}>
                      <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={24} color="#3b82f6" style={{ marginRight: 12 }} />
                        <View className="flex-1">
                          <Text className="text-blue-500 font-bold text-sm mb-1">
                            💡 Màn hình này hiển thị gì?
                          </Text>
                          <Text className={`${textSecondary} text-xs leading-5`}>
                            Đây là nơi xem các <Text className="font-bold text-blue-500">sessions đã book</Text> (đã trừ credit). 
                            Để xem lớp đã đăng ký, vào tab <Text className="font-bold">Lớp học</Text>.
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Empty state */}
                    <View className={`${cardClass} rounded-2xl p-8 items-center`}
                      style={{
                        borderWidth: 1,
                        borderColor: isDark ? '#475569' : '#cbd5e1',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                      }}
                    >
                      <View className="p-6 rounded-full mb-4" style={{ backgroundColor: isDark ? '#475569' : '#e2e8f0' }}>
                        <Ionicons name="calendar-outline" size={40} color={isDark ? '#64748b' : '#94a3b8'} />
                      </View>
                      <Text className={`${textPrimary} text-center font-black text-xl mb-2`}>
                        Chưa book session nào
                      </Text>
                      <Text className={`${textSecondary} text-sm text-center leading-6 mb-6`}>
                        Bạn chưa đặt lịch cho buổi tập nào. Hãy book session để lịch hiển thị ở đây!
                      </Text>
                      
                      {/* Action steps */}
                      <View className="w-full space-y-3 rounded-xl p-4" style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)', borderWidth: 1, borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)' }}>
                        <Text className={`${textPrimary} font-bold text-sm mb-2`}>📋 Các bước để book session:</Text>
                        <View className="flex-row items-start">
                          <Text className="text-blue-500 font-bold mr-2">1.</Text>
                          <Text className={`${textSecondary} text-xs flex-1`}>Đăng ký lớp học (tab "Lớp học" → "Tìm thêm lớp học")</Text>
                        </View>
                        <View className="flex-row items-start">
                          <Text className="text-blue-500 font-bold mr-2">2.</Text>
                          <Text className={`${textSecondary} text-xs flex-1`}>Mua gói tập để có credits (tab "Gói tập")</Text>
                        </View>
                        <View className="flex-row items-start">
                          <Text className="text-blue-500 font-bold mr-2">3.</Text>
                          <Text className={`${textSecondary} text-xs flex-1`}>Book session cụ thể (tab "Dashboard" → "Book Sessions")</Text>
                        </View>
                        <View className="flex-row items-start">
                          <Text className="text-green-500 font-bold mr-2">✓</Text>
                          <Text className="text-green-500 text-xs flex-1 font-semibold">Sessions đã book sẽ hiển thị ở đây!</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}