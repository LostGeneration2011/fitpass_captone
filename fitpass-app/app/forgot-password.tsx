import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { apiPost } from '../lib/api';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
      });
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Sending forgot password request for:', email);
      await apiPost('/auth/forgot-password', { email });
      
      setSuccess(true);
      Toast.show({
        type: 'success',
        text1: 'Đã gửi email',
        text2: 'Vui lòng kiểm tra hộp thư để đặt lại mật khẩu',
        visibilityTime: 5000,
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      Toast.show({
        type: 'error',
        text1: 'Request Failed',
        text2: error.message || 'Unable to send reset email',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    (navigation as any).navigate('Login');
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          className="flex-1"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex-1 px-6 py-8 justify-center">
              {/* Header */}
              <View className="items-center mb-12">
                <View className="bg-green-600 p-6 rounded-full mb-6"
                      style={{
                        shadowColor: '#16a34a',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.4,
                        shadowRadius: 16,
                      }}>
                  <Ionicons name="checkmark" size={48} color="#fff" />
                </View>
                <Text className="text-3xl font-bold text-white text-center mb-4">
                  Đã gửi email đặt lại mật khẩu
                </Text>
                <Text className="text-lg text-slate-300 text-center leading-relaxed">
                  We've sent password reset instructions to{'\n'}
                  <Text className="text-cyan-400 font-semibold">{email}</Text>
                </Text>
              </View>

              {/* Instructions */}
              <View className="bg-slate-800 rounded-xl p-6 mb-8"
                    style={{
                      borderWidth: 1,
                      borderColor: '#475569',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }}>
                <Text className="text-white font-semibold text-lg mb-4">Hướng dẫn tiếp theo</Text>
                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <View className="bg-blue-600 w-6 h-6 rounded-full items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">1</Text>
                    </View>
                    <Text className="text-slate-300 flex-1">Check your email inbox</Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="bg-purple-600 w-6 h-6 rounded-full items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">2</Text>
                    </View>
                    <Text className="text-slate-300 flex-1">Click the reset password link</Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="bg-green-600 w-6 h-6 rounded-full items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">3</Text>
                    </View>
                    <Text className="text-slate-300 flex-1">Create your new password</Text>
                  </View>
                </View>
              </View>

              {/* Warning */}
              <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="time" size={20} color="#f59e0b" />
                  <Text className="text-amber-400 font-semibold ml-2">Important:</Text>
                </View>
                <Text className="text-amber-200 text-sm leading-relaxed">
                  The reset link will expire in 1 hour for security reasons. 
                  If you don't see the email, check your spam folder.
                </Text>
              </View>

              {/* Actions */}
              <View className="space-y-4">
                <TouchableOpacity 
                  onPress={handleBackToLogin}
                  className="bg-blue-600 rounded-xl py-4 items-center"
                  style={{
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}>
                  <Text className="text-white text-lg font-semibold">Back to Login</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => setSuccess(false)}
                  className="bg-slate-700 rounded-xl py-4 items-center border border-slate-600">
                  <Text className="text-slate-300 text-lg font-semibold">Send Another Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 px-6 py-8">
            {/* Header with Back Button */}
            <View className="flex-row items-center justify-between mb-8">
              <TouchableOpacity 
                onPress={handleBackToLogin}
                className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <Ionicons name="arrow-back" size={24} color="#94a3b8" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-white">Forgot Password</Text>
              <View className="w-12" />
            </View>

            {/* Icon and Title */}
            <View className="items-center mb-12">
              <View className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-full mb-6"
                    style={{
                      shadowColor: '#3b82f6',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.4,
                      shadowRadius: 16,
                    }}>
                <Ionicons name="lock-closed" size={48} color="#fff" />
              </View>
              <Text className="text-3xl font-bold text-white text-center mb-4">
                Reset Your Password 🔐
              </Text>
              <Text className="text-lg text-slate-300 text-center leading-relaxed">
                Enter your email address and we'll send you instructions to reset your password.
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-6 mb-8">
              <View>
                <Text className="text-white font-semibold mb-3 text-lg">Email Address</Text>
                <View className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-4 flex-row items-center">
                  <Ionicons name="mail" size={24} color="#64748b" />
                  <TextInput
                    className="flex-1 text-white text-lg ml-3"
                    placeholder="Enter your email address"
                    placeholderTextColor="#64748b"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              onPress={handleForgotPassword}
              disabled={loading || !email.trim()}
              className={`rounded-xl py-4 items-center mb-6 ${
                loading || !email.trim() 
                  ? 'bg-slate-600' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600'
              }`}
              style={{
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loading ? 0.1 : 0.3,
                shadowRadius: 8,
              }}>
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white text-lg font-semibold ml-3">Sending Email...</Text>
                </View>
              ) : (
                <Text className="text-white text-lg font-semibold">Send Reset Email</Text>
              )}
            </TouchableOpacity>

            {/* Security Note */}
            <View className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
                <Text className="text-blue-400 font-semibold ml-2">Security Note</Text>
              </View>
              <Text className="text-slate-300 text-sm leading-relaxed">
                For your security, password reset links expire after 1 hour. 
                If you don't receive an email, check your spam folder or try again.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}