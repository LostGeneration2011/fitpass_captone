import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { sessionsAPI } from "../../../lib/api";
import Toast from "react-native-toast-message";

export default function SessionDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params as { id: string };
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      setLoading(true);
      if (typeof id === 'string') {
        const sessionData = await sessionsAPI.getById(id);
        setSession(sessionData);
      }
    } catch (err) {
      console.log("❌ Error loading session:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text className="text-white mt-4">Đang tải thông tin buổi học...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-white text-lg">Không tìm thấy buổi học</Text>
        <Pressable onPress={() => navigation.goBack()} className="bg-blue-600 px-6 py-3 rounded-lg mt-4">
          <Text className="text-white font-semibold">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950 p-4">
      <View className="flex-row items-center mb-6">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text className="text-white text-xl font-bold">Chi tiết buổi học</Text>
      </View>

      <View className="bg-slate-900 p-6 rounded-xl mb-4">
        <Text className="text-white text-xl font-bold mb-2">{session.class?.name || session.className || 'Buổi học'}</Text>
        <Text className="text-slate-300 mb-4">{session.description || 'Không có mô tả'}</Text>

        <View className="space-y-3">
          <View className="flex-row items-center">
            <Ionicons name="calendar" size={20} color="#94a3b8" />
            <Text className="text-slate-300 ml-3">
              {new Date(session.startTime || session.scheduledAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="time" size={20} color="#94a3b8" />
            <Text className="text-slate-300 ml-3">
              {new Date(session.startTime || session.scheduledAt).toLocaleTimeString('vi-VN')}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="flag" size={20} color="#94a3b8" />
            <Text className="text-slate-300 ml-3">Trạng thái: {session.status}</Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="people" size={20} color="#94a3b8" />
            <Text className="text-slate-300 ml-3">
              Điểm danh: {session._count?.attendances || 0}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="id-card" size={20} color="#94a3b8" />
            <Text className="text-slate-300 ml-3">Mã buổi học: {session.id}</Text>
          </View>
        </View>
      </View>

      <View className="space-y-3">
        <Pressable
          className="bg-blue-600 p-4 rounded-xl"
          onPress={() =>
            (navigation as any).navigate('QR', {
              sessionId: session.id,
              className: session.class?.name || session.className || '',
              startTime: session.startTime || session.scheduledAt,
            })
          }
        >
          <Text className="text-white text-center font-bold">Tạo mã QR</Text>
        </Pressable>

        <Pressable
          className="bg-green-600 p-4 rounded-xl"
          onPress={() =>
            (navigation as any).navigate('AttendanceView', { sessionId: session.id })
          }
        >
          <Text className="text-white text-center font-bold">Xem điểm danh</Text>
        </Pressable>

        <Pressable
          className="bg-slate-700 p-4 rounded-xl border border-slate-600"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-slate-300 text-center font-bold">Quay lại danh sách</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}