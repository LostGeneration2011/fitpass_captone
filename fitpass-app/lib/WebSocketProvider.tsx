import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { connectWebSocket, disconnectWebSocket, reconnectWebSocket, addWebSocketStatusListener } from './websocket';
import { getToken } from './auth';

interface WebSocketContextType {
  isConnected: boolean;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  reconnect: () => {}
});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  // Return default values if not within provider (optional usage)
  return context || {
    isConnected: false,
    reconnect: () => console.log('[WebSocket] No provider - reconnect skipped')
  };
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appState = useRef(AppState.currentState);
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = React.useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('🚀 [WebSocket Provider] useEffect starting...');
    const initializeConnection = async () => {
      try {
        console.log('🚀 [WebSocket Provider] Waiting for token...');
        // Wait a bit for token to be available
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const token = await getToken();
        console.log('🔑 [WebSocket Provider] Token check - got token:', token ? token.slice(0, 20) + '...' : 'null');
        
        if (token) {
          console.log('[WebSocket Provider] Initializing connection with token');
          const ws = connectWebSocket(token);
          if (!ws) {
            console.log('⚠️ [WebSocket Provider] Failed to create WebSocket connection');
          } else {
            console.log('✅ [WebSocket Provider] WebSocket object created successfully');
          }
        } else {
          console.log('⚠️ [WebSocket Provider] No token available - skipping WebSocket initialization');
        }
      } catch (error) {
        console.error('[WebSocket Provider] Failed to initialize connection:', error);
      }
    };

    initializeConnection();

    // App state change handler
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[WebSocket Provider] App state changed from ${appState.current} to ${nextAppState}`);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - reconnect if needed
        console.log('[WebSocket Provider] App came to foreground - checking connection');
        setTimeout(async () => {
          if (!isConnectedRef.current) {
            const token = await getToken();
            if (token) {
              console.log('[WebSocket Provider] Reconnecting with latest token...');
              connectWebSocket(token);
            }
          }
        }, 100);
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background - connection will be handled by websocket.ts
        console.log('[WebSocket Provider] App going to background');
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    const removeStatusListener = addWebSocketStatusListener((status) => {
      if (status === 'open') {
        isConnectedRef.current = true;
        setIsConnected(true);
      } else {
        isConnectedRef.current = false;
        setIsConnected(false);
      }
    });

    // Cleanup
    return () => {
      subscription?.remove();
      removeStatusListener?.();
      disconnectWebSocket();
    };
  }, []);

  const reconnect = () => {
    console.log('[WebSocket Provider] Manual reconnect requested');
    getToken()
      .then((token) => {
        if (token) {
          connectWebSocket(token);
        } else {
          reconnectWebSocket();
        }
      })
      .catch(() => {
        reconnectWebSocket();
      });
  };

  const contextValue: WebSocketContextType = {
    isConnected,
    reconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};