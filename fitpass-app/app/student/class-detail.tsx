import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { classAPI, chatAPI } from '../../lib/api';

const StarRating = ({ rating, onChange }: { rating: number; onChange: (value: number) => void }) => {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((value) => (
        <TouchableOpacity key={value} onPress={() => onChange(value)}>
          <Ionicons
            name={value <= rating ? 'star' : 'star-outline'}
            size={22}
            color={value <= rating ? '#f59e0b' : '#94a3b8'}
            style={{ marginRight: 6 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function StudentClassDetailScreen({ route, navigation }: any) {
  const { classId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [classImages, setClassImages] = useState<any[]>([]);
  const [classImagesLoading, setClassImagesLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myReaction, setMyReaction] = useState<'LIKE' | 'DISLIKE' | null>(null);
  const [reactionCounts, setReactionCounts] = useState({ likeCount: 0, dislikeCount: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const ratingSummary = detail?.ratingSummary;
  const reactionSummary = detail?.reactionSummary;
  const teacher = detail?.teacher;

  const loadImages = async () => {
    try {
      setClassImagesLoading(true);
      const images = await classAPI.getImages(classId);
      setClassImages(images || []);
    } catch (error: any) {
      setClassImages([]);
    } finally {
      setClassImagesLoading(false);
    }
  };

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await classAPI.getDetail(classId);
      setDetail(data);
      setRating(data?.myReview?.rating || 0);
      setComment(data?.myReview?.comment || '');
      setMyReaction(data?.myReaction?.type || null);
      setReactionCounts({
        likeCount: data?.reactionSummary?.likeCount || 0,
        dislikeCount: data?.reactionSummary?.dislikeCount || 0,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải chi tiết lớp học',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (nextPage = 1, replace = false) => {
    try {
      if (nextPage > 1) setLoadingMore(true);
      const res = await classAPI.getReviews(classId, { page: nextPage, limit: 10, sort: 'newest' });
      const data = res?.data || [];
      const pagination = res?.pagination;

      setReviews((prev) => (replace ? data : [...prev, ...data]));
      setPage(pagination?.page || nextPage);
      setTotalPages(pagination?.totalPages || 1);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải đánh giá',
      });
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!classId) return;
    loadDetail();
    loadImages();
    loadReviews(1, true);
  }, [classId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDetail(), loadImages(), loadReviews(1, true)]);
    setRefreshing(false);
  };

  const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
    try {
      if (myReaction === type) {
        await classAPI.removeReaction(classId);
        setMyReaction(null);
        setReactionCounts((prev) => ({
          likeCount: Math.max(prev.likeCount - (type === 'LIKE' ? 1 : 0), 0),
          dislikeCount: Math.max(prev.dislikeCount - (type === 'DISLIKE' ? 1 : 0), 0),
        }));
        return;
      }

      await classAPI.setReaction(classId, type);
      setReactionCounts((prev) => {
        const updated = { ...prev };
        if (type === 'LIKE') updated.likeCount += 1;
        if (type === 'DISLIKE') updated.dislikeCount += 1;
        if (myReaction === 'LIKE') updated.likeCount = Math.max(updated.likeCount - 1, 0);
        if (myReaction === 'DISLIKE') updated.dislikeCount = Math.max(updated.dislikeCount - 1, 0);
        return updated;
      });
      setMyReaction(type);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể cập nhật phản hồi',
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu đánh giá',
        text2: 'Vui lòng chọn số sao',
      });
      return;
    }

    try {
      setSubmitting(true);
      await classAPI.submitReview(classId, { rating, comment });
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đánh giá của bạn đã được lưu',
      });
      await loadDetail();
      await loadReviews(1, true);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể gửi đánh giá',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChatTeacher = async () => {
    try {
      const thread = await chatAPI.createClassThread(classId);
      navigation.navigate('ChatThread', {
        threadId: thread.id,
        title: `Chat với ${teacher?.fullName || 'giáo viên'}`,
        threadType: thread.type,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể mở chat với giáo viên',
      });
    }
  };

  const breakdown = useMemo(() => ratingSummary?.breakdown || [], [ratingSummary]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-slate-300 mt-4 text-lg font-medium">Đang tải chi tiết lớp học...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-300">Không tìm thấy lớp học</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-slate-800 px-4 py-2 rounded-lg">
            <Text className="text-white">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-slate-800 p-3 rounded-xl border border-slate-700"
          >
            <Ionicons name="arrow-back" size={24} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Chi tiết lớp</Text>
          <View className="w-12" />
        </View>

        <View className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-5">
          <Text className="text-2xl font-bold text-white mb-2">{detail.name}</Text>
          <Text className="text-slate-300 mb-3">{detail.description || 'Chưa có mô tả'}</Text>
          <View className="flex-row items-center">
            <Ionicons name="time" size={16} color="#94a3b8" />
            <Text className="text-slate-300 ml-2">{detail.duration} phút</Text>
          </View>
        </View>

        <View className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-5">
          <View className="flex-row items-center justify-between flex-wrap">
            <View className="flex-row items-center flex-1 pr-3">
              {teacher?.avatar ? (
                <Image
                  source={{ uri: teacher.avatar }}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center">
                  <Ionicons name="person" size={22} color="#94a3b8" />
                </View>
              )}
              <View className="ml-3 flex-shrink">
                <Text className="text-white font-semibold text-lg">{teacher?.fullName || 'Giáo viên'}</Text>
                <Text className="text-slate-400">{teacher?.email || ''}</Text>
              </View>
            </View>
            {teacher?.id && (
              <View className="flex-row items-center flex-wrap gap-2 mt-3">
                <TouchableOpacity
                  onPress={() => navigation.navigate('TeacherProfile', { teacherId: teacher.id })}
                  className="bg-blue-600 px-3 py-2 rounded-lg"
                >
                  <Text className="text-white font-semibold">Hồ sơ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChatTeacher}
                  className="bg-slate-700 px-3 py-2 rounded-lg border border-slate-600"
                >
                  <Text className="text-white font-semibold">Chat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {teacher?.teacherBio ? (
            <Text className="text-slate-300 mt-4">{teacher.teacherBio}</Text>
          ) : null}
          {typeof teacher?.teacherExperienceYears === 'number' ? (
            <View className="flex-row items-center mt-3">
              <Ionicons name="time" size={16} color="#60A5FA" />
              <Text className="text-slate-300 ml-2">{teacher.teacherExperienceYears} năm kinh nghiệm</Text>
            </View>
          ) : null}
          {teacher?.teacherSpecialties?.length ? (
            <View className="flex-row flex-wrap mt-3">
              {teacher.teacherSpecialties.map((item: string, idx: number) => (
                <View key={`${item}-${idx}`} className="bg-blue-600/20 border border-blue-500/40 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-blue-200 text-xs font-semibold">{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-5">
          <Text className="text-lg font-semibold text-white mb-3">Hình ảnh lớp học</Text>
          {classImagesLoading ? (
            <Text className="text-slate-400">Đang tải hình ảnh...</Text>
          ) : classImages.length === 0 ? (
            <Text className="text-slate-400">Chưa có hình ảnh</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {classImages.map((img: any) => (
                <View key={img.id} className="mr-4">
                  <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
                    <Image
                      source={{ uri: img.url }}
                      style={{ width: 200, height: 120 }}
                    />
                    <View className="p-3">
                      <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                        {detail.name}
                      </Text>
                      <Text className="text-slate-400 text-xs" numberOfLines={1}>
                        {img.caption || 'Không có mô tả'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-5">
          <Text className="text-lg font-semibold text-white mb-3">Đánh giá & phản hồi</Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-bold text-white">
                {ratingSummary?.average?.toFixed(1) || '0.0'}
              </Text>
              <Text className="text-slate-400">{ratingSummary?.count || 0} đánh giá</Text>
            </View>
            <View className="flex-1 ml-6">
              {breakdown.map((item: any) => (
                <View key={item.rating} className="flex-row items-center mb-1">
                  <Text className="text-slate-400 w-6">{item.rating}</Text>
                  <View className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden mx-2">
                    <View
                      style={{
                        width: ratingSummary?.count ? `${(item.count / ratingSummary.count) * 100}%` : '0%',
                        height: '100%',
                        backgroundColor: '#f59e0b',
                      }}
                    />
                  </View>
                  <Text className="text-slate-400 w-8 text-right">{item.count}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-4">
            <TouchableOpacity
              onPress={() => handleReaction('LIKE')}
              className={`flex-1 mr-2 px-4 py-2 rounded-lg border ${
                myReaction === 'LIKE' ? 'bg-green-600 border-green-500' : 'bg-slate-700 border-slate-600'
              }`}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="thumbs-up" size={18} color="#fff" />
                <Text className="text-white ml-2">{reactionCounts.likeCount}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReaction('DISLIKE')}
              className={`flex-1 ml-2 px-4 py-2 rounded-lg border ${
                myReaction === 'DISLIKE' ? 'bg-red-600 border-red-500' : 'bg-slate-700 border-slate-600'
              }`}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="thumbs-down" size={18} color="#fff" />
                <Text className="text-white ml-2">{reactionCounts.dislikeCount}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-5">
          <Text className="text-lg font-semibold text-white mb-3">Viết đánh giá</Text>
          {detail?.myReview ? (
            <Text className="text-slate-400 text-xs mb-2">Bạn đã đánh giá trước đó, có thể cập nhật.</Text>
          ) : null}
          <StarRating rating={rating} onChange={setRating} />
          <TextInput
            className="bg-slate-700 text-white rounded-lg px-4 py-3 mt-4"
            placeholder="Chia sẻ cảm nhận của bạn..."
            placeholderTextColor="#94a3b8"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            onPress={handleSubmitReview}
            disabled={submitting}
            className={`mt-4 px-4 py-3 rounded-lg ${submitting ? 'bg-slate-600' : 'bg-blue-600'}`}
          >
            <Text className="text-white text-center font-semibold">
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-10">
          <Text className="text-lg font-semibold text-white mb-3">Bình luận gần đây</Text>
          {reviews.length === 0 ? (
            <View className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <Text className="text-slate-400">Chưa có đánh giá nào</Text>
            </View>
          ) : (
            reviews.map((review: any) => (
              <View key={review.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    {review.student?.avatar ? (
                      <Image
                        source={{ uri: review.student.avatar }}
                        style={{ width: 36, height: 36, borderRadius: 18 }}
                      />
                    ) : (
                      <View className="w-9 h-9 rounded-full bg-slate-700 items-center justify-center">
                        <Ionicons name="person" size={16} color="#94a3b8" />
                      </View>
                    )}
                    <View className="ml-3">
                      <Text className="text-white font-semibold">{review.student?.fullName || 'Học viên'}</Text>
                      <Text className="text-slate-400 text-xs">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text className="text-white ml-1">{review.rating}</Text>
                  </View>
                </View>
                {review.comment ? (
                  <Text className="text-slate-300 mt-3">{review.comment}</Text>
                ) : (
                  <Text className="text-slate-500 mt-3">(Không có bình luận)</Text>
                )}

                {review.replyText ? (
                  <View className="mt-4 bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <Text className="text-slate-400 text-xs mb-1">Phản hồi của giáo viên</Text>
                    <Text className="text-slate-200">{review.replyText}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}

          {page < totalPages && (
            <TouchableOpacity
              onPress={() => loadReviews(page + 1)}
              disabled={loadingMore}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 items-center"
            >
              <Text className="text-white font-semibold">
                {loadingMore ? 'Đang tải...' : 'Tải thêm'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={galleryVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setGalleryVisible(false)}
        >
          <View className="flex-1 bg-black/90">
            <View className="flex-row items-center justify-between px-4 pt-10 pb-4">
              <Text className="text-white font-semibold">Ảnh lớp học</Text>
              <TouchableOpacity onPress={() => setGalleryVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View className="flex-1 items-center justify-center">
              {classImages[galleryIndex]?.url ? (
                <Image
                  source={{ uri: classImages[galleryIndex].url }}
                  style={{ width: '90%', height: '70%', borderRadius: 16 }}
                  resizeMode="contain"
                />
              ) : null}
            </View>
            <View className="flex-row items-center justify-between px-6 pb-10">
              <TouchableOpacity
                onPress={() => setGalleryIndex((prev) => Math.max(prev - 1, 0))}
                disabled={galleryIndex === 0}
                className={`px-4 py-2 rounded-full ${galleryIndex === 0 ? 'bg-slate-700' : 'bg-white/20'}`}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <Text className="text-white text-sm">
                {galleryIndex + 1}/{classImages.length}
              </Text>
              <TouchableOpacity
                onPress={() => setGalleryIndex((prev) => Math.min(prev + 1, classImages.length - 1))}
                disabled={galleryIndex === classImages.length - 1}
                className={`px-4 py-2 rounded-full ${galleryIndex === classImages.length - 1 ? 'bg-slate-700' : 'bg-white/20'}`}
              >
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
