// Debug script to check network detection
const Constants = require('expo-constants');

console.log('=== Network Debug Info ===');
console.log('__DEV__:', __DEV__);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Constants.manifest:', JSON.stringify(Constants.manifest, null, 2));
console.log('Constants.expoConfig:', JSON.stringify(Constants.expoConfig, null, 2));

// Test getAPIUrl logic
const getAPIUrl = () => {
  // Production check first
  if (process.env.NODE_ENV === 'production' || Constants.expoConfig?.extra?.IS_PRODUCTION) {
    const prodUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API || 
                   process.env.EXPO_PUBLIC_API ||
                   '';
    console.log('🚀 Production API URL:', prodUrl);
    return prodUrl;
  }
  
  // Development: Use Expo's automatic network detection
  if (__DEV__) {
    // Check config override first
    const configUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API;
    if (configUrl) {
      console.log('🔧 Using config API URL:', configUrl);
      return configUrl;
    }
    
    // Expo automatically detects the correct IP via manifest
    const { manifest } = Constants;
    if (manifest?.debuggerHost) {
      const host = manifest.debuggerHost.split(':')[0];
      const url = `http://${host}:3001/api`;
      console.log('🌐 Auto-detected API URL:', url);
      return url;
    }
    
    // Web platform fallback
    console.log('⚠️ Using fallback localhost - network may not be auto-detected');
    return 'http://localhost:3001/api';
  }
  
  // Staging or other environments
  return '/api';
};

console.log('Final API URL:', getAPIUrl());