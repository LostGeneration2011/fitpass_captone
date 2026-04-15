import dotenv from 'dotenv';

// Load environment variables (supports .env.local created by auto-manager)
dotenv.config({ path: '.env.local' });
dotenv.config();

export default {
  expo: {
    name: 'fitpass-app',
    slug: 'fitpass-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'fitpass',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.fitpass.app',
      googleServicesFile: './ios/GoogleService-Info.plist'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },
      package: 'com.fitpass.app',
      googleServicesFile: './android/app/google-services.json',
      intentFilters: [
        {
          action: 'VIEW',
          category: ['DEFAULT', 'BROWSABLE'],
          data: {
            scheme: 'fitpass'
          }
        }
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      // Production URLs (set via environment variables for builds)
      EXPO_PUBLIC_API: process.env.EXPO_PUBLIC_API, // Only set for production
      EXPO_PUBLIC_WS: process.env.EXPO_PUBLIC_WS,   // Only set for production
      // Dev URLs injected by auto-manager (.env.local)
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
      IS_PRODUCTION: process.env.NODE_ENV === 'production' || process.env.IS_PRODUCTION === 'true'
    },
    // Deep link configuration removed for simplified development flow
    linking: {
      config: {
        screens: {}
      }
    },
    plugins: [
      'expo-build-properties',
      'expo-font',
      'expo-router',
      'expo-secure-store',
      'expo-web-browser',
      '@react-native-firebase/app',
      '@react-native-firebase/messaging'
    ]
  }
};