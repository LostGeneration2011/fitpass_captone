import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

type RequestConfigWithOptions = AxiosRequestConfig & {
  suppressErrorLog?: boolean;
};

const ADMIN_TOKEN_KEY = 'fitpass_admin_token';

const LOCAL_API_BASE_URL = 'http://localhost:3001/api';
const DEFAULT_REMOTE_API_BASE_URL = 'https://fortunate-wholeness-production.up.railway.app/api';

const normalizeBaseUrl = (value?: string) => {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
};

const configuredBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const forceRemoteApiOnLocal = process.env.NEXT_PUBLIC_FORCE_REMOTE_API === 'true';

const isLocalHostRuntime =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Local development should use local backend by default to avoid stale ngrok links/token mismatches.
const API_BASE_URL = (() => {
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }
  if (isLocalHostRuntime && !forceRemoteApiOnLocal) {
    return LOCAL_API_BASE_URL;
  }
  // Fallback: production backend only, never ngrok
  return DEFAULT_REMOTE_API_BASE_URL;
})();

// Export for WS URL derivation in other modules
export { API_BASE_URL };

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Gửi cookie httpOnly lên backend
});

console.log('🔧 API BASE URL:', API_BASE_URL);

// Request interceptor chỉ thêm header phụ trợ, KHÔNG thêm token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔑 Admin API Request:', {
        url: config.url,
        method: config.method?.toUpperCase(),
        baseURL: config.baseURL
      });
    }
    // Force HTTPS for ngrok URLs (dev only)
    if (config.baseURL?.includes('ngrok')) {
      config.headers['X-Forwarded-Proto'] = 'https';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('🔑 Unauthorized request, clearing session and redirecting to login...');
      if (typeof window !== 'undefined') {
        // Clear stale user data to break any potential redirect loop
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem('fitpass_admin_user');
        // Only redirect if not already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);



// API helper functions
export async function apiGet(url: string, config?: RequestConfigWithOptions): Promise<any> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔥 GETTING FROM:', API_BASE_URL + url);
  }
  try {
    // Add cache busting for fresh data
    const separator = url.includes('?') ? '&' : '?';
    const urlWithCache = `${url}${separator}_t=${Date.now()}`;
    const { suppressErrorLog, ...axiosConfig } = config || {};
    const response: AxiosResponse = await api.get(urlWithCache, axiosConfig);
    return response.data;
  } catch (error: any) {
    if (!config?.suppressErrorLog) {
      console.error(`❌ GET ${url} failed:`, error.response?.data || error.message);
    }
    throw error;
  }
}

export async function apiPost(url: string, data: any, config?: AxiosRequestConfig): Promise<any> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔥 POSTING TO:', API_BASE_URL + url);
  }
  try {
    const response: AxiosResponse = await api.post(url, data, config);
    return response.data;
  } catch (error: any) {
    console.error(`❌ POST ${url} failed:`, error.response?.data || error.message);
    throw error;
  }
}

export async function apiPut(url: string, data: any, config?: AxiosRequestConfig): Promise<any> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔥 PUTTING TO:', API_BASE_URL + url);
  }
  try {
    const response: AxiosResponse = await api.put(url, data, config);
    return response.data;
  } catch (error: any) {
    console.error(`❌ PUT ${url} failed:`, error.response?.data || error.message);
    throw error;
  }
}

export async function apiDelete(url: string, config?: AxiosRequestConfig): Promise<any> {
  console.log('🔥 DELETING FROM:', API_BASE_URL + url);
  try {
    const response: AxiosResponse = await api.delete(url, config);
    return response.data;
  } catch (error: any) {
    console.error(`❌ DELETE ${url} failed:`, error.response?.data || error.message);
    throw error;
  }
}

export async function apiPatch(url: string, data: any, config?: AxiosRequestConfig): Promise<any> {
  console.log('🔥 PATCHING TO:', API_BASE_URL + url);
  try {
    const response: AxiosResponse = await api.patch(url, data, config);
    return response.data;
  } catch (error: any) {
    console.error(`❌ PATCH ${url} failed:`, error.response?.data || error.message);
    throw error;
  }
}

// Specialized API functions
export const classesAPI = {
  getAll: () => apiGet('/classes'),
  getById: (id: string) => apiGet(`/classes/${id}`),
  getDetail: (id: string) => apiGet(`/classes/${id}/detail`),
  create: (data: any) => apiPost('/classes', data),
  update: (id: string, data: any) => apiPut(`/classes/${id}`, data),
  delete: (id: string) => apiDelete(`/classes/${id}`),
  approve: (id: string) => apiPost(`/classes/${id}/approve`, {}),
  reject: (id: string, rejectionReason?: string) =>
    apiPost(`/classes/${id}/reject`, rejectionReason ? { rejectionReason } : {}),
};

export const sessionsAPI = {
  getAll: () => apiGet('/sessions'),
  getById: (id: string) => apiGet(`/sessions/${id}`),
  create: (data: any) => apiPost('/sessions', data),
  update: (id: string, data: any) => apiPatch(`/sessions/${id}`, data),
  delete: (id: string) => apiDelete(`/sessions/${id}`),
  deleteWithReason: (id: string, adminOverrideReason: string) => apiDelete(`/sessions/${id}`, { data: { adminOverrideReason } }),
};

export const usersAPI = {
  getAll: () => apiGet('/users'),
  getById: (id: string) => apiGet(`/users/${id}`),
  create: (data: any) => apiPost('/users', data),
  update: (id: string, data: any) => apiPatch(`/users/${id}`, data),
  delete: (id: string) => apiDelete(`/users/${id}`),
};

export const packagesAPI = {
  getAll: () => apiGet('/packages/admin/all'),
  getById: (id: string) => apiGet(`/packages/${id}`),
  create: (data: any) => apiPost('/packages', data),
  update: (id: string, data: any) => apiPut(`/packages/${id}`, data),
  delete: (id: string) => apiDelete(`/packages/${id}`),
};

export const userPackagesAPI = {
  getAll: () => apiGet('/user-packages'),
  getById: (id: string) => apiGet(`/user-packages/${id}`),
  getStatus: (userPackageId: string) => apiGet(`/user-packages/status/${userPackageId}`),
  purchase: (data: any) => apiPost('/user-packages/purchase', data),
  activate: (data: any) => apiPost('/user-packages/activate', data),
  useCredits: (data: any) => apiPost('/user-packages/use-credits', data),
  getBookings: () => apiGet('/user-packages/bookings'),
  getSessions: () => apiGet('/user-packages/sessions'),
};

export const roomsAPI = {
  getAll: () => apiGet('/rooms'),
  getById: (id: string) => apiGet(`/rooms/${id}`),
  create: (data: any) => apiPost('/rooms', data),
  update: (id: string, data: any) => apiPut(`/rooms/${id}`, data),
  delete: (id: string) => apiDelete(`/rooms/${id}`),
  getSchedule: () => apiGet('/rooms/schedule'),
  checkAvailability: (data: any) => apiPost('/rooms/check-availability', data),
};

export const transactionsAPI = {
  getAll: () => apiGet('/transactions'),
  getById: (id: string) => apiGet(`/transactions/${id}`),
  updateStatus: (id: string, status: string) => apiPatch(`/transactions/${id}`, { status }),
};

export const reviewModerationAPI = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: 'all' | 'visible' | 'hidden';
    search?: string;
    classId?: string;
    teacherId?: string;
    sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
  }) => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.status && params.status !== 'all') queryParams.set('status', params.status);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.classId) queryParams.set('classId', params.classId);
    if (params?.teacherId) queryParams.set('teacherId', params.teacherId);
    if (params?.sort) queryParams.set('sort', params.sort);

    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

    return apiGet(`/admin/class-reviews${qs}`).then((payload: any) => {
      const nested = payload?.data;
      const rows =
        (Array.isArray(payload?.data) && payload.data) ||
        (Array.isArray(payload) && payload) ||
        (Array.isArray(nested?.data) && nested.data) ||
        (Array.isArray(nested?.reviews) && nested.reviews) ||
        (Array.isArray(payload?.reviews) && payload.reviews) ||
        [];

      const pagination = payload?.pagination || nested?.pagination || {
        page: params?.page || 1,
        limit: params?.limit || rows.length || 20,
        total: rows.length,
        totalPages: 1,
      };

      return {
        ...payload,
        data: rows,
        pagination,
      };
    });
  },
  moderate: (id: string, data: { isHidden: boolean; moderationReason?: string }) =>
    apiPatch(`/admin/class-reviews/${id}/moderate`, data),
};

export const chatAPI = {
  listThreads: () => apiGet('/chat/threads'),
  listMembers: (threadId: string) => apiGet(`/chat/threads/${threadId}/members`),
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
  deleteMessage: (messageId: string) => apiDelete(`/chat/admin/messages/${messageId}`),
  deleteThread: (threadId: string) => apiDelete(`/chat/admin/threads/${threadId}`),
  lockThread: (threadId: string, reason?: string) => apiPost(`/chat/admin/threads/${threadId}/lock`, { reason }),
  unlockThread: (threadId: string, reason?: string) => apiPost(`/chat/admin/threads/${threadId}/unlock`, { reason }),
  uploadMedia: (data: FormData) =>
    apiPost('/chat/media', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const forumModerationAPI = {
  listPosts: (params?: { limit?: number; cursor?: string; status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'all' }) => {
    const searchParams = new URLSearchParams();
    if (typeof params?.limit === 'number') {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.cursor) {
      searchParams.set('cursor', params.cursor);
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiGet(`/forum/admin/posts${qs}`);
  },
  getPostDetail: (postId: string) => apiGet(`/forum/admin/posts/${postId}`),
  reviewPost: (postId: string, action: 'approve' | 'reject', reason?: string) =>
    apiPatch(`/forum/admin/posts/${postId}/review`, { action, reason }),
  hidePost: (postId: string, reason?: string) =>
    apiPost(`/forum/admin/posts/${postId}/hide`, { reason }),
  unhidePost: (postId: string) => apiPost(`/forum/admin/posts/${postId}/unhide`, {}),
  hideComment: (commentId: string, reason?: string) =>
    apiPost(`/forum/admin/comments/${commentId}/hide`, { reason }),
  unhideComment: (commentId: string) =>
    apiPost(`/forum/admin/comments/${commentId}/unhide`, {}),
  listReports: (params?: { status?: string; cursor?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (typeof params?.limit === 'number') {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.cursor) {
      searchParams.set('cursor', params.cursor);
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiGet(`/forum/admin/reports${qs}`);
  },
  reviewReport: (reportId: string, data: { action: string; hideContent?: boolean; reviewNote?: string }) =>
    apiPatch(`/forum/admin/reports/${reportId}`, data),
};

export const enrollmentsAPI = {
  getAll: () => apiGet('/enrollments'),
  getById: (id: string) => apiGet(`/enrollments/${id}`),
  create: (data: any) => apiPost('/enrollments', data),
  delete: (studentId: string, classId: string) => apiDelete(`/enrollments?studentId=${studentId}&classId=${classId}`),
};

export const salaryAPI = {
  getTeacherOverview: () => apiGet('/salary/teachers/salary-overview'),
  updateHourlyRate: (teacherId: string, hourlyRate: number) => 
    apiPatch(`/salary/teachers/${teacherId}/hourly-rate`, { hourlyRate }),
  payTeacher: (teacherId: string, amount: number) => 
    apiPost('/salary/teachers/pay', { teacherId, amount }),
  getPayrollHistory: (status?: string) => 
    apiGet(`/salary/payroll${status ? `?status=${status}` : ''}`),
  getTeacherHistory: (teacherId: string) => 
    apiGet(`/salary/teachers/${teacherId}/history`),
};

export const attendanceAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiGet(`/attendance/admin/all${query}`);
  },
  getById: (id: string) => apiGet(`/attendance/${id}`),
  getBySession: (sessionId: string) => apiGet(`/attendance/session/${sessionId}`),
  getBySessionIds: async (sessionIds: string[]) => {
    const ids = Array.from(new Set(sessionIds.filter(Boolean)));
    if (ids.length === 0) {
      return Promise.resolve({ attendances: [] });
    }

    // Keep each request payload bounded to avoid large-body and timeout issues on huge datasets.
    const chunkSize = 400;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    const responses = await Promise.all(
      chunks.map((chunk) => apiPost('/attendance/bulk', { sessionIds: chunk }))
    );

    const merged = responses.flatMap((response: any) => {
      if (Array.isArray(response)) return response;
      return response?.attendances || response?.attendance || [];
    });

    return { attendances: merged };
  },
  create: (data: any) => apiPost('/attendance', data),
  update: (id: string, data: any) => apiPatch(`/attendance/${id}`, data),
  delete: (id: string) => apiDelete(`/attendance/${id}`),
};

export default api;