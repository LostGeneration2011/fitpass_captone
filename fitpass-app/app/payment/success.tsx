import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { paymentAPI } from '../../lib/packageAPI';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { userPackageId, token } = useLocalSearchParams();

  useEffect(() => {
    handlePaymentSuccess();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      console.log('Payment success screen loaded');
      console.log('📦 UserPackageId:', userPackageId);
      console.log('🔑 Token:', token);

      if (token && userPackageId) {
        // Try to capture payment
        const captureResponse = await paymentAPI.capturePayPalPayment(token as string);
        
        if (captureResponse.success) {
          console.log('Payment captured successfully');
          
          // Redirect to packages with success message
          setTimeout(() => {
            router.replace('/student/packages?payment=success');
          }, 2000);
        } else {
          console.error('Payment capture failed:', captureResponse.message);
          setTimeout(() => {
            router.replace('/student/packages?payment=failed');
          }, 2000);
        }
      } else {
        console.log('⚠️ Missing required parameters');
        setTimeout(() => {
          router.replace('/student/packages');
        }, 2000);
      }
    } catch (error) {
      console.error('Payment success handling error:', error);
      setTimeout(() => {
        router.replace('/student/packages?payment=error');
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.title}>Đang xử lý thanh toán...</Text>
      <Text style={styles.message}>Vui lòng đợi trong giây lát</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});