import { networkInterfaces } from 'os';

// Dynamic IP detection for development environment
export function getDeviceIP(): string {
  const interfaces = networkInterfaces();
  
  // Priority order: WiFi first
  const priorityKeys = ['Wi-Fi', 'WiFi', 'en0', 'wlp3s0', 'Ethernet', 'eth0'];
  
  // Check priority interfaces first
  for (const key of priorityKeys) {
    const networkInterface = interfaces[key];
    if (networkInterface) {
      for (const config of networkInterface) {
        if (config.family === 'IPv4' && !config.internal) {
          console.log(`🌐 Network: Using IP ${config.address} from ${key}`);
          return config.address;
        }
      }
    }
  }
  
  // Fallback: search all interfaces
  for (const [key, networkInterface] of Object.entries(interfaces)) {
    if (networkInterface) {
      for (const config of networkInterface) {
        if (config.family === 'IPv4' && !config.internal) {
          console.log(`🌐 Network: Fallback IP ${config.address} from ${key}`);
          return config.address;
        }
      }
    }
  }
  
  console.log('⚠️ Network: Could not detect IP, using localhost');
  return 'localhost';
}

// Environment detection
export function getEnvironment(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}

// Dynamic URL generation
export class URLConfig {
  private static deviceIP = getDeviceIP();
  
  // Backend API URL
  static getBackendURL(): string {
    const env = getEnvironment();
    
    if (env === 'production') {
      return process.env.PRODUCTION_API_URL || 'https://your-api.vercel.app/api';
    }
    
    if (env === 'test') {
      return process.env.TEST_API_URL || 'http://localhost:3001/api';
    }
    
    // Development: Use dynamic IP
    const port = process.env.BACKEND_PORT || '3001';
    return `http://${this.deviceIP}:${port}/api`;
  }
  
  // WebSocket URL
  static getWebSocketURL(): string {
    const env = getEnvironment();
    
    if (env === 'production') {
      return process.env.PRODUCTION_WS_URL || 'wss://your-api.vercel.app/ws';
    }
    
    if (env === 'test') {
      return process.env.TEST_WS_URL || 'ws://localhost:3001/ws';
    }
    
    // Development: Use dynamic IP
    const port = process.env.BACKEND_PORT || '3001';
    return `ws://${this.deviceIP}:${port}/ws`;
  }
  
  // Frontend/Admin URL  
  static getFrontendURL(): string {
    const env = getEnvironment();
    
    if (env === 'production') {
      return process.env.PRODUCTION_FRONTEND_URL || 'https://your-admin.vercel.app';
    }
    
    // Development: Use dynamic IP
    const port = process.env.FRONTEND_PORT || '3000';
    return `http://${this.deviceIP}:${port}`;
  }
  
  // Expo app URLs
  static getExpoURL(path: string = '', params: Record<string, string> = {}): string {
    const port = process.env.EXPO_PORT || '8081';
    const queryString = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    return `exp://${this.deviceIP}:${port}/--${path}${queryString}`;
  }
  
  // Get current device IP
  static getCurrentIP(): string {
    return this.deviceIP;
  }
  
  // Refresh IP detection (for WiFi changes)
  static refreshIP(): string {
    this.deviceIP = getDeviceIP();
    return this.deviceIP;
  }
}

export default URLConfig;