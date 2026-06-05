import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getUser } from '../../lib/auth';
import { apiGet, apiPost, enrollmentAPI } from '../../lib/api';
import { refreshEmitter } from '../../lib/refreshEmitter';
import { useTheme } from '../../lib/theme';
import { useThemeClasses } from '../../lib/theme';

interface AvailableSession {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  isBooked: boolean;
  availableSlots: number;
  class: {
    id: string;
    name: string;
    description: string;
    capacity: number;
    teacher: {
      fullName: string;
    };
  };
  room?: {
    name: string;
  };
}

interface UserPackage {
  id: string;
  creditsLeft: number;
  package: {
    name: string;
  };
}

interface EnrolledClassOption {
  id: string;
  name: string;
}

export default function BookSessionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = ((route as any)?.params || {}) as { classId?: string; className?: string };
  const { isDark } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();

  const [sessions, setSessions] = useState<AvailableSession[]>([]);
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [enrolledClassIds, setEnrolledClassIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'enrolled' | 'all'>('enrolled');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClassOption[]>([]);

  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [isDark]);

  const loadData = async () => {
    try {
      const user = await getUser();
      console.log('📊 BookSessions - Current user:', user);
      if (user?.id) {
        console.log('📊 BookSessions - Loading data for user:', user.id);
        console.log('📊 BookSessions - About to call /user-packages/sessions');
        
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 90);
        const sessionsQuery = `/user-packages/sessions?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}&limit=300`;

        const [sessionsRes, packagesRes, enrollmentsRes, studentSessionsRes] = await Promise.all([
          apiGet(sessionsQuery).catch(e => {
            console.error('❌ Sessions API error:', e);
            return { data: [] };
          }),
          apiGet('/sessions').catch(e => {
            console.error('❌ Student Sessions API error:', e);
            return { sessions: [] };
          }),
          apiGet('/user-packages').catch(e => {
            console.error('❌ Packages API error:', e);
            return { data: [] };
          }),
          enrollmentAPI.getByStudent(user.id).catch(e => {
            console.error('❌ Enrollments API error:', e);
            return [];
          }),
        ]);
        
        console.log('📊 BookSessions - Sessions response (package scope):', sessionsRes);
        console.log('📊 BookSessions - Sessions response (student scope):', studentSessionsRes);
        console.log('📊 BookSessions - Packages response:', packagesRes);
        console.log('📊 BookSessions - Sessions data:', sessionsRes?.data);
        console.log('📊 BookSessions - Sessions count:', sessionsRes?.data?.length || 0);

        const enrolledIds = Array.isArray(enrollmentsRes)
          ? enrollmentsRes
              .filter((e: any) => {
                const classStatus = String(e?.class?.status || '').toUpperCase();
                return !classStatus || classStatus === 'APPROVED' || classStatus === 'ACTIVE';
              })
              .map((e: any) => e?.class?.id)
              .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
          : [];

        const enrolledClassInfo = Array.isArray(enrollmentsRes)
          ? enrollmentsRes
              .map((e: any) => ({
                id: e?.class?.id,
                name: e?.class?.name,
              }))
              .filter((item: any) => typeof item?.id === 'string' && item.id)
          : [];

        const uniqueEnrolledClasses: EnrolledClassOption[] = Array.from(
          new Map(
            enrolledClassInfo.map((item: any) => [
              item.id,
              {
                id: item.id,
                name: item.name || 'Lớp đã đăng ký',
              },
            ])
          ).values()
        );

        console.log('📊 BookSessions - Enrolled class ids:', enrolledIds);

        const packageScopedSessions: AvailableSession[] = Array.isArray(sessionsRes?.data)
          ? sessionsRes.data
          : [];

        const studentScopedSessionsRaw: any[] = Array.isArray(studentSessionsRes?.sessions)
          ? studentSessionsRes.sessions
          : [];

        const normalizedStudentScopedSessions: AvailableSession[] = studentScopedSessionsRaw
          .map((session: any) => ({
            id: session.id,
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status || 'UPCOMING',
            isBooked: Boolean(session.isBooked),
            availableSlots: typeof session.availableSlots === 'number'
              ? session.availableSlots
              : (session.room?.capacity ?? session.class?.capacity ?? 1),
            class: {
              id: session.class?.id,
              name: session.class?.name || 'Lớp học',
              description: session.class?.description || '',
              capacity: session.class?.capacity ?? session.room?.capacity ?? 0,
              teacher: {
                fullName: session.class?.teacher?.fullName || 'Chưa có giáo viên',
              },
            },
            room: session.room ? { name: session.room.name } : undefined,
          }))
          .filter((session: AvailableSession) => Boolean(session.id) && Boolean(session.class?.id));

        const mergedMap = new Map<string, AvailableSession>();
        normalizedStudentScopedSessions.forEach((session) => mergedMap.set(session.id, session));
        packageScopedSessions.forEach((session) => mergedMap.set(session.id, session));

        const mergedSessions = Array.from(mergedMap.values()).filter((session) => {
          const sessionTime = new Date(session.startTime).getTime();
          return (
            !Number.isNaN(sessionTime) &&
            sessionTime >= start.getTime() &&
            sessionTime <= end.getTime() &&
            (enrolledIds.length === 0 || enrolledIds.includes(session.class?.id))
          );
        });
        
        setSessions(mergedSessions);
        setUserPackages(packagesRes?.data || []);
        const uniqueEnrolledIds = Array.from(new Set(enrolledIds));
        setEnrolledClassIds(uniqueEnrolledIds);
        setEnrolledClasses(uniqueEnrolledClasses);

        if (routeParams.classId && uniqueEnrolledIds.includes(routeParams.classId)) {
          setSelectedClassId(routeParams.classId);
          setViewMode('enrolled');
        } else if (!routeParams.classId && uniqueEnrolledIds.length === 1) {
          setSelectedClassId(uniqueEnrolledIds[0]);
          setViewMode('enrolled');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải dữ liệu',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Listen for class enrollment and session booking updates
    const unsubscribe = refreshEmitter.onRefresh((screenName) => {
      console.log('🔄 BookSessions screen received refresh event for:', screenName);
      if (screenName === 'classEnrollment' || screenName === 'sessionBooking' || screenName === 'packagePurchase' || !screenName) {
        console.log('🔄 BookSessions screen refreshing data due to:', screenName || 'global refresh');
        // Only load data, don't trigger any new refresh events
        loadData();
      }
    });
    
    return unsubscribe;
  }, []);

  // Auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 BookSessions screen focused, refreshing data...');
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  const getTotalCredits = () => {
    return userPackages.reduce((total, pkg) => total + pkg.creditsLeft, 0);
  };

  const handleBookSession = async (sessionId: string) => {
    const totalCredits = getTotalCredits();
    
    if (totalCredits === 0) {
      Alert.alert(
        'Không đủ credits',
        'Bạn cần mua gói tập để book session',
        [{ text: 'OK' }]
      );
      return;
    }

    setBookingLoading(sessionId);
    
    try {
      await apiPost('/user-packages/use-credits', {
        sessionId: sessionId,
        amount: 1
      });

      // Reload data to update UI
      await loadData();
      
      // Trigger global refresh for schedule and dashboard updates
      refreshEmitter.triggerRefresh('sessionBooking');
      
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đã book session thành công. Kiểm tra lịch của bạn!',
        visibilityTime: 3000,
      });
      
    } catch (error: any) {
      let errorMessage = 'Không thể book session';
      
      // Try to parse error message from different formats
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        // If error.message is a JSON string, parse it
        try {
          const parsed = JSON.parse(error.message);
          errorMessage = parsed.message || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      Toast.show({
        type: 'error',
        text1: 'Không thể book',
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setBookingLoading(null);
    }
  };

  const groupSessionsByDate = (sessions: AvailableSession[]) => {
    const grouped: { [date: string]: AvailableSession[] } = {};
    
    sessions.forEach(session => {
      const dateKey = formatDateTime(session.startTime).date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });

    // Sort sessions within each date by time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    });

    return grouped;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={textSecondary} style={{ marginTop: 16, fontSize: 18, fontWeight: '500' }}>Đang tải sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const enrolledClassSet = new Set(enrolledClassIds);
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const sortedSessions = [...sessions].sort((a, b) => {
    const aIsEnrolledClass = enrolledClassSet.has(a.class?.id);
    const bIsEnrolledClass = enrolledClassSet.has(b.class?.id);

    if (aIsEnrolledClass !== bIsEnrolledClass) {
      return aIsEnrolledClass ? -1 : 1;
    }

    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const enrolledSessions = sortedSessions.filter((session) => enrolledClassSet.has(session.class?.id));
  const baseSessions = viewMode === 'enrolled' ? enrolledSessions : sortedSessions;
  const classFilteredSessions = selectedClassId
    ? baseSessions.filter((session) => session.class?.id === selectedClassId)
    : baseSessions;
  const visibleSessions = normalizedSearch
    ? classFilteredSessions.filter((session) => {
        const className = (session.class?.name || '').toLowerCase();
        const teacherName = (session.class?.teacher?.fullName || '').toLowerCase();
        return className.includes(normalizedSearch) || teacherName.includes(normalizedSearch);
      })
    : classFilteredSessions;
  const groupedSessions = groupSessionsByDate(visibleSessions);
  const totalCredits = getTotalCredits();

  const enrolledClassOptions = enrolledClasses.length > 0
    ? enrolledClasses
    : enrolledClassIds.map((id) => {
        const firstSession = enrolledSessions.find((session) => session.class?.id === id);
        return {
          id,
          name: firstSession?.class?.name || 'Lớp đã đăng ký',
        };
      });

  const getSessionStatus = (session: AvailableSession) => {
    const rawStatus = String(session.status || '').toUpperCase();

    if (!session.room?.name) {
      return { label: 'Chưa xếp phòng', color: '#6b7280', disabled: true };
    }

    if (session.isBooked) {
      return { label: 'Đã đặt chỗ', color: '#16a34a', disabled: true };
    }

    if (rawStatus === 'CANCELLED' || rawStatus === 'SUSPENDED' || rawStatus === 'INACTIVE') {
      return { label: 'Tạm dừng', color: '#6b7280', disabled: true };
    }

    if (session.availableSlots <= 0) {
      return { label: 'Đầy', color: '#4b5563', disabled: true };
    }

    return { label: 'Còn chỗ', color: '#2563eb', disabled: false };
  };

  return (
    <SafeAreaView 
      key={`book-${isDark}-${forceUpdate}`}
      style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500' }}>{totalCredits} credits</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setViewMode('enrolled')}
            style={{
              minWidth: 150,
              flexGrow: 1,
              backgroundColor: viewMode === 'enrolled' ? '#2563eb' : (isDark ? '#334155' : '#e2e8f0'),
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 9999,
            }}
          >
            <Text style={{ color: viewMode === 'enrolled' ? '#ffffff' : (isDark ? '#e2e8f0' : '#334155'), fontWeight: '600' }}>
              Lớp đã đăng ký ({enrolledSessions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode('all')}
            style={{
              minWidth: 150,
              flexGrow: 1,
              backgroundColor: viewMode === 'all' ? '#2563eb' : (isDark ? '#334155' : '#e2e8f0'),
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 9999,
            }}
          >
            <Text style={{ color: viewMode === 'all' ? '#ffffff' : (isDark ? '#e2e8f0' : '#334155'), fontWeight: '600' }}>
              Tất cả ({sortedSessions.length})
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#475569' : '#cbd5e1',
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: isDark ? '#ffffff' : '#0f172a',
            marginBottom: 12,
          }}
          placeholder="Tìm theo tên lớp hoặc giáo viên"
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {enrolledClassOptions.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12, maxHeight: 42 }}
            contentContainerStyle={{ alignItems: 'center', paddingRight: 8 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedClassId(null)}
              style={{
                backgroundColor: selectedClassId === null ? '#2563eb' : (isDark ? '#334155' : '#e2e8f0'),
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                marginRight: 8,
              }}
            >
              <Text style={{ color: selectedClassId === null ? '#ffffff' : (isDark ? '#e2e8f0' : '#334155'), fontWeight: '600' }}>
                Tất cả lớp đã đăng ký
              </Text>
            </TouchableOpacity>
            {enrolledClassOptions.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedClassId(item.id)}
                style={{
                  backgroundColor: selectedClassId === item.id ? '#2563eb' : (isDark ? '#334155' : '#e2e8f0'),
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginRight: 8,
                }}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ color: selectedClassId === item.id ? '#ffffff' : (isDark ? '#e2e8f0' : '#334155'), fontWeight: '600', maxWidth: 170 }}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
        >
          <View style={{ paddingBottom: 24 }}>
            {totalCredits === 0 ? (
              <View style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#475569' : '#e2e8f0',
                borderWidth: 1,
                borderRadius: 12,
                padding: 32,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}>
                <View style={{ backgroundColor: '#dc2626', padding: 24, borderRadius: 9999, marginBottom: 16 }}>
                  <Ionicons name="card-outline" size={32} color="#fff" />
                </View>
                <Text className={`${textPrimary} font-semibold`} style={{ fontSize: 20, marginBottom: 8 }}>Không có credits</Text>
                <Text className={textSecondary} style={{ textAlign: 'center', lineHeight: 24, marginBottom: 16 }}>
                  Bạn cần mua gói tập để nhận credits và đặt chỗ buổi học
                </Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                  onPress={() => navigation.navigate('Packages' as never)}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '600' }}>Mua gói</Text>
                </TouchableOpacity>
              </View>
            ) : Object.keys(groupedSessions).length === 0 ? (
              <View style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#475569' : '#e2e8f0',
                borderWidth: 1,
                borderRadius: 12,
                padding: 32,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}>
                <View style={{ backgroundColor: '#2563eb', padding: 24, borderRadius: 9999, marginBottom: 16 }}>
                  <Ionicons name="calendar" size={32} color="#ffffff" />
                </View>
                <Text className={`${textPrimary} font-semibold`} style={{ fontSize: 20, marginBottom: 8 }}>
                  {viewMode === 'enrolled' ? 'Lớp đã đăng ký chưa có buổi học mở' : 'Chưa có buổi học khả dụng'}
                </Text>
                <Text className={textSecondary} style={{ textAlign: 'center', lineHeight: 24 }}>
                  {viewMode === 'enrolled'
                    ? 'Bạn chưa có buổi học mở trong các lớp đã đăng ký. Bạn có thể xem tất cả để đặt lớp khác.'
                    : 'Hiện tại chưa có buổi học nào khả dụng để đặt chỗ'}
                </Text>
                {viewMode === 'enrolled' && sortedSessions.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setViewMode('all')}
                    style={{ marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '600' }}>Xem tất cả buổi học</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              Object.entries(groupedSessions).map(([date, dateSessions]) => (
                <View key={date} style={{ marginBottom: 12 }}>
                  <Text className={`${textPrimary} font-semibold`} style={{ fontSize: 18, paddingHorizontal: 8, marginBottom: 12 }}>{date}</Text>
                  {dateSessions.map((session) => {
                    const startTime = formatDateTime(session.startTime);
                    const endTime = formatDateTime(session.endTime);
                    const sessionStatus = getSessionStatus(session);
                    
                    return (
                      <View 
                        key={session.id} 
                        style={{
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderColor: isDark ? '#475569' : '#e2e8f0',
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                        }}
                      >
                        <View style={{ marginBottom: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text className={`${textPrimary} font-semibold`} style={{ fontSize: 18, marginBottom: 4 }}>
                              {session.class.name}
                            </Text>
                            <Text className={textSecondary} style={{ fontSize: 14, marginBottom: 8 }}>
                              {session.class.description}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              <Ionicons name="time" size={16} color="#94a3b8" />
                              <Text className={textSecondary} style={{ fontSize: 14, marginLeft: 8 }}>
                                {startTime.time} - {endTime.time}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              <Ionicons name="person" size={16} color="#94a3b8" />
                              <Text className={textSecondary} style={{ fontSize: 14, marginLeft: 8 }}>
                                {session.class?.teacher?.fullName || 'Chưa có giáo viên'}
                              </Text>
                            </View>
                            {session.room && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Ionicons name="location" size={16} color="#94a3b8" />
                                <Text className={textSecondary} style={{ fontSize: 14, marginLeft: 8 }}>
                                  {session.room.name}
                                </Text>
                              </View>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="people" size={16} color="#94a3b8" />
                              <Text className={textSecondary} style={{ fontSize: 14, marginLeft: 8 }}>
                                {session.availableSlots}/{session.class.capacity} chỗ trống
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          <View
                            style={{
                              backgroundColor: sessionStatus.color,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              minHeight: 40,
                              justifyContent: 'center',
                              flexGrow: 1,
                            }}
                          >
                            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                              {sessionStatus.label}
                            </Text>
                          </View>

                          {!sessionStatus.disabled && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#1d4ed8',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 8,
                                minHeight: 40,
                                justifyContent: 'center',
                                flexGrow: 1,
                                minWidth: 150,
                              }}
                              onPress={() => handleBookSession(session.id)}
                              disabled={bookingLoading === session.id || totalCredits === 0}
                            >
                              {bookingLoading === session.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                                  Đặt chỗ (1 credit)
                                </Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}