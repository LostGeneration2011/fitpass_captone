import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getUser } from '../../lib/auth';
import { classAPI, enrollmentAPI } from '../../lib/api';
import { refreshEmitter } from '../../lib/refreshEmitter';
import { useThemeClasses } from '../../lib/theme';


export default function BrowseClassesScreen({ navigation }: any) {
  const {
    isDark,
    screenClass,
    cardClass,
    panelClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();
  const inputClass = isDark
    ? 'bg-slate-800 border border-slate-700 text-white'
    : 'bg-white border border-slate-200 text-slate-900';
  const softChip = isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200';
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [enrolledClassIds, setEnrolledClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'capacity' | 'duration'>('name');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const computeDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;
    if (timeRange === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (timeRange === 'week') {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7; // Monday as start
      start = new Date(now);
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0,0,0,0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
    } else if (timeRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }
    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: end ? end.toISOString() : undefined,
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await getUser();
      if (!user?.id) return;

      // Build filters for API
      const dateRange = computeDateRange();
      const allClasses = await classAPI.getAll(undefined, {
        approved: true,
        type: selectedType || undefined,
        level: selectedLevel || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const approvedClasses = allClasses.filter((c: any) => c.status === 'APPROVED');
      
      // Load user enrollments to check which classes are already enrolled
      const enrollments = await enrollmentAPI.getByStudent(user.id);
      const userEnrollments = enrollments.filter((e: any) => e.studentId === user.id);
      const enrolledIds = userEnrollments.map((e: any) => e.classId);
      
      setAvailableClasses(approvedClasses);
      setEnrolledClassIds(enrolledIds);
      console.log('Browse Classes - Available:', approvedClasses.length, 'Enrolled:', enrolledIds.length);
    } catch (error) {
      console.error('Error loading browse classes data:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải danh sách lớp học',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEnroll = async (classItem: any) => {
    try {
      setEnrolling(classItem.id);
      const user = await getUser();
      
      if (!user?.id) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi đăng ký',
          text2: 'Không thể xác thực người dùng',
        });
        return;
      }

      console.log('Enrolling student:', user.id, 'in class:', classItem.id);
      
      await enrollmentAPI.create({
        studentId: user.id,
        classId: classItem.id,
      });
      
      // Update enrolled list immediately
      setEnrolledClassIds(prev => [...prev, classItem.id]);
      
      // Trigger global refresh FIRST to update all screens
      refreshEmitter.triggerRefresh('classEnrollment');
      
      // Then refresh local data
      await loadData();
      
      Toast.show({
          type: 'success',
          text1: 'Đăng ký thành công',
          text2: `Bạn đã đăng ký lớp "${classItem.name}"`,
        visibilityTime: 4000,
      });
      
    } catch (error: any) {
      console.error('Enrollment error:', error);
      Toast.show({
        type: 'error',
        text1: 'Đăng ký thất bại',
        text2: error.message || 'Đã xảy ra lỗi khi đăng ký',
      });
    } finally {
      setEnrolling(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  
  // Reload when filters change
  useEffect(() => {
    loadData();
  }, [selectedType, selectedLevel, timeRange, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={`${textSecondary} mt-4 text-lg font-medium`}>Đang tải lớp học...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const availableClassesToEnroll = availableClasses.filter(c => !enrolledClassIds.includes(c.id));
  
  const filteredClasses = availableClassesToEnroll.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.teacher?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const sortedClasses = [...filteredClasses].sort((a, b) => {
    switch(sortBy) {
      case 'capacity':
        return b.capacity - a.capacity;
      case 'duration':
        return a.duration - b.duration;
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 px-4 pt-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className={`${panelClass} p-3 rounded-xl`}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#94a3b8' : '#475569'} />
          </TouchableOpacity>
          <Text className={`text-2xl font-bold ${textPrimary}`}>Tìm lớp học</Text>
          <View className="w-12" />
        </View>

        {/* Stats */}
        <View className={`${cardClass} rounded-xl p-4 mb-6`}>
          <View className="flex-row items-center justify-between">
            <View className="items-center">
              <Text className="text-blue-400 text-2xl font-bold">{availableClassesToEnroll.length}</Text>
              <Text className={`${textSecondary} text-sm`}>Có thể đăng ký</Text>
            </View>
            <View className="items-center">
              <Text className="text-green-400 text-2xl font-bold">{enrolledClassIds.length}</Text>
              <Text className={`${textSecondary} text-sm`}>Đã đăng ký</Text>
            </View>
            <View className="items-center">
              <Text className="text-purple-400 text-2xl font-bold">{availableClasses.length}</Text>
              <Text className={`${textSecondary} text-sm`}>Tổng lớp</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View className="mb-4">
          <View className={`${inputClass} rounded-xl flex-row items-center px-4 py-3`}>
            <Ionicons name="search" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
            <TextInput
              className={`flex-1 ml-3 font-medium ${textPrimary}`}
              placeholder="Tìm lớp, giáo viên..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Sort Options */}
        <View className="mb-3 flex-row gap-2">
          <TouchableOpacity
            onPress={() => setSortBy('name')}
            className={`px-4 py-2 rounded-lg flex-row items-center ${
              sortBy === 'name' ? 'bg-blue-600' : softChip
            }`}>
            <Ionicons name="text" size={16} color={sortBy === 'name' ? '#fff' : (isDark ? '#94a3b8' : '#64748b')} />
            <Text className={`ml-2 font-semibold ${sortBy === 'name' ? 'text-white' : textSecondary}`}>
              Tên
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSortBy('capacity')}
            className={`px-4 py-2 rounded-lg flex-row items-center ${
              sortBy === 'capacity' ? 'bg-blue-600' : softChip
            }`}>
            <Ionicons name="people" size={16} color={sortBy === 'capacity' ? '#fff' : (isDark ? '#94a3b8' : '#64748b')} />
            <Text className={`ml-2 font-semibold ${sortBy === 'capacity' ? 'text-white' : textSecondary}`}>
              Sức chứa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSortBy('duration')}
            className={`px-4 py-2 rounded-lg flex-row items-center ${
              sortBy === 'duration' ? 'bg-blue-600' : softChip
            }`}>
            <Ionicons name="time" size={16} color={sortBy === 'duration' ? '#fff' : (isDark ? '#94a3b8' : '#64748b')} />
            <Text className={`ml-2 font-semibold ${sortBy === 'duration' ? 'text-white' : textSecondary}`}>
              Thời gian
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter: Type & Level */}
        <View className="mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {[
              { key: '', label: 'Tất cả loại hình' },
              { key: 'YOGA', label: 'Yoga' },
              { key: 'CARDIO', label: 'Cardio' },
              { key: 'STRENGTH', label: 'Sức mạnh' },
              { key: 'DANCE', label: 'Dance' },
              { key: 'PILATES', label: 'Pilates' },
              { key: 'OTHER', label: 'Khác' },
            ].map(opt => (
              <TouchableOpacity
                key={`type-${opt.key}`}
                onPress={() => setSelectedType(opt.key)}
                className={`px-3 py-2 mr-2 rounded-lg ${selectedType === opt.key ? 'bg-blue-600' : softChip}`}
              >
                <Text className={`${selectedType === opt.key ? 'text-white' : textSecondary} text-sm font-semibold`}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {[
              { key: '', label: 'Mọi trình độ' },
              { key: 'BEGINNER', label: 'Cơ bản' },
              { key: 'INTERMEDIATE', label: 'Trung cấp' },
              { key: 'ADVANCED', label: 'Nâng cao' },
              { key: 'ALL_LEVELS', label: 'All levels' },
            ].map(opt => (
              <TouchableOpacity
                key={`level-${opt.key}`}
                onPress={() => setSelectedLevel(opt.key)}
                className={`px-3 py-2 mr-2 rounded-lg ${selectedLevel === opt.key ? 'bg-purple-600' : softChip}`}
              >
                <Text className={`${selectedLevel === opt.key ? 'text-white' : textSecondary} text-sm font-semibold`}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time range quick filter */}
        <View className="mb-6 flex-row gap-2">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'today', label: 'Hôm nay' },
            { key: 'week', label: 'Tuần này' },
            { key: 'month', label: 'Tháng này' },
          ].map(opt => (
            <TouchableOpacity
              key={`time-${opt.key}`}
              onPress={() => setTimeRange(opt.key as any)}
              className={`px-4 py-2 rounded-lg ${timeRange === opt.key ? 'bg-green-600' : softChip}`}
            >
              <Text className={`${timeRange === opt.key ? 'text-white' : textSecondary} font-semibold`}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
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
            {sortedClasses.length === 0 ? (
              <View className={`${cardClass} rounded-xl p-8 items-center`}>
                <Ionicons name="search" size={48} color={isDark ? '#64748b' : '#94a3b8'} />
                <Text className={`text-xl font-semibold ${textPrimary} mt-4 mb-2`}>
                    {searchQuery ? 'Không tìm thấy' : 'Tuyệt vời!'}
                </Text>
                <Text className={`${textSecondary} text-center`}>
                  {searchQuery ? `Không có kết quả cho "${searchQuery}"` : 'Bạn đã đăng ký tất cả lớp học có sẵn'}
                </Text>
              </View>
            ) : (
              sortedClasses.map((classItem: any) => (
                <View 
                  key={classItem.id} 
                  className={`${cardClass} rounded-xl`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}>
                  <View className="p-6">
                    <View className="flex-row items-start justify-between mb-4">
                      <View className="flex-1">
                        <Text className={`text-xl font-semibold ${textPrimary} mb-2`}>
                          {classItem.name}
                        </Text>
                        <Text className={`${textSecondary} text-sm mb-3 leading-5`}>
                          {classItem.description || 'Không có mô tả'}
                        </Text>
                        
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="person" size={16} color="#94a3b8" />
                          <Text className={`${textSecondary} text-sm ml-2`}>
                            Giáo viên: {classItem.teacher?.fullName || 'Chưa phân công'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row items-center space-x-6 mb-4">
                      <View className="flex-row items-center">
                        <View className="bg-blue-600 p-2 rounded-lg mr-3">
                          <Ionicons name="people" size={16} color="#fff" />
                        </View>
                        <View>
                          <Text className={`${textSecondary} text-xs`}>Sức chứa</Text>
                          <Text className={`${textPrimary} font-semibold`}>{classItem.capacity}</Text>
                        </View>
                      </View>
                      
                      <View className="flex-row items-center">
                        <View className="bg-purple-600 p-2 rounded-lg mr-3">
                          <Ionicons name="time" size={16} color="#fff" />
                        </View>
                        <View>
                          <Text className={`${textSecondary} text-xs`}>Thời lượng</Text>
                          <Text className={`${textPrimary} font-semibold`}>{classItem.duration} phút</Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row space-x-3">
                      <TouchableOpacity
                        onPress={() => navigation.navigate('ClassDetail', { classId: classItem.id })}
                        className={`flex-1 rounded-lg py-4 flex-row items-center justify-center ${panelClass}`}
                      >
                        <Ionicons name="information-circle" size={20} color={isDark ? '#fff' : '#1f2937'} />
                        <Text className={`${textPrimary} font-semibold ml-2`}>Chi tiết</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleEnroll(classItem)}
                        disabled={enrolling === classItem.id}
                        className="flex-1 rounded-lg py-4 flex-row items-center justify-center"
                        style={{
                          backgroundColor: enrolling === classItem.id 
                            ? (isDark ? '#475569' : '#64748b')
                            : (isDark ? '#2563eb' : '#3b82f6'),
                          shadowColor: '#3b82f6',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                        }}>
                        {enrolling === classItem.id ? (
                          <>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text className="text-white font-semibold ml-2">Đang đăng ký...</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="add-circle" size={20} color="#fff" />
                            <Text className="text-white font-semibold ml-2">Đăng ký</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}