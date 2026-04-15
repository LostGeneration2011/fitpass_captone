import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { classAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useThemeClasses } from '../../lib/theme';

export default function CreateClass() {
  const navigation = useNavigation();
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
    name: '',
    description: '',
    capacity: '',
    duration: '',
    type: 'OTHER',
    level: 'ALL_LEVELS',
  });
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);

  const classTypes = ['YOGA', 'CARDIO', 'STRENGTH', 'DANCE', 'PILATES', 'OTHER'];
  const classLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];

  const handleCreateClass = async () => {
    // Validation
    if (!formData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng nhập tên lớp học',
      });
      return;
    }

    if (!formData.capacity || !formData.duration) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng nhập đầy đủ thông tin',
      });
      return;
    }

    const capacity = parseInt(formData.capacity);
    const duration = parseInt(formData.duration);

    if (capacity <= 0 || duration <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Sức chứa và thời lượng phải lớn hơn 0',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get current teacher
      const currentUser = await getUser();
      if (!currentUser || currentUser.role !== 'TEACHER') {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Bạn không có quyền tạo lớp học',
        });
        return;
      }
      
      const classData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        capacity: capacity,
        duration: duration,
        type: formData.type,
        level: formData.level,
        teacherId: currentUser.id, // Auto-assign current teacher
      };

      await classAPI.create(classData);
      
      Toast.show({
        type: 'success',
        text1: 'Đã gửi yêu cầu',
        text2: 'Lớp học đã được tạo và đang chờ Admin duyệt!',
      });

      // Navigate back to classes list
      navigation.goBack();
    } catch (error: any) {
      console.error('Error creating class:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tạo lớp học. Vui lòng thử lại.',
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
            onPress={() => {
              navigation.goBack();
            }}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text className={`${textPrimary} text-2xl font-bold`}>Tạo lớp học mới</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Form */}
          <View className="space-y-6">
            {/* Class Name */}
            <View>
              <Text className={`${textPrimary} text-base font-medium mb-3`}>
                Tên lớp học *
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  color: isDark ? '#ffffff' : '#000000'
                }}
                className="border rounded-lg px-4 py-3"
                placeholder="Nhập tên lớp học..."
                placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
              />
            </View>

            {/* Description */}
            <View>
              <Text className={`${textPrimary} text-base font-medium mb-3`}>
                Mô tả
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  color: isDark ? '#ffffff' : '#000000'
                }}
                className="border rounded-lg px-4 py-3"
                placeholder="Mô tả về lớp học..."
                placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Capacity & Duration Row */}
            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Text className={`${textPrimary} text-base font-medium mb-3`}>
                  Sức chứa *
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#475569' : '#e2e8f0',
                    color: isDark ? '#ffffff' : '#000000'
                  }}
                  className="border rounded-lg px-4 py-3"
                  placeholder="15"
                  placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({...formData, capacity: text})}
                  keyboardType="numeric"
                />
              </View>

              <View className="flex-1">
                <Text className={`${textPrimary} text-base font-medium mb-3`}>
                  Thời lượng (phút) *
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#475569' : '#e2e8f0',
                    color: isDark ? '#ffffff' : '#000000'
                  }}
                  className="border rounded-lg px-4 py-3"
                  placeholder="60"
                  placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                  value={formData.duration}
                  onChangeText={(text) => setFormData({...formData, duration: text})}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Class Type Dropdown */}
            <View>
              <Text className={`${textPrimary} text-base font-medium mb-3`}>
                Loại lớp học *
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0'
                }}
                className="border rounded-lg px-4 py-3 flex-row justify-between items-center"
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <Text className={textPrimary}>{formData.type}</Text>
                <Text className={textMuted}>{showTypeDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showTypeDropdown && (
                <View style={{
                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                  borderColor: isDark ? '#475569' : '#e2e8f0'
                }} className="border rounded-lg mt-1 overflow-hidden">
                  {classTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={{
                        borderBottomColor: isDark ? '#475569' : '#e2e8f0'
                      }}
                      className="px-4 py-3 border-b"
                      onPress={() => {
                        setFormData({...formData, type});
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text className={`text-base ${formData.type === type ? 'text-blue-400 font-bold' : textPrimary}`}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Class Level Dropdown */}
            <View>
              <Text className={`${textPrimary} text-base font-medium mb-3`}>
                Cấp độ lớp học *
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0'
                }}
                className="border rounded-lg px-4 py-3 flex-row justify-between items-center"
                onPress={() => setShowLevelDropdown(!showLevelDropdown)}
              >
                <Text className={textPrimary}>{formData.level}</Text>
                <Text className={textMuted}>{showLevelDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showLevelDropdown && (
                <View style={{
                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                  borderColor: isDark ? '#475569' : '#e2e8f0'
                }} className="border rounded-lg mt-1 overflow-hidden">
                  {classLevels.map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={{
                        borderBottomColor: isDark ? '#475569' : '#e2e8f0'
                      }}
                      className="px-4 py-3 border-b"
                      onPress={() => {
                        setFormData({...formData, level});
                        setShowLevelDropdown(false);
                      }}
                    >
                      <Text className={`text-base ${formData.level === level ? 'text-blue-400 font-bold' : textPrimary}`}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
                Sau khi tạo lớp học, bạn có thể tạo các buổi học và mời học viên tham gia.
              </Text>
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
          onPress={handleCreateClass}
          disabled={loading}
        >
          <Text className="text-white text-center text-lg font-semibold">
            {loading ? 'Đang tạo...' : 'Tạo lớp học'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}