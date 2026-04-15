import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
import { authAPI, getAPIUrl, warmUpServer } from '../lib/api';
import { saveToken, saveUser } from '../lib/auth';
import { useWebSocket } from '../lib/WebSocketProvider';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const navigation = useNavigation();
  const { reconnect } = useWebSocket();

  // Warm up server when user opens register screen (fallback if they skipped welcome/login)
  useEffect(() => {
    warmUpServer();
  }, []);

  // Handle Google OAuth
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const backendUrl = getAPIUrl().replace('/api', '');
      // Pass the selected role and a timestamp to backend
      const timestamp = Date.now();
      const googleAuthUrl = `${backendUrl}/api/auth/google?role=${role}&ts=${timestamp}`;
      
      console.log('Opening Google OAuth:', googleAuthUrl, 'with role:', role);
      
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
          const userStr = params.get('user');
          
          if (token && userStr) {
            try {
              const user = JSON.parse(decodeURIComponent(userStr));
              await saveToken(token);
              await saveUser(user);
              reconnect();
              
              setGoogleLoading(false);
              
              Toast.show({
                type: 'success',
                text1: 'Đăng ký thành công',
                text2: `Chào mừng, ${user.fullName}! Bạn đã đăng ký là ${user.role === 'TEACHER' ? 'Giáo viên' : 'Học viên'}`,
                position: 'top'
              });
              
              // Navigate based on role
              setTimeout(() => {
                if (user.role === 'TEACHER') {
                  navigation.navigate('Teacher' as never);
                } else if (user.role === 'STUDENT') {
                  navigation.navigate('Student' as never);
                }
              }, 1500);
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
          text2: 'Bạn đã hủy đăng ký Google',
          position: 'top'
        });
        return;
      }
      
      // If we get here, something went wrong
      setGoogleLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Lỗi đăng ký',
        text2: 'Không thể hoàn tất đăng ký Google',
        position: 'top'
      });
    } catch (error) {
      console.error('Google Sign Up error:', error);
      setGoogleLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Lỗi Google Sign Up',
        text2: 'Không thể kết nối với Google. Vui lòng thử lại.',
        position: 'top'
      });
    }
  };

  // Real-time validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('');
    } else if (!emailRegex.test(email)) {
      setEmailError('Vui lòng nhập địa chỉ email hợp lệ');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('');
    } else if (password.length < 8) {
      setPasswordError('Mật khẩu phải có ít nhất 8 ký tự');
    } else if (!/(?=.*[a-z])/.test(password)) {
      setPasswordError('Mật khẩu phải có ít nhất một chữ cái thường');
    } else if (!/(?=.*[A-Z])/.test(password)) {
      setPasswordError('Mật khẩu phải có ít nhất một chữ cái hoa');
    } else if (!/(?=.*\d)/.test(password)) {
      setPasswordError('Mật khẩu phải có ít nhất một chữ số');
    } else if (!/(?=.*[@$!%*?&])/.test(password)) {
      setPasswordError('Mật khẩu phải có ít nhất một ký tự đặc biệt (@$!%*?&)');
    } else {
      setPasswordError('');
    }
  };

  const validateName = (name: string) => {
    if (!name) {
      setNameError('');
    } else if (name.length < 2) {
      setNameError('Tên phải có ít nhất 2 ký tự');
    } else {
      setNameError('');
    }
  };

  const handleRegister = async () => {
    // Final validation
    if (!fullName.trim()) {
      setNameError('Họ tên là bắt buộc');
      return;
    }
    if (!email.trim()) {
      setEmailError('Email là bắt buộc');
      return;
    }
    if (!password) {
      setPasswordError('Mật khẩu là bắt buộc');
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu không khớp',
        text2: 'Xác nhận mật khẩu không trùng khớp',
        position: 'top'
      });
      return;
    }
    if (emailError || passwordError || nameError) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi xác thực',
        text2: 'Vui lòng sửa các lỗi ở trên',
        position: 'top'
      });
      return;
    }

    setLoading(true);

    // After 8s without a response, hint that the server is cold-starting
    // After 20s without a response, hint that server is still booting
    // (should be rare if warmUpServer() fired earlier on welcome/login screen)
    const slowHintTimer = setTimeout(() => {
      Toast.show({
        type: 'info',
        text1: 'Server đang khởi động...',
        text2: 'Vui lòng đợi, có thể mất thêm vài giây.',
        position: 'top',
        visibilityTime: 15000,
      });
    }, 20000);

    try {
      console.log('Attempting registration with:', { fullName, email, role });
      
      const response = await authAPI.register(fullName.trim(), email.trim(), password, role);
      clearTimeout(slowHintTimer);
      console.log('Registration response:', response);

      // Always show success message about email verification
      Toast.show({
        type: 'success',
        text1: 'Đăng ký thành công',
        text2: 'Vui lòng kiểm tra email để xác thực tài khoản',
        position: 'top',
        visibilityTime: 5000
      });

      // Show detailed instructions
      setTimeout(() => {
        Toast.show({
          type: 'info',
            text1: 'Kiểm tra email của bạn',
          text2: `Email xác thực đã được gửi đến ${email.trim()}. Hãy nhấp vào liên kết để kích hoạt tài khoản.`,
          position: 'top',
          visibilityTime: 7000
        });
      }, 2000);
      
      // Navigate back to login after delay
      setTimeout(() => {
        navigation.goBack();
      }, 3000);
    } catch (error: any) {
      clearTimeout(slowHintTimer);
      console.error('Registration error:', error);
      // Account exists but unverified — backend already resent verification email
      if ((error as any).code === 'UNVERIFIED_RESENT' || error.message?.includes('not verified')) {
        Toast.show({
          type: 'info',
          text1: 'Email chưa được xác thực',
          text2: 'Chúng tôi đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.',
          position: 'top',
          visibilityTime: 7000
        });
        setTimeout(() => navigation.goBack(), 3500);
        return;
      }
      Toast.show({
        type: 'error',
        text1: 'Đăng ký thất bại',
        text2: error.message || 'Không thể tạo tài khoản. Vui lòng thử lại.',
        position: 'top'
      });
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center items-center px-6 py-8">
            
            {/* Header */}
            <View className="items-center mb-8">
              <View 
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{
                  backgroundColor: '#8b5cf6',
                  shadowColor: '#8b5cf6',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 12,
                }}
              >
                <Ionicons name="rocket-outline" size={32} color="#fff" />
              </View>
              <Text className="text-3xl font-bold text-white mb-2">
                Tham gia FitPass
              </Text>
              <Text className="text-lg text-slate-300 text-center leading-6">
                Tạo tài khoản và bắt đầu hành trình thể dục của bạn
              </Text>
            </View>

            {/* Registration Form */}
            <View className="w-full max-w-sm">
              <View className="bg-slate-800 rounded-3xl p-6"
                   style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 8 },
                     shadowOpacity: 0.3,
                     shadowRadius: 16,
                     borderWidth: 1,
                     borderColor: '#475569',
                   }}>
                
                {/* Role Selection */}
                <View className="mb-6">
                  <Text className="text-slate-300 font-semibold mb-3">Tôi là:</Text>
                  <View className="flex-row space-x-3">
                    <TouchableOpacity
                      className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                        role === 'STUDENT' 
                          ? 'bg-blue-600 border-blue-500' 
                          : 'bg-slate-700 border-slate-600'
                      }`}
                      onPress={() => setRole('STUDENT')}
                    >
                      <Text className={`text-center font-semibold ${
                        role === 'STUDENT' ? 'text-white' : 'text-slate-300'
                      }`}>
                        🎯 Học viên
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                        role === 'TEACHER' 
                          ? 'bg-purple-600 border-purple-500' 
                          : 'bg-slate-700 border-slate-600'
                      }`}
                      onPress={() => setRole('TEACHER')}
                    >
                      <Text className={`text-center font-semibold ${
                        role === 'TEACHER' ? 'text-white' : 'text-slate-300'
                      }`}>
                        👨‍🏫 Giáo viên
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Full Name */}
                <View className="mb-4">
                  <Text className="text-slate-300 font-semibold mb-2">Họ và tên</Text>
                  <TextInput
                    className={`w-full px-4 py-4 bg-slate-700 rounded-xl border text-white font-medium ${
                      nameError ? 'border-red-500' : 'border-slate-600'
                    } ${loading ? 'opacity-50' : ''}`}
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      validateName(text);
                    }}
                    placeholder="Nhập họ và tên của bạn"
                    placeholderTextColor="#94a3b8"
                    editable={!loading}
                    autoCapitalize="words"
                  />
                  {nameError ? (
                    <Text className="text-red-400 text-xs mt-1 ml-1">{nameError}</Text>
                  ) : null}
                </View>

                {/* Email */}
                <View className="mb-4">
                  <Text className="text-slate-300 font-semibold mb-2">Email</Text>
                  <TextInput
                    className={`w-full px-4 py-4 bg-slate-700 rounded-xl border text-white font-medium ${
                      emailError ? 'border-red-500' : 'border-slate-600'
                    } ${loading ? 'opacity-50' : ''}`}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      validateEmail(text);
                    }}
                    placeholder="Nhập địa chỉ email của bạn"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  {emailError ? (
                    <Text className="text-red-400 text-xs mt-1 ml-1">{emailError}</Text>
                  ) : null}
                </View>

                {/* Password */}
                <View className="mb-4">
                  <Text className="text-slate-300 font-semibold mb-2">Mật khẩu</Text>
                  <View className="relative">
                    <TextInput
                      className={`w-full px-4 py-4 bg-slate-700 rounded-xl border text-white font-medium pr-12 ${
                        passwordError ? 'border-red-500' : 'border-slate-600'
                      } ${loading ? 'opacity-50' : ''}`}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        validatePassword(text);
                      }}
                      placeholder="Tạo mật khẩu mới"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      className="absolute right-4 top-4"
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color="#94a3b8" 
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? (
                    <Text className="text-red-400 text-xs mt-1 ml-1">{passwordError}</Text>
                  ) : (
                    <Text className="text-slate-400 text-xs mt-1 ml-1">
                      💡 Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)
                    </Text>
                  )}
                  
                  {/* Password Strength Indicator */}
                  {password && !passwordError ? (
                    <View className="mt-2 ml-1">
                      <View className="flex-row items-center">
                        <View className="flex-row space-x-1 flex-1">
                          <View className={`h-1 flex-1 rounded ${password.length >= 8 ? 'bg-green-500' : 'bg-slate-600'}`} />
                          <View className={`h-1 flex-1 rounded ${/(?=.*[a-z])(?=.*[A-Z])/.test(password) ? 'bg-green-500' : 'bg-slate-600'}`} />
                          <View className={`h-1 flex-1 rounded ${/(?=.*\d)/.test(password) ? 'bg-green-500' : 'bg-slate-600'}`} />
                          <View className={`h-1 flex-1 rounded ${/(?=.*[@$!%*?&])/.test(password) ? 'bg-green-500' : 'bg-slate-600'}`} />
                        </View>
                        <Text className="text-green-400 text-xs ml-2">Mạnh 💪</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Confirm Password */}
                <View className="mb-6">
                  <Text className="text-slate-300 font-semibold mb-2">Xác nhận mật khẩu</Text>
                  <View className="relative">
                    <TextInput
                      className={`w-full px-4 py-4 bg-slate-700 rounded-xl border text-white font-medium pr-12 ${
                        confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-slate-600'
                      } ${loading ? 'opacity-50' : ''}`}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Nhập lại mật khẩu của bạn"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      className="absolute right-4 top-4"
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons 
                        name={showConfirmPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color="#94a3b8" 
                      />
                    </TouchableOpacity>
                  </View>
                  {confirmPassword && password !== confirmPassword ? (
                    <Text className="text-red-400 text-xs mt-1 ml-1">Mật khẩu không trùng khớp</Text>
                  ) : null}
                </View>

                {/* Register Button */}
                <TouchableOpacity
                  className="w-full py-4 rounded-xl items-center mb-4"
                  style={!loading ? {
                    backgroundColor: role === 'STUDENT' ? '#3B82F6' : '#8B5CF6',
                    shadowColor: role === 'STUDENT' ? '#3B82F6' : '#8B5CF6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  } : { backgroundColor: '#64748b' }}
                  onPress={handleRegister}
                  disabled={loading || !fullName || !email || !password || !confirmPassword || !!emailError || !!passwordError || !!nameError}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white text-lg font-bold">
                      Tạo tài khoản
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider with text */}
                <View className="flex-row items-center mb-4">
                  <View className="flex-1 h-px bg-slate-600" />
                  <Text className="mx-3 text-slate-400 text-sm">Hoặc</Text>
                  <View className="flex-1 h-px bg-slate-600" />
                </View>

                {/* Google Sign Up Button */}
                <TouchableOpacity
                  className="w-full py-4 rounded-xl items-center mb-4 bg-white border-2 border-slate-200 flex-row justify-center"
                  onPress={handleGoogleSignUp}
                  disabled={googleLoading || loading}
                  style={{ opacity: googleLoading || loading ? 0.6 : 1 }}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#1f2937" size="small" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 10 }} />
                      <Text className="text-gray-800 text-base font-bold">
                        Đăng ký với Google
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Login Link */}
                <TouchableOpacity
                  className="items-center py-2"
                  onPress={goToLogin}
                  disabled={loading || googleLoading}
                >
                  <Text className="text-slate-400 text-sm">
                    Đã có tài khoản? {' '}
                    <Text className="text-blue-400 font-semibold">Đăng nhập</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View className="mt-8 items-center">
              <Text className="text-slate-500 text-sm text-center">
                Bằng cách tạo tài khoản, bạn đồng ý với{'\n'}Điều khoản dịch vụ và Chính sách bảo mật
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}