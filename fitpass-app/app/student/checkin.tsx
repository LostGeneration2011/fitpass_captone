import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import { getUser, getToken } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { useThemeClasses } from '../../lib/theme';
import Constants from 'expo-constants';
import { API_URL } from '../../lib/api';

function getApiBaseUrl(): string {
  const base = API_URL;
  return base.replace(/\/api$/, "");
}

export default function StudentCheckInScreen() {
  const { isDark } = useTheme();
  const { textPrimary, textSecondary, textMuted } = useThemeClasses();
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [isDark]);

  const processQRData = async (qrData: string) => {
    if (loading) return;
    
    setLoading(true);

    try {
      console.log('Processing QR data:', qrData);
      
      // Validate that this is a FitPass checkin URL
      const apiBaseUrl = getApiBaseUrl();
      if (!qrData.startsWith(`${apiBaseUrl}/api/attendance/checkin`)) {
        throw new Error('Invalid QR code. Please scan a FitPass attendance QR code.');
      }

      // Get auth token and user
      const token = await getToken();
      const user = await getUser();
      
      if (!token || !user || user.role !== 'STUDENT') {
        throw new Error('You must be logged in as a student to check in.');
      }

      // Call the backend URL directly
      const response = await fetch(qrData, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Check-in failed');
      }

      Alert.alert(
        'Success!', 
        result.message || 'Checked in successfully',
        [{ text: 'OK', onPress: () => {
          setQrInput('');
          setCameraModalVisible(false);
          setScanned(false);
        }}]
      );

    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert('Check-in Error', error.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = (scanningResult: any) => {
    if (scanned || !scanningResult?.data) return;
    
    setScanned(true);
    setCameraModalVisible(false);
    processQRData(scanningResult.data);
  };

  const handleManualEntry = async () => {
    if (!qrInput.trim()) {
      Alert.alert('Error', 'Please enter a QR code URL');
      return;
    }

    await processQRData(qrInput);
  };

  const openCamera = async () => {
    if (!permission) {
      Alert.alert('Permission Required', 'Requesting camera permission...');
      return;
    }
    
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('No Camera Access', 'Camera permission is required to scan QR codes. Please enable camera access in your device settings.');
        return;
      }
    }

    setScanned(false);
    setCameraModalVisible(true);
  };

  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className={textSecondary} style={{ marginTop: 8 }}>Please allow camera permissions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      key={`checkin-${isDark}-${forceUpdate}`}
      style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 24, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
        <Text className={`${textPrimary} font-bold`} style={{ fontSize: 24, marginBottom: 24 }}>Điểm danh</Text>
        
        {/* QR Scanner Section */}
        <View style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#475569' : '#e2e8f0',
          borderWidth: 1,
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="qr-code-outline" size={64} color="#3b82f6" />
            <Text className={`${textPrimary} font-semibold`} style={{ fontSize: 20, marginTop: 16, marginBottom: 8 }}>
              Scan QR Code
            </Text>
            <Text className={textMuted} style={{ textAlign: 'center' }}>
              Use your device camera to scan the attendance QR code from your teacher
            </Text>
          </View>
          
          <TouchableOpacity
            style={{
              backgroundColor: '#a855f7',
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 24,
              alignItems: 'center'
            }}
            onPress={openCamera}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="camera" size={24} color="white" />
                <Text style={{ color: '#ffffff', fontWeight: '600', marginTop: 8 }}>Open Camera</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Manual Entry Section */}
        <View style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#475569' : '#e2e8f0',
          borderWidth: 1,
          borderRadius: 12,
          padding: 24
        }}>
          <Text className={`${textPrimary} font-semibold`} style={{ fontSize: 18, marginBottom: 16 }}>
            Manual Entry (Fallback)
          </Text>
          <Text className={textMuted} style={{ fontSize: 14, marginBottom: 16 }}>
            If camera scanning doesn't work, you can manually paste the QR code URL here
          </Text>
          
          <TextInput
            style={{
              backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
              color: isDark ? '#ffffff' : '#0f172a',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#cbd5e1'
            }}
            placeholder="Paste QR code URL here..."
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={qrInput}
            onChangeText={setQrInput}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={true}
            numberOfLines={3}
          />
          
          <TouchableOpacity
            style={{
              backgroundColor: '#10b981',
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 24,
              alignItems: 'center'
            }}
            onPress={handleManualEntry}
            disabled={loading || !qrInput.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={{ color: '#ffffff', fontWeight: '600', marginTop: 8 }}>Check In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={cameraModalVisible}
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#0f172a' }}>
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '600' }}>Scan QR Code</Text>
                <TouchableOpacity 
                  onPress={() => setCameraModalVisible(false)}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              {permission?.granted && (
                <CameraView
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
              )}
              
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 16 }}>
                <Text style={{ color: '#ffffff', textAlign: 'center', marginBottom: 8 }}>
                  Position the QR code within the camera frame
                </Text>
                {scanned && (
                  <TouchableOpacity
                    style={{ backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' }}
                    onPress={() => setScanned(false)}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '600' }}>Tap to Scan Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}