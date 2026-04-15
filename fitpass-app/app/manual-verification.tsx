import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { authAPI, getAPIUrl } from '../lib/api';

export default function ManualVerificationScreen() {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleManualVerification = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter verification code');
      return;
    }

    // Extract token from QR code format "VERIFIED:token"
    let token = verificationCode.trim();
    if (token.startsWith('VERIFIED:')) {
      token = token.replace('VERIFIED:', '');
    }

    try {
      setLoading(true);
      
        // Call the verification endpoint directly
        const response = await fetch(`${getAPIUrl()}/auth/verify-email?token=${token}`);
      
      if (response.ok) {
          Toast.show({
            type: 'success',
            text1: 'Xác minh email thành công',
          text2: 'Your email has been verified successfully.',
          visibilityTime: 4000,
        });
        setVerificationCode('');
      } else {
        const errorData = await response.text();
        throw new Error('Verification failed');
      }
    } catch (error) {
      console.error('Manual verification error:', error);
      Alert.alert('Verification Failed', 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Manual Email Verification</Text>
        <Text style={styles.subtitle}>
          If automatic verification didn't work, paste your verification code here:
        </Text>

        <TextInput
          style={styles.input}
          value={verificationCode}
          onChangeText={setVerificationCode}
          placeholder="Paste verification code or 'VERIFIED:xxxx'"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleManualVerification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helpText}>
          You can find this code in the verification email or scan the QR code from the verification page.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
    minHeight: 80,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});