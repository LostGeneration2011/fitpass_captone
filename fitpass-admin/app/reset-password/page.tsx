"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Password strength validation state
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError("Token đặt lại mật khẩu không hợp lệ hoặc bị thiếu.");
    }
  }, [searchParams]);

  // Check password strength in real-time
  useEffect(() => {
    setPasswordStrength({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  const isPasswordStrong = Object.values(passwordStrength).every(v => v === true);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const validatePasswords = () => {
    if (!newPassword) {
      setError("Vui lòng nhập mật khẩu.");
      return false;
    }
    if (!isPasswordStrong) {
      setError("Mật khẩu chưa đáp ứng yêu cầu bảo mật.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return false;
    }
    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePasswords()) return;
    if (!token) {
      setError("Token đặt lại mật khẩu không hợp lệ.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Đặt lại mật khẩu thất bại.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Đặt lại mật khẩu thành công! 🎉
            </h1>
            <p className="text-slate-300 mb-8 leading-relaxed">
              Mật khẩu của bạn đã được đặt lại thành công. Bây giờ bạn có thể đăng nhập FitPass bằng mật khẩu mới.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Tiếp tục đến trang đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Đặt lại mật khẩu 🔐
            </h1>
            <p className="text-slate-300">
              Nhập mật khẩu mới của bạn bên dưới
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-400 font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-300 mb-2">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập mật khẩu mới"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
                  aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showNewPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password Strength Requirements */}
              {newPassword && (
                <div className="mt-4 space-y-3">
                  {/* Warning if not strong */}
                  {!isPasswordStrong && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs font-semibold text-red-400">
                        ⚠️ Mật khẩu chưa đáp ứng yêu cầu bảo mật
                      </p>
                    </div>
                  )}

                  {/* Requirements Checklist */}
                  <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 space-y-3">
                    <p className="text-xs font-semibold text-slate-300 mb-3">Yêu cầu mật khẩu:</p>
                    
                    <div className="space-y-2">
                      {/* Minimum 8 characters */}
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${passwordStrength.minLength ? 'bg-green-500/20 border border-green-500' : 'bg-slate-600 border border-slate-500'}`}>
                          {passwordStrength.minLength && (
                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs ${passwordStrength.minLength ? 'text-green-400' : 'text-slate-400'}`}>
                          Tối thiểu 8 ký tự
                        </span>
                      </div>

                      {/* Uppercase letter */}
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${passwordStrength.hasUppercase ? 'bg-green-500/20 border border-green-500' : 'bg-slate-600 border border-slate-500'}`}>
                          {passwordStrength.hasUppercase && (
                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs ${passwordStrength.hasUppercase ? 'text-green-400' : 'text-slate-400'}`}>
                          Có ít nhất 1 chữ in hoa (A-Z)
                        </span>
                      </div>

                      {/* Lowercase letter */}
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${passwordStrength.hasLowercase ? 'bg-green-500/20 border border-green-500' : 'bg-slate-600 border border-slate-500'}`}>
                          {passwordStrength.hasLowercase && (
                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs ${passwordStrength.hasLowercase ? 'text-green-400' : 'text-slate-400'}`}>
                          Có ít nhất 1 chữ thường (a-z)
                        </span>
                      </div>

                      {/* Number */}
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${passwordStrength.hasNumber ? 'bg-green-500/20 border border-green-500' : 'bg-slate-600 border border-slate-500'}`}>
                          {passwordStrength.hasNumber && (
                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs ${passwordStrength.hasNumber ? 'text-green-400' : 'text-slate-400'}`}>
                          Có ít nhất 1 chữ số (0-9)
                        </span>
                      </div>

                      {/* Special character */}
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${passwordStrength.hasSpecialChar ? 'bg-green-500/20 border border-green-500' : 'bg-slate-600 border border-slate-500'}`}>
                          {passwordStrength.hasSpecialChar && (
                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs ${passwordStrength.hasSpecialChar ? 'text-green-400' : 'text-slate-400'}`}>
                          Có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-300 mb-2">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPassword && newPassword && (
                <p className={`text-xs mt-2 font-medium ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordsMatch ? '✓ Mật khẩu khớp' : '✗ Mật khẩu không khớp'}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !token || !isPasswordStrong || !passwordsMatch}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                loading || !token || !isPasswordStrong || !passwordsMatch
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang đặt lại mật khẩu...
                </span>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-slate-300 font-medium mb-1">Nhắc nhở bảo mật</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hãy chọn mật khẩu mạnh và chưa từng dùng trước đây. Liên kết này sẽ hết hạn sau 1 giờ vì lý do bảo mật.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}