'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiPost } from './api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'fitpass_admin_token';
const USER_KEY = 'fitpass_admin_user';
const LAST_ACTIVITY_KEY = 'fitpass_admin_last_activity';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = () => {
      // Add timeout to prevent blocking
      setTimeout(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        const userData = localStorage.getItem(USER_KEY);
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

        if (!token || !userData) {
          setIsLoading(false);
          return;
        }

        try {
          const parsedUser = JSON.parse(userData);
          const lastActivityTime = lastActivity ? parseInt(lastActivity) : 0;
          const now = Date.now();
          
          // Check session timeout
        if (now - lastActivityTime > SESSION_TIMEOUT) {
          localStorage.clear();
          sessionStorage.clear();
          setUser(null);
        } else if (parsedUser.role === 'ADMIN') {
          localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
          setUser(parsedUser);
        } else {
          localStorage.clear();
          sessionStorage.clear();
          setUser(null);
        }
        } catch {
          localStorage.clear();
          sessionStorage.clear();
          setUser(null);
        }
        
        setIsLoading(false);
      }, 100); // Small delay to prevent blocking
    };

    initAuth();
  }, []);


  useEffect(() => {
    if (!isLoading) {
      const isLoginPage = pathname === '/login';
      const isForgotPasswordPage = pathname === '/forgot-password';
      const authenticated = !!user && user.role === 'ADMIN';

      // Allow public access to /login and /forgot-password
      if (!authenticated && !isLoginPage && !isForgotPasswordPage) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          router.replace('/login');
        }
      } else if (authenticated && isLoginPage) {
        router.replace('/dashboard');
      } else if (user && user.role !== 'ADMIN' && !isLoginPage && !isForgotPasswordPage) {
        logout();
      }
    }
  }, [user, isLoading, pathname]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiPost('/auth/login', { email, password });

      if (response.token && response.user) {
        if (response.user.role !== 'ADMIN') {
          return { success: false, error: 'Access denied. Admin access only.' };
        }

        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        setUser(response.user);

        return { success: true };
      }

      return { success: false, error: 'Invalid server response' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    router.push('/login');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  };

  // Activity tracker - update last activity on user interaction
  useEffect(() => {
    const updateActivity = () => {
      if (user) {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [user]);

  // Session timeout checker
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivity) {
          const now = Date.now();
          const lastActivityTime = parseInt(lastActivity);
          if (now - lastActivityTime > SESSION_TIMEOUT) {
            logout();
          }
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return getToken() !== null;
}

export function redirectIfNotLoggedIn() {
  if (typeof window === 'undefined') return;
  if (!isLoggedIn()) window.location.href = '/login';
}

export function forceLogout() {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
