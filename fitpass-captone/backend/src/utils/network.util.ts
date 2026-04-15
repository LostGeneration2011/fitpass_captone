import { Request } from 'express';
import { networkInterfaces } from 'os';

// Environment detection
function getEnvironment(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}

export class NetworkUtils {
  // Get current device IP address
  static getLocalIPAddress(): string {
    // In production, return the server's public interface
    if (process.env.NODE_ENV === 'production') {
      return process.env.SERVER_IP || '0.0.0.0';
    }
    
    const interfaces = networkInterfaces();
    
    // Priority order: WiFi, Ethernet, others
    const priorityKeys = ['Wi-Fi', 'WiFi', 'en0', 'wlp3s0', 'Ethernet', 'eth0'];
    
    // Check priority interfaces first
    for (const key of priorityKeys) {
      const networkInterface = interfaces[key];
      if (networkInterface) {
        for (const config of networkInterface) {
          if (config.family === 'IPv4' && !config.internal) {
            console.log(`🌐 Found IP via ${key}:`, config.address);
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
            console.log(`🌐 Fallback IP via ${key}:`, config.address);
            return config.address;
          }
        }
      }
    }
    
    // Ultimate fallback
    console.log('⚠️ Could not detect IP, using localhost');
    return 'localhost'; // Dynamic fallback
  }
  
  // Note: Deep link functionality removed for simplified development flow
  static getExpoAppURL(path: string = '', params: Record<string, string> = {}): string {
    console.log('Deep link functionality has been removed for simplified development flow');
    return '';
  }
  
  // Expo app URLs with environment awareness
  // Note: Deep link functionality removed for simplified development flow
  static getExpoURL(path: string = '', params: Record<string, string> = {}): string {
    console.log('Deep link functionality has been removed for simplified development flow');
    return '';
  }
  
  // Get ngrok URL if available (for email verification)
  static async getNgrokURL(): Promise<string | null> {
    try {
      const response = await fetch('http://localhost:4040/api/tunnels');
      const data = await response.json() as any;
      
      const tunnel = data.tunnels?.find((t: any) => 
        t.proto === 'https' && t.config?.addr?.includes('3001')
      );
      
      if (tunnel?.public_url) {
        console.log('🌐 Found ngrok URL:', tunnel.public_url);
        return tunnel.public_url;
      }
    } catch (error: any) {
      console.log('⚠️ Ngrok not available:', error.message);
    }
    
    return null;
  }
  
  // Get request IP (useful for debugging)
  static getRequestIP(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           'unknown';
  }
}