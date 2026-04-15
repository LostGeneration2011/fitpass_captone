"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EnvelopeIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Không thể gửi email đặt lại mật khẩu.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white shadow-xl dark:shadow-2xl dark:bg-gray-800 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Kiểm tra email của bạn
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Nếu tài khoản <span className="font-semibold text-gray-900 dark:text-white">{email}</span> tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.
              </p>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Mẹo:</strong> Hãy kiểm tra thư mục spam nếu bạn chưa thấy email.
                </p>
              </div>

              <button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-2xl">
            <span className="text-4xl font-bold text-white">F</span>
          </div>
          <h2 className="mt-8 text-4xl font-extrabold text-black dark:text-white tracking-tight">
            Đặt lại mật khẩu
          </h2>
          <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
            Nhập email để nhận liên kết đặt lại mật khẩu
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white shadow-xl dark:shadow-2xl dark:bg-gray-800 overflow-hidden">
          <form onSubmit={handleForgotPassword}>
            <div className="p-8 space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="mb-2.5 block font-medium text-gray-800 dark:text-white text-sm">
                  Địa chỉ email <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <EnvelopeIcon className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="admin@fitpass.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white py-3 pl-11 pr-5 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-blue-50 active:border-blue-500 disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:bg-gray-700"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-3 px-4 text-white font-semibold transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 disabled:opacity-70 active:scale-95 transform"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Đang gửi...</span>
                  </div>
                ) : (
                  "Gửi liên kết đặt lại"
                )}
              </button>
            </div>
          </form>

          {/* Footer Link */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-8 py-4 bg-gray-50 dark:bg-gray-700/50">
            <button
              onClick={() => router.push("/login")}
              className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Quay lại đăng nhập
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Liên kết đặt lại sẽ hết hạn sau 1 giờ vì lý do bảo mật.
          </p>
        </div>
      </div>
    </div>
  );
}
