import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/auth";
import { classAPI } from "../../lib/api";
import { useCallback } from "react";
import Toast from 'react-native-toast-message';
import { useThemeClasses } from "../../lib/theme";

export default function TeacherClasses() {
  const navigation = useNavigation();
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();
  
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-600';
      case 'PENDING': return 'bg-yellow-600';
      case 'REJECTED': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'PENDING': return 'Chờ duyệt';
      case 'REJECTED': return 'Bị từ chối';
      default: return 'Không rõ';
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await getUser();

      if (!user || user.role !== "TEACHER") {
        console.log("Invalid user");
        setClasses([]);
        return;
      }

      const allClasses = await classAPI.getAll();
      const teacherClasses = Array.isArray(allClasses) 
        ? allClasses.filter((c: any) => c.teacherId === user.id)
        : [];

      console.log("FINAL CLASS RENDER LIST:", teacherClasses);
      setClasses(teacherClasses);
    } catch (err) {
      console.log("Error loading classes:", err);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className={`flex-1 ${screenClass} items-center justify-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className={`${textSecondary} mt-4`}>Đang tải các lớp học...</Text>
      </View>
    );
  }

  return (
    <ScrollView className={`flex-1 ${screenClass} p-4`}>
      <View className="flex-row justify-between items-center mb-4">
        <Text className={`${textPrimary} text-xl font-bold`}>Lớp học của tôi</Text>
        <TouchableOpacity
          className="bg-blue-600 px-4 py-2 rounded-lg flex-row items-center"
          style={{
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
          onPress={() => {
            (navigation as any).navigate('CreateClass');
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white font-medium ml-1">Tạo lớp</Text>
        </TouchableOpacity>
      </View>

      {classes.length === 0 && (
        <View className="p-6 rounded-xl border"
             style={{
               backgroundColor: isDark ? '#1e293b' : '#f8fafc',
               borderColor: isDark ? '#334155' : '#e2e8f0',
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 4 },
               shadowOpacity: 0.3,
               shadowRadius: 8,
             }}>
          <Text className={`${textSecondary} text-center`}>Bạn chưa có lớp học nào.</Text>
          <Text className={`${textSecondary} text-center mt-2`}>Tạo lớp học mới và chờ Admin duyệt.</Text>
        </View>
      )}

      {classes.map((c: any) => (
        <View 
          key={c.id}
          className="p-4 mb-4 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          {/* Class name and status */}
          <View className="flex-row justify-between items-start mb-2">
            <Text className={`${textPrimary} text-lg font-semibold flex-1`}>{c.name}</Text>
            <View className={`px-3 py-1 rounded-full ${getStatusColor(c.status || 'PENDING')}`}>
              <Text className="text-white text-xs font-medium">{getStatusText(c.status || 'PENDING')}</Text>
            </View>
          </View>
          
          <Text className={`${textSecondary} mt-1`}>{c.description}</Text>

          {/* Rejection reason if any */}
          {c.status === 'REJECTED' && c.rejectionReason && (
            <View className="p-3 rounded-lg mt-2 border"
                  style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                  }}>
              <Text className="text-red-500 text-sm font-medium">Lý do từ chối:</Text>
              <Text className="text-red-500 text-sm mt-1 opacity-90">{c.rejectionReason}</Text>
            </View>
          )}

          <View className="flex-row justify-between mt-3">
            <View>
              <Text className={`${textMuted} text-sm`}>Sức chứa: {c.capacity}</Text>
              <Text className={`${textMuted} text-sm`}>Thời lượng: {c.duration} phút</Text>
            </View>
            <View>
              <Text className={`${textMuted} text-sm`}>Tạo ngày: {new Date(c.createdAt).toLocaleDateString()}</Text>
              <Text className="text-green-400 text-sm font-medium">Học viên: {c._count?.enrollments ?? 0}</Text>
            </View>
          </View>

          {/* Action buttons - only for approved classes */}
          {c.status === 'APPROVED' && (
            <View className="gap-2 mt-3">
              <View className="flex-row space-x-2">
                <TouchableOpacity 
                  className="bg-blue-600 p-3 rounded-lg flex-1"
                  style={{
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                  }}
                  onPress={() => {
                    (navigation as any).navigate('EditClass', { id: c.id });
                  }}
                >
                  <Text className="text-white text-center font-semibold text-sm">✏️ Chỉnh sửa</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-purple-600 p-3 rounded-lg flex-1"
                  style={{
                    shadowColor: '#a855f7',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                  }}
                  onPress={() => {
                    (navigation as any).navigate('Sessions', {
                      classId: c.id,
                      className: c.name || ''
                    });
                  }}
                >
                  <Text className="text-white text-center font-semibold text-sm">📅 Buổi học</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: isDark ? '#374151' : '#d1d5db',
                  shadowColor: isDark ? '#4b5563' : '#9ca3af',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                }}
                onPress={() => {
                  (navigation as any).navigate('ClassDetail', { classId: c.id });
                }}
              >
                <Text className={`${textPrimary} text-center font-semibold`}>💬 Chi tiết & phản hồi</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-green-600 p-3 rounded-lg"
                style={{
                  shadowColor: '#16a34a',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                }}
                onPress={() => {
                  (navigation as any).navigate('CreateSession', {
                    classId: c.id,
                    className: c.name || ''
                  });
                }}
              >
                <Text className="text-white text-center font-semibold">➕ Tạo buổi học mới</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pending status message */}
          {c.status === 'PENDING' && (
            <View className="p-3 rounded-lg mt-3 border"
                  style={{
                    backgroundColor: isDark ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.05)',
                    borderColor: isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.2)',
                  }}>
              <Text className="text-yellow-600 text-sm text-center">
                Lớp học đang chờ Admin duyệt. Bạn sẽ nhận được thông báo khi có kết quả.
              </Text>
            </View>
          )}

          {/* Rejected status actions */}
          {c.status === 'REJECTED' && (
            <TouchableOpacity 
              className="bg-blue-600 p-3 rounded-lg mt-3"
              style={{
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
              }}
              onPress={() => {
                (navigation as any).navigate('EditClass', {
                  id: c.id,
                  prefillName: c.name,
                  prefillDescription: c.description || '',
                  prefillCapacity: c.capacity?.toString() || '',
                  prefillDuration: c.duration?.toString() || ''
                });
              }}
            >
              <Text className="text-white text-center font-semibold">Tạo lại lớp học</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}