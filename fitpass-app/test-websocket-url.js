// Quick test script to check WebSocket URL detection
import Constants from 'expo-constants';

console.log('=== WebSocket URL Test ===');
console.log('__DEV__:', __DEV__);
console.log('Platform.OS:', Platform?.OS || 'unknown');
console.log('Constants.manifest?.debuggerHost:', Constants.manifest?.debuggerHost);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Test the WebSocket URL generation
const getWebSocketUrl = () => {
  const configUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_WS;
  if (configUrl) {
    console.log('🔧 Using config WebSocket URL:', configUrl);
    return configUrl;
  }
  
  if (__DEV__) {
    const { manifest } = Constants;
    if (manifest?.debuggerHost) {
      const host = manifest.debuggerHost.split(':')[0];
      const wsUrl = `ws://${host}:3001/ws`;
      console.log('🌐 Fresh auto-detected WebSocket URL:', wsUrl);
      console.log('🔍 Based on debuggerHost:', manifest.debuggerHost);
      return wsUrl;
    }
    
    console.log('⚠️ Using fallback localhost WebSocket');
    return 'ws://localhost:3001/ws';
  }
  
  return 'ws://production-host/ws';
};

const websocketUrl = getWebSocketUrl();
console.log('Final WebSocket URL:', websocketUrl);
console.log('=== End Test ===');