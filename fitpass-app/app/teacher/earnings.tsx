import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUser } from '../../lib/auth';
import { apiGet } from '../../lib/api';
import Toast from 'react-native-toast-message';
import { useThemeClasses } from '../../lib/theme';

interface Earnings {
  totalHoursTaught: number;
  currentMonthHours: number;
  expectedSalaryThisMonth: number;
  lastPaidAmount: number;
  lastPaidDate: string | null;
}

interface SalaryHistory {
  id: string;
  period: string;
  totalHours: number;
  amount: number;
  status: string;
  date: string;
}

interface TeacherData {
  fullName: string;
  email: string;
  hourlyRate: number;
}

export default function TeacherEarningsScreen() {
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);

  const loadEarnings = async () => {
    try {
      const user = await getUser();
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const response = await apiGet('/earnings/me');

      if (response) {
        setTeacherData(response.teacher);
        setEarnings(response.earnings);
        setSalaryHistory(response.salaryHistory || []);
      }
    } catch (error: any) {
      console.error('Error loading earnings:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải thông tin lương',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarnings();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass} items-center justify-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className={`${textSecondary} mt-2`}>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="p-6 border-b"
              style={{
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
              }}>
          <Text className={`${textPrimary} text-2xl font-bold`}>Thu Nhập</Text>
          <Text className={`${textSecondary} mt-1`}>Theo dõi kiến thức và lương của bạn</Text>
        </View>

        {teacherData && earnings ? (
          <>
            {/* Teacher Info */}
            <View className="p-6 border-b"
                  style={{
                    borderColor: isDark ? '#1e293b' : '#e2e8f0',
                  }}>
              <Text className={`${textPrimary} text-lg font-semibold`}>{teacherData.fullName}</Text>
              <Text className={`${textMuted} text-sm mt-1`}>{teacherData.email}</Text>
              <View className="mt-4 rounded-lg p-4 border"
                    style={{
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
                    }}>
                <Text className={`${textSecondary} text-sm`}>Mức lương theo giờ</Text>
                <Text className="text-blue-400 text-2xl font-bold mt-2">
                  {teacherData.hourlyRate.toLocaleString('vi-VN')} ₫/h
                </Text>
              </View>
            </View>

            {/* Main Stats */}
            <View className="p-6 gap-4">
              {/* Total Hours */}
              <View className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl p-6">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-white text-sm opacity-80 mb-2">Tổng Giờ Dạy</Text>
                    <Text className="text-white text-3xl font-bold">
                      {earnings.totalHoursTaught}h
                    </Text>
                    <Text className="text-purple-100 text-xs mt-2">Tất cả các buổi học đã hoàn tất</Text>
                  </View>
                  <Ionicons name="time-outline" size={32} color="rgba(255,255,255,0.3)" />
                </View>
              </View>

              {/* This Month */}
              <View>
                <Text className={`${textPrimary} font-semibold mb-3`}>Tháng Này</Text>

                <View className="rounded-xl p-4 mb-3 border"
                      style={{
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                      }}>
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className={`${textSecondary}`}>Giờ Dạy</Text>
                    <Text className={`${textPrimary} font-bold text-lg`}>
                      {earnings.currentMonthHours}h
                    </Text>
                  </View>
                  <View className="h-1 rounded-full overflow-hidden"
                        style={{
                          backgroundColor: isDark ? '#334155' : '#e2e8f0',
                        }}>
                    <View
                      className="h-full bg-blue-500"
                      style={{
                        width: `${Math.min((earnings.currentMonthHours / 40) * 100, 100)}%`,
                      }}
                    />
                  </View>
                  <Text className={`${textMuted} text-xs mt-2`}>
                    {earnings.currentMonthHours > 40 ? 'Vượt quá tiêu chuẩn 40h' : 'Tiêu chuẩn: 40h'}
                  </Text>
                </View>

                {/* Expected Salary */}
                <View className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6">
                  <Text className="text-white text-sm opacity-80 mb-2">Lương Dự Kiến Tháng Này</Text>
                  <Text className="text-white text-3xl font-bold">
                    {earnings.expectedSalaryThisMonth.toLocaleString('vi-VN')} ₫
                  </Text>
                  <Text className="text-green-100 text-xs mt-2">
                    Dựa trên {earnings.currentMonthHours}h × {teacherData.hourlyRate.toLocaleString('vi-VN')}
                    ₫/h
                  </Text>
                </View>
              </View>

              {/* Last Payment */}
              {earnings.lastPaidDate && (
                <View className="rounded-xl p-4 border"
                      style={{
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                      }}>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text className={`${textSecondary} ml-2`}>Lần Thanh Toán Gần Nhất</Text>
                  </View>
                  <Text className={`${textPrimary} text-xl font-bold mt-2`}>
                    {earnings.lastPaidAmount.toLocaleString('vi-VN')} ₫
                  </Text>
                  <Text className={`${textMuted} text-sm mt-2`}>
                    {new Date(earnings.lastPaidDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              )}
            </View>

            {/* Salary History */}
            <View className="p-6 border-t"
                  style={{
                    borderColor: isDark ? '#1e293b' : '#e2e8f0',
                  }}>
              <Text className={`${textPrimary} text-lg font-bold mb-4`}>Lịch Sử Lương</Text>

              {salaryHistory.length === 0 ? (
                <View className="rounded-xl p-6 items-center border"
                      style={{
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                      }}>
                  <Text className={`${textSecondary}`}>Chưa có lịch sử lương</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {salaryHistory.map((record) => {
                    const isGreen = record.status === 'PAID';
                    const isYellow = record.status === 'PENDING';
                    
                    return (
                      <View
                        key={record.id}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: isGreen 
                            ? isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)'
                            : isYellow 
                            ? isDark ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.05)'
                            : isDark ? '#1e293b' : '#f8fafc',
                          borderColor: isGreen
                            ? isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'
                            : isYellow
                            ? isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.2)'
                            : isDark ? '#334155' : '#e2e8f0',
                        }}
                      >
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1">
                            <Text className={`${textPrimary} font-semibold`}>{record.period}</Text>
                            <Text className={`${textMuted} text-sm mt-1`}>
                              {record.totalHours}h dạy
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className={`${textPrimary} font-bold`}>
                              {record.amount.toLocaleString('vi-VN')} ₫
                            </Text>
                            <View
                              className="mt-2 px-2 py-1 rounded"
                              style={{
                                backgroundColor: record.status === 'PAID'
                                  ? '#10b981'
                                  : record.status === 'PENDING'
                                  ? '#eab308'
                                  : '#64748b'
                              }}
                            >
                              <Text className="text-white text-xs font-bold">
                                {record.status === 'PAID'
                                  ? 'ĐÃ THANH TOÁN'
                                  : record.status === 'PENDING'
                                  ? 'CHỜ THANH TOÁN'
                                  : 'KHÁC'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          <View className="p-6 items-center">
            <Text className={`${textSecondary}`}>Không thể tải thông tin lương</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
