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

const USER_KEY = 'fitpass_admin_user';
const TOKEN_KEY = 'fitpass_admin_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getToken();
    const userData = localStorage.getItem(USER_KEY);
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role === 'ADMIN') {
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    } else {
      removeToken();
      localStorage.removeItem(USER_KEY);
    }
    setIsLoading(false);
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
      if (response.user && response.token) {
        if (response.user.role !== 'ADMIN') {
          return { success: false, error: 'Access denied. Admin access only.' };
        }
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
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
    removeToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push('/login');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };



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
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login';
  }
}
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function removeToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

