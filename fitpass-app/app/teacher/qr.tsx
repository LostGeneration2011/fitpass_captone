import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, SafeAreaView, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { sessionsAPI, classAPI, qrAPI, API_URL } from "../../lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUser } from "../../lib/auth";
import { useWebSocket } from "../../lib/WebSocketProvider";
import { useNavigation } from '@react-navigation/native';
import { useThemeClasses } from "../../lib/theme";
import { useTheme } from "../../lib/theme";

const QR_FILTER_STORAGE_KEY = 'teacher_qr_filters_v1';

// Get API base URL
function getApiBaseUrl(): string {
  const base = API_URL;
  return base.replace(/\/api$/, "");
}

function buildSignedQRUrl(token: string): string {
  return `${getApiBaseUrl()}/api/attendance/checkin?token=${encodeURIComponent(token)}`;
}

export default function TeacherQR() {
  const navigation = useNavigation();
  
  // Ensure theme context is loaded
  const { isDark: isDarkTheme } = useTheme();
  
  const {
    isDark,
    screenClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const [sessions, setSessions] = useState<any[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [qrValue, setQrValue] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { isConnected, reconnect } = useWebSocket();
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [isDark]);

  useEffect(() => {
    const hydrateFilters = async () => {
      try {
        const stored = await AsyncStorage.getItem(QR_FILTER_STORAGE_KEY);
        if (!stored) {
          setFiltersHydrated(true);
          return;
        }

        const parsed = JSON.parse(stored);
        if (typeof parsed?.selectedClassId === 'string') {
          setSelectedClassId(parsed.selectedClassId);
        }
        if (typeof parsed?.searchQuery === 'string') {
          setSearchQuery(parsed.searchQuery);
        }
      } catch (storageError) {
        console.log('[TeacherQR] Unable to hydrate filters:', storageError);
      } finally {
        setFiltersHydrated(true);
      }
    };

    hydrateFilters();
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    AsyncStorage.setItem(
      QR_FILTER_STORAGE_KEY,
      JSON.stringify({
        selectedClassId,
        searchQuery,
      })
    ).catch((storageError) => {
      console.log('[TeacherQR] Unable to persist filters:', storageError);
    });
  }, [selectedClassId, searchQuery, filtersHydrated]);

  // Request signed QR token from server and build QR URL.
  const generateNewQR = async () => {
    if (!selectedSession) return;

    try {
      const response = await qrAPI.startSession(selectedSession.id);
      const token = response?.qr;
      if (!token) {
        throw new Error('QR token missing from server response');
      }

      setQrValue(buildSignedQRUrl(token));

      console.log("🔍 Generated signed QR for session:", selectedSession.id);
    } catch (error) {
      console.error('Failed to generate signed QR:', error);
    }
  };

  // Auto-refresh QR every 10 seconds (also depends on isDark to force re-render on theme change)
  useEffect(() => {
    if (!selectedSession) return;
    
    generateNewQR();
    const interval = setInterval(() => {
      generateNewQR();
    }, 4 * 60 * 1000);
    
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
          sessionsAPI.getAll(user.id),
          classAPI.getAll(user.id),
        ]);

        // Filter teacher's classes
        const teacherClasses = Array.isArray(allClasses) 
          ? allClasses.filter((c: any) => c.teacherId === user.id)
          : [];
        setTeacherClasses(teacherClasses);
        
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

  const filteredSessions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sessions
      .filter((session) => {
        if (selectedClassId !== 'ALL' && session.classId !== selectedClassId) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const classLabel = (session.class?.name || '').toLowerCase();
        const dateLabel = new Date(session.startTime).toLocaleDateString().toLowerCase();
        return classLabel.includes(normalizedQuery) || dateLabel.includes(normalizedQuery);
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessions, selectedClassId, searchQuery]);

  const groupedSessions = useMemo(() => {
    const grouped = new Map<string, { title: string; data: any[] }>();

    filteredSessions.forEach((session) => {
      const key = session.classId || 'unknown';
      const current = grouped.get(key);
      if (current) {
        current.data.push(session);
        return;
      }

      grouped.set(key, {
        title: session.class?.name || 'Lớp không xác định',
        data: [session],
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  }, [filteredSessions]);

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
            <View
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#475569' : '#e2e8f0',
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  marginBottom: 10,
                }}
              >
                <Ionicons name="search" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Tìm lớp hoặc ngày học..."
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                  className={`${textPrimary} flex-1 py-2 px-2`}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: selectedClassId === 'ALL' ? '#2563eb' : isDark ? '#334155' : '#e2e8f0',
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginRight: 8,
                    }}
                    onPress={() => setSelectedClassId('ALL')}
                  >
                    <Text style={{ color: selectedClassId === 'ALL' ? '#fff' : isDark ? '#cbd5e1' : '#334155', fontSize: 12, fontWeight: '600' }}>
                      Tất cả lớp
                    </Text>
                  </TouchableOpacity>

                  {teacherClasses.map((teacherClass: any) => {
                    const active = selectedClassId === teacherClass.id;
                    return (
                      <TouchableOpacity
                        key={teacherClass.id}
                        style={{
                          backgroundColor: active ? '#2563eb' : isDark ? '#334155' : '#e2e8f0',
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          marginRight: 8,
                        }}
                        onPress={() => setSelectedClassId(teacherClass.id)}
                      >
                        <Text style={{ color: active ? '#fff' : isDark ? '#cbd5e1' : '#334155', fontSize: 12, fontWeight: '600' }}>
                          {teacherClass.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: isDark ? '#475569' : '#cbd5e1',
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                    onPress={() => {
                      setSelectedClassId('ALL');
                      setSearchQuery('');
                    }}
                  >
                    <Text className={`${textSecondary} text-xs`}>Đặt lại</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>

            <Text className={`${textMuted} mb-3`}>
              {groupedSessions.length} lớp, {filteredSessions.length} buổi phù hợp
            </Text>

            {groupedSessions.map((group) => (
              <View key={group.title} style={{ marginBottom: 12 }}>
                <View
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text className={`${textPrimary} font-semibold`}>
                    {group.title} ({group.data.length})
                  </Text>
                </View>

                {group.data.map((session) => (
                  <Pressable
                    key={session.id}
                    style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#e2e8f0', borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 8 }}
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
              </View>
            ))}

            {filteredSessions.length === 0 && (
              <View
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#475569' : '#e2e8f0',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 20,
                  alignItems: 'center',
                }}
              >
                <Text className={`${textSecondary} text-center`}>
                  Không có buổi học phù hợp với bộ lọc hiện tại.
                </Text>
              </View>
            )}
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
                  <Text className={`${textMuted} mt-2`}>Đang tạo QR bảo mật...</Text>
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
                QR bảo mật tự động làm mới trước khi hết hạn (5 phút).{"\n"}
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
                  if (selectedSession?.classId && selectedSession?.class?.name) {
                    (navigation as any).navigate('Sessions', {
                      classId: selectedSession.classId,
                      className: selectedSession.class.name
                    });
                  }
                }}
              >
                <Text className={`${textSecondary} font-semibold`} style={{ textAlign: 'center' }}>
                  Xem tất cả buổi học cho {selectedSession?.class?.name}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}