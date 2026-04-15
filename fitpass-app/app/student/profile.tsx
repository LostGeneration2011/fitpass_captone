import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getUser, removeToken, removeUser, User } from '../../lib/auth';
import { classAPI, sessionsAPI, enrollmentAPI, apiGet, apiPatch, authAPI, forumAPI } from '../../lib/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../lib/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ThemeToggle from '../../components/ThemeToggle';
import ThemeSettings from '../../components/ThemeSettings';

type StudentSettingKey = 'notifications' | 'autoReminder' | 'showProgress' | 'darkMode';

export default function StudentProfileScreen() {
  const navigation = useNavigation();
  const { colors, isDark, theme, setTheme } = useTheme();
  
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSessions: 0,
    attendedSessions: 0,
    attendanceRate: 0
  });
  const [classHistory, setClassHistory] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [statsRange, setStatsRange] = useState<'7D' | '30D' | 'ALL'>('30D');
  const [settings, setSettings] = useState({
    notifications: true,
    autoReminder: true,
    showProgress: true,
    darkMode: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(4);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DROPPED'>('ALL');
  const [reviewCount, setReviewCount] = useState(0);

  // Class names for NativeWind
  const screenClass = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardClass = isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const extractWarningMessage = (payload: any) => payload?.warning || payload?.data?.warning || '';

  const showUploadWarning = (payload: any) => {
    const warningMessage = extractWarningMessage(payload);
    if (warningMessage) {
      Toast.show({
        type: 'info',
        text1: 'Anh dang dung luu tru du phong',
        text2: warningMessage,
      });
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg.primary,
    },
    header: {
      backgroundColor: colors.bg.secondary,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    cardBg: {
      backgroundColor: colors.card.bg,
      borderColor: colors.card.border,
    },
    textPrimary: {
      color: colors.text.primary,
    },
    textSecondary: {
      color: colors.text.secondary,
    },
    textMuted: {
      color: colors.text.muted,
    },
    textAccent: {
      color: colors.text.accent,
    },
  }), [colors]);


  useEffect(() => {
    loadUserData();
    loadSettings();
    loadAvatar();
  }, []);

  useEffect(() => {
    setSettings((prev) => ({ ...prev, darkMode: isDark }));
  }, [isDark]);

  useEffect(() => {
    setVisibleHistoryCount(4);
  }, [classHistory.length, historyFilter]);

  // Auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Profile screen focused, refreshing data...');
      loadUserData();
    }, [])
  );

  const loadSettings = async () => {
    let localSettings = settings;
    try {
      const savedSettings = await AsyncStorage.getItem('student_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        localSettings = parsedSettings;
        setSettings(parsedSettings);
        console.log('✅ Loaded settings from storage:', parsedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    try {
      const response = await authAPI.getPreferences();
      const serverData = response?.data || response;

      if (
        typeof serverData?.notificationEnabled === 'boolean' ||
        typeof serverData?.autoReminderEnabled === 'boolean'
      ) {
        const mergedSettings = {
          ...localSettings,
          notifications:
            typeof serverData.notificationEnabled === 'boolean'
              ? serverData.notificationEnabled
              : localSettings.notifications,
          autoReminder:
            typeof serverData.autoReminderEnabled === 'boolean'
              ? serverData.autoReminderEnabled
              : localSettings.autoReminder,
        };

        setSettings(mergedSettings);
        await saveSettings(mergedSettings);
      }
    } catch (error) {
      console.warn('Failed to sync student preferences from backend:', error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await AsyncStorage.setItem('student_settings', JSON.stringify(newSettings));
      console.log('✅ Settings saved to storage:', newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi lưu cài đặt',
        text2: 'Không thể lưu cài đặt. Vui lòng thử lại.',
      });
    }
  };

  const loadAvatar = async () => {
    try {
      const currentUser = await getUser();
      if (currentUser?.id) {
        const avatarKey = `student_avatar_${currentUser.id}`;
        const savedAvatar = await AsyncStorage.getItem(avatarKey);
        if (savedAvatar) {
          setAvatarUri(savedAvatar);
          console.log('✅ Loaded avatar from storage for user:', currentUser.id);
        }
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
  };

  const saveAvatar = async (uri: string) => {
    try {
      const currentUser = await getUser();
      if (currentUser?.id) {
        const avatarKey = `student_avatar_${currentUser.id}`;
        await AsyncStorage.setItem(avatarKey, uri);
        console.log('✅ Avatar saved to storage for user:', currentUser.id);
      }
    } catch (error) {
      console.error('Error saving avatar:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi lưu ảnh',
        text2: 'Không thể lưu ảnh đại diện. Vui lòng thử lại.',
      });
    }
  };

  const toAvatarPayload = async (uri?: string | null): Promise<string | null | undefined> => {
    if (typeof uri === 'undefined') return undefined;
    if (uri === null) return null;
    if (!uri) return undefined;
    if (uri.startsWith('data:image/')) return uri;
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });

    const normalizedUri = uri.toLowerCase();
    const mime = normalizedUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  };

  const buildAvatarPayloadFromAsset = (asset?: ImagePicker.ImagePickerAsset | null): string | undefined => {
    if (!asset?.base64) return undefined;
    const mimeType = asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg';
    return `data:${mimeType};base64,${asset.base64}`;
  };

  const updateCachedUser = async (next: User) => {
    setUser(next);
    await AsyncStorage.setItem('user', JSON.stringify(next));
  };

  const syncAvatarToServer = async (nextAvatarUri: string | null, explicitAvatarPayload?: string | null) => {
    if (!user?.id) return;

    const avatarPayload = typeof explicitAvatarPayload !== 'undefined'
      ? explicitAvatarPayload
      : await toAvatarPayload(nextAvatarUri);
    const response = await apiPatch('/auth/me', { avatar: avatarPayload });

    const persistedAvatar = response?.user?.avatar ?? nextAvatarUri ?? undefined;

    const updatedUser = { ...user, avatar: persistedAvatar ?? undefined } as User;
    await updateCachedUser(updatedUser);

    if (persistedAvatar) {
      await saveAvatar(persistedAvatar);
    }

    return { avatar: persistedAvatar ?? null, warning: extractWarningMessage(response) };
  };

  const loadUserData = async () => {
    try {
      const currentUser = await getUser();
      setUser(currentUser);
      setEditedName(currentUser?.fullName || '');
      
      if (currentUser?.id) {
        console.log('🔄 Loading profile statistics for user:', currentUser.id);
        
        try {
          // Load enrollments and attendance directly
          const [enrollmentsRes, attendanceRes] = await Promise.allSettled([
            enrollmentAPI.getByStudent(currentUser.id),
            apiGet(`/attendance?studentId=${currentUser.id}`)
          ]);

          // Enrollments for class count
          let studentEnrollments = [] as any[];
          if (enrollmentsRes.status === 'fulfilled') {
            const allEnrollments = Array.isArray(enrollmentsRes.value)
              ? enrollmentsRes.value
              : (enrollmentsRes.value?.data || []);
            studentEnrollments = allEnrollments.filter((e: any) => e?.studentId === currentUser.id);
          }

          // Attendance for session stats
          let attendances: any[] = [];
          if (attendanceRes.status === 'fulfilled') {
            const payload = attendanceRes.value;
            attendances = Array.isArray(payload)
              ? payload
              : (payload?.attendances || payload?.data || []);
          }

          setAttendanceRecords(attendances);

          const totalSessions = attendances.length;
          const attendedSessions = attendances.filter((a: any) => (a.status || '').toUpperCase() === 'PRESENT').length;
          const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

          const enrollmentByClass = new Map<string, any>();
          studentEnrollments.forEach((enrollment: any) => {
            const classId = enrollment?.class?.id || enrollment?.classId;
            if (!classId) return;
            enrollmentByClass.set(classId, {
              classId,
              className: enrollment?.class?.name || 'Lớp học',
              teacherName: enrollment?.class?.teacher?.fullName || 'Chưa cập nhật',
              enrollmentStatus: String(enrollment?.status || '').toUpperCase(),
              createdAt: enrollment?.createdAt || null,
            });
          });

          const attendanceByClass = new Map<string, { total: number; attended: number; latestAt: string | null }>();
          attendances.forEach((attendance: any) => {
            const classId = attendance?.session?.class?.id;
            if (!classId) return;
            const previous = attendanceByClass.get(classId) || { total: 0, attended: 0, latestAt: null };
            const nextTotal = previous.total + 1;
            const nextAttended = previous.attended + ((attendance?.status || '').toUpperCase() === 'PRESENT' ? 1 : 0);
            const candidateLatest = attendance?.checkedInAt || attendance?.createdAt || attendance?.session?.startTime || null;
            const latestAt = !previous.latestAt
              ? candidateLatest
              : (candidateLatest && new Date(candidateLatest) > new Date(previous.latestAt) ? candidateLatest : previous.latestAt);

            attendanceByClass.set(classId, {
              total: nextTotal,
              attended: nextAttended,
              latestAt,
            });
          });

          const historyItems = Array.from(enrollmentByClass.values()).map((item: any) => {
            const classAttendance = attendanceByClass.get(item.classId) || { total: 0, attended: 0, latestAt: null };
            const rate = classAttendance.total > 0 ? Math.round((classAttendance.attended / classAttendance.total) * 100) : 0;
            const learningStatus = item.enrollmentStatus === 'COMPLETED'
              ? 'COMPLETED'
              : item.enrollmentStatus === 'ACTIVE'
                ? 'ACTIVE'
                : 'DROPPED';

            return {
              classId: item.classId,
              className: item.className,
              teacherName: item.teacherName,
              learningStatus,
              totalSessions: classAttendance.total,
              attendedSessions: classAttendance.attended,
              attendanceRate: rate,
              latestDate: classAttendance.latestAt || item.createdAt,
            };
          }).sort((a: any, b: any) => {
            if (!a.latestDate && !b.latestDate) return 0;
            if (!a.latestDate) return 1;
            if (!b.latestDate) return -1;
            return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
          });

          setClassHistory(historyItems);

          setStats({
            totalClasses: studentEnrollments.length,
            totalSessions,
            attendedSessions,
            attendanceRate
          });

          try {
            const forumProfileRes = await forumAPI.getUserProfile(currentUser.id);
            const forumProfile = forumProfileRes?.data || forumProfileRes || {};
            const totalReviews = Number(forumProfile?.stats?.reviewCount || 0);
            setReviewCount(Number.isFinite(totalReviews) ? totalReviews : 0);
          } catch (reviewError) {
            console.warn('Failed to load review history summary:', reviewError);
            setReviewCount(0);
          }
        } catch (statsError) {
          console.error('Error calculating statistics:', statsError);
          setAttendanceRecords([]);
          setClassHistory([]);
          setReviewCount(0);
          setStats({ totalClasses: 0, totalSessions: 0, attendedSessions: 0, attendanceRate: 0 });
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng.');
      // Set default stats on error
      setStats({
        totalClasses: 0,
        totalSessions: 0,
        attendedSessions: 0,
        attendanceRate: 0
      });
      setAttendanceRecords([]);
      setClassHistory([]);
      setReviewCount(0);
    } finally {
      setLoading(false);
    }
  };
  
  // Settings handlers with feedback and persistence
  const handleSettingToggle = async (settingKey: StudentSettingKey, value: boolean) => {
    const previousSettings = settings;
    const newSettings = { ...settings, [settingKey]: value };
    setSettings(newSettings);
    
    // Save to AsyncStorage
    await saveSettings(newSettings);

    try {
      if (settingKey === 'notifications') {
        await authAPI.updatePreferences({ notificationEnabled: value });
      }

      if (settingKey === 'autoReminder') {
        await authAPI.updatePreferences({ autoReminderEnabled: value });
      }
    } catch (error) {
      console.error('Failed to sync preference:', error);
      setSettings(previousSettings);
      await saveSettings(previousSettings);
      Toast.show({
        type: 'error',
        text1: 'Không thể lưu lên server',
        text2: 'Đã khôi phục cài đặt trước đó.',
      });
      return;
    }

    // For darkMode: directly set theme to light or dark (not system)
    if (settingKey === 'darkMode') {
      await setTheme(value ? 'dark' : 'light');
    }
    
    // Provide user feedback
    const settingNames = {
      notifications: 'Thông báo',
      autoReminder: 'Nhắc nhở tự động', 
      showProgress: 'Hiển thị tiến độ',
      darkMode: 'Chế độ tối'
    };
    
    Toast.show({
      type: value ? 'success' : 'info',
      text1: `${settingNames[settingKey as keyof typeof settingNames]} ${value ? 'bật' : 'tắt'}`,
      text2: 'Cài đặt đã được lưu',
      visibilityTime: 2000,
    });
  };

  const handleChangeAvatar = () => {
    Alert.alert(
      'Thay đổi ảnh đại diện',
      'Chọn nguồn ảnh',
      [
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Toast.show({
                type: 'error',
                text1: 'Cần quyền truy cập',
                text2: 'Vui lòng cấp quyền camera để chụp ảnh.',
              });
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
              base64: true,
            });

            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              try {
                setAvatarUri(uri);
                const avatarPayload = buildAvatarPayloadFromAsset(result.assets[0]);
                const synced = await syncAvatarToServer(uri, avatarPayload);
                setAvatarUri(synced?.avatar ?? uri);
                showUploadWarning(synced);
                Toast.show({
                  type: 'success',
                  text1: 'Thành công',
                  text2: 'Ảnh đại diện đã được cập nhật',
                });
              } catch (error) {
                console.error('Error syncing avatar:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Lỗi cập nhật',
                  text2: 'Không thể đồng bộ ảnh đại diện lên hệ thống.',
                });
              }
            }
          },
        },
        {
          text: 'Chọn từ thư viện',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Toast.show({
                type: 'error',
                text1: 'Cần quyền truy cập',
                text2: 'Vui lòng cấp quyền thư viện ảnh để chọn ảnh.',
              });
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
              base64: true,
            });

            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              try {
                setAvatarUri(uri);
                const avatarPayload = buildAvatarPayloadFromAsset(result.assets[0]);
                const synced = await syncAvatarToServer(uri, avatarPayload);
                setAvatarUri(synced?.avatar ?? uri);
                showUploadWarning(synced);
                Toast.show({
                  type: 'success',
                  text1: 'Thành công',
                  text2: 'Ảnh đại diện đã được cập nhật',
                });
              } catch (error) {
                console.error('Error syncing avatar:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Lỗi cập nhật',
                  text2: 'Không thể đồng bộ ảnh đại diện lên hệ thống.',
                });
              }
            }
          },
        },
        {
          text: 'Xóa ảnh',
          style: 'destructive',
          onPress: async () => {
            const currentUser = await getUser();
            try {
              setAvatarUri(null);
              if (currentUser?.id) {
                const avatarKey = `student_avatar_${currentUser.id}`;
                await AsyncStorage.removeItem(avatarKey);
              }
              const synced = await syncAvatarToServer(null);
              setAvatarUri(synced?.avatar ?? null);
              showUploadWarning(synced);
              Toast.show({
                type: 'info',
                text1: 'Đã xóa',
                text2: 'Ảnh đại diện đã được xóa',
              });
            } catch (error) {
              console.error('Error removing avatar:', error);
              Toast.show({
                type: 'error',
                text1: 'Lỗi cập nhật',
                text2: 'Không thể xóa ảnh đại diện trên hệ thống.',
              });
            }
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleEditProfile = () => {
    setEditedName(user?.fullName || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Tên không được để trống',
      });
      return;
    }

    setIsUpdating(true);
    try {
      if (!user?.id) throw new Error('Không xác định được người dùng');
      // Call backend to update profile
      const avatarPayload = await toAvatarPayload(avatarUri);
      const response = await apiPatch('/auth/me', { fullName: editedName.trim(), avatar: avatarPayload });

      const persistedAvatar = response?.user?.avatar ?? avatarUri ?? undefined;

      // Update local user data
      const updatedUser = {
        ...user,
        fullName: editedName.trim(),
        avatar: persistedAvatar,
      } as User;
      await updateCachedUser(updatedUser);
      if (persistedAvatar) {
        await saveAvatar(persistedAvatar);
      }
      setAvatarUri(persistedAvatar ?? null);
      showUploadWarning(response);

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Thông tin đã được cập nhật',
      });
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi cập nhật',
        text2: 'Không thể cập nhật thông tin. Vui lòng thử lại.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const resetChangePasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const validateNewPassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Mật khẩu mới phải có ít nhất 8 ký tự';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Mật khẩu mới phải có ít nhất 1 chữ hoa';
    }
    if (!/[a-z]/.test(password)) {
      return 'Mật khẩu mới phải có ít nhất 1 chữ thường';
    }
    if (!/[0-9]/.test(password)) {
      return 'Mật khẩu mới phải có ít nhất 1 chữ số';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt';
    }
    return null;
  };

  const handleOpenChangePasswordModal = () => {
    resetChangePasswordForm();
    setChangePasswordModalVisible(true);
  };

  const handleCloseChangePasswordModal = () => {
    if (isChangingPassword) return;
    setChangePasswordModalVisible(false);
    resetChangePasswordForm();
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu thông tin',
        text2: 'Vui lòng nhập đủ mật khẩu hiện tại và mật khẩu mới.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu không khớp',
        text2: 'Mật khẩu xác nhận không trùng với mật khẩu mới.',
      });
      return;
    }

    if (currentPassword === newPassword) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu không hợp lệ',
        text2: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      });
      return;
    }

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu mới chưa đủ mạnh',
        text2: passwordError,
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await authAPI.changePassword(currentPassword, newPassword, confirmPassword);
      const emailSent = result?.emailSent !== false;

      Toast.show({
        type: 'success',
        text1: 'Đổi mật khẩu thành công',
        text2: emailSent
          ? 'Email xác nhận đã được gửi đến hộp thư của bạn.'
          : 'Đổi mật khẩu thành công nhưng chưa gửi được email xác nhận.',
      });
      setChangePasswordModalVisible(false);
      resetChangePasswordForm();
    } catch (error: any) {
      console.error('Change password error:', error);
      Toast.show({
        type: 'error',
        text1: 'Không thể đổi mật khẩu',
        text2: error?.message || 'Vui lòng kiểm tra lại mật khẩu hiện tại.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeToken();
              await removeUser();
              Toast.show({
                type: 'success',
                text1: 'Đăng xuất thành công',
                text2: 'Hẹn gặp lại bạn!',
              });
              // Navigate to login after a short delay
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' } as any],
                });
              }, 1000);
            } catch (error) {
              console.error('Logout error:', error);
              Toast.show({
                type: 'error',
                text1: 'Lỗi đăng xuất',
                text2: 'Không thể đăng xuất. Vui lòng thử lại.',
              });
            }
          }
        }
      ]
    );
  };

  const handleScanQR = () => {
    navigation.navigate('Scanner' as never);
  };

  const handleViewSchedule = () => {
    navigation.navigate('Schedule' as never);
  };

  const handleViewReviewHistory = () => {
    if (!user?.id) {
      Toast.show({
        type: 'error',
        text1: 'Không thể mở lịch sử review',
        text2: 'Không tìm thấy tài khoản hiện tại. Vui lòng thử lại.',
      });
      return;
    }

    (navigation as any).navigate('ForumProfile', { userId: user.id });
  };

  const handleViewAchievements = () => {
    const { totalClasses, attendedSessions, attendanceRate } = stats;
    
    let achievementLevel = 'Mới bắt đầu';
    let achievementIcon = '🌱';
    
    if (attendanceRate >= 90) {
      achievementLevel = 'Siêu sao';
      achievementIcon = '⭐';
    } else if (attendanceRate >= 75) {
      achievementLevel = 'Xuất sắc';
      achievementIcon = '🏆';
    } else if (attendanceRate >= 50) {
      achievementLevel = 'Tốt';
      achievementIcon = '💪';
    }
    
    Toast.show({
      type: 'success',
      text1: `${achievementIcon} ${achievementLevel}`,
      text2: `Bạn đã tham gia ${attendedSessions} buổi học với tỷ lệ ${attendanceRate}%`,
      visibilityTime: 5000,
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'HV';
    const names = name.split(' ');
    return names.length > 1 
      ? `${names[0][0]}${names[names.length - 1][0]}` 
      : names[0][0];
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return '#10b981'; // Green
    if (rate >= 70) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getAttendanceText = (rate: number) => {
    if (rate >= 95) return 'Xuất sắc!';
    if (rate >= 85) return 'Rất tốt!';
    if (rate >= 70) return 'Ổn định';
    if (rate >= 50) return 'Thiếu đều đặn';
    return 'Cảnh báo';
  };

  const getLearningStatusMeta = (status: string) => {
    if (status === 'ACTIVE') {
      return { label: 'Đang học', color: '#10b981', icon: 'play-circle' as const };
    }
    if (status === 'COMPLETED') {
      return { label: 'Đã hoàn thành', color: '#3b82f6', icon: 'checkmark-done-circle' as const };
    }
    return { label: 'Bỏ dở', color: '#ef4444', icon: 'close-circle' as const };
  };

  const formatHistoryDate = (value?: string | null) => {
    if (!value) return 'Chưa có dữ liệu';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredClassHistory = useMemo(() => {
    if (historyFilter === 'ALL') return classHistory;
    return classHistory.filter((item: any) => item.learningStatus === historyFilter);
  }, [classHistory, historyFilter]);

  const visibleClassHistory = useMemo(() => {
    return filteredClassHistory.slice(0, visibleHistoryCount);
  }, [filteredClassHistory, visibleHistoryCount]);

  const periodStats = useMemo(() => {
    const now = new Date();
    const getRecordDate = (record: any) => {
      const value = record?.checkedInAt || record?.createdAt || record?.session?.startTime;
      const date = value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) ? date : null;
    };

    const currentDays = statsRange === '7D' ? 7 : statsRange === '30D' ? 30 : null;
    const currentStart = currentDays ? new Date(now.getTime() - currentDays * 24 * 60 * 60 * 1000) : null;

    const currentRecords = attendanceRecords.filter((record: any) => {
      const date = getRecordDate(record);
      if (!date) return false;
      if (!currentStart) return true;
      return date >= currentStart && date <= now;
    });

    const totalSessions = currentRecords.length;
    const attendedSessions = currentRecords.filter((record: any) => (record?.status || '').toUpperCase() === 'PRESENT').length;
    const missedSessions = Math.max(totalSessions - attendedSessions, 0);
    const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

    const presentDates = currentRecords
      .filter((record: any) => (record?.status || '').toUpperCase() === 'PRESENT')
      .map((record: any) => getRecordDate(record))
      .filter(Boolean)
      .map((date: any) => {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      })
      .sort((a: Date, b: Date) => b.getTime() - a.getTime());

    let streakDays = 0;
    if (presentDates.length > 0) {
      const latest = presentDates[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const gapFromToday = Math.floor((today.getTime() - latest.getTime()) / (24 * 60 * 60 * 1000));

      if (gapFromToday <= 1) {
        streakDays = 1;
        for (let i = 1; i < presentDates.length; i++) {
          const diff = Math.floor((presentDates[i - 1].getTime() - presentDates[i].getTime()) / (24 * 60 * 60 * 1000));
          if (diff === 0) continue;
          if (diff === 1) {
            streakDays += 1;
            continue;
          }
          break;
        }
      }
    }

    let previousRate: number | null = null;
    if (currentDays) {
      const previousStart = new Date(now.getTime() - currentDays * 2 * 24 * 60 * 60 * 1000);
      const previousEnd = new Date(now.getTime() - currentDays * 24 * 60 * 60 * 1000);
      const previousRecords = attendanceRecords.filter((record: any) => {
        const date = getRecordDate(record);
        if (!date) return false;
        return date >= previousStart && date < previousEnd;
      });
      const previousTotal = previousRecords.length;
      const previousAttended = previousRecords.filter((record: any) => (record?.status || '').toUpperCase() === 'PRESENT').length;
      previousRate = previousTotal > 0 ? Math.round((previousAttended / previousTotal) * 100) : null;
    }

    const deltaRate = previousRate === null ? null : attendanceRate - previousRate;

    return {
      totalSessions,
      attendedSessions,
      missedSessions,
      attendanceRate,
      streakDays,
      deltaRate,
    };
  }, [attendanceRecords, statsRange]);

  const statsInsight = useMemo(() => {
    if (periodStats.totalSessions === 0) {
      return 'Chưa có dữ liệu điểm danh trong giai đoạn đã chọn.';
    }
    if (periodStats.attendanceRate >= 90) {
      return 'Phong độ rất tốt, bạn đang duy trì thói quen đều đặn.';
    }
    const targetSessions = Math.ceil((periodStats.totalSessions * 90) / 100);
    const needed = Math.max(targetSessions - periodStats.attendedSessions, 1);
    return `Cần thêm khoảng ${needed} buổi tham gia đúng lịch để tiến gần mốc 90%.`;
  }, [periodStats]);

  const getAttendanceMood = (rate: number) => {
    if (rate >= 95) {
      return { emoji: '😄', message: 'Tuyệt vời! Bạn đang giữ phong độ rất cao.' };
    }
    if (rate >= 85) {
      return { emoji: '🙂', message: 'Làm tốt lắm, cố gắng giữ nhịp này nhé!' };
    }
    if (rate >= 70) {
      return { emoji: '😐', message: 'Ổn, nhưng bạn có thể đều đặn hơn nữa.' };
    }
    if (rate >= 50) {
      return { emoji: '😟', message: 'Bạn đang bỏ lỡ khá nhiều buổi học.' };
    }
    return { emoji: '😠', message: 'Điểm danh quá thấp, cần tập trung hơn!' };
  };

  const StatCard = ({ icon, label, value, color, subtitle }: any) => (
    <View className={`${cardClass} rounded-2xl p-4 items-center flex-1 mx-1`}
          style={{
            shadowColor: color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent'
          }}>
      <Ionicons name={icon} size={24} color={color} />
      <Text className={`${textPrimary} font-bold text-xl mt-2`}>{value}</Text>
      <Text className={`${textSecondary} text-sm text-center`}>{label}</Text>
      {subtitle && <Text className={`${textMuted} text-xs mt-1`}>{subtitle}</Text>}
    </View>
  );

  const SettingItem = ({ icon, label, helperText, value, onToggle, color }: any) => (
    <View className={`${cardClass} rounded-xl p-4 mb-3 flex-row items-center justify-between`}
          style={{
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent'
          }}>
      <View className="flex-row items-center flex-1 pr-3">
        <View className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${color}20` }}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View className="flex-1">
          <Text className={`${textPrimary} font-medium text-base`}>{label}</Text>
          {helperText ? (
            <Text className={`${textMuted} text-xs mt-0.5`}>{helperText}</Text>
          ) : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#374151', true: color }}
        thumbColor={value ? '#ffffff' : '#9ca3af'}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass} items-center justify-center`}>
        <Ionicons name="sync" size={32} color="#10b981" />
        <Text className={`${textPrimary} text-lg mt-4`}>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass} items-center justify-center px-6`}>
        <Ionicons name="warning-outline" size={48} color="#ef4444" />
        <Text className={`${textPrimary} text-xl font-bold text-center mt-4`}>Oops!</Text>
        <Text className={`${textSecondary} text-center mt-2 mb-6`}>{error}</Text>
        <TouchableOpacity 
          onPress={() => {
            setError(null);
            setLoading(true);
            loadUserData();
          }}
          className="bg-green-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-medium">Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6">
          {/* Profile Header */}
          <View className="items-center mb-8">
            <View className="relative">
              <TouchableOpacity
                onPress={handleChangeAvatar}
                activeOpacity={0.8}
              >
                <View className="w-28 h-28 rounded-full items-center justify-center mb-4 overflow-hidden"
                     style={{
                       backgroundColor: avatarUri ? '#1e293b' : '#10b981',
                       shadowColor: '#10b981',
                       shadowOffset: { width: 0, height: 8 },
                       shadowOpacity: 0.5,
                       shadowRadius: 16,
                       elevation: 12,
                       borderWidth: 3,
                       borderColor: '#10b981',
                     }}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-4xl font-bold text-white">
                      {getInitials(user?.fullName || 'Học Viên')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleChangeAvatar}
                className="absolute bottom-2 right-0 bg-green-600 p-2 rounded-full"
                style={{
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="camera" size={16} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleEditProfile}
                className="absolute bottom-2 left-0 bg-blue-600 p-2 rounded-full"
                style={{
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="pencil" size={16} color="white" />
              </TouchableOpacity>
            </View>
            
            <Text className={`text-3xl font-bold ${textPrimary} mb-2 text-center`}>
              {user?.fullName || 'Học Viên'}
            </Text>
            <View className="bg-green-500 px-4 py-1 rounded-full mb-2">
              <Text className="text-white font-medium text-sm">🎓 Học Viên</Text>
            </View>
            <Text className={`${textSecondary} text-lg`}>
              {user?.email || 'student@fitpass.com'}
            </Text>
            
            {/* Decoration */}
            <View className="flex-row items-center mt-4">
              <View className="w-8 h-1 bg-green-500 rounded-full mr-2" />
              <Ionicons name="fitness" size={20} color="#10b981" />
              <View className="w-8 h-1 bg-green-500 rounded-full ml-2" />
            </View>
          </View>
          
          {settings.showProgress ? (
          <>
          {/* Attendance Rate Highlight */}
          <View className="mb-8">
            <View className={`${cardClass} rounded-2xl p-6 items-center`}
                  style={{
                    shadowColor: getAttendanceColor(stats.attendanceRate),
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    borderWidth: isDark ? 2 : 1,
                    borderColor: getAttendanceColor(stats.attendanceRate)
                  }}>
              <Text className={`${textSecondary} text-lg mb-2`}>Tỷ lệ Điểm danh</Text>
              <Text className="text-5xl mb-2">{getAttendanceMood(stats.attendanceRate).emoji}</Text>
              <Text className="text-white font-bold text-4xl mb-2"
                    style={{ color: getAttendanceColor(stats.attendanceRate) }}>
                {stats.attendanceRate}%
              </Text>
              <Text className={`${textPrimary} text-lg font-medium`}>
                {getAttendanceText(stats.attendanceRate)}
              </Text>
              <Text className={`${textSecondary} text-sm mt-1 text-center`}>
                {getAttendanceMood(stats.attendanceRate).message}
              </Text>
              
              {/* Progress Bar */}
              <View className={`w-full mt-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-3 overflow-hidden`}>
                <View 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${Math.min(stats.attendanceRate, 100)}%`,
                    backgroundColor: getAttendanceColor(stats.attendanceRate),
                  }} 
                />
              </View>
              <Text className={`${textMuted} text-xs mt-2`}>
                {stats.attendedSessions}/{stats.totalSessions} buổi học
              </Text>
            </View>
          </View>
          
          {/* Statistics Section */}
          <View className="mb-8">
            <Text className={`${textPrimary} text-xl font-bold mb-4 px-2`}>📊 Thống Kê</Text>
            <View className="flex-row px-2 mb-3">
              {[
                { key: '7D', label: '7 ngày' },
                { key: '30D', label: '30 ngày' },
                { key: 'ALL', label: 'Toàn bộ' },
              ].map((item) => {
                const selected = statsRange === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    className="px-3 py-1.5 rounded-full mr-2"
                    style={{
                      backgroundColor: selected ? '#3b82f6' : (isDark ? '#1e293b' : '#ffffff'),
                      borderWidth: 1,
                      borderColor: selected ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'),
                    }}
                    onPress={() => setStatsRange(item.key as '7D' | '30D' | 'ALL')}
                  >
                    <Text className="text-xs font-semibold" style={{ color: selected ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569') }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="px-2 mb-4">
              <Text className={`${textPrimary} text-lg font-bold`}>{periodStats.attendanceRate}% tham gia</Text>
              {periodStats.deltaRate !== null ? (
                <Text className={`text-sm mt-1 ${periodStats.deltaRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {periodStats.deltaRate >= 0 ? '▲' : '▼'} {Math.abs(periodStats.deltaRate)}% so với kỳ trước
                </Text>
              ) : null}
              <Text className={`${textSecondary} text-sm mt-1`}>{statsInsight}</Text>
            </View>

            <View
              className={`${cardClass} rounded-2xl p-4 mx-1 mb-4`}
              style={{
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className={`${textPrimary} text-sm font-semibold`}>Phân bổ tham gia</Text>
                <Text className={`${textMuted} text-xs`}>
                  {statsRange === 'ALL' ? 'Toàn bộ' : statsRange === '7D' ? '7 ngày' : '30 ngày'}
                </Text>
              </View>

              <View className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'} flex-row`}>
                <View
                  style={{
                    width: `${periodStats.totalSessions > 0 ? (periodStats.attendedSessions / periodStats.totalSessions) * 100 : 0}%`,
                    backgroundColor: '#10b981',
                  }}
                />
                <View
                  style={{
                    width: `${periodStats.totalSessions > 0 ? (periodStats.missedSessions / periodStats.totalSessions) * 100 : 0}%`,
                    backgroundColor: '#ef4444',
                  }}
                />
              </View>

              <View className="flex-row items-center mt-3">
                <View className="flex-row items-center mr-4">
                  <View className="w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: '#10b981' }} />
                  <Text className={`${textSecondary} text-xs`}>Tham gia {periodStats.attendedSessions}</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: '#ef4444' }} />
                  <Text className={`${textSecondary} text-xs`}>Bỏ lỡ {periodStats.missedSessions}</Text>
                </View>
              </View>
            </View>

            <View className="flex-row px-1">
              <View
                className={`${cardClass} rounded-xl p-3 flex-1 mx-1`}
                style={{ borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              >
                <Text className="text-[11px] text-blue-500 font-semibold">Buổi trong kỳ</Text>
                <Text className={`${textPrimary} text-xl font-bold mt-1`}>{periodStats.totalSessions}</Text>
              </View>
              <View
                className={`${cardClass} rounded-xl p-3 flex-1 mx-1`}
                style={{ borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              >
                <Text className="text-[11px] text-green-500 font-semibold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Đã tham gia</Text>
                <Text className={`${textPrimary} text-xl font-bold mt-1`}>{periodStats.attendedSessions}</Text>
              </View>
              <View
                className={`${cardClass} rounded-xl p-3 flex-1 mx-1`}
                style={{ borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              >
                <Text className="text-[11px] text-amber-500 font-semibold">Chuỗi ngày</Text>
                <Text className={`${textPrimary} text-xl font-bold mt-1`}>{periodStats.streakDays}</Text>
              </View>
            </View>
            <Text className={`${textMuted} text-xs mt-2 px-2`}>
              Chuỗi ngày = số ngày liên tiếp có ít nhất 1 buổi điểm danh PRESENT.
            </Text>
          </View>

          <View className="mb-8">
            <Text className={`${textPrimary} text-xl font-bold mb-4 px-2`}>📚 Lịch Sử Tham Gia</Text>
            <View className="flex-row flex-wrap px-1 mb-3">
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'ACTIVE', label: 'Đang học' },
                { key: 'COMPLETED', label: 'Hoàn thành' },
                { key: 'DROPPED', label: 'Bỏ dở' },
              ].map((item) => {
                const selected = historyFilter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    className="px-3 py-1.5 rounded-full mr-2 mb-2"
                    style={{
                      backgroundColor: selected ? '#3b82f6' : (isDark ? '#1e293b' : '#ffffff'),
                      borderWidth: 1,
                      borderColor: selected ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'),
                    }}
                    onPress={() => setHistoryFilter(item.key as 'ALL' | 'ACTIVE' | 'COMPLETED' | 'DROPPED')}
                  >
                    <Text className="text-xs font-semibold" style={{ color: selected ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569') }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {filteredClassHistory.length === 0 ? (
              <View className={`${cardClass} rounded-2xl p-4 mx-1`}>
                <Text className={`${textSecondary} text-center`}>Chưa có lịch sử lớp học</Text>
              </View>
            ) : (
              visibleClassHistory.map((item: any) => {
                const statusMeta = getLearningStatusMeta(item.learningStatus);
                return (
                  <View
                    key={item.classId}
                    className={`${cardClass} rounded-2xl p-4 mb-3 mx-1`}
                    style={{
                      borderWidth: isDark ? 1 : 0,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 pr-3">
                        <Text className={`${textPrimary} text-base font-bold`}>{item.className}</Text>
                        <Text className={`${textSecondary} text-sm mt-1`}>Giáo viên: {item.teacherName}</Text>
                      </View>
                      <View className="flex-row items-center px-2 py-1 rounded-full" style={{ backgroundColor: `${statusMeta.color}20` }}>
                        <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
                        <Text className="text-xs font-semibold ml-1" style={{ color: statusMeta.color }}>{statusMeta.label}</Text>
                      </View>
                    </View>

                    <Text className={`${textPrimary} text-sm font-medium mt-1`}>
                      {item.totalSessions > 0
                        ? `${item.attendedSessions}/${item.totalSessions} buổi (${item.attendanceRate}%)`
                        : 'Chưa có dữ liệu điểm danh'}
                    </Text>

                    <View className={`w-full mt-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-2 overflow-hidden`}>
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(item.attendanceRate || 0, 100)}%`,
                          backgroundColor: getAttendanceColor(item.attendanceRate || 0),
                        }}
                      />
                    </View>

                    <Text className={`${textMuted} text-xs mt-2`}>Ngày gần nhất: {formatHistoryDate(item.latestDate)}</Text>
                  </View>
                );
              })
            )}

            {filteredClassHistory.length > 4 ? (
              <View className="px-1 mt-1">
                {visibleHistoryCount < filteredClassHistory.length ? (
                  <TouchableOpacity
                    className="rounded-xl py-3 items-center"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)',
                    }}
                    onPress={() => setVisibleHistoryCount((prev) => Math.min(prev + 4, filteredClassHistory.length))}
                  >
                    <Text className="text-blue-500 font-semibold">
                      Xem thêm {Math.min(4, filteredClassHistory.length - visibleHistoryCount)} lớp
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className="rounded-xl py-3 items-center"
                    style={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)',
                    }}
                    onPress={() => setVisibleHistoryCount(4)}
                  >
                    <Text className="text-slate-500 font-semibold">Thu gọn</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>
          </>
          ) : null}

          {/* Settings Section */}
          <View className="mb-8">
            <Text className={`${textPrimary} text-xl font-bold mb-4 px-2`}>⚙️ Cài Đặt</Text>
            <TouchableOpacity
              onPress={handleViewReviewHistory}
              className={`${cardClass} rounded-xl p-4 mb-3 flex-row items-center justify-between`}
              style={{
                shadowColor: isDark ? '#000' : '#64748b',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#f59e0b20' }}
                >
                  <Ionicons name="star-outline" size={20} color="#f59e0b" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className={`${textPrimary} font-medium text-base`}>Lịch Sử Review</Text>
                  <Text className={`${textMuted} text-sm`}>{reviewCount} đánh giá đã gửi</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
            <SettingItem
              icon="notifications-outline"
              label="Nhận tất cả thông báo"
              helperText="Công tắc chính: tắt mục này sẽ dừng toàn bộ thông báo."
              value={settings.notifications}
              onToggle={(value: boolean) => handleSettingToggle('notifications', value)}
              color="#3b82f6"
            />
            <SettingItem
              icon="alarm-outline"
              label="Nhắc lịch học tự động"
              helperText="Chỉ áp dụng cho nhắc lịch 24h/1h trước buổi học."
              value={settings.autoReminder}
              onToggle={(value: boolean) => handleSettingToggle('autoReminder', value)}
              color="#f59e0b"
            />
            <SettingItem
              icon="stats-chart-outline"
              label="Hiển Thị Tiến Độ"
              value={settings.showProgress}
              onToggle={(value: boolean) => handleSettingToggle('showProgress', value)}
              color="#10b981"
            />
            <TouchableOpacity
              onPress={handleOpenChangePasswordModal}
              className={`${cardClass} rounded-xl p-4 mb-3 flex-row items-center justify-between`}
              style={{
                shadowColor: isDark ? '#000' : '#64748b',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#dc2626' + '20' }}
                >
                  <Ionicons name="lock-closed-outline" size={20} color="#dc2626" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className={`${textPrimary} font-medium text-base`}>Đổi Mật Khẩu</Text>
                  <Text className={`${textMuted} text-sm`}>Cập nhật bảo mật tài khoản</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
            {/* Theme Settings Button - More intuitive than simple toggle */}
            <TouchableOpacity
              onPress={() => setThemeModalVisible(true)}
              className={`${cardClass} rounded-xl p-4 mb-3 flex-row items-center justify-between`}
              style={{
                shadowColor: isDark ? '#000' : '#64748b',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#6b7280' + '20' }}
                >
                  <Ionicons
                    name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sunny' : 'contrast'}
                    size={20}
                    color="#6b7280"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className={`${textPrimary} font-medium text-base`}>Giao Diện</Text>
                  <Text className={`${textMuted} text-sm`}>
                    {theme === 'dark' ? '🌙 Tối' : theme === 'light' ? '☀️ Sáng' : '⚙️ Hệ thống'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View className="mb-8">
            <Text className={`${textPrimary} text-xl font-bold mb-4 px-2`}>🚀 Thao Tác Nhanh</Text>
            
            <TouchableOpacity 
              onPress={handleScanQR}
              className="rounded-xl p-4 mb-3 flex-row items-center"
              style={{
                backgroundColor: isDark ? '#2563eb' : '#3b82f6',
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}>
              <Ionicons name="qr-code-outline" size={24} color="white" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">Quét QR Điểm Danh</Text>
                <Text className="text-white opacity-90">Nhanh chóng điểm danh buổi học</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleViewSchedule}
              className="rounded-xl p-4 mb-3 flex-row items-center"
              style={{
                backgroundColor: isDark ? '#7c3aed' : '#8b5cf6',
                shadowColor: '#8b5cf6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}>
              <Ionicons name="calendar-outline" size={24} color="white" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">Xem Lịch Học</Text>
                <Text className="text-white opacity-90">Kiểm tra lịch học hôm nay</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleViewAchievements}
              className="rounded-xl p-4 mb-3 flex-row items-center"
              style={{
                backgroundColor: isDark ? '#059669' : '#10b981',
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}>
              <Ionicons name="trophy-outline" size={24} color="white" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">Thành Tích</Text>
                <Text className="text-white opacity-90">Xem tiến độ học tập của bạn</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            onPress={handleSignOut}
            className="rounded-xl p-4 items-center mb-6 flex-row justify-center"
            style={{
              backgroundColor: isDark ? '#dc2626' : '#ef4444',
              shadowColor: '#dc2626',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? '#991b1b' : '#dc2626',
            }}
          >
            <Ionicons name="log-out-outline" size={24} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-bold text-lg">Đăng Xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-2xl font-black">Chỉnh Sửa Hồ Sơ</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <Text className="text-slate-300 text-sm font-medium mb-2">Họ và Tên</Text>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#64748b"
                className="bg-slate-900 text-white px-4 py-3 rounded-xl text-base"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                }}
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-300 text-sm font-medium mb-2">Email</Text>
              <View className="bg-slate-900 px-4 py-3 rounded-xl"
                    style={{
                      borderWidth: 1,
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                    }}>
                <Text className="text-slate-400 text-base">{user?.email}</Text>
              </View>
              <Text className="text-slate-500 text-xs mt-1">Email không thể thay đổi</Text>
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                className="flex-1 bg-slate-700 py-3 rounded-xl items-center"
                disabled={isUpdating}
              >
                <Text className="text-white font-bold text-base">Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleSaveProfile}
                className="flex-1 bg-blue-600 py-3 rounded-xl items-center"
                style={{
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseChangePasswordModal}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View
            className={`${cardClass} rounded-2xl p-6 w-full max-w-md`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className={`${textPrimary} text-2xl font-bold`}>Đổi Mật Khẩu</Text>
              <TouchableOpacity
                onPress={handleCloseChangePasswordModal}
                disabled={isChangingPassword}
                className="p-2"
              >
                <Ionicons name="close" size={24} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className={`${textMuted} text-sm mb-2`}>Mật khẩu hiện tại</Text>
              <View
                className="rounded-xl px-4 py-3 flex-row items-center"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                <TextInput
                  className={`flex-1 ${textPrimary} ml-3`}
                  placeholder="Nhập mật khẩu hiện tại"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!isChangingPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword((prev) => !prev)}>
                  <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-4">
              <Text className={`${textMuted} text-sm mb-2`}>Mật khẩu mới</Text>
              <View
                className="rounded-xl px-4 py-3 flex-row items-center"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
                <TextInput
                  className={`flex-1 ${textPrimary} ml-3`}
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!isChangingPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword((prev) => !prev)}>
                  <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Xác nhận mật khẩu mới</Text>
              <View
                className="rounded-xl px-4 py-3 flex-row items-center"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#64748b" />
                <TextInput
                  className={`flex-1 ${textPrimary} ml-3`}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isChangingPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={handleCloseChangePasswordModal}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
                disabled={isChangingPassword}
              >
                <Text className={`${textPrimary} font-bold text-base`}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleChangePassword}
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: '#dc2626',
                  opacity: isChangingPassword ? 0.7 : 1,
                }}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Settings Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View
            className={`${cardClass} rounded-2xl p-6 w-full max-w-md`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className={`${textPrimary} text-2xl font-bold`}>Giao Diện</Text>
              <TouchableOpacity
                onPress={() => setThemeModalVisible(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <ThemeSettings onClose={() => setThemeModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}