import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { sessionsAPI, classAPI, API_URL } from "../../lib/api";
import Constants from "expo-constants";
import { getUser } from "../../lib/auth";
import { useWebSocket } from "../../lib/WebSocketProvider";
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useThemeClasses } from "../../lib/theme";
import { useTheme } from "../../lib/theme";

// Simple base64 encode function for React Native
function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63) +
              chars.charAt((bitmap >> 12) & 63) +
              (i - 2 >= str.length ? '=' : chars.charAt((bitmap >> 6) & 63)) +
              (i - 1 >= str.length ? '=' : chars.charAt(bitmap & 63));
  }
  
  return result;
}

// Generate a secure nonce for QR payload
function generateNonce(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${random}_${Math.random().toString(36).substring(2, 15)}`;
}

// Get API base URL
function getApiBaseUrl(): string {
  const base = API_URL;
  return base.replace(/\/api$/, "");
}

// Build QR payload and encode it
function buildQRPayload(sessionId: string): string {
  const payload = {
    sessionId,
    nonce: generateNonce(),
    expiresAt: Date.now() + 15000 // 15 seconds from now
  };
  
  // Use react-native-base64 library
  const jsonString = JSON.stringify(payload);
  const encodedPayload = base64Encode(jsonString);
  return `${getApiBaseUrl()}/api/attendance/checkin?payload=${encodedPayload}`;
}

export default function TeacherQR() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as any) || {};
  
  // Ensure theme context is loaded
  const { isDark: isDarkTheme } = useTheme();
  
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [qrValue, setQrValue] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { isConnected, reconnect } = useWebSocket();
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [isDark]);

  // Generate new QR code
  const generateNewQR = () => {
    if (!selectedSession) return;
    
    const newQrValue = buildQRPayload(selectedSession.id);
    const newExpiresAt = Date.now() + 15000;
    
    setQrValue(newQrValue);
    setExpiresAt(newExpiresAt);
    
    console.log("🔍 Generated new QR for session:", selectedSession.id);
  };

  // Auto-refresh QR every 10 seconds (also depends on isDark to force re-render on theme change)
  useEffect(() => {
    if (!selectedSession) return;
    
    generateNewQR();
    const interval = setInterval(generateNewQR, 10000);
    
    return () => clearInterval(interval);
  }, [selectedSession, isDark]);

  // Load teacher sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const user = await getUser();
        if (!user?.id || user.role !== 'TEACHER') {
          console.log('Invalid user for QR:', user);
          setLoading(false);
          return;
        }

        const [allSessions, allClasses] = await Promise.all([
          sessionsAPI.getAll(),
          classAPI.getAll(),
        ]);

        // Filter teacher's classes
        const teacherClasses = Array.isArray(allClasses) 
          ? allClasses.filter((c: any) => c.teacherId === user.id)
          : [];
        
        // Filter teacher's sessions with ACTIVE + UPCOMING status
        const teacherSessions = Array.isArray(allSessions) 
          ? allSessions.filter((s: any) => {
              const statusUpper = s.status?.toUpperCase?.() || "";
              const isValidStatus = statusUpper === "ACTIVE" || statusUpper === "UPCOMING";
              const isTeacherClass = teacherClasses.some((c: any) => c.id === s.classId);
              return isValidStatus && isTeacherClass;
            })
          : [];
        
        console.log("🔍 QR - Valid sessions:", teacherSessions);
        setSessions(teacherSessions);
        
        // Auto-select if only one session
        if (teacherSessions.length === 1) {
          setSelectedSession(teacherSessions[0]);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  if (loading) {
    return (
      <SafeAreaView 
        style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className={`${textSecondary} mt-2`}>Đang tải các buổi học...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      key={`qr-theme-${isDark}-${forceUpdate}`}
      style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', flex: 1 }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 24, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
        {/* Header with connection status */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className={`${textPrimary} text-2xl font-bold`}>QR điểm danh</Text>
          <View className={`flex-row items-center px-3 py-1 rounded-full ${isConnected ? 'bg-green-800' : 'bg-red-800'}`}>
            <View className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <Text className={`text-xs font-medium ${isConnected ? 'text-green-200' : 'text-red-200'}`}>
              {isConnected ? 'Đã kết nối' : 'Ngoại tuyến'}
            </Text>
            {!isConnected && (
              <Pressable onPress={reconnect} className="ml-2">
                <Ionicons name="refresh" size={12} color="#fecaca" />
              </Pressable>
            )}
          </View>
        </View>

        {sessions.length === 0 ? (
          <View style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0', borderWidth: 1, borderRadius: 12, padding: 24, alignItems: 'center' }}>
            <Ionicons name="calendar-clear" size={48} color={isDark ? '#64748b' : '#94a3b8'} />
            <Text className={`${textSecondary} text-center mt-4 mb-2 text-lg`}>
              Không có buổi học hoạt động
            </Text>
            <Text className={`${textMuted} text-center`}>
              Không có buổi học HOẠT ĐỘNG hoặc SẮP TỚI. Hãy tạo hoặc bắt đầu một buổi học trước.
            </Text>
          </View>
        ) : !selectedSession ? (
          <>
            <Text className={`${textSecondary} text-lg mb-4`}>Chọn một buổi học:</Text>
            {sessions.map((session) => (
              <Pressable
                key={session.id}
                style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0', borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 }}
                onPress={() => setSelectedSession(session)}
              >
                <Text className={`${textPrimary} font-semibold text-lg`}>
                  {session.class?.name || "Buổi học"}
                </Text>
                <Text className={`${textSecondary} mt-1`}>
                  {new Date(session.startTime).toLocaleString()}
                </Text>
                <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, marginTop: 8, alignSelf: 'flex-start' }}>
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '500' }}>{session.status}</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : (
          <View style={{ alignItems: 'center' }}>
            {/* Session Info */}
            <View style={{ 
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#475569' : '#e2e8f0',
              borderWidth: 1,
              borderRadius: 12,
              padding: 24,
              width: '100%',
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}>
              <Text className={`${textPrimary} text-xl font-bold text-center`}>
                {selectedSession.class?.name || "Buổi học"}
              </Text>
              <Text className={`${textSecondary} text-center mt-2`}>
                {new Date(selectedSession.startTime).toLocaleString()}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
                <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 }}>
                  <Text style={{ color: '#ffffff', fontWeight: '500' }}>{selectedSession.status}</Text>
                </View>
              </View>
            </View>

            {/* QR Code */}
            <View style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              padding: 32,
              borderRadius: 12,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}>
              {qrValue ? (
                <QRCode
                  value={qrValue}
                  size={200}
                  color="black"
                  backgroundColor={isDark ? '#1e293b' : '#ffffff'}
                />
              ) : (
                <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#7c3aed" />
                </View>
              )}
            </View>

            {/* Instructions */}
            <View style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#475569' : '#e2e8f0',
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24
            }}>
              <Text className={`${textSecondary} text-center text-sm leading-5`}>
                QR tự động làm mới mỗi 10 giây.{"\n"}
                Yêu cầu học viên quét bằng ứng dụng FitPass.
              </Text>
            </View>

            {/* Controls */}
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable
                style={{
                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  borderWidth: 1,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  flex: 1
                }}
                onPress={() => setSelectedSession(null)}
              >
                <Text className={`${textPrimary} font-medium`} style={{ textAlign: 'center' }}>Đổi buổi học</Text>
              </Pressable>
              
              <Pressable
                style={{
                  backgroundColor: '#a855f7',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  flex: 1
                }}
                onPress={generateNewQR}
              >
                <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: '500' }}>Làm mới QR</Text>
              </Pressable>
            </View>
            
            {/* Navigation to Sessions */}
            {sessions.length > 0 && (
              <Pressable
                style={{
                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                  width: '100%'
                }}
                onPress={() => {
                  const firstSession = sessions[0];
                  if (firstSession?.classId && firstSession?.class?.name) {
                    (navigation as any).navigate('Sessions', {
                      classId: firstSession.classId,
                      className: firstSession.class.name
                    });
                  }
                }}
              >
                <Text className={`${textSecondary} font-semibold`} style={{ textAlign: 'center' }}>
                  Xem tất cả buổi học cho {sessions[0]?.class?.name}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}