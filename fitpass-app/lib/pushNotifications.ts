import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import { authAPI } from './api';
import { getToken } from './auth';

const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const hasRnfbAppModule = Boolean((NativeModules as Record<string, unknown>).RNFBAppModule);

type MessagingApi = {
  AuthorizationStatus: {
    AUTHORIZED: number;
    PROVISIONAL: number;
  };
  (): {
    requestPermission: () => Promise<number>;
    getToken: () => Promise<string>;
    onTokenRefresh: (listener: (token: string) => void) => () => void;
  };
};

let cachedMessaging: MessagingApi | null | undefined;
let hasLoggedUnavailable = false;

const getMessaging = (): MessagingApi | null => {
  if (!isNativeMobile) return null;
  if (cachedMessaging !== undefined) return cachedMessaging;

  if (isExpoGo || !hasRnfbAppModule) {
    cachedMessaging = null;
    if (!hasLoggedUnavailable) {
      hasLoggedUnavailable = true;
      if (isExpoGo) {
        console.warn('[Push] Skipping RN Firebase Messaging on Expo Go runtime.');
      } else {
        console.warn('[Push] RNFBAppModule is missing in current build. Push registration skipped.');
      }
      console.warn('[Push] Build a native/dev client app to enable FCM token registration.');
    }
    return null;
  }

  try {
    // Use dynamic require so app does not crash in Expo Go when RNFB native modules are unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleRef = require('@react-native-firebase/messaging');
    const messagingFactory = (moduleRef?.default || moduleRef) as MessagingApi;

    // Probe once to ensure native bridge is actually available in this runtime.
    try {
      messagingFactory();
    } catch (probeError) {
      cachedMessaging = null;
      if (!hasLoggedUnavailable) {
        hasLoggedUnavailable = true;
        console.warn('[Push] RN Firebase Messaging package loaded but native bridge is unavailable.');
        console.warn('[Push] Push registration will be skipped in this runtime.');
      }
      return null;
    }

    cachedMessaging = messagingFactory;
    return cachedMessaging;
  } catch (error) {
    cachedMessaging = null;
    if (!hasLoggedUnavailable) {
      hasLoggedUnavailable = true;
      console.warn('[Push] Failed to load RN Firebase Messaging package in current runtime.');
      console.warn('[Push] Use an EAS/dev build to enable native Firebase modules.');
    }
    return null;
  }
};

type PushPlatform = 'ios' | 'android';

const resolvePlatform = (): PushPlatform => (Platform.OS === 'ios' ? 'ios' : 'android');

export const registerFcmTokenWithBackend = async (): Promise<string | null> => {
  if (!isNativeMobile) return null;

  const messaging = getMessaging();
  if (!messaging) return null;

  try {
    const authToken = await getToken();
    if (!authToken) return null;

    const permission = await messaging().requestPermission();
    const granted =
      permission === messaging.AuthorizationStatus.AUTHORIZED ||
      permission === messaging.AuthorizationStatus.PROVISIONAL;

    if (!granted) {
      console.log('[Push] Notification permission was not granted');
      return null;
    }

    const fcmToken = await messaging().getToken();
    if (!fcmToken) return null;

    await authAPI.saveFcmToken(fcmToken, resolvePlatform());
    console.log('[Push] FCM token synced to backend');
    return fcmToken;
  } catch (error) {
    console.warn('[Push] Failed to register FCM token:', error);
    return null;
  }
};

export const subscribeFcmTokenRefresh = () => {
  if (!isNativeMobile) {
    return () => undefined;
  }

  const messaging = getMessaging();
  if (!messaging) {
    return () => undefined;
  }

  return messaging().onTokenRefresh(async (nextToken: string) => {
    try {
      const authToken = await getToken();
      if (!authToken) return;

      await authAPI.saveFcmToken(nextToken, resolvePlatform());
      console.log('[Push] Refreshed FCM token synced to backend');
    } catch (error) {
      console.warn('[Push] Failed to sync refreshed FCM token:', error);
    }
  });
};
