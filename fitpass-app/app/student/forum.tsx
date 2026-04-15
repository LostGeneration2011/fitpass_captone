import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing';
import { forumAPI, getAPIUrl } from '../../lib/api';
import { useTheme } from '../../lib/theme';
import { getUser } from '../../lib/auth';

type ReactionType = 'LIKE' | 'LOVE' | 'WOW';

type ForumAuthor = {
  id: string;
  fullName: string;
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  avatar?: string | null;
};

type ForumComment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  author?: ForumAuthor;
};

type ForumPost = {
  id: string;
  content: string;
  createdAt: string;
  author?: ForumAuthor;
  _count?: {
    comments?: number;
    reactions?: number;
  };
  reactionSummary?: {
    LIKE?: number;
    LOVE?: number;
    WOW?: number;
  };
  myReaction?: ReactionType | null;
  images?: Array<{
    id: string;
    url: string;
    order: number;
  }>;
  comments?: ForumComment[];
};

const MAX_IMAGES_PER_POST = 4;

const REACTION_OPTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: 'LIKE', emoji: '👍', label: 'Like' },
  { type: 'LOVE', emoji: '❤️', label: 'Love' },
  { type: 'WOW', emoji: '😮', label: 'Wow' },
];

const REPORT_REASONS: Array<{ value: string; label: string; iconName: React.ComponentProps<typeof MaterialIcons>['name'] }> = [
  { value: 'SPAM', label: 'Spam / quảng cáo', iconName: 'campaign' },
  { value: 'HARASSMENT', label: 'Quấy rối / bắt nạt', iconName: 'report-problem' },
  { value: 'INAPPROPRIATE', label: 'Nội dung không phù hợp', iconName: 'block' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch', iconName: 'fact-check' },
  { value: 'OTHER', label: 'Lý do khác', iconName: 'chat-bubble-outline' },
];

const formatDateTime = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN');
};

const getInitials = (fullName?: string) => {
  const normalized = (fullName || 'Thành viên').trim();
  if (!normalized) return 'TV';
  const parts = normalized.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || 'T';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || 'V';
  return `${first}${last}`.toUpperCase();
};

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'TEACHER':
      return 'Giáo viên';
    case 'ADMIN':
      return 'Quản trị';
    default:
      return 'Học viên';
  }
};

const mergeUnique = (items: string[]) => {
  return Array.from(new Set(items.filter(Boolean)));
};

export default function StudentForumScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('Bạn');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingPost, setUpdatingPost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [detailCommentText, setDetailCommentText] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPost, setDetailPost] = useState<ForumPost | null>(null);
  const [isEditingDetailPost, setIsEditingDetailPost] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [editingExistingImageUrls, setEditingExistingImageUrls] = useState<string[]>([]);
  const [editingNewImages, setEditingNewImages] = useState<string[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const reactionDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetail, setReportDetail] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<Array<{ uri: string }>>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const uploadBaseUrl = getAPIUrl().replace(/\/api$/, '');
  const toDisplayImageUrl = useCallback(
    (url: string) =>
      url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')
        ? url
        : `${uploadBaseUrl}${url}`,
    [uploadBaseUrl]
  );

  const openImageGallery = useCallback(
    (imageUrls: string[], initialIndex: number) => {
      const normalized = imageUrls.map((url) => toDisplayImageUrl(url)).filter(Boolean);
      if (normalized.length === 0) return;

      setGalleryImages(normalized.map((uri) => ({ uri })));
      setGalleryIndex(Math.max(0, Math.min(initialIndex, normalized.length - 1)));
      setGalleryVisible(true);
    },
    [toDisplayImageUrl]
  );

  const openAuthorProfile = useCallback(
    (author?: ForumAuthor) => {
      if (!author?.id) return;

      const navigateToProfile = () => {
        if (typeof navigation?.push === 'function') {
          navigation.push('ForumProfile', { userId: author.id });
          return;
        }

        navigation?.navigate?.('ForumProfile', { userId: author.id });
      };

      if (detailVisible) {
        setDetailVisible(false);
        setTimeout(navigateToProfile, 120);
        return;
      }

      navigateToProfile();
    },
    [detailVisible, navigation]
  );

  const renderAuthorMeta = (author?: ForumAuthor, createdAt?: string, compact = false) => {
    const avatarSize = compact ? 32 : 38;

    return (
      <TouchableOpacity
        disabled={!author?.id}
        onPress={() => openAuthorProfile(author)}
        activeOpacity={author?.id ? 0.85 : 1}
        style={[styles.row, { flex: compact ? 0 : 1, alignItems: 'center' }]}
      >
        {author?.avatar ? (
          <Image
            source={{ uri: toDisplayImageUrl(author.avatar) }}
            style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              compact
                ? { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
                : null,
            ]}
          >
            <Text style={styles.avatarText}>{getInitials(author?.fullName)}</Text>
          </View>
        )}
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.textPrimary, { fontWeight: '800', fontSize: compact ? 14 : 15 }]}>
            {author?.fullName || 'Thành viên'}
          </Text>
          <View style={[styles.row, { flexWrap: 'wrap' as const }]}>
            {createdAt ? <Text style={styles.textSecondary}>{formatDateTime(createdAt)}</Text> : null}
            {author?.role ? (
              <View style={[styles.helperTag, { paddingHorizontal: 8, paddingVertical: 3 }]}>
                <Text style={styles.helperTagText}>{getRoleLabel(author.role)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: colors.bg.primary },
      container: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24, gap: 14 },
      card: {
        backgroundColor: colors.card.bg,
        borderColor: colors.card.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        shadowColor: colors.card.shadow,
        shadowOpacity: 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      },
      composerCard: {
        backgroundColor: colors.card.bg,
        borderColor: colors.text.accent,
        borderWidth: 1,
        borderRadius: 20,
        padding: 14,
        shadowColor: colors.card.shadow,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
      },
      title: { color: colors.text.primary, fontSize: 22, fontWeight: '800' as const },
      subtitle: { color: colors.text.secondary, fontSize: 13, lineHeight: 19 },
      textPrimary: { color: colors.text.primary },
      textSecondary: { color: colors.text.secondary },
      textMuted: { color: colors.text.muted },
      input: {
        backgroundColor: colors.bg.secondary,
        borderColor: colors.card.border,
        borderWidth: 1,
        borderRadius: 12,
        color: colors.text.primary,
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
      },
      actionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: colors.bg.secondary,
        borderColor: colors.card.border,
        borderWidth: 1,
      },
      actionBtnPrimary: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 11,
        backgroundColor: colors.text.accent,
      },
      actionText: { color: colors.text.primary, fontWeight: '600' as const },
      actionTextPrimary: { color: '#fff', fontWeight: '700' as const },
      row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
      avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: colors.bg.secondary,
        borderColor: colors.card.border,
        borderWidth: 1,
      },
      avatarText: { color: colors.text.primary, fontWeight: '800' as const, fontSize: 13 },
      reactionChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderColor: colors.card.border,
        borderWidth: 1,
        backgroundColor: colors.bg.secondary,
      },
      reactionChipActive: {
        backgroundColor: colors.text.accent,
        borderColor: colors.text.accent,
      },
      reactionText: { color: colors.text.primary, fontWeight: '700' as const, fontSize: 12 },
      reactionTextActive: { color: '#fff' },
      commentCard: {
        backgroundColor: colors.bg.secondary,
        borderColor: colors.card.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
      },
      helperTag: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: colors.bg.secondary,
        borderColor: colors.card.border,
        borderWidth: 1,
      },
      helperTagText: { color: colors.text.secondary, fontSize: 12, fontWeight: '600' as const },
      thinDivider: { height: 1, backgroundColor: colors.card.border, marginVertical: 10 },
    }),
    [colors]
  );

  const pickMultipleImages = async (remainingSlots: number) => {
    const maxSlots = Math.max(0, remainingSlots);
    if (maxSlots <= 0) {
      Toast.show({ type: 'info', text1: `Tối đa ${MAX_IMAGES_PER_POST} ảnh cho mỗi bài` });
      return [] as string[];
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: 'error', text1: 'Bạn cần cấp quyền thư viện ảnh' });
      return [] as string[];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.82,
      selectionLimit: maxSlots,
    } as any);

    if (result.canceled || !Array.isArray(result.assets)) {
      return [] as string[];
    }

    return result.assets.map((asset) => asset.uri).filter(Boolean);
  };

  const uploadLocalImages = async (uris: string[]) => {
    const imageUrls: string[] = [];
    const warningMessages = new Set<string>();

    for (const imageUri of uris) {
      const fileName = imageUri.split('/').pop() || `forum-${Date.now()}.jpg`;
      const ext = fileName.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const formData = new FormData();

      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: mimeType,
      } as any);

      const uploaded = await forumAPI.uploadMedia(formData);
      const warningMessage = uploaded?.warning || uploaded?.data?.warning;
      if (warningMessage) {
        warningMessages.add(warningMessage);
      }
      const uploadedUrl = uploaded?.data?.url || uploaded?.url;
      if (uploadedUrl) {
        imageUrls.push(uploadedUrl);
      }
    }

    if (warningMessages.size) {
      Toast.show({
        type: 'info',
        text1: 'Anh dang dung luu tru du phong',
        text2: Array.from(warningMessages).join(' '),
      });
    }

    return imageUrls;
  };

  const loadFeed = useCallback(async (options?: { append?: boolean; cursor?: string }) => {
    const append = options?.append || false;
    try {
      const response = await forumAPI.getFeed({ limit: 10, cursor: options?.cursor });
      const nextPosts = Array.isArray(response?.data) ? response.data : [];
      if (append) {
        setPosts((prev) => [...prev, ...nextPosts]);
      } else {
        setPosts(nextPosts);
      }
      setNextCursor(response?.paging?.nextCursor || null);
      setHasNextPage(Boolean(response?.paging?.hasNextPage));

      const user = await getUser();
      setCurrentUserId(user?.id || '');
      setCurrentUserName(user?.fullName || 'Bạn');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không tải được cộng đồng',
        text2: error?.message || 'Vui lòng thử lại',
      });
    } finally {
      if (!append) {
        setLoading(false);
        setRefreshing(false);
      }
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeed({ append: false });
    }, [loadFeed])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed({ append: false });
  };

  const onEndReached = () => {
    if (!hasNextPage || !nextCursor || loadingMore || loading) {
      return;
    }
    setLoadingMore(true);
    loadFeed({ append: true, cursor: nextCursor });
  };

  const createPost = async () => {
    try {
      if (!newPostText.trim() && selectedImages.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'Nhập nội dung hoặc chọn ảnh trước khi đăng',
        });
        return;
      }

      setPosting(true);
      const imageUrls = await uploadLocalImages(selectedImages);

      await forumAPI.createPost({ content: newPostText.trim(), imageUrls });
      setNewPostText('');
      setSelectedImages([]);
      await loadFeed({ append: false });
      Toast.show({ type: 'success', text1: 'Đăng bài thành công' });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không thể đăng bài',
        text2: error?.message || 'Vui lòng thử lại',
      });
    } finally {
      setPosting(false);
    }
  };

  const pickImages = async () => {
    try {
      const pickedUris = await pickMultipleImages(MAX_IMAGES_PER_POST - selectedImages.length);
      if (pickedUris.length === 0) return;
      setSelectedImages((prev) => mergeUnique([...prev, ...pickedUris]).slice(0, MAX_IMAGES_PER_POST));
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không thể chọn ảnh',
        text2: error?.message || 'Vui lòng thử lại',
      });
    }
  };

  const removeSelectedImage = (uri: string) => {
    setSelectedImages((prev) => prev.filter((item) => item !== uri));
  };

  const openPostDetail = async (postId: string) => {
    try {
      setDetailVisible(true);
      setDetailLoading(true);
      const response = await forumAPI.getPostDetail(postId);
      const nextDetail = response?.data || null;
      const imageUrls = Array.isArray(nextDetail?.images)
        ? nextDetail.images.map((image: { url: string }) => image.url)
        : [];
      setDetailPost(nextDetail);
      setEditingContent(nextDetail?.content || '');
      setEditingExistingImageUrls(imageUrls);
      setEditingNewImages([]);
      setEditingCommentId(null);
      setEditingCommentText('');
      setIsEditingDetailPost(false);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không tải được chi tiết bài',
        text2: error?.message || 'Vui lòng thử lại',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const pickEditImages = async () => {
    try {
      const usedSlots = editingExistingImageUrls.length + editingNewImages.length;
      const pickedUris = await pickMultipleImages(MAX_IMAGES_PER_POST - usedSlots);
      if (pickedUris.length === 0) return;
      setEditingNewImages((prev) => mergeUnique([...prev, ...pickedUris]).slice(0, MAX_IMAGES_PER_POST));
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không thể chọn ảnh',
        text2: error?.message || 'Vui lòng thử lại',
      });
    }
  };

  const removeExistingDetailImage = (url: string) => {
    setEditingExistingImageUrls((prev) => prev.filter((item) => item !== url));
  };

  const removeNewDetailImage = (uri: string) => {
    setEditingNewImages((prev) => prev.filter((item) => item !== uri));
  };

  const beginEditDetailPost = () => {
    if (!detailPost) return;
    setEditingContent(detailPost.content || '');
    setEditingExistingImageUrls(Array.isArray(detailPost.images) ? detailPost.images.map((image) => image.url) : []);
    setEditingNewImages([]);
    setIsEditingDetailPost(true);
  };

  const cancelEditDetailPost = () => {
    if (!detailPost) {
      setIsEditingDetailPost(false);
      return;
    }
    setEditingContent(detailPost.content || '');
    setEditingExistingImageUrls(Array.isArray(detailPost.images) ? detailPost.images.map((image) => image.url) : []);
    setEditingNewImages([]);
    setIsEditingDetailPost(false);
  };

  const addCommentInDetail = async () => {
    try {
      if (!detailPost?.id || !detailCommentText.trim()) return;
      const postId = detailPost.id;
      const content = detailCommentText.trim();
      const tempId = `temp-${Date.now()}`;
      const tempComment = {
        id: tempId,
        content,
        createdAt: new Date().toISOString(),
        author: {
          id: currentUserId,
          fullName: currentUserName,
        },
      };

      setDetailPost((prev) => {
        if (!prev || prev.id !== postId) return prev;
        const comments = Array.isArray(prev.comments) ? prev.comments : [];
        return { ...prev, comments: [...comments, tempComment] };
      });
      setPosts((prev) =>
        prev.map((item) =>
          item.id === postId
            ? {
                ...item,
                _count: {
                  ...item._count,
                  comments: (item._count?.comments || 0) + 1,
                },
              }
            : item
        )
      );

      const response = await forumAPI.addComment(postId, content);
      const createdComment = response?.data;
      if (createdComment?.id) {
        setDetailPost((prev) => {
          if (!prev || prev.id !== postId) return prev;
          const comments = Array.isArray(prev.comments) ? prev.comments : [];
          return {
            ...prev,
            comments: comments.map((comment) => (comment.id === tempId ? createdComment : comment)),
          };
        });
      }
      setDetailCommentText('');
    } catch (error: any) {
      if (detailPost?.id) {
        setDetailPost((prev) => {
          if (!prev || !Array.isArray(prev.comments)) return prev;
          return {
            ...prev,
            comments: prev.comments.filter((comment) => !String(comment.id).startsWith('temp-')),
          };
        });
        setPosts((prev) =>
          prev.map((item) =>
            item.id === detailPost.id
              ? {
                  ...item,
                  _count: {
                    ...item._count,
                    comments: Math.max((item._count?.comments || 0) - 1, 0),
                  },
                }
              : item
          )
        );
      }
      Toast.show({
        type: 'error',
        text1: 'Không thể bình luận',
        text2: error?.message || 'Vui lòng thử lại',
      });
    }
  };

  const setReaction = async (postId: string, type: 'LIKE' | 'LOVE' | 'WOW') => {
    let previousReaction: 'LIKE' | 'LOVE' | 'WOW' | null = null;
    let nextReaction: 'LIKE' | 'LOVE' | 'WOW' | null = null;

    const applyReaction = (target: ForumPost) => {
      const previousReaction = target.myReaction || null;
      const nextReaction = previousReaction === type ? null : type;
      const currentSummary = {
        LIKE: target.reactionSummary?.LIKE || 0,
        LOVE: target.reactionSummary?.LOVE || 0,
        WOW: target.reactionSummary?.WOW || 0,
      };

      if (previousReaction) {
        currentSummary[previousReaction] = Math.max(currentSummary[previousReaction] - 1, 0);
      }
      if (nextReaction) {
        currentSummary[nextReaction] = currentSummary[nextReaction] + 1;
      }

      return {
        ...target,
        myReaction: nextReaction,
        reactionSummary: currentSummary,
      };
    };

    setPosts((prev) =>
      prev.map((item) => {
        if (item.id !== postId) return item;
        previousReaction = item.myReaction || null;
        nextReaction = previousReaction === type ? null : type;
        return applyReaction(item);
      })
    );
    setDetailPost((prev) => {
      if (!prev || prev.id !== postId) return prev;
      return applyReaction(prev);
    });

    if (reactionDebounceRef.current[postId]) {
      clearTimeout(reactionDebounceRef.current[postId]);
    }

    reactionDebounceRef.current[postId] = setTimeout(async () => {
      try {
        if (nextReaction) {
          await forumAPI.setReaction(postId, nextReaction);
        } else {
          await forumAPI.removeReaction(postId);
        }
      } catch (error: any) {
        setPosts((prev) =>
          prev.map((item) => {
            if (item.id !== postId) return item;

            const summary = {
              LIKE: item.reactionSummary?.LIKE || 0,
              LOVE: item.reactionSummary?.LOVE || 0,
              WOW: item.reactionSummary?.WOW || 0,
            };

            if (item.myReaction) {
              summary[item.myReaction] = Math.max(summary[item.myReaction] - 1, 0);
            }
            if (previousReaction) {
              summary[previousReaction] = summary[previousReaction] + 1;
            }

            return {
              ...item,
              myReaction: previousReaction,
              reactionSummary: summary,
            };
          })
        );

        setDetailPost((prev) => {
          if (!prev || prev.id !== postId) return prev;
          const summary = {
            LIKE: prev.reactionSummary?.LIKE || 0,
            LOVE: prev.reactionSummary?.LOVE || 0,
            WOW: prev.reactionSummary?.WOW || 0,
          };

          if (prev.myReaction) {
            summary[prev.myReaction] = Math.max(summary[prev.myReaction] - 1, 0);
          }
          if (previousReaction) {
            summary[previousReaction] = summary[previousReaction] + 1;
          }

          return {
            ...prev,
            myReaction: previousReaction,
            reactionSummary: summary,
          };
        });

        Toast.show({
          type: 'error',
          text1: 'Không thể thả cảm xúc',
          text2: error?.message || 'Vui lòng thử lại',
        });
      }
    }, 350);
  };

  const addComment = async (postId: string) => {
    try {
      const trimmed = commentText.trim();
      if (!trimmed) return;
      setPosts((prev) =>
        prev.map((item) =>
          item.id === postId
            ? {
                ...item,
                _count: {
                  ...item._count,
                  comments: (item._count?.comments || 0) + 1,
                },
              }
            : item
        )
      );

      if (detailPost?.id === postId) {
        const tempId = `temp-${Date.now()}`;
        setDetailPost((prev) => {
          if (!prev || prev.id !== postId) return prev;
          const comments = Array.isArray(prev.comments) ? prev.comments : [];
          return {
            ...prev,
            comments: [
              ...comments,
              {
                id: tempId,
                content: trimmed,
                createdAt: new Date().toISOString(),
                author: {
                  id: currentUserId,
                  fullName: currentUserName,
                },
              },
            ],
          };
        });
      }

      await forumAPI.addComment(postId, trimmed);
      setCommentText('');
      setCommentingPostId(null);
    } catch (error: any) {
      setPosts((prev) =>
        prev.map((item) =>
          item.id === postId
            ? {
                ...item,
                _count: {
                  ...item._count,
                  comments: Math.max((item._count?.comments || 0) - 1, 0),
                },
              }
            : item
        )
      );
      if (detailPost?.id === postId) {
        setDetailPost((prev) => {
          if (!prev || !Array.isArray(prev.comments)) return prev;
          return {
            ...prev,
            comments: prev.comments.filter((comment) => !String(comment.id).startsWith('temp-')),
          };
        });
      }
      Toast.show({
        type: 'error',
        text1: 'Không thể bình luận',
        text2: error?.message || 'Vui lòng thử lại',
      });
    }
  };

  const deleteCommentInDetail = async (commentId: string) => {
    if (!detailPost?.id) return;

    const postId = detailPost.id;
    const previousDetail = detailPost;

    setDetailPost((prev) => {
      if (!prev || !Array.isArray(prev.comments)) return prev;
      return {
        ...prev,
        comments: prev.comments.filter((comment) => comment.id !== commentId),
      };
    });
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              _count: {
                ...item._count,
                comments: Math.max((item._count?.comments || 0) - 1, 0),
              },
            }
          : item
      )
    );

    try {
      await forumAPI.deleteComment(commentId);
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentText('');
      }
      Toast.show({ type: 'success', text1: 'Đã xóa bình luận' });
    } catch (error: any) {
      setDetailPost(previousDetail);
      setPosts((prev) =>
        prev.map((item) =>
          item.id === postId
            ? {
                ...item,
                _count: {
                  ...item._count,
                  comments: (item._count?.comments || 0) + 1,
                },
              }
            : item
        )
      );
      Toast.show({
        type: 'error',
        text1: 'Không thể xóa bình luận',
        text2: error?.message || 'Vui lòng thử lại',
      });
    }
  };

  const beginEditComment = (comment: ForumComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content || '');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const updateCommentInDetail = async (commentId: string) => {
    try {
      const content = editingCommentText.trim();
      if (!content) {
        Toast.show({ type: 'info', text1: 'Nội dung bình luận không được để trống' });
        return;
      }

      setUpdatingCommentId(commentId);
      const response = await forumAPI.updateComment(commentId, content);
      const updatedComment = response?.data;

      setDetailPost((prev) => {
        if (!prev || !Array.isArray(prev.comments)) return prev;
        return {
          ...prev,
          comments: prev.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  ...(updatedComment || {}),
                  content,
                }
              : comment
          ),
        };
      });

      setEditingCommentId(null);
      setEditingCommentText('');
      Toast.show({ type: 'success', text1: 'Đã cập nhật bình luận' });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không thể cập nhật bình luận',
        text2: error?.message || 'Vui lòng thử lại',
      });
    } finally {
      setUpdatingCommentId(null);
    }
  };

  const deletePost = async (postId: string) => {
    Alert.alert('Xóa bài viết', 'Bạn có chắc muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await forumAPI.deletePost(postId);
            if (detailPost?.id === postId) {
              setDetailVisible(false);
            }
            await loadFeed({ append: false });
            Toast.show({ type: 'success', text1: 'Đã xóa bài viết' });
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: 'Không thể xóa bài viết',
              text2: error?.message || 'Vui lòng thử lại',
            });
          }
        },
      },
    ]);
  };

  const updateDetailPost = async () => {
    try {
      if (!detailPost?.id) return;
      const nextContent = editingContent.trim();
      const uploadedUrls = await uploadLocalImages(editingNewImages);
      const finalImageUrls = [...editingExistingImageUrls, ...uploadedUrls].slice(0, MAX_IMAGES_PER_POST);

      if (!nextContent && finalImageUrls.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'Bài viết cần có nội dung hoặc ít nhất 1 ảnh',
        });
        return;
      }

      setUpdatingPost(true);
      await forumAPI.updatePost(detailPost.id, {
        content: nextContent,
        imageUrls: finalImageUrls,
      });
      await openPostDetail(detailPost.id);
      await loadFeed({ append: false });
      Toast.show({ type: 'success', text1: 'Đã cập nhật bài viết' });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không thể cập nhật bài viết',
        text2: error?.message || 'Vui lòng thử lại',
      });
    } finally {
      setUpdatingPost(false);
    }
  };

  const openReportModal = (type: 'post' | 'comment', id: string) => {
    setReportTarget({ type, id });
    setReportReason('');
    setReportDetail('');
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (!reportTarget || !reportReason) return;
    try {
      setSubmittingReport(true);
      if (reportTarget.type === 'post') {
        await forumAPI.reportPost(reportTarget.id, reportReason, reportDetail.trim() || undefined);
      } else {
        await forumAPI.reportComment(reportTarget.id, reportReason, reportDetail.trim() || undefined);
      }
      setReportModalVisible(false);
      Toast.show({ type: 'success', text1: 'Báo cáo đã được gửi', text2: 'Quản trị viên sẽ xem xét sớm nhất.' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Không thể gửi báo cáo', text2: error?.message || 'Vui lòng thử lại' });
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={styles.card}>
            <View style={{ height: 22, width: 120, borderRadius: 6, backgroundColor: colors.bg.secondary, marginBottom: 10 }} />
            <View style={{ height: 18, width: '100%', borderRadius: 6, backgroundColor: colors.bg.secondary, marginBottom: 8 }} />
            <View style={{ height: 18, width: '70%', borderRadius: 6, backgroundColor: colors.bg.secondary }} />
          </View>
          {[1, 2, 3].map((index) => (
            <View key={index} style={styles.card}>
              <View style={{ height: 16, width: 120, borderRadius: 6, backgroundColor: colors.bg.secondary, marginBottom: 8 }} />
              <View style={{ height: 14, width: 180, borderRadius: 6, backgroundColor: colors.bg.secondary, marginBottom: 10 }} />
              <View style={{ height: 16, width: '100%', borderRadius: 6, backgroundColor: colors.bg.secondary, marginBottom: 8 }} />
              <View style={{ height: 16, width: '85%', borderRadius: 6, backgroundColor: colors.bg.secondary }} />
            </View>
          ))}
          <View style={{ alignItems: 'center', paddingTop: 6 }}>
            <ActivityIndicator size="small" color={colors.text.accent} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator size="small" color={colors.text.accent} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.composerCard}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}> 
              <View>
                <Text style={styles.title}>Community Feed</Text>
                <Text style={styles.subtitle}>Góc chia sẻ của học viên và giáo viên, cập nhật nhanh theo thời gian thực.</Text>
              </View>
              <View style={styles.helperTag}>
                <Text style={styles.helperTagText}>{selectedImages.length}/{MAX_IMAGES_PER_POST} ảnh</Text>
              </View>
            </View>
            <View style={{ height: 10 }} />
            <TextInput
              value={newPostText}
              onChangeText={setNewPostText}
              placeholder="Bạn đang nghĩ gì hôm nay?"
              placeholderTextColor={colors.text.muted}
              style={[styles.input, { minHeight: 90 }]}
              multiline
            />
            <View style={{ height: 10 }} />
            {selectedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.row}>
                  {selectedImages.map((imageUri) => (
                    <View key={imageUri}>
                      <Image
                        source={{ uri: imageUri }}
                        style={{ width: 84, height: 84, borderRadius: 12, marginRight: 8 }}
                      />
                      <TouchableOpacity
                        onPress={() => removeSelectedImage(imageUri)}
                        style={{ position: 'absolute', right: 6, top: 6, backgroundColor: '#0008', borderRadius: 12, paddingHorizontal: 6 }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12 }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            <View style={{ height: 10 }} />
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <TouchableOpacity style={styles.actionBtn} onPress={pickImages}>
                <Text style={styles.actionText}>Thêm nhiều ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnPrimary} onPress={createPost} disabled={posting}>
                <Text style={styles.actionTextPrimary}>{posting ? 'Đang đăng...' : 'Đăng status'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.row, { alignItems: 'flex-start', justifyContent: 'space-between' }]}>
              {renderAuthorMeta(item.author, item.createdAt)}
              <View style={styles.helperTag}>
                <Text style={styles.helperTagText}>💬 {item._count?.comments || 0}</Text>
              </View>
            </View>
            <View style={{ height: 8 }} />
            <Text style={[styles.textPrimary, { lineHeight: 22, fontSize: 14 }]}>{item.content}</Text>
            {Array.isArray(item.images) && item.images.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {item.images.map((image, imageIndex) => (
                    <TouchableOpacity
                      key={image.id}
                      activeOpacity={0.9}
                      onPress={() => openImageGallery(item.images!.map((img) => img.url), imageIndex)}
                    >
                      <Image
                        source={{ uri: toDisplayImageUrl(image.url) }}
                        style={{ width: item.images!.length > 1 ? 138 : 220, height: item.images!.length > 1 ? 138 : 220, borderRadius: 14, marginRight: 10 }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.thinDivider} />

            <View style={[styles.row, { flexWrap: 'wrap' as const }]}>
              {REACTION_OPTIONS.map((reaction) => {
                const active = item.myReaction === reaction.type;
                const count = item.reactionSummary?.[reaction.type] || 0;
                return (
                  <TouchableOpacity
                    key={reaction.type}
                    style={[styles.reactionChip, active && styles.reactionChipActive]}
                    onPress={() => setReaction(item.id, reaction.type)}
                  >
                    <Text style={[styles.reactionText, active && styles.reactionTextActive]}>
                      {reaction.emoji} {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 8 }} />
            <TouchableOpacity style={styles.actionBtn} onPress={() => openPostDetail(item.id)}>
              <Text style={styles.actionText}>Xem chi tiết</Text>
            </TouchableOpacity>

            {item.author?.id === currentUserId && (
              <>
                <View style={{ height: 8 }} />
                <TouchableOpacity style={styles.actionBtn} onPress={() => deletePost(item.id)}>
                  <Text style={[styles.actionText, { color: '#dc2626' }]}>Xóa bài viết</Text>
                </TouchableOpacity>
              </>
            )}
            {item.author?.id && item.author.id !== currentUserId && (
              <>
                <View style={{ height: 8 }} />
                <TouchableOpacity style={styles.actionBtn} onPress={() => openReportModal('post', item.id)}>
                  <View style={styles.row}>
                    <MaterialIcons name="report-problem" size={16} color="#f59e0b" />
                    <Text style={[styles.actionText, { color: '#f59e0b' }]}>Báo cáo</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            <View style={{ height: 10 }} />
            {commentingPostId === item.id ? (
              <View style={styles.row}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Viết bình luận..."
                  placeholderTextColor={colors.text.muted}
                  style={[styles.input, { flex: 1, minHeight: 40 }]}
                />
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => addComment(item.id)}>
                  <Text style={styles.actionTextPrimary}>Gửi</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentingPostId(item.id)}>
                <Text style={styles.actionText}>Bình luận</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal visible={detailVisible} animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <SafeAreaView style={styles.screen}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, alignItems: 'center' }}>
            <Text style={styles.title}>Chi tiết bài viết</Text>
            <TouchableOpacity onPress={() => setDetailVisible(false)}>
              <Text style={styles.actionText}>Đóng</Text>
            </TouchableOpacity>
          </View>
          {detailLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.text.accent} />
            </View>
          ) : detailPost ? (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              <View style={styles.card}>
                {renderAuthorMeta(detailPost.author, detailPost.createdAt)}
                <View style={{ height: 8 }} />
                {isEditingDetailPost ? (
                  <>
                    <TextInput
                      value={editingContent}
                      onChangeText={setEditingContent}
                      placeholder="Nội dung bài viết"
                      placeholderTextColor={colors.text.muted}
                      style={[styles.input, { minHeight: 90 }]}
                      multiline
                    />
                    <View style={{ height: 8 }} />
                    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}> 
                      <View style={styles.helperTag}>
                        <Text style={styles.helperTagText}>
                          {(editingExistingImageUrls.length + editingNewImages.length)}/{MAX_IMAGES_PER_POST} ảnh
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.actionBtn} onPress={pickEditImages}>
                        <Text style={styles.actionText}>Thêm ảnh</Text>
                      </TouchableOpacity>
                    </View>

                    {(editingExistingImageUrls.length > 0 || editingNewImages.length > 0) && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.row}>
                          {editingExistingImageUrls.map((url) => (
                            <View key={`existing-${url}`}>
                              <Image
                                source={{ uri: toDisplayImageUrl(url) }}
                                style={{ width: 96, height: 96, borderRadius: 12, marginRight: 8 }}
                              />
                              <TouchableOpacity
                                onPress={() => removeExistingDetailImage(url)}
                                style={{ position: 'absolute', right: 6, top: 6, backgroundColor: '#0008', borderRadius: 12, paddingHorizontal: 6 }}
                              >
                                <Text style={{ color: '#fff', fontSize: 12 }}>×</Text>
                              </TouchableOpacity>
                            </View>
                          ))}

                          {editingNewImages.map((uri) => (
                            <View key={`new-${uri}`}>
                              <Image
                                source={{ uri }}
                                style={{ width: 96, height: 96, borderRadius: 12, marginRight: 8 }}
                              />
                              <TouchableOpacity
                                onPress={() => removeNewDetailImage(uri)}
                                style={{ position: 'absolute', right: 6, top: 6, backgroundColor: '#0008', borderRadius: 12, paddingHorizontal: 6 }}
                              >
                                <Text style={{ color: '#fff', fontSize: 12 }}>×</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    )}

                    <View style={{ height: 8 }} />
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={cancelEditDetailPost}
                      >
                        <Text style={styles.actionText}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtnPrimary} onPress={updateDetailPost} disabled={updatingPost}>
                        <Text style={styles.actionTextPrimary}>{updatingPost ? 'Đang lưu...' : 'Lưu'}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <Text style={styles.textPrimary}>{detailPost.content}</Text>
                )}
                {Array.isArray(detailPost.images) && detailPost.images.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    {detailPost.images.map((image, imageIndex) => (
                      <TouchableOpacity
                        key={image.id}
                        activeOpacity={0.95}
                        onPress={() => openImageGallery(detailPost.images!.map((img) => img.url), imageIndex)}
                      >
                        <Image
                          source={{ uri: toDisplayImageUrl(image.url) }}
                          style={{ width: '100%', height: 220, borderRadius: 10, marginBottom: 8 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {detailPost.author?.id === currentUserId && !isEditingDetailPost && (
                  <>
                    <View style={{ height: 10 }} />
                    <View style={styles.row}>
                      <TouchableOpacity style={styles.actionBtn} onPress={beginEditDetailPost}>
                        <Text style={styles.actionText}>Sửa bài viết</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => deletePost(detailPost.id)}>
                        <Text style={[styles.actionText, { color: '#dc2626' }]}>Xóa bài viết</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                {detailPost.author?.id && detailPost.author.id !== currentUserId && !isEditingDetailPost && (
                  <>
                    <View style={{ height: 10 }} />
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openReportModal('post', detailPost.id)}>
                      <View style={styles.row}>
                        <MaterialIcons name="report-problem" size={16} color="#f59e0b" />
                        <Text style={[styles.actionText, { color: '#f59e0b' }]}>Báo cáo bài viết này</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.card}>
                <Text style={[styles.textPrimary, { fontWeight: '700', marginBottom: 8 }]}>Bình luận</Text>
                {Array.isArray(detailPost.comments) && detailPost.comments.length > 0 ? (
                  detailPost.comments.map((comment) => (
                    <View key={comment.id} style={[styles.commentCard, { marginBottom: 10 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {renderAuthorMeta(comment.author, undefined, true)}
                        {comment.author?.id === currentUserId && (
                          <View style={styles.row}>
                            <TouchableOpacity onPress={() => beginEditComment(comment)}>
                              <Text style={[styles.actionText, { color: colors.text.accent }]}>Sửa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteCommentInDetail(comment.id)}>
                              <Text style={[styles.actionText, { color: '#dc2626' }]}>Xóa</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {comment.author?.id && comment.author.id !== currentUserId && (
                          <TouchableOpacity onPress={() => openReportModal('comment', comment.id)}>
                            <View style={styles.row}>
                              <MaterialIcons name="report-problem" size={14} color="#f59e0b" />
                              <Text style={[styles.actionText, { color: '#f59e0b', fontSize: 12 }]}>Báo cáo</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.textSecondary}>
                        {formatDateTime(comment.createdAt)}
                        {comment.updatedAt && comment.updatedAt !== comment.createdAt ? ' • đã sửa' : ''}
                      </Text>

                      {editingCommentId === comment.id ? (
                        <>
                          <TextInput
                            value={editingCommentText}
                            onChangeText={setEditingCommentText}
                            placeholder="Sửa bình luận..."
                            placeholderTextColor={colors.text.muted}
                            style={[styles.input, { minHeight: 40, marginTop: 6 }]}
                          />
                          <View style={[styles.row, { marginTop: 8 }]}> 
                            <TouchableOpacity style={styles.actionBtn} onPress={cancelEditComment}>
                              <Text style={styles.actionText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionBtnPrimary}
                              onPress={() => updateCommentInDetail(comment.id)}
                              disabled={updatingCommentId === comment.id}
                            >
                              <Text style={styles.actionTextPrimary}>
                                {updatingCommentId === comment.id ? 'Đang lưu...' : 'Lưu'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <Text style={[styles.textPrimary, { marginTop: 2 }]}>{comment.content}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.textSecondary}>Chưa có bình luận.</Text>
                )}

                <View style={{ height: 8 }} />
                <View style={styles.row}>
                  <TextInput
                    value={detailCommentText}
                    onChangeText={setDetailCommentText}
                    placeholder="Viết bình luận..."
                    placeholderTextColor={colors.text.muted}
                    style={[styles.input, { flex: 1, minHeight: 40 }]}
                  />
                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={addCommentInDetail}>
                    <Text style={styles.actionTextPrimary}>Gửi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={styles.textSecondary}>Không có dữ liệu bài viết</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <ImageViewing
        images={galleryImages}
        imageIndex={galleryIndex}
        visible={galleryVisible}
        onRequestClose={() => setGalleryVisible(false)}
        onImageIndexChange={(index) => setGalleryIndex(index)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />

      {/* Report modal */}
      <Modal visible={reportModalVisible} animationType="slide" transparent onRequestClose={() => setReportModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 }}>
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
              <Text style={[styles.title, { fontSize: 18 }]}>Báo cáo nội dung</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text style={styles.actionText}>Hủy</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.textSecondary, { marginBottom: 10 }]}>Chọn lý do báo cáo:</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setReportReason(r.value)}
                style={[
                  styles.actionBtn,
                  {
                    marginBottom: 8,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    borderColor: reportReason === r.value ? colors.text.accent : colors.card.border,
                  },
                ]}
              >
                <View style={styles.row}>
                  <MaterialIcons
                    name={r.iconName}
                    size={16}
                    color={reportReason === r.value ? colors.text.accent : colors.text.primary}
                  />
                  <Text style={[styles.actionText, reportReason === r.value && { color: colors.text.accent, fontWeight: '700' }]}>
                    {r.label}
                  </Text>
                </View>
                {reportReason === r.value ? <Text style={{ color: colors.text.accent, fontWeight: '700' }}>✓</Text> : null}
              </TouchableOpacity>
            ))}
            <View style={{ height: 8 }} />
            <TextInput
              value={reportDetail}
              onChangeText={setReportDetail}
              placeholder="Mô tả thêm (tùy chọn)…"
              placeholderTextColor={colors.text.muted}
              style={[styles.input, { minHeight: 70 }]}
              multiline
              maxLength={500}
            />
            <View style={{ height: 14 }} />
            <TouchableOpacity
              style={[styles.actionBtnPrimary, { opacity: !reportReason ? 0.5 : 1 }]}
              onPress={submitReport}
              disabled={!reportReason || submittingReport}
            >
              <Text style={styles.actionTextPrimary}>{submittingReport ? 'Đang gửi...' : 'Gửi báo cáo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
