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
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';
import { classAPI } from '../../lib/api';
import { useThemeClasses } from '../../lib/theme';

const StarRow = ({ rating }: { rating: number }) => (
  <View className="flex-row items-center">
    {[1, 2, 3, 4, 5].map((value) => (
      <Ionicons key={value} name={value <= rating ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
    ))}
  </View>
);

export default function TeacherClassDetailScreen({ route, navigation }: any) {
  const { classId } = route.params || {};

  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageCaption, setImageCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImages, setSelectedImages] = useState<Array<{ uri: string }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(new Set());

  const classImages = detail?.classImages || [];

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await classAPI.getDetail(classId);
      setDetail(data);
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

  const loadReviews = async () => {
    try {
      const res = await classAPI.getReviews(classId, { page: 1, limit: 20, sort: 'newest' });
      setReviews(res?.data || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải đánh giá',
      });
    }
  };

  useEffect(() => {
    if (!classId) return;
    loadDetail();
    loadReviews();
  }, [classId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDetail(), loadReviews()]);
    setRefreshing(false);
  };

  const handleReply = async (reviewId: string) => {
    try {
      setSubmitting(reviewId);
      const replyText = replyDrafts[reviewId] ?? '';
      await classAPI.replyReview(classId, reviewId, replyText);
      Toast.show({
        type: 'success',
        text1: 'Đã phản hồi',
        text2: 'Phản hồi của bạn đã được lưu',
      });
      await loadReviews();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể gửi phản hồi',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const pickImageAndUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Cần quyền truy cập',
          text2: 'Vui lòng cấp quyền thư viện ảnh.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
        base64: true,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets?.length) {
        const newItems = result.assets.map((asset) => ({
          uri: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
        }));
        setSelectedImages((prev) => [...prev, ...newItems]);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể chọn ảnh',
      });
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Cần quyền truy cập',
          text2: 'Vui lòng cấp quyền camera.',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setSelectedImages((prev) => [...prev, { uri: base64 }]);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể chụp ảnh',
      });
    }
  };

  const handleUploadImage = async () => {
    const pendingImages = [...selectedImages];
    if (imageUrl.trim()) {
      pendingImages.push({ uri: imageUrl.trim() });
    }
    if (pendingImages.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu ảnh',
        text2: 'Vui lòng chọn ảnh hoặc nhập URL',
      });
      return;
    }

    try {
      setUploading(true);
      const optimizeImage = async (uri: string) => {
        if (uri.startsWith('data:image') || uri.startsWith('http')) {
          return uri;
        }

        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1280 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        return manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : manipulated.uri;
      };

      for (const img of pendingImages) {
        const optimizedUri = await optimizeImage(img.uri);
        await classAPI.addImage(classId, {
          url: optimizedUri,
          caption: imageCaption || undefined,
        });
      }
      Toast.show({
        type: 'success',
        text1: 'Đã tải ảnh',
        text2: 'Ảnh lớp học đã được thêm',
      });
      setImageUrl('');
      setImageCaption('');
      setSelectedImages([]);
      await loadDetail();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải ảnh',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDeleteImage = (imageId: string) => {
    Alert.alert('Xóa ảnh', 'Bạn chắc chắn muốn xóa ảnh này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await classAPI.deleteImage(classId, imageId);
            setDetail((prev: any) => ({
              ...prev,
              classImages: (prev?.classImages || []).filter((img: any) => img.id !== imageId),
            }));
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: 'Lỗi',
              text2: error?.message || 'Không thể xóa ảnh',
            });
          }
        },
      },
    ]);
  };

  const toggleDeleteSelection = (imageId: string) => {
    setSelectedDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return next;
    });
  };

  const handleDeleteSelectedImages = () => {
    if (selectedDeleteIds.size === 0) return;
    Alert.alert('Xóa ảnh', 'Bạn chắc chắn muốn xóa các ảnh đã chọn?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            const ids = Array.from(selectedDeleteIds);
            await Promise.all(ids.map((id) => classAPI.deleteImage(classId, id)));
            setDetail((prev: any) => ({
              ...prev,
              classImages: (prev?.classImages || []).filter((img: any) => !selectedDeleteIds.has(img.id)),
            }));
            setSelectedDeleteIds(new Set());
            setDeleteMode(false);
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: 'Lỗi',
              text2: error?.message || 'Không thể xóa ảnh',
            });
          }
        },
      },
    ]);
  };

  const ratingSummary = detail?.ratingSummary;

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={`${textSecondary} mt-4 text-lg font-medium`}>Đang tải chi tiết lớp học...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <Text className={textSecondary}>Không tìm thấy lớp học</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }} className="mt-4 px-4 py-2 rounded-lg">
            <Text className={isDark ? 'text-white' : 'text-slate-900'}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
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
            style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9', borderColor: isDark ? '#475569' : '#e2e8f0' }}
            className="p-3 rounded-xl border"
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
          <Text className={`text-2xl font-bold ${textPrimary}`}>Chi tiết lớp</Text>
          <View className="w-12" />
        </View>

        <View style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0' }} className="rounded-xl p-5 border mb-5">
          <Text className={`text-2xl font-bold ${textPrimary} mb-2`}>{detail.name}</Text>
          <Text className={`${textSecondary} mb-3`}>{detail.description || 'Chưa có mô tả'}</Text>
          <Text className={textMuted}>Sức chứa: {detail.capacity}</Text>
          <Text className={textMuted}>Thời lượng: {detail.duration} phút</Text>
        </View>

        <View style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0' }} className="rounded-xl p-5 border mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-lg font-semibold ${textPrimary}`}>Ảnh lớp học</Text>
            {classImages.length > 0 && (
              <View className="flex-row items-center">
                {deleteMode && selectedDeleteIds.size > 0 ? (
                  <TouchableOpacity
                    onPress={handleDeleteSelectedImages}
                    className="mr-3 bg-red-600/20 border border-red-500/40 px-3 py-1 rounded-full"
                  >
                    <Text className="text-red-300 text-xs font-semibold">Xóa đã chọn</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={() => {
                    setDeleteMode((prev) => !prev);
                    setSelectedDeleteIds(new Set());
                  }}
                  className="bg-slate-700 border border-slate-600 px-3 py-1 rounded-full"
                >
                  <Text className="text-slate-200 text-xs font-semibold">
                    {deleteMode ? 'Hủy chọn' : 'Chọn nhiều'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {classImages.length === 0 ? (
            <Text className="text-slate-400">Chưa có ảnh</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {classImages.map((img: any, idx: number) => (
                <View key={img.id} className="mr-4">
                  <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        if (deleteMode) {
                          toggleDeleteSelection(img.id);
                          return;
                        }
                        setGalleryIndex(idx);
                        setGalleryVisible(true);
                      }}
                    >
                      <Image source={{ uri: img.url }} style={{ width: 220, height: 140 }} />
                    </TouchableOpacity>
                    <View className="p-3 flex-row items-center justify-between">
                      <Text className="text-slate-400 text-xs flex-1" numberOfLines={1}>
                        {img.caption || 'Không có mô tả'}
                      </Text>
                      {deleteMode ? (
                        <TouchableOpacity onPress={() => toggleDeleteSelection(img.id)}>
                          <Ionicons
                            name={selectedDeleteIds.has(img.id) ? 'checkbox' : 'square-outline'}
                            size={16}
                            color={selectedDeleteIds.has(img.id) ? '#22c55e' : '#94a3b8'}
                          />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => handleDeleteImage(img.id)}>
                          <Ionicons name="trash" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View className="mt-4">
            <Text className="text-slate-300 mb-2">Thêm ảnh mới</Text>
            {selectedImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {selectedImages.map((img, idx) => (
                  <View key={`${img.uri}-${idx}`} className="mr-3">
                    <View className="relative">
                      <Image source={{ uri: img.uri }} style={{ width: 120, height: 80, borderRadius: 10 }} />
                      <TouchableOpacity
                        onPress={() => handleRemoveSelectedImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <TextInput
              className="bg-slate-700 text-white rounded-lg px-4 py-3 mb-3"
              placeholder="Nhập URL ảnh hoặc chọn từ thư viện"
              placeholderTextColor="#94a3b8"
              value={imageUrl}
              onChangeText={setImageUrl}
            />
            {imageUrl ? (
              <View className="mb-3">
                <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 120, borderRadius: 10 }} />
              </View>
            ) : null}
            <TextInput
              className="bg-slate-700 text-white rounded-lg px-4 py-3 mb-3"
              placeholder="Ghi chú ảnh (tuỳ chọn)"
              placeholderTextColor="#94a3b8"
              value={imageCaption}
              onChangeText={setImageCaption}
            />
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={pickImageAndUpload}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Chọn ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={takePhoto}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUploadImage}
                disabled={uploading}
                className={`flex-1 rounded-lg py-3 items-center ${uploading ? 'bg-slate-600' : 'bg-blue-600'}`}
              >
                <Text className="text-white font-semibold">{uploading ? 'Đang tải...' : 'Tải lên'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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

        <View className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-5">
          <Text className="text-lg font-semibold text-white mb-3">Đánh giá lớp</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-white">
              {ratingSummary?.average?.toFixed(1) || '0.0'}
            </Text>
            <Text className="text-slate-400">{ratingSummary?.count || 0} đánh giá</Text>
          </View>
        </View>

        <View className="mb-10">
          <Text className="text-lg font-semibold text-white mb-3">Review từ học viên</Text>
          {reviews.length === 0 ? (
            <View className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <Text className="text-slate-400">Chưa có đánh giá nào</Text>
            </View>
          ) : (
            reviews.map((review: any) => (
              <View key={review.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-semibold">{review.student?.fullName || 'Học viên'}</Text>
                  <StarRow rating={review.rating} />
                </View>
                {review.comment ? (
                  <Text className="text-slate-300 mt-2">{review.comment}</Text>
                ) : (
                  <Text className="text-slate-500 mt-2">(Không có bình luận)</Text>
                )}

                <View className="mt-4 bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <Text className="text-slate-300 text-sm mb-2">Phản hồi của giáo viên</Text>
                  {review.replyText ? (
                    <Text className="text-slate-100 mb-3">{review.replyText}</Text>
                  ) : (
                    <Text className="text-slate-500 mb-3">Chưa có phản hồi</Text>
                  )}
                  <TextInput
                    className="bg-slate-800 text-white rounded-lg px-3 py-2"
                    placeholder="Nhập phản hồi..."
                    placeholderTextColor="#94a3b8"
                    value={replyDrafts[review.id] ?? review.replyText ?? ''}
                    onChangeText={(text) =>
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [review.id]: text,
                      }))
                    }
                    multiline
                  />
                  <TouchableOpacity
                    onPress={() => handleReply(review.id)}
                    disabled={submitting === review.id}
                    className={`mt-3 rounded-lg py-2 items-center ${
                      submitting === review.id ? 'bg-slate-600' : 'bg-blue-600'
                    }`}
                  >
                    <Text className="text-white font-semibold">
                      {submitting === review.id ? 'Đang gửi...' : 'Gửi phản hồi'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
