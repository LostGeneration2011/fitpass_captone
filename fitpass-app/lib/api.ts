import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';

// Dynamic API URL with production support
const getAPIUrl = (): string => {
  // Production check first
  if (process.env.NODE_ENV === 'production' || Constants.expoConfig?.extra?.IS_PRODUCTION) {
    const prodUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API ||
                    process.env.EXPO_PUBLIC_API;
    if (!prodUrl) {
      console.error('❌ EXPO_PUBLIC_API is not configured for this production build. Set the env variable before building.');
      // Fallback to localhost so the app fails visibly rather than silently routing to a wrong domain
      return 'http://localhost:3001/api';
    }
    console.log('🚀 Production API URL:', prodUrl);
    return prodUrl;
  }
  
  // Development: Use Expo's automatic network detection
  if (__DEV__) {
    // Check config override first
    const configUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_API;
    if (configUrl) {
      console.log('🔧 Using config API URL:', configUrl);
      return configUrl;
    }
    
    // Try multiple ways to get the correct host IP
    const debuggerHost = Constants.manifest?.debuggerHost || Constants.manifest2?.debuggerHost;
    const hostUrl = Constants.linkingUrl || Constants.linkingUri;
    
    // Method 1: Use debuggerHost
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      const url = `http://${host}:3001/api`;
      console.log('🌐 Auto-detected API URL (debuggerHost):', url);
      console.log('🔍 debuggerHost found:', debuggerHost);
      return url;
    }
    
    // Method 2: Extract from linkingUrl
    if (hostUrl && hostUrl.includes('://')) {
      try {
        const host = new URL(hostUrl).hostname;
        if (host && host !== 'localhost') {
          const url = `http://${host}:3001/api`;
          console.log('🌐 Auto-detected API URL (linkingUrl):', url);
          console.log('🔍 linkingUrl found:', hostUrl);
          return url;
        }
      } catch (e) {
        console.log('⚠️ Failed to parse linkingUrl:', hostUrl);
      }
    }
    
    // Web platform fallback
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform using localhost');
      return 'http://localhost:3001/api';
    }
    
    // Debug what we actually have
    console.log('🔍 Debug - Constants.manifest:', Constants.manifest);
    console.log('🔍 Debug - Constants.linkingUrl:', Constants.linkingUrl);
    
    // Ultimate fallback
    console.log('⚠️ Using fallback localhost - network may not be auto-detected');
    return 'http://localhost:3001/api';
  }
  
  // Staging or other environments
  return '/api';
};

const API_URL = getAPIUrl();

// Export API_URL and getAPIUrl for dynamic usage
export { API_URL, getAPIUrl };

/**
 * Fire-and-forget server warm-up ping.
 * Call this as early as possible (app launch, welcome screen).
 * Silently handles all errors — purely to wake Render free-tier from sleep.
 */
export function warmUpServer(): void {
  const url = `${getAPIUrl()}/health`;
  const controller = new AbortController();
  // 90s gives Render enough time to cold-start; we don't await this
  const tid = setTimeout(() => controller.abort(), 90000);
  fetch(url, { method: 'GET', signal: controller.signal })
    .then(() => { clearTimeout(tid); console.log('🔥 Server warm-up OK'); })
    .catch(() => { clearTimeout(tid); /* silent — server might still be booting */ });
}

async function waitForServerReady(maxWaitMs = 45000): Promise<boolean> {
  const startedAt = Date.now();
  const healthUrl = `${getAPIUrl()}/health`;

  while (Date.now() - startedAt < maxWaitMs) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(tid);
      if (res.ok) return true;
    } catch {
      clearTimeout(tid);
      // keep polling until timeout window is reached
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  return false;
}

function isRequestTimeoutError(error: unknown): boolean {
  const message = (error as any)?.message;
  return typeof message === 'string' && message.includes('Yêu cầu quá hạn');
}

async function tryRefreshAccessToken(currentApiUrl: string): Promise<boolean> {
  try {
    const refreshToken = await AsyncStorage.getItem('fitpass_refresh_token');
    if (!refreshToken) return false;

    const res = await fetch(`${currentApiUrl}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    if (!data?.token) return false;

    await AsyncStorage.setItem('fitpass_token', data.token);
    if (data.refreshToken) {
      await AsyncStorage.setItem('fitpass_refresh_token', data.refreshToken);
    }

    return true;
  } catch {
    return false;
  }
}

// Fetch wrapper
async function apiRequest(method, path, body, timeoutMs = 60000, canRetry = true) {
  const token = await AsyncStorage.getItem("fitpass_token");
  
  // Get dynamic API URL for each request to handle network changes
  const currentApiUrl = getAPIUrl();
  
  console.log("API Request:", method, `${currentApiUrl}${path}`, "Token:", !!token);

  // Add aggressive cache busting headers for GET requests
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(method === "GET" ? {
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "If-None-Match": "",
      "If-Modified-Since": "Thu, 01 Jan 1970 00:00:00 GMT"
    } : {})
  };

  // Add timestamp for cache busting on GET requests
  const urlPath = method === "GET" && !path.includes('?') 
    ? `${path}?_t=${Date.now()}` 
    : method === "GET" && path.includes('?')
    ? `${path}&_t=${Date.now()}`
    : path;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${currentApiUrl}${urlPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: method === "GET" ? "no-store" : "default",
      signal: controller.signal,
    });
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      throw new Error('Yêu cầu quá hạn. Server có thể đang khởi động – vui lòng thử lại sau vài giây.');
    }
    throw fetchError;
  } finally {
    clearTimeout(timeoutId);
  }

  console.log("API Response:", res.status, res.statusText, "Cache:", res.headers.get('cache-control'));

  if (!res.ok) {
    if (
      res.status === 401 &&
      canRetry &&
      !path.includes('/auth/login') &&
      !path.includes('/auth/register') &&
      !path.includes('/auth/refresh-token')
    ) {
      const refreshed = await tryRefreshAccessToken(currentApiUrl);
      if (refreshed) {
        return apiRequest(method, path, body, timeoutMs, false);
      }
    }

    const err = await res.text();
    
    // Try to parse JSON error
    let errorObj;
    try {
      errorObj = JSON.parse(err);
    } catch {
      errorObj = { message: err || "Request failed" };
    }
    
    const errorMessage = errorObj.message || errorObj.error || "Request failed";
    const error = new Error(errorMessage);
    (error as any).response = { data: errorObj };
    (error as any).code = errorObj.code;
    throw error;
  }

  const data = await res.json();
  console.log("API Data received:", Array.isArray(data) ? data.length + " items" : typeof data, "for path:", urlPath);
  
  return data;
}

export const apiGet = (path) => apiRequest("GET", path, undefined);
export const apiPost = (path, body) => apiRequest("POST", path, body);
export const apiPatch = (path, body) => apiRequest("PATCH", path, body);
export const apiDelete = (path) => apiRequest("DELETE", path, undefined);

// Auth
export const authAPI = {
  login: (email, password) =>
    apiPost("/auth/login", { email, password }),
  register: async (fullName, email, password, role) => {
    try {
      return await apiRequest("POST", "/auth/register", { fullName, email, password, role }, 90000);
    } catch (error) {
      if (!isRequestTimeoutError(error)) throw error;

      // Render free-tier may still be booting; retry once after an active readiness wait.
      warmUpServer();
      const ready = await waitForServerReady(30000);
      if (!ready) {
        throw new Error('Server vẫn đang khởi động. Vui lòng thử lại sau 20-30 giây.');
      }

      return apiRequest("POST", "/auth/register", { fullName, email, password, role }, 60000, false);
    }
  },
  getPreferences: () =>
    apiGet('/auth/preferences'),
  updatePreferences: (preferences: { notificationEnabled?: boolean; autoReminderEnabled?: boolean }) =>
    apiPatch('/auth/preferences', preferences),
  saveFcmToken: (token: string, platform: 'ios' | 'android') =>
    apiPost('/auth/fcm-token', { token, platform }),
  forgotPassword: (email) =>
    apiPost("/auth/forgot-password", { email }),
  resetPassword: (token, newPassword) =>
    apiPost("/auth/reset-password", { token, newPassword }),
  changePassword: (currentPassword, newPassword, confirmPassword) =>
    apiPost('/auth/change-password', { currentPassword, newPassword, confirmPassword })
};

export const forgotPassword = (email: string) => apiPost("/auth/forgot-password", { email });

export const validateResetToken = (token: string) => apiPost("/auth/validate-reset-token", { token });

export const resetPassword = (token: string, newPassword: string) => 
  apiPost("/auth/reset-password", { token, newPassword });

// Classes
export const classAPI = {
  getAll: (teacherId?: string, filters?: { approved?: boolean; status?: string; type?: string; level?: string; startDate?: string; endDate?: string; }) => {
    const params: Record<string, string> = {};
    if (teacherId) params.teacherId = teacherId;
    if (filters?.approved) params.approved = 'true';
    if (filters?.status) params.status = filters.status;
    if (filters?.type) params.type = filters.type;
    if (filters?.level) params.level = filters.level;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    const endpoint = `/classes${qs}`;
    return apiGet(endpoint).then(res => {
      console.log("🔍 classesAPI raw response:", res);
      // Backend returns direct array for classes
      const items = Array.isArray(res) ? res : (res.classes ?? []);
      console.log("🔍 classesAPI normalized:", items);
      return items;
    });
  },
  getById: (id) => apiGet(`/classes/${id}`),
  getDetail: (id) => apiGet(`/classes/${id}/detail`),
  getImages: (id) => apiGet(`/classes/${id}/images`),
  getReviews: (id, params?: { page?: number; limit?: number; sort?: 'newest' | 'highest' | 'lowest' }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiGet(`/classes/${id}/reviews${qs}`);
  },
  submitReview: (id, data: { rating: number; comment?: string }) => apiPost(`/classes/${id}/reviews`, data),
  replyReview: (id, reviewId, replyText: string | null) => apiPatch(`/classes/${id}/reviews/${reviewId}/reply`, { replyText }),
  setReaction: (id, type: 'LIKE' | 'DISLIKE') => apiPost(`/classes/${id}/reactions`, { type }),
  removeReaction: (id) => apiDelete(`/classes/${id}/reactions`),
  addImage: (id, data: { url: string; caption?: string; order?: number }) => apiPost(`/classes/${id}/images`, data),
  deleteImage: (id, imageId) => apiDelete(`/classes/${id}/images/${imageId}`),
  create: (classData) => apiPost("/classes", classData),
  update: (id, classData) => apiPatch(`/classes/${id}`, classData),
  delete: (id) => apiDelete(`/classes/${id}`),
  approve: (id: string) => apiPost(`/classes/${id}/approve`, {}),
  reject: (id: string, reason?: string) =>
    apiPost(`/classes/${id}/reject`, reason ? { rejectionReason: reason } : {}),
};

// Teachers
export const teachersAPI = {
  getProfile: (id) => apiGet(`/teachers/${id}/profile`),
  updateMyProfile: (data: {
    fullName?: string;
    avatar?: string | null;
    teacherBio?: string | null;
    teacherExperienceYears?: number | null;
    teacherSpecialties?: string[];
    teacherCertifications?: string[];
    teacherHighlights?: string[];
    teacherCoverImage?: string | null;
    teacherGalleryImages?: string[];
  }) => apiPatch('/teachers/me/profile', data),
};

// Chat
export const chatAPI = {
  listThreads: () => apiGet('/chat/threads'),
  listMembers: (threadId: string) => apiGet(`/chat/threads/${threadId}/members`),
  createSupportThread: () => apiPost('/chat/threads/support', {}),
  createClassThread: (classId: string) => apiPost('/chat/threads/class', { classId }),
  getMessages: (threadId: string, params?: { limit?: number; before?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiGet(`/chat/threads/${threadId}/messages${qs}`);
  },
  sendMessage: (threadId: string, content: string, options?: { replyToId?: string; attachments?: any[]; mentionUserIds?: string[] }) =>
    apiPost(`/chat/threads/${threadId}/messages`, { content, ...options }),
  markRead: (threadId: string, lastReadAt?: string) =>
    apiPost(`/chat/threads/${threadId}/read`, { lastReadAt }),
  editMessage: (messageId: string, content: string) => apiPatch(`/chat/messages/${messageId}`, { content }),
  revokeMessage: (messageId: string) => apiPost(`/chat/messages/${messageId}/revoke`, {}),
  deleteThread: (threadId: string) => apiDelete(`/chat/threads/${threadId}`),
  deleteMessage: (messageId: string) => apiDelete(`/chat/messages/${messageId}`),
  uploadMedia: async (data: FormData) => {
    const token = await AsyncStorage.getItem("fitpass_token");
    const res = await fetch(`${getAPIUrl()}/chat/media`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Upload failed');
    }

    return res.json();
  },
};

// Forum
export const forumAPI = {
  getFeed: (params?: { limit?: number; cursor?: string }) => {
    const searchParams = new URLSearchParams();
    if (typeof params?.limit === 'number') {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.cursor) {
      searchParams.set('cursor', params.cursor);
    }
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiGet(`/forum/posts${qs}`);
  },
  getUserProfile: (userId: string) => apiGet(`/forum/users/${userId}/profile`),
  getPostDetail: (postId: string) => apiGet(`/forum/posts/${postId}`),
  createPost: (data: { content: string; imageUrls?: string[] }) => apiPost('/forum/posts', data),
  updatePost: (postId: string, data: { content?: string; imageUrls?: string[] }) =>
    apiPatch(`/forum/posts/${postId}`, data),
  deletePost: (postId: string) => apiDelete(`/forum/posts/${postId}`),
  addComment: (postId: string, content: string) => apiPost(`/forum/posts/${postId}/comments`, { content }),
  updateComment: (commentId: string, content: string) => apiPatch(`/forum/comments/${commentId}`, { content }),
  deleteComment: (commentId: string) => apiDelete(`/forum/comments/${commentId}`),
  setReaction: (postId: string, type: 'LIKE' | 'LOVE' | 'WOW') =>
    apiPost(`/forum/posts/${postId}/reactions`, { type }),
  removeReaction: (postId: string) => apiDelete(`/forum/posts/${postId}/reactions`),
  uploadMedia: async (data: FormData) => {
    const token = await AsyncStorage.getItem('fitpass_token');
    const res = await fetch(`${getAPIUrl()}/forum/media`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Upload failed');
    }

    return res.json();
  },
  reportPost: (postId: string, reason: string, detail?: string) =>
    apiPost(`/forum/posts/${postId}/reports`, { reason, detail }),
  reportComment: (commentId: string, reason: string, detail?: string) =>
    apiPost(`/forum/comments/${commentId}/reports`, { reason, detail }),
};

// Sessions
export const sessionsAPI = {
  getAll: (teacherId?: string) => {
    const endpoint = teacherId ? `/sessions?teacherId=${teacherId}` : "/sessions";
    return apiGet(endpoint).then(res => {
      console.log("🔍 sessionsAPI raw response:", res);
      // Fix API response mapping exactly as specified
      const items = res.sessions ?? res.classSessions ?? [];
      console.log("🔍 sessionsAPI normalized:", items);
      return items;
    });
  },
  getById: (id) => apiGet(`/sessions/${id}`),
  create: (sessionData) => apiPost("/sessions", sessionData),
  updateStatus: (id, status) => apiPatch(`/sessions/${id}/status`, { status }),
  delete: (id) => apiDelete(`/sessions/${id}`)
};

// Attendance
export const attendanceAPI = {
  getBySession: (sessionId) => apiGet(`/attendance/session/${sessionId}`),
  getByStudent: (studentId) => apiGet(`/attendance?studentId=${studentId}`),
  getByClass: (classId) => apiGet(`/attendance?classId=${classId}`)
};

// Enrollment
export const enrollmentAPI = {
  getAll: () => {
    return apiGet("/enrollments").then(res => {
      const items = Array.isArray(res)
        ? res
        : (res?.enrollments ?? res?.data ?? []);
      return items;
    });
  },
  getByStudent: (studentId: string) => {
    return apiGet(`/enrollments?studentId=${studentId}`).then(res => {
      const items = Array.isArray(res)
        ? res
        : (res?.enrollments ?? res?.data ?? []);
      return items;
    });
  },
  create: (data) => apiPost("/enrollments", data)
};

// Notifications
export const notificationAPI = {
  getAll: (limit = 50) => apiGet(`/notifications?limit=${limit}`),
  getUnreadCount: () => apiGet(`/notifications/unread/count`),
  markAsRead: (notificationId: string) => apiPatch(`/notifications/${notificationId}/read`, {}),
  markAllAsRead: () => apiPatch(`/notifications/read-all`, {}),
  delete: (notificationId: string) => apiDelete(`/notifications/${notificationId}`),
};

// QR
export const getQRBaseUrl = () => API_URL;

// Export axios instance for simplified usage
import axios from "axios";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("fitpass_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
