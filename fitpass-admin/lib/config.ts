/**
 * Smart API Configuration
 * Automatically detects and switches between ngrok and localhost
 */

// Ngrok URLs từ .env hoặc có thể update manually
const NGROK_URLS = [
  'https://onagraceous-unblenchingly-ebony.ngrok-free.dev',
  // Có thể add thêm ngrok URLs backup
];

const LOCAL_API_URL = 'http://localhost:3001';

/**
 * Kiểm tra xem URL có accessible không
 */
async function checkApiHealth(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Tự động detect và chọn API URL tốt nhất
 */
export async function getOptimalApiUrl(): Promise<string> {
  // Ưu tiên lấy từ biến môi trường build-time
  const envApi = process.env.NEXT_PUBLIC_API || process.env.NEXT_PUBLIC_API_URL;
  if (envApi) {
    console.log(`✅ Using API from env: ${envApi}`);
    return envApi.endsWith('/') ? envApi + 'api' : envApi + '/api';
  }
  // Fallback: local dev
  console.warn('⚠️ Không tìm thấy biến môi trường API, fallback về localhost.');
  return LOCAL_API_URL + '/api';
}

/**
 * Force refresh API URL detection
 */
export function refreshApiUrl(): void {
  localStorage.removeItem('fitpass_api_url');
  localStorage.removeItem('fitpass_api_url_time');
  console.log('🔄 API URL cache cleared, will auto-detect on next request');
}

/**
 * Get current API URL synchronously (sử dụng cache)
 */
export function getCurrentApiUrl(): string {
  if (typeof window === 'undefined') {
    return `${LOCAL_API_URL}/api`;
  }
  
  const cached = localStorage.getItem('fitpass_api_url');
  return cached || `${LOCAL_API_URL}/api`;
}

/**
 * Manual override API URL
 */
export function setManualApiUrl(url: string): void {
  const apiUrl = url.endsWith('/api') ? url : `${url}/api`;
  localStorage.setItem('fitpass_api_url', apiUrl);
  localStorage.setItem('fitpass_api_url_time', Date.now().toString());
}