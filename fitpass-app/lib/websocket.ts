// WebSocket helper for FitPass - Production Ready with Auto-reconnect + App State Management
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 1000; // Start with 1 second
let reconnectTimeout: NodeJS.Timeout | null = null;
let currentToken: string | null = null;
let appStateSubscription: any = null;
let isIntentionalDisconnect = false;
const pendingMessages: any[] = [];
let isAuthReady = false;
const pendingJoinThreads = new Set<string>();

const WS_STATE_CONNECTING = typeof WebSocket !== 'undefined' && typeof (WebSocket as any).CONNECTING === 'number'
  ? (WebSocket as any).CONNECTING
  : 0;
const WS_STATE_OPEN = typeof WebSocket !== 'undefined' && typeof (WebSocket as any).OPEN === 'number'
  ? (WebSocket as any).OPEN
  : 1;
const WS_STATE_CLOSED = typeof WebSocket !== 'undefined' && typeof (WebSocket as any).CLOSED === 'number'
  ? (WebSocket as any).CLOSED
  : 3;

// Lightweight status subscription so UI can react without overriding handlers
type WebSocketStatus = 'open' | 'close' | 'error';
type WebSocketStatusListener = (status: WebSocketStatus) => void;
const statusListeners: WebSocketStatusListener[] = [];

type WebSocketMessageListener = (message: any) => void;
const messageListeners: WebSocketMessageListener[] = [];

const notifyStatus = (status: WebSocketStatus) => {
  statusListeners.forEach(listener => {
    try {
      listener(status);
    } catch (err) {
      console.log('⚠️ [WebSocket] Status listener error:', err);
    }
  });
};

export const addWebSocketStatusListener = (listener: WebSocketStatusListener) => {
  statusListeners.push(listener);
  return () => {
    const idx = statusListeners.indexOf(listener);
    if (idx !== -1) {
      statusListeners.splice(idx, 1);
    }
  };
};

export const addWebSocketMessageListener = (listener: WebSocketMessageListener) => {
  messageListeners.push(listener);
  return () => {
    const idx = messageListeners.indexOf(listener);
    if (idx !== -1) {
      messageListeners.splice(idx, 1);
    }
  };
};

// Get WebSocket URL based on environment - Always recalculate for network changes
const getWebSocketUrl = (): string => {
  // Try to get from expo config first (from .env.local - ngrok setup)
  const configWsUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_WS_URL;
  if (configWsUrl) {
    console.log('🔧 Using config WebSocket URL from .env:', configWsUrl);
    return configWsUrl;
  }
  
  // Try to get from expo config second option (production)
  const configUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_WS;
  if (configUrl) {
    console.log('🔧 Using config WebSocket URL:', configUrl);
    return configUrl;
  }
  
  // Auto-detect fresh API URL for consistent connection
  if (__DEV__) {
    // Debug: Check what we have in Constants
    console.log('🔍 Constants.manifest:', Constants.manifest);
    console.log('🔍 Constants.expoConfig:', Constants.expoConfig);
    console.log('🔍 manifest.debuggerHost:', Constants.manifest?.debuggerHost);
    
    // Get fresh manifest data in case network changed
    const { manifest } = Constants;
    if (manifest?.debuggerHost) {
      const host = manifest.debuggerHost.split(':')[0];
      const wsUrl = `ws://${host}:3001/ws`;
      console.log('🌐 Fresh auto-detected WebSocket URL:', wsUrl);
      console.log('🔍 Based on debuggerHost:', manifest.debuggerHost);
      return wsUrl;
    }
    
    // Try using the bundlerHost from expoConfig
    if (Constants.expoConfig?.hostUri) {
      const host = Constants.expoConfig.hostUri.split(':')[0];
      const wsUrl = `ws://${host}:3001/ws`;
      console.log('🌐 Using expoConfig.hostUri for WebSocket:', wsUrl);
      return wsUrl;
    }
    
    // Try linkingUrl as fallback (important for ngrok)
    const hostUrl = Constants.linkingUrl || Constants.linkingUri;
    if (hostUrl && hostUrl.includes('://')) {
      try {
        const url = new URL(hostUrl);
        // If it's an ngrok URL (https), use wss
        if (url.protocol === 'https:') {
          const wsUrl = `wss://${url.host}/ws`;
          console.log('🌐 Using ngrok WebSocket URL (wss):', wsUrl);
          console.log('🔍 From linkingUrl:', hostUrl);
          return wsUrl;
        }
      } catch (e) {
        console.log('⚠️ Failed to parse linkingUrl for WebSocket:', hostUrl);
      }
    }
    
    // Web platform fallback
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform using localhost WebSocket');
      return 'ws://localhost:3001/ws';
    }
    
    // Ultimate fallback
    console.log('⚠️ Using fallback localhost WebSocket - network may not be auto-detected');
    return 'ws://localhost:3001/ws';
  } else {
    // Production: get fresh API URL and convert to WebSocket
    const { getAPIUrl } = require('./api');
    const apiUrl = getAPIUrl();
    const protocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    // Remove /api suffix and add /ws
    const baseUrl = apiUrl.replace(/\/api$/, '');
    const wsUrl = `${protocol}://${new URL(baseUrl).host}/ws`;
    console.log('🚀 Production WebSocket URL:', wsUrl);
    return wsUrl;
  }
};

// Handle app state changes
const handleAppStateChange = (nextAppState: AppStateStatus) => {
  console.log(`[WebSocket Provider] App state changed to: ${nextAppState}`);
  
  if (nextAppState === 'active' && currentToken) {
    // App became active - reconnect if needed
    if (!ws || ws.readyState !== WS_STATE_OPEN) {
      console.log('[WebSocket Provider] App became active - attempting reconnect');
      connectWebSocket();
    }
  } else if (nextAppState === 'background' || nextAppState === 'inactive') {
    // App going to background - close connection gracefully
    if (ws && ws.readyState === WS_STATE_OPEN) {
      console.log('[WebSocket Provider] App going to background - closing connection');
      isIntentionalDisconnect = true;
      disconnectWebSocket();
    }
  }
};

// Auto-reconnect function
const attemptReconnect = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  // Don't reconnect if app is in background or if it was intentional disconnect
  if (AppState.currentState !== 'active' || isIntentionalDisconnect) {
    console.log('[WebSocket] Skipping reconnect - app not active or intentional disconnect');
    return;
  }
  
  reconnectAttempts++;
  const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
  
  console.log(`[WebSocket] Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);
  
  reconnectTimeout = setTimeout(() => {
    if (currentToken && AppState.currentState === 'active') {
      connectWebSocket();
    }
  }, delay);
};

// Connect with auto-reconnect capability
export const connectWebSocket = (token?: string): WebSocket | null => {
  if (token) {
    currentToken = token;
    
    // Setup app state listener on first connection
    if (!appStateSubscription) {
      appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
      console.log('[WebSocket Provider] App state listener registered');
    }
  }
  
  // Reset intentional disconnect flag
  isIntentionalDisconnect = false;
  
  if (ws && (ws.readyState === WS_STATE_CONNECTING || ws.readyState === WS_STATE_OPEN)) {
    return ws;
  }

  const url = getWebSocketUrl();
  console.log('🔗 [WebSocket] Attempting to connect to:', url);
  console.log('🔑 [WebSocket] Current token available:', currentToken ? 'YES' : 'NO');
  
  try {
    ws = new WebSocket(url);
    console.log('🚀 [WebSocket] WebSocket object created');
    
    ws.onopen = () => {
      console.log('✅ [WebSocket] Connected successfully');
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        notifyStatus('open');
      console.log('🔒 [WebSocket] Setting isAuthReady = false');
      isAuthReady = false;
      
      // Send authentication message
      if (currentToken) {
        const authMsg = {
          type: 'auth',
          token: currentToken
        };
        ws?.send(JSON.stringify(authMsg));
        console.log('🔐 [WebSocket] Auth message sent, waiting for auth_success response...');
        
        // Timeout fallback - if no auth_success after 3 seconds, assume success
        setTimeout(() => {
          if (!isAuthReady && ws && ws.readyState === WS_STATE_OPEN) {
            console.log('⚠️ [WebSocket] Auth timeout - forcing isAuthReady = true');
            isAuthReady = true;
            console.log('✅ [WebSocket] Auth assumed complete, flushing queue...');
            
            // Flush pending messages
            if (pendingMessages.length > 0 || pendingJoinThreads.size > 0) {
              const queue = [...pendingMessages];
              pendingMessages.length = 0;
              const joinQueue = Array.from(pendingJoinThreads).map((threadId) => ({
                type: 'chat.join',
                threadId,
              }));
              pendingJoinThreads.clear();

              [...queue, ...joinQueue].forEach((message) => {
                try {
                  const jsonMessage = JSON.stringify(message);
                  ws?.send(jsonMessage);
                  console.log('[WebSocket] Flushed queued message:', message.type);
                } catch (err) {
                  console.log('[WebSocket] Failed to flush queued message:', err);
                }
              });
            }
          }
        }, 3000);
      } else {
        console.log('⚠️ [WebSocket] No token available to send auth message');
      }
    };
    
    ws.onmessage = (event) => {
      console.log('📬 [WebSocket] Raw message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('📨 [WebSocket] Parsed message type:', data.type || data.event || 'UNKNOWN');
        console.log('📨 [WebSocket] Full parsed data:', data);

        messageListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.log('⚠️ [WebSocket] Message listener error:', err);
          }
        });
        
        // Handle different message types
        if (data.type === 'auth_success') {
          console.log('✅ [WebSocket] Received auth_success response');
          console.log('🔓 [WebSocket] Setting isAuthReady = true');
          isAuthReady = true;
          console.log('✅ [WebSocket] Authentication complete! Can now send messages');
          console.log('📦 [WebSocket] Pending messages count:', pendingMessages.length);
          console.log('📦 [WebSocket] Pending joins count:', pendingJoinThreads.size);
          if (pendingMessages.length > 0 || pendingJoinThreads.size > 0) {
            const queue = [...pendingMessages];
            pendingMessages.length = 0;
            const joinQueue = Array.from(pendingJoinThreads).map((threadId) => ({
              type: 'chat.join',
              threadId,
            }));
            pendingJoinThreads.clear();

            [...queue, ...joinQueue].forEach((message) => {
              try {
                const jsonMessage = JSON.stringify(message);
                ws?.send(jsonMessage);
                console.log('[WebSocket] Flushed queued message:', message);
              } catch (err) {
                console.log('[WebSocket] Failed to flush queued message:', err);
              }
            });
          }
        } else if (data.type === 'attendance_update') {
          console.log('📊 [WebSocket] Attendance update:', data.payload);
        } else if (data.event === 'attendance.update') {
          console.log('📊 [WebSocket] Attendance update event:', data.data);
        }
      } catch (error) {
        console.log('📨 [WebSocket] Non-JSON message:', event.data);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ [WebSocket] Connection error:', error);
      console.error('❌ [WebSocket] Error type:', error.type);
      console.error('❌ [WebSocket] Error message:', error.message);
      console.error('❌ [WebSocket] Current URL:', url);
      notifyStatus('error');
      if (currentToken && AppState.currentState === 'active' && reconnectAttempts < maxReconnectAttempts) {
        attemptReconnect();
      }
    };
    
    ws.onclose = (event) => {
      console.log('🔌 [WebSocket] Connection closed');
      console.log('🔌 [WebSocket] Close code:', event.code);
      console.log('🔌 [WebSocket] Close reason:', event.reason);
      console.log('🔌 [WebSocket] Current URL:', url);
      ws = null;
        notifyStatus('close');
      isAuthReady = false;
      pendingJoinThreads.clear();
      
      // Auto-reconnect if not intentionally closed and we have attempts left and app is active
      if (!isIntentionalDisconnect && 
          event.code !== 1000 && 
          reconnectAttempts < maxReconnectAttempts && 
          currentToken && 
          AppState.currentState === 'active') {
        attemptReconnect();
      }
    };
    
  } catch (error) {
    console.error('[WebSocket] Failed to connect:', error);
    if (currentToken && reconnectAttempts < maxReconnectAttempts && AppState.currentState === 'active') {
      attemptReconnect();
    }
  }
  
  return ws;
};

export const disconnectWebSocket = (preserveToken = false): void => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  // Remove app state listener
  if (appStateSubscription) {
    appStateSubscription?.remove();
    appStateSubscription = null;
    console.log('[WebSocket Provider] App state listener removed');
  }
  
  reconnectAttempts = 0;
  if (!preserveToken) {
    currentToken = null;
  }
  isIntentionalDisconnect = true;
  
  if (ws) {
    console.log('[WebSocket] Disconnecting...');
    ws.close(1000, 'User disconnect'); // Normal closure
    ws = null;
  }
};

// Force reconnect (useful for network changes)
export const reconnectWebSocket = (): void => {
  console.log('[WebSocket] Force reconnecting due to network change');
  if (currentToken && AppState.currentState === 'active') {
    const tokenToReconnect = currentToken;
    isIntentionalDisconnect = true;
    disconnectWebSocket(true);
    setTimeout(() => {
      isIntentionalDisconnect = false;
      reconnectAttempts = 0; // Reset attempts for fresh connection
      connectWebSocket(tokenToReconnect);
    }, 100);
  }
};

export const sendWebSocketMessage = (message: any): void => {
  console.log('📤 [WebSocket] sendWebSocketMessage called with:', message);
  console.log('📤 [WebSocket] ws exists:', !!ws);
  console.log('📤 [WebSocket] ws.readyState:', ws?.readyState, '(OPEN=1)');
  console.log('📤 [WebSocket] isAuthReady:', isAuthReady);
  
  // Auto-reconnect if ws is null but we have a token
  if (!ws && currentToken) {
    console.log('🔄 [WebSocket] WebSocket is null but token exists - auto-reconnecting...');
    connectWebSocket(currentToken);
    // Queue the message for after reconnect
    pendingMessages.push(message);
    console.log('[WebSocket] Queued message for after reconnect:', message);
    return;
  }
  
  if (ws && ws.readyState === WS_STATE_OPEN && isAuthReady) {
    const jsonMessage = JSON.stringify(message);
    ws.send(jsonMessage);
    console.log('✅ [WebSocket] Message sent successfully:', message.type);
  } else {
    console.log('⚠️  [WebSocket] Cannot send - ws:', !!ws, 'readyState:', ws?.readyState, 'isAuthReady:', isAuthReady);
    
    if (message?.type === 'chat.join' && message?.threadId) {
      if (!pendingJoinThreads.has(message.threadId)) {
        pendingJoinThreads.add(message.threadId);
        console.log('[WebSocket] Queued join (socket not ready):', message);
      }
      return;
    }

    pendingMessages.push(message);
    console.log('[WebSocket] Queued message (socket not ready):', message);
  }
};

export const isWebSocketConnected = () => {
  return ws ? ws.readyState === WS_STATE_OPEN : false;
};

export default {
  connect: connectWebSocket,
  disconnect: disconnectWebSocket,
  reconnect: reconnectWebSocket,
  send: sendWebSocketMessage,
  onMessage: addWebSocketMessageListener,
  get isConnected() {
    return ws ? ws.readyState === WS_STATE_OPEN : false;
  },
  get connectionState() {
    return ws ? ws.readyState : WS_STATE_CLOSED;
  }
};
