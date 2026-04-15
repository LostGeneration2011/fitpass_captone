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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getUser } from '../../lib/auth';
import { apiGet, apiPost } from '../../lib/api';
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

export default function BookSessionsScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const { textPrimary, textSecondary, textMuted } = useThemeClasses();

  const [sessions, setSessions] = useState<AvailableSession[]>([]);
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

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
        end.setDate(end.getDate() + 30);
        const sessionsQuery = `/user-packages/sessions?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}&limit=300`;

        const [sessionsRes, packagesRes] = await Promise.all([
          apiGet(sessionsQuery).catch(e => {
            console.error('❌ Sessions API error:', e);
            return { data: [] };
          }),
          apiGet('/user-packages').catch(e => {
            console.error('❌ Packages API error:', e);
            return { data: [] };
          })
        ]);
        
        console.log('📊 BookSessions - Sessions response:', sessionsRes);
        console.log('📊 BookSessions - Packages response:', packagesRes);
        console.log('📊 BookSessions - Sessions data:', sessionsRes?.data);
        console.log('📊 BookSessions - Sessions count:', sessionsRes?.data?.length || 0);
        
        setSessions(sessionsRes?.data || []);
        setUserPackages(packagesRes?.data || []);
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
      if (screenName === 'classEnrollment' || screenName === 'sessionBooking' || 'packagePurchase' || !screenName) {
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

  const groupedSessions = groupSessionsByDate(sessions);
  const totalCredits = getTotalCredits();

  return (
    <SafeAreaView 
      key={`book-${isDark}-${forceUpdate}`}
      style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text className={`${textPrimary} font-bold`} style={{ fontSize: 24 }}>Book Sessions</Text>
          <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500' }}>{totalCredits} credits</Text>
          </View>
        </View>
        
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
                  Bạn cần mua gói tập để nhận credits và book sessions
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
                <Text className={`${textPrimary} font-semibold`} style={{ fontSize: 20, marginBottom: 8 }}>Chưa có sessions</Text>
                <Text className={textSecondary} style={{ textAlign: 'center', lineHeight: 24 }}>
                  Hiện tại chưa có sessions nào có sẵn để book
                </Text>
              </View>
            ) : (
              Object.entries(groupedSessions).map(([date, dateSessions]) => (
                <View key={date} style={{ marginBottom: 12 }}>
                  <Text className={`${textPrimary} font-semibold`} style={{ fontSize: 18, paddingHorizontal: 8, marginBottom: 12 }}>{date}</Text>
                  {dateSessions.map((session) => {
                    const startTime = formatDateTime(session.startTime);
                    const endTime = formatDateTime(session.endTime);
                    const isFullyBooked = session.availableSlots <= 0;
                    
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
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
                          
                          <View style={{ marginLeft: 12 }}>
                            {session.isBooked ? (
                              <View style={{ backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500' }}>Đã book</Text>
                              </View>
                            ) : isFullyBooked ? (
                              <View style={{ backgroundColor: '#4b5563', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                                <Text style={{ color: '#d1d5db', fontSize: 14, fontWeight: '500' }}>Hết chỗ</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                                onPress={() => handleBookSession(session.id)}
                                disabled={bookingLoading === session.id || totalCredits === 0}
                              >
                                {bookingLoading === session.id ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500' }}>
                                    Book (1 credit)
                                  </Text>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
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