import React, { useState, useEffect, useMemo } from 'react';
import { 
  Platform, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  Linking,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
import { authAPI, getAPIUrl, warmUpServer } from '../lib/api';
import { saveRefreshToken, saveToken, saveUser, User } from '../lib/auth';
import { registerFcmTokenWithBackend } from '../lib/pushNotifications';
import { WebLogin } from '../components/WebLogin';
import { useWebSocket } from '../lib/WebSocketProvider';
import { useTheme } from '../lib/theme';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/Button';

// For Expo Auth Session
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { reconnect } = useWebSocket();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  // Listen for deep link callback from Google OAuth
  useEffect(() => {
    // Wake up Render free-tier server as early as possible
    warmUpServer();
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (url.includes('fitpass://auth/callback')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const token = params.get('token');
        const refreshToken = params.get('refreshToken');
        const userStr = params.get('user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(decodeURIComponent(userStr));
            await saveToken(token);
            if (refreshToken) {
              await saveRefreshToken(refreshToken);
            }
            await saveUser(user);
            await registerFcmTokenWithBackend();
            reconnect();
            
            // Navigate based on role
            if (user.role === 'TEACHER') {
              navigation.navigate('Teacher' as never);
            } else if (user.role === 'STUDENT') {
              navigation.navigate('Student' as never);
            }
            
            Toast.show({
              type: 'success',
              text1: 'Đăng nhập thành công',
              text2: `Chào mừng, ${user.fullName}!`,
              position: 'top'
            });
          } catch (error) {
            console.error('Deep link parsing error:', error);
            Toast.show({
              type: 'error',
              text1: 'Lỗi đăng nhập',
              text2: 'Không thể xử lý phản hồi từ Google',
              position: 'top'
            });
          } finally {
            setGoogleLoading(false);
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation, reconnect]);

  // Use web-specific component for web platform
  if (Platform.OS === 'web') {
    return <WebLogin />;
  }

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg.primary,
    },
    logoContainer: {
      backgroundColor: colors.button.primary,
      shadowColor: colors.button.primary,
    },
    formCard: {
      backgroundColor: colors.card.bg,
      borderColor: colors.card.border,
      shadowColor: colors.card.shadow,
    },
    textPrimary: {
      color: colors.text.primary,
    },
    textSecondary: {
      color: colors.text.secondary,
    },
    input: {
      backgroundColor: colors.input.bg,
      borderColor: colors.input.border,
      color: colors.text.primary,
    },
    dividerLine: {
      backgroundColor: colors.border.default,
    },
    googleButton: {
      backgroundColor: colors.bg.primary,
      borderColor: colors.border.default,
    },
  }), [colors]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const backendUrl = getAPIUrl().replace('/api', '');
      const googleAuthUrl = `${backendUrl}/api/auth/google`;
      
      console.log('Opening Google OAuth:', googleAuthUrl);
      
      // Open browser for Google OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        googleAuthUrl,
        'fitpass://auth/callback'
      );
      
      console.log('OAuth result:', result);
      
      // Handle different result types
      if (result.type === 'success' && result.url) {
        // Parse the callback URL
        const url = result.url;
        if (url.includes('fitpass://auth/callback')) {
          const params = new URLSearchParams(url.split('?')[1]);
          const token = params.get('token');
          const refreshToken = params.get('refreshToken');
          const userStr = params.get('user');
          
          if (token && userStr) {
            try {
              const user = JSON.parse(decodeURIComponent(userStr));
              await saveToken(token);
              if (refreshToken) {
                await saveRefreshToken(refreshToken);
              }
              await saveUser(user);
              await registerFcmTokenWithBackend();
              reconnect();
              
              setGoogleLoading(false);
              
              // Navigate based on role
              if (user.role === 'TEACHER') {
                navigation.navigate('Teacher' as never);
              } else if (user.role === 'STUDENT') {
                navigation.navigate('Student' as never);
              }
              
              Toast.show({
                type: 'success',
                text1: 'Đăng nhập thành công',
                text2: `Chào mừng, ${user.fullName}!`,
                position: 'top'
              });
              return;
            } catch (error) {
              console.error('Parse error:', error);
            }
          }
        }
      } else if (result.type === 'cancel') {
        setGoogleLoading(false);
        Toast.show({
          type: 'info',
          text1: 'Đã hủy',
          text2: 'Bạn đã hủy đăng nhập Google',
          position: 'top'
        });
        return;
      }
      
      // If we get here, something went wrong
      setGoogleLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Lỗi đăng nhập',
        text2: 'Không thể hoàn tất đăng nhập Google',
        position: 'top'
      });
    } catch (error) {
      console.error('Google Sign In error:', error);
      setGoogleLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Lỗi Google Sign In',
        text2: 'Không thể kết nối với Google. Vui lòng thử lại.',
        position: 'top'
      });
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu thông tin',
        text2: 'Vui lòng nhập email và mật khẩu',
        position: 'top'
      });
      return;
    }

    setLoading(true);
    try {

      const response = await authAPI.login(email, password);
      console.log('Login response:', response); // Debug log

      // Extract user from response (no token expected)
      const { user } = response;
      if (!user) {
        throw new Error('Invalid response format');
      }

      // Save user to storage
      console.log('Saving user to storage...');
      await saveUser(user);
      await registerFcmTokenWithBackend();
      console.log('User saved successfully');

      // Nếu websocket cần token, cần refactor lại logic, còn không thì bỏ reconnect();

      // Validate user role and navigate accordingly
      if (user.role === 'TEACHER') {
        // Navigate to teacher dashboard
        navigation.navigate('Teacher' as never);
      } else if (user.role === 'STUDENT') {
        // Navigate to student dashboard
        navigation.navigate('Student' as never);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Vai trò không hợp lệ',
          text2: 'Vai trò người dùng không hợp lệ. Vui lòng liên hệ hỗ trợ.',
          position: 'top'
        });
        setLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Đăng nhập thất bại',
        text2: error.message || 'Email hoặc mật khẩu không chính xác',
        position: 'top'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Theme Toggle */}
      <View style={{ position: 'absolute', top: 48, right: 16, zIndex: 10 }}>
        <ThemeToggle size="sm" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Section */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View 
              style={[
                styles.logoContainer,
                {
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 12,
                }
              ]}
            >
              <Ionicons name="barbell" size={40} color="#fff" />
            </View>
            <Text style={[styles.textPrimary, { fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }]}>
              Chào mừng đến FitPass
            </Text>
            <Text style={[styles.textSecondary, { fontSize: 16, textAlign: 'center', lineHeight: 20 }]}>
              Hành trình thể dục của bạn bắt đầu từ đây
            </Text>
          </View>

          {/* Login Form */}
          <View style={[
            styles.formCard,
            {
              borderRadius: 24,
              padding: 32,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              borderWidth: 1,
            }
          ]}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary, textAlign: 'center', marginBottom: 32 }}>
              Đăng Nhập
            </Text>

            {/* Email Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: colors.text.secondary, fontWeight: '600', marginBottom: 8 }}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    width: '100%',
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    fontSize: 16,
                    fontWeight: '500',
                    opacity: loading ? 0.5 : 1,
                  }
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập email của bạn"
                placeholderTextColor={colors.input.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ color: colors.text.secondary, fontWeight: '600', marginBottom: 8 }}>Mật khẩu</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      width: '100%',
                      paddingLeft: 16,
                      paddingRight: 50,
                      paddingVertical: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      fontSize: 16,
                      fontWeight: '500',
                      opacity: loading ? 0.5 : 1,
                    }
                  ]}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Nhập mật khẩu của bạn"
                  placeholderTextColor={colors.input.placeholder}
                  autoComplete="password"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: 14,
                    padding: 2,
                  }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity 
              style={{ marginBottom: 24 }}
              onPress={() => navigation.navigate('ForgotPassword' as never)}
            >
              <Text style={{ 
                color: colors.text.accent, 
                fontSize: 14, 
                textAlign: 'right',
                fontWeight: '500'
              }}>
                Quên mật khẩu?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Button
              title={loading ? "Đang xử lý..." : "Đăng Nhập"}
              onPress={handleLogin}
              variant="primary"
              size="lg"
              disabled={loading}
              style={{ marginBottom: 16 }}
            />

            {/* Divider */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 20
            }}>
              <View style={[styles.dividerLine, { flex: 1, height: 1 }]} />
              <Text style={{ 
                marginHorizontal: 12, 
                color: colors.text.muted,
                fontSize: 14,
                fontWeight: '500'
              }}>
                HOẶC
              </Text>
              <View style={[styles.dividerLine, { flex: 1, height: 1 }]} />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  width: '100%',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  borderWidth: 2,
                  shadowColor: colors.card.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }
              ]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.button.primary} size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 12 }} />
                  <Text style={{
                    color: colors.text.primary,
                    fontSize: 16,
                    fontWeight: '600'
                  }}>
                    Đăng nhập bằng Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{ color: colors.text.secondary, fontSize: 14 }}>
                Chưa có tài khoản? 
              </Text>
              <TouchableOpacity 
                style={{ marginLeft: 4 }}
                onPress={() => navigation.navigate('Register' as never)}
              >
                <Text style={{
                  color: colors.text.accent,
                  fontSize: 14,
                  fontWeight: '600'
                }}>
                  Đăng ký
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={{ marginTop: 24, alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: colors.text.muted, fontSize: 12, textAlign: 'center' }}>
              Được phát triển bởi FitPass Technology
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}