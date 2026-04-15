import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getUser, removeToken, removeUser, User } from '../../lib/auth';
import { classAPI, sessionsAPI, teachersAPI, authAPI } from '../../lib/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../lib/theme';
import { useThemeClasses } from '../../lib/theme';
import ThemeSettings from '../../components/ThemeSettings';

type TeacherSettingKey = 'notifications' | 'autoReminder' | 'darkMode';

export default function TeacherProfileScreen() {
  const navigation = useNavigation();
  const { isDark, toggleTheme, colors, theme } = useTheme();
  const {
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSessions: 0,
    totalStudents: 0,
    completedSessions: 0
  });
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [settings, setSettings] = useState({
    notifications: true,
    autoReminder: true,
    darkMode: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedExperienceYears, setEditedExperienceYears] = useState('');
  const [editedSpecialties, setEditedSpecialties] = useState('');
  const [editedCertifications, setEditedCertifications] = useState('');
  const [editedHighlights, setEditedHighlights] = useState('');
  const [editedCoverImage, setEditedCoverImage] = useState('');
  const [editedGalleryImages, setEditedGalleryImages] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  useEffect(() => {
    loadUserData();
    loadAvatar();
    loadSettings();
  }, []);

  useEffect(() => {
    setSettings((prev) => ({ ...prev, darkMode: isDark }));
  }, [isDark]);

  const loadSettings = async () => {
    let localSettings = settings;

    try {
      const savedSettings = await AsyncStorage.getItem('teacher_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        localSettings = parsedSettings;
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Error loading teacher settings:', error);
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
      console.warn('Failed to sync teacher preferences from backend:', error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await AsyncStorage.setItem('teacher_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving teacher settings:', error);
    }
  };

  const handleSettingToggle = async (settingKey: TeacherSettingKey, value: boolean) => {
    const previousSettings = settings;
    const newSettings = { ...settings, [settingKey]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);

    try {
      if (settingKey === 'notifications') {
        await authAPI.updatePreferences({ notificationEnabled: value });
      }

      if (settingKey === 'autoReminder') {
        await authAPI.updatePreferences({ autoReminderEnabled: value });
      }
    } catch (error) {
      console.error('Failed to sync teacher preference:', error);
      setSettings(previousSettings);
      await saveSettings(previousSettings);
      Toast.show({
        type: 'error',
        text1: 'Không thể lưu lên server',
        text2: 'Đã khôi phục cài đặt trước đó.',
      });
      return;
    }

    if (settingKey === 'darkMode') {
      await toggleTheme();
    }

    Toast.show({
      type: value ? 'success' : 'info',
      text1: `${settingKey === 'notifications' ? 'Thông báo' : settingKey === 'autoReminder' ? 'Nhắc nhở tự động' : 'Chế độ tối'} ${value ? 'bật' : 'tắt'}`,
      text2: 'Cài đặt đã được lưu',
      visibilityTime: 2000,
    });
  };

  const loadAvatar = async () => {
    try {
      const currentUser = await getUser();
      if (currentUser?.id) {
        const avatarKey = `teacher_avatar_${currentUser.id}`;
        const savedAvatar = await AsyncStorage.getItem(avatarKey);
        if (savedAvatar) {
          setAvatarUri(savedAvatar);
          console.log('✅ Loaded avatar from storage for teacher:', currentUser.id);
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
        const avatarKey = `teacher_avatar_${currentUser.id}`;
        await AsyncStorage.setItem(avatarKey, uri);
        console.log('✅ Avatar saved to storage for teacher:', currentUser.id);
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
    const avatarPayload = typeof explicitAvatarPayload !== 'undefined'
      ? explicitAvatarPayload
      : await toAvatarPayload(nextAvatarUri);
    const response = await teachersAPI.updateMyProfile({ avatar: avatarPayload ?? null });

    const persistedAvatar = response?.data?.avatar ?? nextAvatarUri ?? undefined;

    if (!user) return;
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
        const profile = await teachersAPI.getProfile(currentUser.id);
        const teacher = profile?.teacher;
        setTeacherProfile(teacher || null);
        setEditedBio(teacher?.teacherBio || '');
        setEditedExperienceYears(
          typeof teacher?.teacherExperienceYears === 'number' ? String(teacher.teacherExperienceYears) : ''
        );
        setEditedSpecialties((teacher?.teacherSpecialties || []).join(', '));
        setEditedCertifications((teacher?.teacherCertifications || []).join(', '));
        setEditedHighlights((teacher?.teacherHighlights || []).join(', '));
        setEditedCoverImage(teacher?.teacherCoverImage || '');
        setEditedGalleryImages((teacher?.teacherGalleryImages || []).join(', '));
      }
      
      if (currentUser?.id) {
        // Load teacher statistics
        const [classesRes, sessionsRes] = await Promise.all([
          classAPI.getAll(),
          sessionsAPI.getAll()
        ]);
        
        // Safely access data with fallbacks
        const allClasses = classesRes?.data || [];
        const allSessions = sessionsRes?.data || [];
        
        const teacherClasses = allClasses.filter((c: any) => c.teacherId === currentUser.id);
        const teacherSessions = allSessions.filter((s: any) => {
          return teacherClasses.some((c: any) => c.id === s.classId);
        });
        
        // Calculate unique students
        const uniqueStudents = new Set();
        teacherSessions.forEach((session: any) => {
          if (session.attendance && Array.isArray(session.attendance)) {
            session.attendance.forEach((att: any) => {
              if (att?.studentId) {
                uniqueStudents.add(att.studentId);
              }
            });
          }
        });
        
        setStats({
          totalClasses: teacherClasses.length,
          totalSessions: teacherSessions.length,
          totalStudents: uniqueStudents.size,
          completedSessions: teacherSessions.filter((s: any) => s.status === 'completed').length
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng.');
      // Set default stats on error
      setStats({
        totalClasses: 0,
        totalSessions: 0,
        totalStudents: 0,
        completedSessions: 0
      });
    } finally {
      setLoading(false);
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
                const avatarKey = `teacher_avatar_${currentUser.id}`;
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

      const parsedExperience = editedExperienceYears.trim()
        ? Number(editedExperienceYears.trim())
        : null;

      const avatarPayload = await toAvatarPayload(avatarUri);
      const payload = {
        fullName: editedName.trim(),
        avatar: avatarPayload ?? undefined,
        teacherBio: editedBio.trim() || null,
        teacherExperienceYears: Number.isNaN(parsedExperience) ? null : parsedExperience,
        teacherSpecialties: editedSpecialties
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        teacherCertifications: editedCertifications
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        teacherHighlights: editedHighlights
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        teacherCoverImage: editedCoverImage.trim() || null,
        teacherGalleryImages: editedGalleryImages
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const response = await teachersAPI.updateMyProfile(payload);

      const persistedAvatar = response?.data?.avatar ?? avatarUri ?? user?.avatar;

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

  const handleCreateSession = () => {
    navigation.getParent()?.navigate('Classes' as never);
  };

  const handleCreateQR = () => {
    navigation.getParent()?.navigate('QR' as never);
  };

  const handleViewReports = () => {
    (navigation as any).navigate('AttendanceView');
  };

  const handleViewEarnings = () => {
    (navigation as any).navigate('Earnings');
  };

  const getInitials = (name: string) => {
    if (!name) return 'GT';
    const names = name.split(' ');
    return names.length > 1 
      ? `${names[0][0]}${names[names.length - 1][0]}` 
      : names[0][0];
  };

  const StatCard = ({ icon, label, value, color }: any) => (
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
        <Ionicons name="sync" size={32} color="#3b82f6" />
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
          className="bg-blue-600 px-6 py-3 rounded-xl"
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
                       backgroundColor: avatarUri ? '#1e293b' : '#3b82f6',
                       shadowColor: '#3b82f6',
                       shadowOffset: { width: 0, height: 8 },
                       shadowOpacity: 0.5,
                       shadowRadius: 16,
                       elevation: 12,
                       borderWidth: 3,
                       borderColor: '#3b82f6',
                     }}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-4xl font-bold text-white">
                      {getInitials(user?.fullName || 'Giáo Viên')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleChangeAvatar}
                className="absolute bottom-2 right-0 bg-blue-600 p-2 rounded-full"
                style={{
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="camera" size={16} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleEditProfile}
                className="absolute bottom-2 left-0 bg-purple-600 p-2 rounded-full"
                style={{
                  shadowColor: '#8b5cf6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="pencil" size={16} color="white" />
              </TouchableOpacity>
            </View>
            
            <Text className={`text-3xl font-bold ${textPrimary} mb-2 text-center`}>
              {user?.fullName || 'Giáo Viên'}
            </Text>
            
            <View className="bg-blue-500 px-4 py-1 rounded-full mb-2">
              <Text className="text-white font-medium text-sm">👨‍🏫 Giáo Viên</Text>
            </View>
            <Text className={`${textSecondary} text-lg`}>
              {user?.email || 'teacher@fitpass.com'}
            </Text>
            
            {/* Decoration */}
            <View className="flex-row items-center mt-4">
              <View className="w-8 h-1 bg-blue-500 rounded-full mr-2" />
              <Ionicons name="fitness" size={20} color="#3b82f6" />
              <View className="w-8 h-1 bg-blue-500 rounded-full ml-2" />
            </View>
          </View>
          
          {/* Statistics Section */}
          <View className="mb-8">
            <Text className={`${textPrimary} text-xl font-bold mb-4 px-2`}>📊 Thống Kê</Text>
            <View className="flex-row mb-4">
              <StatCard
                icon="school-outline"
                label="Lớp Học"
                value={stats.totalClasses}
                color="#3b82f6"
              />
              <StatCard
                icon="calendar-outline"
                label="Buổi Học"
                value={stats.totalSessions}
                color="#8b5cf6"
              />
            </View>
            <View className="flex-row">
              <StatCard
                icon="people-outline"
                label="Học Viên"
                value={stats.totalStudents}
                color="#10b981"
              />
              <StatCard
                icon="checkmark-circle-outline"
                label="Hoàn Thành"
                value={stats.completedSessions}
                color="#f59e0b"
              />
            </View>
          </View>

          {/* Public Profile Preview */}
          {(teacherProfile?.teacherBio ||
            (teacherProfile?.teacherSpecialties || []).length > 0 ||
            typeof teacherProfile?.teacherExperienceYears === 'number') && (
            <View className="mb-8">
              <Text className={`${textPrimary} text-xl font-bold mb-4 px-2`}>🌟 Hồ sơ công khai</Text>
              <View className={`${cardClass} rounded-2xl p-4`}
                    style={{
                      borderWidth: 1,
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                    }}>
                {teacherProfile?.teacherCoverImage ? (
                  <Image
                    source={{ uri: teacherProfile.teacherCoverImage }}
                    style={{ width: '100%', height: 140, borderRadius: 16, marginBottom: 12 }}
                  />
                ) : null}
                {teacherProfile?.teacherBio ? (
                  <Text className={`${textSecondary} mb-3`}>{teacherProfile.teacherBio}</Text>
                ) : null}
                {typeof teacherProfile?.teacherExperienceYears === 'number' ? (
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="time" size={16} color="#60A5FA" />
                    <Text className={`${textSecondary} ml-2`}>{teacherProfile.teacherExperienceYears} năm kinh nghiệm</Text>
                  </View>
                ) : null}
                {(teacherProfile?.teacherSpecialties || []).length ? (
                  <View className="flex-row flex-wrap">
                    {teacherProfile.teacherSpecialties.map((item: string, idx: number) => (
                      <View key={`${item}-${idx}`} className="px-3 py-1 rounded-full mr-2 mb-2"
                            style={{
                              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                              borderWidth: 1,
                              borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)',
                            }}>
                        <Text className="text-blue-400 text-xs font-semibold">{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {(teacherProfile?.teacherCertifications || []).length ? (
                  <View className="mt-2">
                    {teacherProfile.teacherCertifications.map((item: string, idx: number) => (
                      <View key={`${item}-${idx}`} className="flex-row items-center mb-2">
                        <Ionicons name="ribbon" size={16} color="#f59e0b" />
                        <Text className={`${textSecondary} ml-2`}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {(teacherProfile?.teacherHighlights || []).length ? (
                  <View className="mt-2">
                    {teacherProfile.teacherHighlights.map((item: string, idx: number) => (
                      <View key={`${item}-${idx}`} className="flex-row items-center mb-2">
                        <Ionicons name="trophy" size={16} color="#22c55e" />
                        <Text className={`${textSecondary} ml-2`}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {(teacherProfile?.teacherGalleryImages || []).length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                    {teacherProfile.teacherGalleryImages.map((img: string, idx: number) => (
                      <Image
                        key={`${img}-${idx}`}
                        source={{ uri: img }}
                        style={{ width: 120, height: 80, borderRadius: 10, marginRight: 8 }}
                      />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View className="mb-8">
            <Text className={`${textPrimary} text-xl font-bold mb-4 px-2`}>⚙️ Cài Đặt</Text>
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
              color="#8b5cf6"
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
            <View className="flex-row items-center mb-4 px-2">
              <Ionicons name="rocket-outline" size={20} color={isDark ? '#ffffff' : '#1f2937'} style={{ marginRight: 8 }} />
              <Text className={`${textPrimary} text-xl font-bold`}>Thao Tác Nhanh</Text>
            </View>
            
            <TouchableOpacity 
              onPress={handleCreateSession}
              className="rounded-xl p-4 mb-3 flex-row items-center"
              style={{
                backgroundColor: '#16a34a',
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}>
              <Ionicons name="calendar-outline" size={24} color="white" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">Tạo Buổi Học Mới</Text>
                <Text className="text-green-100">Lên lịch buổi học cho lớp</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleCreateQR}
              className="rounded-xl p-4 mb-3 flex-row items-center"
              style={{
                backgroundColor: '#3b82f6',
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}>
              <Ionicons name="qr-code-outline" size={24} color="white" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">Tạo QR Điểm Danh</Text>
                <Text className="text-blue-100">Tạo mã QR cho buổi học</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleViewReports}
              className="rounded-xl p-4 mb-3 flex-row items-center"
              style={{
                backgroundColor: '#8b5cf6',
                shadowColor: '#8b5cf6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}>
              <Ionicons name="people-outline" size={24} color="white" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">Điểm Danh Học Viên</Text>
                <Text className="text-purple-100">Theo dõi check-in real-time</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleViewEarnings}
              className="rounded-xl p-4 mb-3 flex-row items-center"
              style={{
                backgroundColor: '#ca8a04',
                shadowColor: '#f59e0b',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              }}>
              <Ionicons name="wallet-outline" size={24} color="white" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">Thu Nhập & Lương</Text>
                <Text className="text-amber-100">Xem tiền kiếm được</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            onPress={handleSignOut}
            className="rounded-xl p-4 items-center mb-6 flex-row justify-center"
            style={{
              backgroundColor: '#dc2626',
              shadowColor: '#dc2626',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              borderWidth: 1,
              borderColor: '#991b1b',
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
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View className="rounded-2xl p-6 w-11/12 max-w-md"
               style={{
                 backgroundColor: isDark ? '#1e293b' : '#ffffff',
                 shadowColor: '#000',
                 shadowOffset: { width: 0, height: 8 },
                 shadowOpacity: 0.5,
                 shadowRadius: 16,
               }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className={`${textPrimary} text-2xl font-bold`}>Chỉnh Sửa Hồ Sơ</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Họ và Tên</Text>
              <View className="rounded-xl px-4 py-3 border-2 border-blue-500 flex-row items-center"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    }}>
                <Ionicons name="person" size={20} color="#3b82f6" />
                <TextInput
                  className={`flex-1 ${textPrimary} text-lg ml-3`}
                  placeholder="Nhập họ tên"
                  placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                  value={editedName}
                  onChangeText={setEditedName}
                  editable={!isUpdating}
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Giới thiệu</Text>
              <TextInput
                className={`${textPrimary} rounded-xl px-4 py-3 border`}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
                placeholder="Mô tả ngắn về bạn"
                placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                value={editedBio}
                onChangeText={setEditedBio}
                editable={!isUpdating}
                multiline
              />
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Số năm kinh nghiệm</Text>
              <TextInput
                className={`${textPrimary} rounded-xl px-4 py-3 border`}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
                placeholder="Ví dụ: 5"
                placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                value={editedExperienceYears}
                onChangeText={setEditedExperienceYears}
                editable={!isUpdating}
                keyboardType="numeric"
              />
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Chuyên môn (phân cách bằng dấu phẩy)</Text>
              <TextInput
                className={`${textPrimary} rounded-xl px-4 py-3 border`}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
                placeholder="Yoga, Pilates, Strength"
                placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                value={editedSpecialties}
                onChangeText={setEditedSpecialties}
                editable={!isUpdating}
              />
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Chứng chỉ (phân cách bằng dấu phẩy)</Text>
              <TextInput
                className={`${textPrimary} rounded-xl px-4 py-3 border`}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
                placeholder="ACE, NASM, ISSA"
                placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                value={editedCertifications}
                onChangeText={setEditedCertifications}
                editable={!isUpdating}
              />
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Thành tựu (phân cách bằng dấu phẩy)</Text>
              <TextInput
                className={`${textPrimary} rounded-xl px-4 py-3 border`}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
                placeholder="Top Coach 2023, 500+ học viên"
                placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                value={editedHighlights}
                onChangeText={setEditedHighlights}
                editable={!isUpdating}
              />
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Ảnh cover (URL)</Text>
              <TextInput
                className={`${textPrimary} rounded-xl px-4 py-3 border`}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
                placeholder="https://..."
                placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                value={editedCoverImage}
                onChangeText={setEditedCoverImage}
                editable={!isUpdating}
              />
            </View>

            <View className="mb-6">
              <Text className={`${textMuted} text-sm mb-2`}>Album ảnh (URLs, phân cách bằng dấu phẩy)</Text>
              <TextInput
                className={`${textPrimary} rounded-xl px-4 py-3 border`}
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                }}
                placeholder="https://..., https://..."
                placeholderTextColor={isDark ? '#64748b' : '#cbd5e1'}
                value={editedGalleryImages}
                onChangeText={setEditedGalleryImages}
                editable={!isUpdating}
                multiline
              />
            </View>

            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                disabled={isUpdating}
                className="rounded-xl px-6 py-3 flex-1 mr-2"
                style={{
                  backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  opacity: isUpdating ? 0.5 : 1
                }}
              >
                <Text className={`${textPrimary} font-bold text-center`}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isUpdating}
                className="bg-blue-600 rounded-xl px-6 py-3 flex-1 ml-2"
                style={{
                  opacity: isUpdating ? 0.5 : 1,
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                }}
              >
                {isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-center">Lưu</Text>
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