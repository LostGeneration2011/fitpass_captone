import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { enrollmentAPI, classAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import { useThemeClasses } from '../../lib/theme';

interface Student {
  id: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  status: string;
  createdAt: string;
  class: {
    name: string;
  };
}

interface GroupedStudents {
  [studentId: string]: {
    user: {
      id: string;
      fullName: string;
      email: string;
    };
    classes: string[];
    status: string;
  };
}

export default function TeacherStudentsScreen() {
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [students, setStudents] = useState<GroupedStudents>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = async () => {
    try {
      const currentUser = await getUser();
      if (!currentUser?.id || currentUser.role !== 'TEACHER') {
        setStudents({});
        return;
      }

      const teacherClassesResponse = await classAPI.getAll(currentUser.id);

      const teacherClasses = Array.isArray(teacherClassesResponse)
        ? teacherClassesResponse
        : teacherClassesResponse?.classes || [];
      const teacherClassIds = new Set(teacherClasses.map((classItem: any) => classItem.id));

      // Fetch enrollments per class using classId filter (teacher-accessible)
      const enrollmentResults = await Promise.all(
        teacherClasses.map((cls: any) => enrollmentAPI.getByClass(cls.id))
      );
      const enrollments: Student[] = enrollmentResults.flat();

      const filteredEnrollments = enrollments.filter((enrollment: any) => {
        return teacherClassIds.has(enrollment.classId || enrollment.class?.id);
      });

      // Group students by user and collect their classes
      const grouped: GroupedStudents = {};
      filteredEnrollments.forEach(enrollment => {
        if (!enrollment.user) return;
        
        const userId = enrollment.user.id;
        if (!grouped[userId]) {
          grouped[userId] = {
            user: enrollment.user,
            classes: [],
            status: enrollment.status || 'ACTIVE'
          };
        }
        
        if (enrollment.class?.name) {
          grouped[userId].classes.push(enrollment.class.name);
        }
      });

      setStudents(grouped);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudents();
    setRefreshing(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE' ? 'bg-green-600' : 'bg-yellow-600';
  };

  const getStatusText = (status: string) => {
    return status === 'ACTIVE' ? 'Đang hoạt động' : 'Chờ duyệt';
  };

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <View className="flex-1 p-4">
        <Text className={`text-3xl font-bold ${textPrimary} mb-6`}>
          Học viên của tôi
        </Text>
        
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="gap-4">
            {Object.values(students).length > 0 ? (
              Object.values(students).map((student, index) => (
                <View 
                  key={student.user.id} 
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#475569' : '#e2e8f0',
                  }}
                  className="rounded-xl p-4 border"
                >
                  <View className="flex-row items-center">
                    <View className="w-14 h-14 rounded-full bg-blue-600 justify-center items-center mr-4">
                      <Text className="text-lg font-bold text-white">
                        {getInitials(student.user.fullName)}
                      </Text>
                    </View>
                    
                    <View className="flex-1">
                      <Text className={`text-lg font-semibold ${textPrimary} mb-1`}>
                        {student.user.fullName}
                      </Text>
                      <Text className={`${textSecondary} text-sm mb-2`}>
                        {student.user.email}
                      </Text>
                      
                      {student.classes.length > 0 && (
                        <Text className={`${textSecondary} text-sm mb-3`}>
                          {student.classes.join(', ')}
                        </Text>
                      )}
                      
                      <View className="flex-row items-center">
                        <View className={`${getStatusColor(student.status)} px-3 py-1 rounded-full mr-3`}>
                          <Text className="text-white text-xs font-medium">
                            {getStatusText(student.status)}
                          </Text>
                        </View>
                        
                        <View className="flex-row items-center">
                          <Ionicons name="school" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                          <Text className={`${textSecondary} text-sm ml-1`}>
                            {student.classes.length} lớp học
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : loading ? (
              <View 
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                }}
                className="rounded-xl p-6 border"
              >
                <Text className={`${textSecondary} text-center`}>Đang tải học viên...</Text>
              </View>
            ) : (
              <View 
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                }}
                className="rounded-xl p-6 border"
              >
                <View className="items-center">
                  <Ionicons name="people" size={48} color={isDark ? '#64748b' : '#94a3b8'} />
                  <Text className={`${textPrimary} text-lg font-semibold mt-4 mb-2`}>
                    Không tìm thấy học viên nào
                  </Text>
                  <Text className={`${textSecondary} text-center`}>
                    Các học viên đăng ký vào lớp của bạn sẽ xuất hiện ở đây
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}