import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { teachersAPI } from '../../lib/api';
import { useTheme } from '../../lib/theme';

export default function StudentTeacherProfileScreen({ route, navigation }: any) {
  const { teacherId } = route.params || {};
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const colors = {
    screen: isDark ? '#020617' : '#f8fafc',
    card: isDark ? '#1e293b' : '#ffffff',
    cardAlt: isDark ? '#0f172a' : '#f1f5f9',
    border: isDark ? '#334155' : '#e2e8f0',
    textPrimary: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#cbd5e1' : '#334155',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    badgeBg: isDark ? 'rgba(37, 99, 235, 0.18)' : '#dbeafe',
    badgeBorder: isDark ? 'rgba(96, 165, 250, 0.4)' : '#93c5fd',
    badgeText: isDark ? '#bfdbfe' : '#1d4ed8',
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await teachersAPI.getProfile(teacherId);
      setProfile(data);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải hồ sơ giáo viên',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!teacherId) return;
    loadProfile();
  }, [teacherId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 18, fontWeight: '500' }}>Đang tải hồ sơ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
        <View className="flex-1 justify-center items-center">
          <Text style={{ color: colors.textSecondary }}>Không tìm thấy giáo viên</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: colors.textPrimary }}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const teacher = profile.teacher;
  const ratingSummary = profile.ratingSummary;
  const reactionSummary = profile.reactionSummary;
  const galleryImages = teacher?.teacherGalleryImages || [];
  const hasTeacherDetails = Boolean(
    teacher?.teacherBio ||
      (teacher?.teacherSpecialties?.length || 0) > 0 ||
      typeof teacher?.teacherExperienceYears === 'number'
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-3 rounded-xl"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700' }}>Hồ sơ giáo viên</Text>
          <View className="w-12" />
        </View>

        <View className="rounded-2xl p-6 mb-5" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          {teacher?.teacherCoverImage ? (
            <View className="rounded-2xl overflow-hidden mb-4" style={{ borderWidth: 1, borderColor: colors.border }}>
              <Image
                source={{ uri: teacher.teacherCoverImage }}
                style={{ width: '100%', height: 160 }}
              />
            </View>
          ) : null}
          <View className="flex-row items-center">
            {teacher?.avatar ? (
              <Image source={{ uri: teacher.avatar }} style={{ width: 88, height: 88, borderRadius: 44 }} />
            ) : (
              <View className="w-22 h-22 rounded-full items-center justify-center" style={{ backgroundColor: colors.cardAlt }}>
                <Ionicons name="person" size={28} color={colors.textMuted} />
              </View>
            )}
            <View className="ml-4 flex-1">
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>{teacher?.fullName}</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>{teacher?.email}</Text>
            </View>
          </View>
        </View>

        {hasTeacherDetails && (
          <View className="rounded-xl p-5 mb-5" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Thông tin giáo viên</Text>
            {teacher?.teacherBio ? (
              <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>{teacher.teacherBio}</Text>
            ) : null}
            {typeof teacher?.teacherExperienceYears === 'number' ? (
              <View className="flex-row items-center mb-2">
                <Ionicons name="time" size={16} color="#60A5FA" />
                <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>{teacher.teacherExperienceYears} năm kinh nghiệm</Text>
              </View>
            ) : null}
            {teacher?.teacherSpecialties?.length ? (
              <View className="flex-row flex-wrap">
                {teacher.teacherSpecialties.map((item: string, idx: number) => (
                  <View
                    key={`${item}-${idx}`}
                    className="px-3 py-1 rounded-full mr-2 mb-2"
                    style={{ backgroundColor: colors.badgeBg, borderWidth: 1, borderColor: colors.badgeBorder }}
                  >
                    <Text style={{ color: colors.badgeText, fontSize: 12, fontWeight: '600' }}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {teacher?.teacherCertifications?.length ? (
          <View className="rounded-xl p-5 mb-5" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Chứng chỉ</Text>
            {teacher.teacherCertifications.map((item: string, idx: number) => (
              <View key={`${item}-${idx}`} className="flex-row items-center mb-2">
                <Ionicons name="ribbon" size={16} color="#f59e0b" />
                <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {teacher?.teacherHighlights?.length ? (
          <View className="rounded-xl p-5 mb-5" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Thành tựu</Text>
            {teacher.teacherHighlights.map((item: string, idx: number) => (
              <View key={`${item}-${idx}`} className="flex-row items-center mb-2">
                <Ionicons name="trophy" size={16} color="#22c55e" />
                <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {galleryImages.length ? (
          <View className="rounded-xl p-5 mb-5" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Hình ảnh giáo viên</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {galleryImages.map((img: string, idx: number) => (
                <Image
                  key={`${img}-${idx}`}
                  source={{ uri: img }}
                  style={{ width: 140, height: 100, borderRadius: 12, marginRight: 10 }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View className="rounded-xl p-5 mb-5" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Đánh giá tổng quan</Text>
          <View className="flex-row items-center justify-between flex-wrap gap-3">
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: 30, fontWeight: '700' }}>
                {ratingSummary?.average?.toFixed(1) || '0.0'}
              </Text>
              <Text style={{ color: colors.textMuted }}>{ratingSummary?.count || 0} đánh giá</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center px-3 py-2 rounded-lg" style={{ backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border }}>
                <Ionicons name="thumbs-up" size={16} color="#22c55e" />
                <Text style={{ color: colors.textSecondary, marginLeft: 8, fontWeight: '600' }}>
                  {reactionSummary?.likeCount || 0}
                </Text>
              </View>
              <View className="flex-row items-center px-3 py-2 rounded-lg" style={{ backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border }}>
                <Ionicons name="thumbs-down" size={16} color="#ef4444" />
                <Text style={{ color: colors.textSecondary, marginLeft: 8, fontWeight: '600' }}>
                  {reactionSummary?.dislikeCount || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mb-10">
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Lớp học của giáo viên</Text>
          {(profile.classes || []).length === 0 ? (
            <View className="rounded-xl p-5" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textMuted }}>Chưa có lớp học</Text>
            </View>
          ) : (
            (profile.classes || []).map((cls: any) => (
              <TouchableOpacity
                key={cls.id}
                onPress={() => navigation.navigate('ClassDetail', { classId: cls.id })}
                className="rounded-xl p-5 mb-4"
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>{cls.name}</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4 }}>{cls.description || 'Chưa có mô tả'}</Text>
                <View className="flex-row items-center justify-between mt-3">
                  <Text style={{ color: colors.textSecondary }}>⭐ {cls.ratingSummary?.average?.toFixed(1) || '0.0'}</Text>
                  <Text style={{ color: colors.textMuted }}>{cls.ratingSummary?.count || 0} đánh giá</Text>
                </View>
                {cls.classImages?.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                    {cls.classImages.map((img: any) => (
                      <Image
                        key={img.id}
                        source={{ uri: img.url }}
                        style={{ width: 120, height: 80, borderRadius: 10, marginRight: 8 }}
                      />
                    ))}
                  </ScrollView>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

