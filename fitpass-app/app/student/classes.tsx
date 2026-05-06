import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getUser } from '../../lib/auth';
import { enrollmentAPI } from '../../lib/api';
import { refreshEmitter } from '../../lib/refreshEmitter';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemeClasses } from '../../lib/theme';

export default function StudentClassesScreen() {
  const navigation = useNavigation();
  const {
    isDark,
    screenClass,
    cardClass,
    panelClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();
  const cardBorder = isDark ? '#475569' : '#e2e8f0';
  
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const user = await getUser();
      console.log('📱 Student Classes - Current User:', user);
      console.log('🔑 Student ID to match:', user?.id);
      if (user?.id) {
        console.log('📚 Loading enrollments for student:', user.id);
        const res = await enrollmentAPI.getByStudent(user.id);
        console.log('📋 Raw enrollments response:', res);
        console.log('📊 Total enrollments found:', res?.length || 0);
        
        // Filter enrollments by current student and only approved classes
        const enrollmentsList = Array.isArray(res)
          ? res.filter((e: any) => {
              const enrollmentStudentId = e?.studentId || e?.userId || e?.student?.id || e?.user?.id;
              const sameStudent = !enrollmentStudentId || enrollmentStudentId === user.id;
              const classStatus = String(e?.class?.status || '').toUpperCase();
              const validStatus = !classStatus || classStatus === 'APPROVED' || classStatus === 'ACTIVE';

              console.log('📅 Classes - Checking enrollment:', e.id, 'studentId:', enrollmentStudentId, 'sameStudent:', sameStudent);
              console.log('🏫 Class status:', classStatus || '(missing)', 'Class name:', e.class?.name);

              return sameStudent && validStatus;
            })
          : [];
        
        console.log('Filtered enrollments:', enrollmentsList);
        setEnrollments(enrollmentsList);
      }
    } catch (error) {
      console.error('Error loading enrollments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClasses();
    
    // Listen for class enrollment updates
    const unsubscribe = refreshEmitter.onRefresh((screenName) => {
      console.log('🔄 Classes screen received refresh event for:', screenName);
      if (screenName === 'classEnrollment' || !screenName) {
        console.log('🔄 Classes screen refreshing data due to:', screenName || 'global refresh');
        // Only load data, don't trigger any new refresh events
        loadClasses();
      }
    });
    
    return unsubscribe;
  }, []);

  // Auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Classes screen focused, refreshing data...');
      loadClasses();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
  };

  const handleScanQR = () => {
    // Navigate to dedicated QR scanner screen
    navigation.navigate('Scanner' as never);
  };

  const handleViewDetails = (enrollment: any) => {
    if (!enrollment?.class?.id) return;
    (navigation as any).navigate('ClassDetail', { classId: enrollment.class.id });
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={`${textSecondary} mt-4 text-lg font-medium`}>Đang tải các lớp học...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 px-4 pt-6">
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className={`text-2xl font-bold ${textPrimary}`}>Lớp học của tôi</Text>
            <Text className={textSecondary}>{enrollments.length} đã đăng ký</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Schedule' as never)}
            className="bg-blue-600 rounded-xl p-3 flex-row items-center justify-center"
            style={{
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text className="text-white font-semibold ml-2">Xem lịch sessions đã book</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
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
          <View className="space-y-4 pb-6">
            {enrollments.length === 0 ? (
              <View className={`${cardClass} rounded-xl p-8 items-center`}
                   style={{
                     borderWidth: 1,
                     borderColor: cardBorder,
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 4 },
                     shadowOpacity: 0.3,
                     shadowRadius: 8,
                   }}>
                <View className="bg-blue-600 p-6 rounded-full mb-4"
                     style={{
                       shadowColor: '#3b82f6',
                       shadowOffset: { width: 0, height: 3 },
                       shadowOpacity: 0.4,
                       shadowRadius: 6,
                     }}>
                  <Ionicons name="calendar-outline" size={32} color="#fff" />
                </View>
                <Text className={`text-xl font-semibold ${textPrimary} mb-2`}>Chưa có lớp học nào</Text>
                <Text className={`${textSecondary} text-center leading-6`}>
                  Bạn chưa đăng ký lớp học nào. Hãy duyệt các lớp học có sẵn để bắt đầu!
                </Text>
              </View>
            ) : (
              enrollments.map((enrollment: any) => (
                <View key={enrollment.id} className={`${cardClass} rounded-xl overflow-hidden`}
                     style={{
                       borderWidth: 1,
                       borderColor: cardBorder,
                       shadowColor: '#000',
                       shadowOffset: { width: 0, height: 4 },
                       shadowOpacity: 0.3,
                       shadowRadius: 8,
                     }}>
                  <View className="p-6">
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <Text className={`text-xl font-semibold ${textPrimary} mb-1`}>
                          {enrollment.class?.name || 'Tên lớp học'}
                        </Text>
                        <Text className={`${textSecondary} text-sm mb-2`}>
                          {enrollment.class?.description || 'Không có mô tả'}
                        </Text>
                        <View className="flex-row items-center">
                          <Ionicons name="person" size={16} color="#94a3b8" />
                          <Text className={`${textSecondary} text-sm ml-2`}>
                            {enrollment.class?.teacher?.fullName || 'Giáo viên'}
                          </Text>
                        </View>
                      </View>
                      <View className="bg-green-600 px-3 py-1 rounded-full ml-3"
                           style={{
                             shadowColor: '#16a34a',
                             shadowOffset: { width: 0, height: 2 },
                             shadowOpacity: 0.3,
                             shadowRadius: 4,
                           }}>
                        <Text className="text-white text-xs font-medium">Đã đăng ký</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center space-x-6 mt-4">
                      <View className="flex-row items-center">
                        <View className="bg-blue-600 p-2 rounded-lg mr-3"
                             style={{
                               shadowColor: '#3b82f6',
                               shadowOffset: { width: 0, height: 2 },
                               shadowOpacity: 0.3,
                               shadowRadius: 4,
                             }}>
                          <Ionicons name="people" size={16} color="#fff" />
                        </View>
                        <View>
                          <Text className={`${textSecondary} text-xs`}>Sức chứa</Text>
                          <Text className={`${textPrimary} font-semibold`}>{enrollment.class?.capacity || 0}</Text>
                        </View>
                      </View>
                      
                      <View className="flex-row items-center">
                        <View className="bg-purple-600 p-2 rounded-lg mr-3"
                             style={{
                               shadowColor: '#8b5cf6',
                               shadowOffset: { width: 0, height: 2 },
                               shadowOpacity: 0.3,
                               shadowRadius: 4,
                             }}>
                          <Ionicons name="time" size={16} color="#fff" />
                        </View>
                        <View>
                          <Text className={`${textSecondary} text-xs`}>Thời lượng</Text>
                          <Text className={`${textPrimary} font-semibold`}>{enrollment.class?.duration || 0} phút</Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row space-x-3 mt-6">
                      <TouchableOpacity 
                        onPress={handleScanQR}
                        className="flex-1 bg-blue-600 rounded-lg py-3 flex-row items-center justify-center"
                                      style={{
                                        shadowColor: '#3b82f6',
                                        shadowOffset: { width: 0, height: 3 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 6,
                                      }}>
                        <Ionicons name="qr-code" size={20} color="#fff" />
                        <Text className="text-white font-medium ml-2">Điểm danh</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => handleViewDetails(enrollment)}
                        className={`${panelClass} rounded-lg py-3 px-4 flex-row items-center justify-center`}>
                        <Ionicons name="information-circle" size={20} color="#94a3b8" />
                        <Text className={`${textSecondary} font-medium ml-2`}>Chi tiết</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Add more classes card - Now clickable! */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('BrowseClasses' as never)}
              className={`${cardClass} rounded-xl p-8 items-center border-2 border-dashed`}
              style={{
                borderColor: isDark ? '#475569' : '#cbd5e1',
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              <View className="p-6 rounded-full mb-4"
                   style={{
                     backgroundColor: isDark ? '#2563eb' : '#3b82f6',
                     shadowColor: '#3b82f6',
                     shadowOffset: { width: 0, height: 4 },
                     shadowOpacity: 0.4,
                     shadowRadius: 8,
                   }}>
                <Ionicons name="search" size={32} color="#fff" />
              </View>
              <Text className={`text-xl font-semibold ${textPrimary} mb-2`}>Tìm thêm lớp học</Text>
              <Text className={`${textSecondary} text-center leading-6 mb-4`}>
                Duyệt các lớp học có sẵn và mở rộng hành trình thể dục của bạn
              </Text>
              <View 
                className="flex-row items-center px-4 py-2 rounded-lg"
                style={{ backgroundColor: isDark ? '#2563eb' : '#3b82f6' }}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text className="text-white font-semibold ml-2">Khám phá ngay</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}