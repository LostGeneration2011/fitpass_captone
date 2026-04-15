import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { classAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useThemeClasses } from '../../lib/theme';

export default function EditClass() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as any) || {};
  const { id } = params;
  
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    duration: '',
    status: '',
  });
  const [originalData, setOriginalData] = useState(formData);

  useEffect(() => {
    loadClassData();
  }, [id]);

  const loadClassData = async () => {
    if (!id) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Class ID không tìm thấy',
      });
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const allClasses = await classAPI.getAll();
      const classData = Array.isArray(allClasses)
        ? allClasses.find((c: any) => c.id === id)
        : null;

      if (!classData) {
        throw new Error('Class not found');
      }

      const user = await getUser();
      if (classData.teacherId !== user?.id) {
        throw new Error('You do not have permission to edit this class');
      }

      const data = {
        name: classData.name,
        description: classData.description || '',
        capacity: String(classData.capacity),
        duration: String(classData.duration),
        status: classData.status,
      };

      setFormData(data);
      setOriginalData(data);
    } catch (error: any) {
      console.error('Error loading class:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải thông tin lớp học',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng nhập tên lớp học',
      });
      return;
    }

    const capacity = parseInt(formData.capacity);
    const duration = parseInt(formData.duration);

    if (isNaN(capacity) || capacity <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Sức chứa phải là số dương',
      });
      return;
    }

    if (isNaN(duration) || duration <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Thời lượng phải là số dương',
      });
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        capacity: capacity,
        duration: duration,
      };

      await classAPI.update(id!, updateData);

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Lớp học đã được cập nhật',
      });

      navigation.goBack();
    } catch (error: any) {
      console.error('Error updating class:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.response?.data?.error || 'Không thể cập nhật lớp học',
      });
    } finally {
      setSaving(false);
    }
  };

  const isChanged = JSON.stringify(formData) !== JSON.stringify(originalData);
  const canEditStatus = formData.status === 'REJECTED';

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={`${textSecondary} mt-4`}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text className={`text-2xl font-bold ${textPrimary}`}>Chỉnh sửa lớp học</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Status Badge */}
        <View style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#475569' : '#e2e8f0'
        }} className="mb-4 p-3 rounded-lg border">
          <Text className={`${textSecondary} text-sm font-medium mb-1`}>Trạng thái</Text>
          <View className="flex-row items-center">
            {formData.status === 'APPROVED' && (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text className="text-green-400 ml-2 font-medium">Đã duyệt</Text>
              </>
            )}
            {formData.status === 'PENDING' && (
              <>
                <Ionicons name="time" size={20} color="#f59e0b" />
                <Text className="text-yellow-400 ml-2 font-medium">Chờ duyệt</Text>
              </>
            )}
            {formData.status === 'REJECTED' && (
              <>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
                <Text className="text-red-400 ml-2 font-medium">Bị từ chối</Text>
              </>
            )}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Class Name */}
          <View className="mb-4">
            <Text className={`${textSecondary} text-sm font-medium mb-2`}>Tên lớp học *</Text>
            <TextInput
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderWidth: 1,
                color: isDark ? '#ffffff' : '#000000'
              }}
              className="p-3 rounded-lg"
              placeholder="Nhập tên lớp học"
              placeholderTextColor="#94a3b8"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              editable={formData.status !== 'REJECTED'}
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className={`${textSecondary} text-sm font-medium mb-2`}>Mô tả</Text>
            <TextInput
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderWidth: 1,
                minHeight: 80,
                color: isDark ? '#ffffff' : '#000000'
              }}
              className="p-3 rounded-lg"
              placeholder="Nhập mô tả lớp học"
              placeholderTextColor="#94a3b8"
              multiline={true}
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              textAlignVertical="top"
              editable={formData.status !== 'REJECTED'}
            />
          </View>

          {/* Capacity & Duration Row */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className={`${textSecondary} text-sm font-medium mb-2`}>Sức chứa *</Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderWidth: 1,
                  color: isDark ? '#ffffff' : '#000000'
                }}
                className="p-3 rounded-lg"
                placeholder="Số người"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={formData.capacity}
                onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                editable={formData.status !== 'REJECTED'}
              />
            </View>
            <View className="flex-1">
              <Text className={`${textSecondary} text-sm font-medium mb-2`}>Thời lượng (phút) *</Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderWidth: 1,
                  color: isDark ? '#ffffff' : '#000000'
                }}
                className="p-3 rounded-lg"
                placeholder="Phút"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={formData.duration}
                onChangeText={(text) => setFormData({ ...formData, duration: text })}
                editable={formData.status !== 'REJECTED'}
              />
            </View>
          </View>

          {/* Rejection Reason Note */}
          {formData.status === 'REJECTED' && (
            <View style={{
              backgroundColor: isDark ? '#7f1d1d' : '#fecaca',
              borderColor: isDark ? '#b91c1c' : '#fca5a5'
            }} className="border p-4 rounded-lg mb-4">
              <Text className={isDark ? 'text-red-400 text-sm font-medium mb-1' : 'text-red-600 text-sm font-medium mb-1'}>Lớp đã bị từ chối</Text>
              <Text className={isDark ? 'text-red-300 text-xs' : 'text-red-500 text-xs'}>
                Bạn không thể chỉnh sửa lớp học bị từ chối. Vui lòng tạo lớp mới.
              </Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={{
              opacity: isChanged && formData.status !== 'REJECTED' && !saving ? 1 : 0.5,
              backgroundColor: '#2563eb'
            }}
            disabled={!isChanged || formData.status === 'REJECTED' || saving}
            onPress={handleSave}
            className="py-4 rounded-lg flex-row items-center justify-center mt-6"
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white font-bold ml-2">Đang lưu...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text className="text-white font-bold ml-2">Lưu thay đổi</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: isDark ? '#475569' : '#e2e8f0' }}
            className="py-3 rounded-lg flex-row items-center justify-center mt-3"
            disabled={saving}
          >
            <Ionicons name="close" size={20} color={isDark ? '#fff' : '#000'} />
            <Text className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold ml-2`}>Hủy bỏ</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
