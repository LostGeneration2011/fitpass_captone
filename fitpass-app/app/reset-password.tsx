import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword, validateResetToken } from '../lib/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      setValidating(true);
      if (!token) {
        Alert.alert('Error', 'No reset token provided');
        router.replace('/login');
        return;
      }

      const response = await validateResetToken(token as string);
      if (response.success) {
        setTokenValid(true);
      } else {
        Alert.alert('Invalid Link', 'This password reset link has expired or is invalid.', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      Alert.alert('Error', 'Unable to validate reset token. Please try again.', [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]);
    } finally {
      setValidating(false);
    }
  };

  const handleResetPassword = async () => {
    // Validation
    if (!password) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      
      const response = await resetPassword(token as string, password);
      
      if (response.success || response.message) {
          Alert.alert('Đổi mật khẩu thành công', 'Mật khẩu của bạn đã được đặt lại.', [
            { text: 'Login Now', onPress: () => router.replace('/login') }
          ]);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert(
        'Reset Failed', 
        error.message || 'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Validating reset link...</Text>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="close-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Invalid Reset Link</Text>
        <Text style={styles.errorMessage}>This password reset link has expired or is invalid.</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={32} color="#4F46E5" />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Create your new password below</Text>
        </View>

        <View style={styles.form}>
          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Minimum 6 characters</Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Reset Button */}
          <TouchableOpacity 
            style={[styles.resetButton, loading && styles.resetButtonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.loginButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#EEF2FF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 12,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  resetButton: {
    backgroundColor: '#4F46E5',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '500',
  },
});