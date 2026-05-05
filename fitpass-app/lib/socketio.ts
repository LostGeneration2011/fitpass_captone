// socketio.ts
// Simple Socket.IO client wrapper for Expo React Native
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

let socket: Socket | null = null;

const getSocketIoUrl = () => {
  // Use the same logic as backend/admin for endpoint
  const url = Constants.expoConfig?.extra?.EXPO_PUBLIC_WS_URL ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_WS ||
    'https://fortunate-wholeness-production.up.railway.app'; // fallback
  // Remove trailing /ws if present
  return url.replace(/\/ws$/, '');
};

export function connectSocket(token: string) {
  if (socket) return socket;
  const url = getSocketIoUrl();
  socket = io(url, {
    transports: ['polling', 'websocket'],
    auth: { token },
    path: '/socket.io',
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
