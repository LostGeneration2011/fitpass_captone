import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { classAPI } from '../../lib/api';

export default function AdminClassApprovalScreen() {
  const [pendingClasses, setPendingClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [classToReject, setClassToReject] = useState<any>(null);

  const loadPendingClasses = async () => {
    try {
      setLoading(true);
      const classes = await classAPI.getAll(undefined, { status: 'PENDING' });
      console.log('Pending classes loaded:', classes);
      setPendingClasses(Array.isArray(classes) ? classes : []);
    } catch (error) {
      console.error('Error loading pending classes:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể tải danh sách lớp chờ duyệt',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (classId: string, className: string) => {
    Alert.alert(
      'Xác nhận duyệt lớp',
      `Bạn có chắc muốn duyệt lớp "${className}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            try {
              await classAPI.approve(classId);
              Toast.show({
                type: 'success',
                text1: 'Đã duyệt',
                text2: `Lớp "${className}" đã được duyệt thành công!`,
              });
              loadPendingClasses();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Lỗi',
                text2: 'Không thể duyệt lớp học',
              });
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!classToReject || !rejectionReason.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng nhập lý do từ chối',
      });
      return;
    }

    try {
      await classAPI.reject(classToReject.id, rejectionReason.trim());
      Toast.show({
        type: 'success',
        text1: 'Đã từ chối',
        text2: `Lớp "${classToReject.name}" đã bị từ chối`,
      });
      setShowRejectModal(false);
      setRejectionReason('');
      setClassToReject(null);
      loadPendingClasses();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể từ chối lớp học',
      });
    }
  };

  const openRejectModal = (classItem: any) => {
    setClassToReject(classItem);
    setShowRejectModal(true);
  };

  useEffect(() => {
    loadPendingClasses();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-300 mt-4 text-lg font-medium">Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 px-4 pt-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <Ionicons name="search-outline" size={22} color="#e5e7eb" style={{ marginRight: 8 }} />
            <Text className="text-2xl font-bold text-white">Duyệt lớp học</Text>
          </View>
          <TouchableOpacity onPress={loadPendingClasses}>
            <Ionicons name="refresh" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center mb-4">
          <Ionicons name="list-outline" size={18} color="#e5e7eb" style={{ marginRight: 6 }} />
          <Text className="text-slate-300">
            {pendingClasses.length} lớp học chờ duyệt
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {pendingClasses.length === 0 ? (
            <View className="bg-slate-800 p-8 rounded-xl items-center">
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text className="text-xl font-semibold text-white mt-4">Tất cả đã duyệt!</Text>
              <Text className="text-slate-300 text-center mt-2">
                Không có lớp học nào chờ duyệt
              </Text>
            </View>
          ) : (
            pendingClasses.map((classItem: any) => (
              <View 
                key={classItem.id}
                className="bg-slate-800 p-4 mb-4 rounded-xl border border-slate-700"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold">{classItem.name}</Text>
                    <Text className="text-slate-300 mt-1">{classItem.description}</Text>
                  </View>
                  <View className="bg-yellow-600 px-3 py-1 rounded-full ml-3 flex-row items-center">
                    <Ionicons name="time-outline" size={14} color="white" style={{ marginRight: 4 }} />
                    <Text className="text-white text-xs font-medium">Chờ duyệt</Text>
                  </View>
                </View>

                <View className="flex-row justify-between mb-3">
                  <View>
                    <Text className="text-slate-300 text-sm">Sức chứa: {classItem.capacity}</Text>
                    <Text className="text-slate-300 text-sm">Thời lượng: {classItem.duration} phút</Text>
                  </View>
                  <View>
                    <Text className="text-slate-300 text-sm">Giáo viên: {classItem.teacher?.fullName || 'Chưa phân công'}</Text>
                    <Text className="text-slate-300 text-sm">Tạo: {new Date(classItem.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>

                <View className="flex-row space-x-3">
                  <TouchableOpacity 
                    onPress={() => handleApprove(classItem.id, classItem.name)}
                    className="flex-1 bg-green-600 p-3 rounded-lg"
                    style={{
                      shadowColor: '#16a34a',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                    }}
                  >
                    <Text className="text-white text-center font-semibold">Duyệt</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => openRejectModal(classItem)}
                    className="flex-1 bg-red-600 p-3 rounded-lg"
                    style={{
                      shadowColor: '#dc2626',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                    }}
                  >
                    <Text className="text-white text-center font-semibold">Từ chối</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-slate-900 p-6 rounded-t-3xl border-t border-slate-700">
            <Text className="text-xl font-bold text-white mb-4">
              Từ chối lớp: {classToReject?.name}
            </Text>
            
            <Text className="text-slate-300 mb-3">Lý do từ chối:</Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Nhập lý do từ chối..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              className="bg-slate-800 text-white p-3 rounded-lg border border-slate-600 mb-4"
              style={{ textAlignVertical: 'top' }}
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                className="flex-1 bg-slate-700 p-3 rounded-lg"
              >
                <Text className="text-white text-center font-semibold">Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleReject}
                className="flex-1 bg-red-600 p-3 rounded-lg"
                style={{
                  shadowColor: '#dc2626',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                }}
              >
                <Text className="text-white text-center font-semibold">Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}