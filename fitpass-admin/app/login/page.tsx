'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      showToast('Vui lòng điền đầy đủ thông tin đăng nhập', 'warning');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(email, password);
      
      if (!result.success) {
        if (result.error?.includes('Admin access only')) {
          showToast('Chỉ Admin mới được phép truy cập hệ thống!', 'error');
        } else if (result.error?.includes('Invalid credentials') || result.error?.includes('User not found')) {
          showToast('Sai tên đăng nhập hoặc mật khẩu!', 'error');
        } else {
          showToast(result.error || 'Đăng nhập thất bại', 'error');
        }
        setError(result.error || 'Đăng nhập thất bại.');
      } else {
        showToast('Đăng nhập thành công!', 'success');
      }
      // If successful, AuthProvider will handle redirect
    } catch (err) {
      showToast('Có lỗi xảy ra, vui lòng thử lại!', 'error');
      setError('Đã xảy ra lỗi không mong muốn.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <span className="text-4xl font-bold text-white">F</span>
          </div>
          <h2 className="mt-8 text-4xl font-extrabold text-black dark:text-white tracking-tight">
            FitPass Admin
          </h2>
          <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
            Bảng điều khiển quản lý phòng gym
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white shadow-xl dark:shadow-2xl dark:bg-gray-800 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 py-5 px-8">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              Đăng nhập vào tài khoản
            </h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="p-8 space-y-6">
              {/* Email Field */}
              <div>
                <label className="mb-2.5 block font-medium text-gray-800 dark:text-white text-sm">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <EnvelopeIcon className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="Nhập địa chỉ email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white py-3 pl-11 pr-5 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-blue-50 active:border-blue-500 disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:bg-gray-700"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="mb-2.5 block font-medium text-gray-800 dark:text-white text-sm">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <LockClosedIcon className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-blue-50 active:border-blue-500 disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:bg-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                  Quên mật khẩu?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-3 px-4 text-white font-semibold transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 disabled:opacity-70 active:scale-98 transform active:scale-95"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Đang đăng nhập...</span>
                  </div>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Chỉ dành cho quản trị viên. Liên hệ quản trị hệ thống để được cấp quyền.
          </p>
        </div>
      </div>
    </div>
  );
}
