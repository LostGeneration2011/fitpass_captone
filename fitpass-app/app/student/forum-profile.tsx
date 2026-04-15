import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { forumAPI, getAPIUrl } from '../../lib/api';
import { useTheme } from '../../lib/theme';

type RoleType = 'STUDENT' | 'TEACHER' | 'ADMIN';

type UserSummary = {
  id: string;
  fullName: string;
  avatar?: string | null;
  role: RoleType;
  memberSince: string;
};

type ForumProfileData = {
  profileType: RoleType;
  user: UserSummary;
  forumActivity?: {
    postCount?: number;
    commentCount?: number;
  };
  teacherProfile?: {
    bio?: string | null;
    experienceYears?: number | null;
    specialties?: string[];
    certifications?: string[];
    highlights?: string[];
    coverImage?: string | null;
    galleryImages?: string[];
  };
  stats?: {
    totalClasses?: number;
    totalReviews?: number;
    averageRating?: number;
    likeCount?: number;
    dislikeCount?: number;
    activeClasses?: number;
    completedClasses?: number;
    totalSessions?: number;
    attendedSessions?: number;
    attendanceRate?: number;
    reviewCount?: number;
    averageReviewRating?: number;
    postCount?: number;
    commentCount?: number;
  };
  classes?: Array<{
    id: string;
    name: string;
    description?: string | null;
    createdAt?: string;
    enrollmentStatus?: string;
    classImage?: { id: string; url: string } | null;
    ratingSummary?: { average?: number; count?: number };
    reactionSummary?: { likeCount?: number; dislikeCount?: number };
    teacher?: { id: string; fullName: string; avatar?: string | null; role?: RoleType } | null;
    totalSessions?: number;
    attendedSessions?: number;
    attendanceRate?: number;
    latestAttendanceAt?: string | null;
  }>;
  recentReviews?: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    replyText?: string | null;
    repliedAt?: string | null;
    createdAt: string;
    class?: { id: string; name: string };
    student?: { id: string; fullName: string; avatar?: string | null; role?: RoleType } | null;
    teacher?: { id: string; fullName: string; avatar?: string | null; role?: RoleType } | null;
  }>;
};

const getInitials = (fullName?: string) => {
  const normalized = (fullName || 'Thành viên').trim();
  if (!normalized) return 'TV';
  const parts = normalized.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'T';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || 'V';
  return `${first}${last}`.toUpperCase();
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  return new Date(value).toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  return new Date(value).toLocaleString('vi-VN');
};

const formatRating = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.0';
  return value.toFixed(1);
};

const getRoleMeta = (role?: RoleType, dark = false) => {
  switch (role) {
    case 'TEACHER':
      return {
        label: 'Giáo viên',
        icon: 'school-outline' as const,
        background: dark ? '#1e3a5f' : '#dbeafe',
        text: dark ? '#93c5fd' : '#1d4ed8',
      };
    case 'ADMIN':
      return {
        label: 'Quản trị',
        icon: 'shield-checkmark-outline' as const,
        background: dark ? '#450a0a' : '#fee2e2',
        text: dark ? '#fca5a5' : '#b91c1c',
      };
    default:
      return {
        label: 'Học viên',
        icon: 'fitness-outline' as const,
        background: dark ? '#052e16' : '#dcfce7',
        text: dark ? '#86efac' : '#15803d',
      };
  }
};

const getEnrollmentStatusMeta = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Hoàn thành', color: '#16a34a' };
    case 'SUSPENDED':
      return { label: 'Tạm dừng', color: '#d97706' };
    case 'TRANSFERRED':
      return { label: 'Chuyển lớp', color: '#2563eb' };
    case 'CANCELLED':
      return { label: 'Đã hủy', color: '#dc2626' };
    default:
      return { label: 'Đang học', color: '#0f766e' };
  }
};

const StarRow = ({ rating }: { rating: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((value) => (
      <Ionicons
        key={value}
        name={value <= Math.round(rating) ? 'star' : 'star-outline'}
        size={14}
        color="#f59e0b"
        style={{ marginRight: 2 }}
      />
    ))}
  </View>
);

export default function StudentForumProfileScreen({ route, navigation }: any) {
  const { userId } = route.params || {};
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ForumProfileData | null>(null);

  const uploadBaseUrl = useMemo(() => getAPIUrl().replace(/\/api$/, ''), []);

  const toDisplayImageUrl = useCallback(
    (url?: string | null) => {
      if (!url) return '';
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')
        ? url
        : `${uploadBaseUrl}${url}`;
    },
    [uploadBaseUrl]
  );

  const loadProfile = useCallback(async () => {
    try {
      if (!userId) {
        setProfile(null);
        return;
      }

      setLoading(true);
      const response = await forumAPI.getUserProfile(userId);
      setProfile(response?.data || response || null);
    } catch (error: any) {
      setProfile(null);
      Toast.show({
        type: 'error',
        text1: 'Không thể tải hồ sơ',
        text2: error?.message || 'Vui lòng thử lại',
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const openProfile = (nextUserId?: string | null) => {
    if (!nextUserId || nextUserId === userId) return;
    navigation.push('ForumProfile', { userId: nextUserId });
  };

  const openClassDetail = (classId?: string | null) => {
    if (!classId) return;
    navigation.navigate('ClassDetail', { classId });
  };

  const renderAvatar = (user?: { fullName?: string; avatar?: string | null }, size = 84) => {
    if (user?.avatar) {
      return (
        <Image
          source={{ uri: toDisplayImageUrl(user.avatar) }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      );
    }

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg.secondary,
          borderWidth: 1,
          borderColor: colors.card.border,
        }}
      >
        <Text style={{ color: colors.text.primary, fontWeight: '800', fontSize: Math.max(16, size * 0.26) }}>
          {getInitials(user?.fullName)}
        </Text>
      </View>
    );
  };

  const renderStatCard = (label: string, value: string | number, hint?: string) => (
    <View
      style={{
        width: '48%',
        backgroundColor: colors.card.bg,
        borderColor: colors.card.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: colors.text.secondary, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <Text style={{ color: colors.text.primary, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      {hint ? <Text style={{ color: colors.text.muted, fontSize: 12, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.text.accent} />
          <Text style={{ color: colors.text.secondary, marginTop: 14, fontSize: 16 }}>Đang tải hồ sơ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '700' }}>Không tìm thấy hồ sơ</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 16,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.text.accent,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const roleMeta = getRoleMeta(profile.user.role, isDark);
  const stats = profile.stats || {};
  const forumActivity = profile.forumActivity || {};
  const classes = profile.classes || [];
  const recentReviews = profile.recentReviews || [];
  const teacherProfile = profile.teacherProfile;
  const isTeacher = profile.profileType === 'TEACHER';
  const isStudent = profile.profileType === 'STUDENT';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card.bg,
              borderWidth: 1,
              borderColor: colors.card.border,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={{ color: colors.text.primary, fontSize: 22, fontWeight: '800' }}>Hồ sơ cộng đồng</Text>
          <View style={{ width: 44 }} />
        </View>

        <View
          style={{
            backgroundColor: colors.card.bg,
            borderColor: colors.card.border,
            borderWidth: 1,
            borderRadius: 22,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderAvatar(profile.user, 84)}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: colors.text.primary, fontSize: 24, fontWeight: '800' }}>{profile.user.fullName}</Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: roleMeta.background,
                  marginTop: 8,
                }}
              >
                <Ionicons name={roleMeta.icon} size={14} color={roleMeta.text} />
                <Text style={{ color: roleMeta.text, fontWeight: '700', marginLeft: 6 }}>{roleMeta.label}</Text>
              </View>
              <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Tham gia từ {formatDate(profile.user.memberSince)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <View
              style={{
                flex: 1,
                marginRight: 6,
                backgroundColor: colors.bg.secondary,
                borderWidth: 1,
                borderColor: colors.card.border,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Bài viết</Text>
              <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{forumActivity.postCount || 0}</Text>
            </View>
            <View
              style={{
                flex: 1,
                marginLeft: 6,
                backgroundColor: colors.bg.secondary,
                borderWidth: 1,
                borderColor: colors.card.border,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Bình luận</Text>
              <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{forumActivity.commentCount || 0}</Text>
            </View>
          </View>
        </View>

        {isTeacher && (
          <>
            <Text style={{ color: colors.text.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 }}>THỐNG KÊ GIÁO VIÊN</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 6 }}>
              {renderStatCard('Lớp đang mở', stats.totalClasses || 0)}
              {renderStatCard('Điểm trung bình', formatRating(stats.averageRating), `${stats.totalReviews || 0} đánh giá`)}
              {renderStatCard('Lượt thích', stats.likeCount || 0)}
              {renderStatCard('Không thích', stats.dislikeCount || 0)}
            </View>

            {(teacherProfile?.bio || teacherProfile?.experienceYears || (teacherProfile?.specialties || []).length > 0 || (teacherProfile?.certifications || []).length > 0 || (teacherProfile?.highlights || []).length > 0) && (
              <View
                style={{
                  backgroundColor: colors.card.bg,
                  borderColor: colors.card.border,
                  borderWidth: 1,
                  borderRadius: 20,
                  padding: 18,
                  marginBottom: 14,
                }}
              >
                <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>Thông tin nổi bật</Text>
                {teacherProfile?.coverImage ? (
                  <Image
                    source={{ uri: toDisplayImageUrl(teacherProfile.coverImage) }}
                    style={{ width: '100%', height: 170, borderRadius: 16, marginBottom: 12 }}
                  />
                ) : null}
                {teacherProfile?.bio ? (
                  <Text style={{ color: colors.text.secondary, lineHeight: 21, marginBottom: 10 }}>{teacherProfile.bio}</Text>
                ) : null}
                {typeof teacherProfile?.experienceYears === 'number' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Ionicons name="time-outline" size={16} color={colors.text.accent} />
                    <Text style={{ color: colors.text.secondary, marginLeft: 8 }}>{teacherProfile.experienceYears} năm kinh nghiệm</Text>
                  </View>
                ) : null}
                {(teacherProfile?.specialties || []).length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                    {(teacherProfile?.specialties || []).map((item, index) => (
                      <View key={`${item}-${index}`} style={{ backgroundColor: isDark ? '#1e3a5f' : '#dbeafe', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 }}>
                        <Text style={{ color: isDark ? '#93c5fd' : '#1d4ed8', fontWeight: '700', fontSize: 12 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {(teacherProfile?.certifications || []).length > 0 ? (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: colors.text.primary, fontWeight: '700', marginBottom: 8 }}>Chứng chỉ</Text>
                    {(teacherProfile?.certifications || []).map((item, index) => (
                      <View key={`${item}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="ribbon-outline" size={15} color="#f59e0b" />
                        <Text style={{ color: colors.text.secondary, marginLeft: 8 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {(teacherProfile?.highlights || []).length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: colors.text.primary, fontWeight: '700', marginBottom: 8 }}>Điểm nhấn</Text>
                    {(teacherProfile?.highlights || []).map((item, index) => (
                      <View key={`${item}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="sparkles-outline" size={15} color="#22c55e" />
                        <Text style={{ color: colors.text.secondary, marginLeft: 8 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {(teacherProfile?.galleryImages || []).length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {(teacherProfile?.galleryImages || []).map((imageUrl, index) => (
                      <Image
                        key={`${imageUrl}-${index}`}
                        source={{ uri: toDisplayImageUrl(imageUrl) }}
                        style={{ width: 136, height: 96, borderRadius: 14, marginRight: 10 }}
                      />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            )}
          </>
        )}

        {isStudent && (
          <>
            <Text style={{ color: colors.text.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 }}>THỐNG KÊ HỌC VIÊN</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 6 }}>
            {renderStatCard('Lớp đã tham gia', stats.totalClasses || 0)}
            {renderStatCard('Tỷ lệ tham gia', `${stats.attendanceRate || 0}%`, `${stats.attendedSessions || 0}/${stats.totalSessions || 0} buổi`)}
            {renderStatCard('Đang học', stats.activeClasses || 0)}
            {renderStatCard('Đã review', stats.reviewCount || 0, `Điểm TB ${formatRating(stats.averageReviewRating)}`)}
          </View>
          </>
        )}

        {!isTeacher && !isStudent && (
          <View
            style={{
              backgroundColor: colors.card.bg,
              borderColor: colors.card.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 18,
              marginBottom: 14,
            }}
          >
            <Text style={{ color: colors.text.primary, fontWeight: '800', fontSize: 18, marginBottom: 8 }}>Tài khoản quản trị</Text>
            <Text style={{ color: colors.text.secondary, lineHeight: 21 }}>
              Hồ sơ này chỉ hiển thị thông tin cộng đồng cơ bản để giữ luồng diễn đàn nhẹ và an toàn.
            </Text>
          </View>
        )}

        <View
          style={{
            backgroundColor: colors.card.bg,
            borderColor: colors.card.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
            {isTeacher ? 'Lớp học nổi bật' : 'Hành trình lớp học'}
          </Text>
          {classes.length === 0 ? (
            <Text style={{ color: colors.text.secondary }}>Chưa có lớp học để hiển thị.</Text>
          ) : (
            classes.map((item, index) => {
              const statusMeta = getEnrollmentStatusMeta(item.enrollmentStatus);
              return (
                <View
                  key={item.id}
                  style={{
                    paddingBottom: index === classes.length - 1 ? 0 : 14,
                    marginBottom: index === classes.length - 1 ? 0 : 14,
                    borderBottomWidth: index === classes.length - 1 ? 0 : 1,
                    borderBottomColor: colors.card.border,
                  }}
                >
                  {item.classImage?.url ? (
                    <Image
                      source={{ uri: toDisplayImageUrl(item.classImage.url) }}
                      style={{ width: '100%', height: 150, borderRadius: 16, marginBottom: 12 }}
                    />
                  ) : null}
                  <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '800' }}>{item.name}</Text>
                  {item.description ? (
                    <Text style={{ color: colors.text.secondary, marginTop: 6, lineHeight: 20 }}>{item.description}</Text>
                  ) : null}

                  {isTeacher ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap' }}>
                      <View style={{ marginBottom: 8 }}>
                        <Text style={{ color: colors.text.primary, fontWeight: '700' }}>⭐ {formatRating(item.ratingSummary?.average)}</Text>
                        <Text style={{ color: colors.text.secondary, marginTop: 2 }}>{item.ratingSummary?.count || 0} đánh giá</Text>
                      </View>
                      <View style={{ marginBottom: 8 }}>
                        <Text style={{ color: colors.text.secondary }}>👍 {item.reactionSummary?.likeCount || 0}   👎 {item.reactionSummary?.dislikeCount || 0}</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap' }}>
                        <View style={{ marginBottom: 8 }}>
                          <Text style={{ color: colors.text.primary, fontWeight: '700' }}>{item.attendanceRate || 0}% tham gia</Text>
                          <Text style={{ color: colors.text.secondary, marginTop: 2 }}>{item.attendedSessions || 0}/{item.totalSessions || 0} buổi</Text>
                        </View>
                        <View style={{ backgroundColor: `${statusMeta.color}20`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 }}>
                          <Text style={{ color: statusMeta.color, fontWeight: '700', fontSize: 12 }}>{statusMeta.label}</Text>
                        </View>
                      </View>
                      {item.teacher?.id ? (
                        <TouchableOpacity onPress={() => openProfile(item.teacher?.id)} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                          <Text style={{ color: colors.text.accent, fontWeight: '700' }}>Giáo viên: {item.teacher?.fullName}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => openClassDetail(item.id)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: colors.button.primary,
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: '700' }}>Xem lớp</Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.text.muted, fontSize: 12 }}>Cập nhật {formatDate(item.createdAt)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View
          style={{
            backgroundColor: colors.card.bg,
            borderColor: colors.card.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 18,
          }}
        >
          <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
            {isTeacher ? 'Đánh giá gần đây' : 'Review gần đây'}
          </Text>
          {recentReviews.length === 0 ? (
            <Text style={{ color: colors.text.secondary }}>Chưa có đánh giá để hiển thị.</Text>
          ) : (
            recentReviews.map((review, index) => (
              <View
                key={review.id}
                style={{
                  paddingBottom: index === recentReviews.length - 1 ? 0 : 14,
                  marginBottom: index === recentReviews.length - 1 ? 0 : 14,
                  borderBottomWidth: index === recentReviews.length - 1 ? 0 : 1,
                  borderBottomColor: colors.card.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <StarRow rating={review.rating} />
                    <Text style={{ color: colors.text.primary, fontWeight: '700', marginLeft: 8 }}>{review.rating}/5</Text>
                  </View>
                  <Text style={{ color: colors.text.muted, fontSize: 12, marginBottom: 6 }}>{formatDateTime(review.createdAt)}</Text>
                </View>

                {review.class?.id ? (
                  <TouchableOpacity onPress={() => openClassDetail(review.class?.id)} style={{ alignSelf: 'flex-start' }}>
                    <Text style={{ color: colors.text.accent, fontWeight: '700' }}>{review.class?.name}</Text>
                  </TouchableOpacity>
                ) : null}

                {isTeacher && review.student?.id ? (
                  <TouchableOpacity onPress={() => openProfile(review.student?.id)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    {renderAvatar(review.student, 34)}
                    <Text style={{ color: colors.text.secondary, marginLeft: 10 }}>Học viên: {review.student?.fullName}</Text>
                  </TouchableOpacity>
                ) : null}

                {isStudent && review.teacher?.id ? (
                  <TouchableOpacity onPress={() => openProfile(review.teacher?.id)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    {renderAvatar(review.teacher, 34)}
                    <Text style={{ color: colors.text.secondary, marginLeft: 10 }}>Giáo viên: {review.teacher?.fullName}</Text>
                  </TouchableOpacity>
                ) : null}

                {review.comment ? (
                  <Text style={{ color: colors.text.primary, lineHeight: 20, marginTop: 10 }}>{review.comment}</Text>
                ) : (
                  <Text style={{ color: colors.text.muted, marginTop: 10 }}>Không có nội dung nhận xét.</Text>
                )}

                {review.replyText ? (
                  <View
                    style={{
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: colors.bg.secondary,
                      borderWidth: 1,
                      borderColor: colors.card.border,
                    }}
                  >
                    <Text style={{ color: colors.text.primary, fontWeight: '700', marginBottom: 4 }}>Phản hồi</Text>
                    <Text style={{ color: colors.text.secondary, lineHeight: 20 }}>{review.replyText}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}