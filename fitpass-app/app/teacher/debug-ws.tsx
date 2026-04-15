import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useWebSocket } from '../../lib/WebSocketProvider';

export default function DebugWSScreen() {
  const navigation = useNavigation();
  const { isConnected, reconnect } = useWebSocket();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // Collect debug information
    const info = {
      manifest: Constants.manifest,
      expoConfig: Constants.expoConfig,
      linkingUrl: Constants.linkingUrl,
      linkingUri: Constants.linkingUri,
      debuggerHost: Constants.manifest?.debuggerHost,
      hostUri: Constants.expoConfig?.hostUri,
      isConnected: isConnected,
    };
    setDebugInfo(info);
    console.log('🔍 WebSocket Debug Info:', info);
  }, [isConnected]);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between p-4 border-b border-slate-700">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">WebSocket Debug</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-slate-800 rounded-lg p-4 mb-4">
          <Text className="text-green-400 font-bold mb-2">WebSocket Status:</Text>
          <Text className={`text-lg font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}
          </Text>
        </View>

        <View className="bg-slate-800 rounded-lg p-4 mb-4">
          <Text className="text-blue-400 font-bold mb-2">Debug Information:</Text>
          <Text className="text-slate-300 font-mono text-xs">
            {JSON.stringify(debugInfo, null, 2)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => reconnect()}
          className="bg-blue-600 rounded-lg p-4 items-center"
        >
          <Text className="text-white font-bold">Reconnect WebSocket</Text>
        </TouchableOpacity>

        <View className="mt-4 bg-slate-800 rounded-lg p-4">
          <Text className="text-slate-400 text-xs">
            Check Expo console for detailed logs with 🌐 prefix for WebSocket URLs
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
