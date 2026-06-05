import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUser } from '../../lib/auth';
import { sessionsAPI } from '../../lib/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useThemeClasses } from '../../lib/theme';

const getTodayViDateString = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

const normalizeDateInput = (input: string) => {
  const value = input.trim();

  // Preferred format: DD/MM/YYYY
  const viMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (viMatch) {
    const [, day, month, year] = viMatch;
    return `${year}-${month}-${day}`;
  }

  // Backward-compatible format: YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return value;
  }

  return null;
};

export default function CreateSession() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as any) || {};
  const { classId, className } = params;
  
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: getTodayViDateString(),
    startTime: '',
    endTime: '',
  });

  const handleCreateSession = async () => {
    // Validation
    if (!formData.date || !formData.startTime || !formData.endTime) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng nhập đầy đủ thông tin',
      });
      return;
    }

    try {
      setLoading(true);

      const normalizedDate = normalizeDateInput(formData.date);
      if (!normalizedDate) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Ngày học phải theo định dạng DD/MM/YYYY',
        });
        return;
      }
      
      // Combine date and time
      const startDateTime = new Date(`${normalizedDate}T${formData.startTime}:00`);
      const endDateTime = new Date(`${normalizedDate}T${formData.endTime}:00`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Ngày hoặc giờ không hợp lệ',
        });
        return;
      }

      // Validate times
      if (endDateTime <= startDateTime) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Giờ kết thúc phải sau giờ bắt đầu',
        });
        return;
      }

      // Validate not in the past
      if (startDateTime < new Date()) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Không thể tạo buổi học trong quá khứ. Vui lòng chọn ngày/giờ trong tương lai.',
        });
        return;
      }

      const sessionData = {
        classId: classId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      };

      await sessionsAPI.create(sessionData);
      
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Tạo buổi học thành công!',
      });

      navigation.goBack();
    } catch (error: any) {
      console.error('Error creating session:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.response?.data?.error || 'Không thể tạo buổi học. Vui lòng thử lại.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 p-6">
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`${textPrimary} text-2xl font-bold`}>Tạo buổi học mới</Text>
            <Text className={`${textSecondary} text-base mt-1`}>{className}</Text>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Form */}
          <View className="space-y-6">
            {/* Date */}
            <View>
              <Text className={`${textPrimary} text-base font-medium mb-3`}>
                Ngày học *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  color: isDark ? '#ffffff' : '#000000'
                }}
                className="border rounded-lg px-4 py-3"
                placeholder="DD/MM/YYYY (ví dụ: 10/12/2025)"
                placeholderTextColor="#94a3b8"
                value={formData.date}
                onChangeText={(text) => setFormData({...formData, date: text})}
              />
              <Text className={`${textMuted} text-sm mt-2`}>
                Định dạng mặc định: DD/MM/YYYY (ngày-tháng-năm)
              </Text>
            </View>

            {/* Start Time */}
            <View>
              <Text className={`${textPrimary} text-base font-medium mb-3`}>
                Giờ bắt đầu *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  borderWidth: 1,
                  color: isDark ? '#ffffff' : '#000000'
                }}
                className="rounded-lg px-4 py-3"
                placeholder="HH:MM (ví dụ: 09:00)"
                placeholderTextColor="#94a3b8"
                value={formData.startTime}
                onChangeText={(text) => setFormData({...formData, startTime: text})}
              />
              <Text className={`${textMuted} text-sm mt-2`}>
                Định dạng: HH:MM (24 giờ)
              </Text>
            </View>

            {/* End Time */}
            <View>
              <Text className={`${textPrimary} text-base font-medium mb-3`}>
                Giờ kết thúc *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  borderWidth: 1,
                  color: isDark ? '#ffffff' : '#000000'
                }}
                className="rounded-lg px-4 py-3"
                placeholder="HH:MM (ví dụ: 10:30)"
                placeholderTextColor="#94a3b8"
                value={formData.endTime}
                onChangeText={(text) => setFormData({...formData, endTime: text})}
              />
              <Text className={`${textMuted} text-sm mt-2`}>
                Định dạng: HH:MM (24 giờ)
              </Text>
            </View>

            {/* Info Card */}
            <View style={{
              backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
              borderColor: isDark ? '#1e40af' : '#93c5fd'
            }} className="border rounded-lg p-4 mt-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text className={isDark ? 'text-blue-300 font-medium ml-2' : 'text-blue-700 font-medium ml-2'}>Thông tin</Text>
              </View>
              <Text className={isDark ? 'text-blue-200 text-sm' : 'text-blue-600 text-sm'}>
                Sau khi tạo buổi học, học viên có thể đăng ký tham gia và bạn có thể tạo mã QR để điểm danh.
              </Text>
            </View>

            {/* Example */}
            <View style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#475569' : '#e2e8f0'
            }} className="border rounded-lg p-4">
              <Text className={`${textSecondary} font-medium mb-2`}>Ví dụ:</Text>
              <Text className={`${textMuted} text-sm`}>📅 Ngày: 10/12/2025</Text>
              <Text className={`${textMuted} text-sm`}>🕘 Bắt đầu: 09:00</Text>
              <Text className={`${textMuted} text-sm`}>🕙 Kết thúc: 10:30</Text>
            </View>
          </View>
        </ScrollView>

        {/* Create Button */}
        <TouchableOpacity
          style={{
            backgroundColor: loading ? '#64748b' : '#2563eb',
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
          className="rounded-lg py-4 mt-6"
          onPress={handleCreateSession}
          disabled={loading}
        >
          <Text className="text-white text-center text-lg font-semibold">
            {loading ? 'Đang tạo...' : 'Tạo buổi học'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}