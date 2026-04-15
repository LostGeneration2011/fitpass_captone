"use client";

import { FormEvent, useMemo, useState } from "react";
import { apiPost } from "@/lib/api";
import { useToast } from "@/lib/toast";

type PasswordStrength = {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
};

const initialStrength: PasswordStrength = {
  minLength: false,
  hasUppercase: false,
  hasLowercase: false,
  hasNumber: false,
  hasSpecialChar: false,
};

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const { showToast } = useToast();

  const strength = useMemo<PasswordStrength>(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
  }, [newPassword]);

  const isStrongPassword = useMemo(() => {
    return Object.values(strength).every(Boolean);
  }, [strength]);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const validateForm = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return "Vui lòng điền đầy đủ các trường mật khẩu.";
    }

    if (!isStrongPassword) {
      return "Mật khẩu mới chưa đáp ứng yêu cầu bảo mật.";
    }

    if (newPassword !== confirmPassword) {
      return "Mật khẩu mới và xác nhận mật khẩu không khớp.";
    }

    if (currentPassword === newPassword) {
      return "Mật khẩu mới phải khác mật khẩu hiện tại.";
    }

    return "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setWarning("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiPost("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      const message =
        response?.message ||
        response?.data?.message ||
        "Cập nhật mật khẩu thành công.";

      const warningMessage =
        response?.warning ||
        response?.data?.warning ||
        "";

      setSuccess(message);
      showToast(message, "success");
      if (warningMessage) {
        setWarning(warningMessage);
        showToast(warningMessage, "warning");
      }
      resetForm();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Đổi mật khẩu thất bại.";

      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bảo mật và Mật khẩu</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Cập nhật mật khẩu tài khoản an toàn. Thao tác này chỉ áp dụng cho tài khoản quản trị đang đăng nhập.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
              {success}
            </div>
          )}

          {warning && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              {warning}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="currentPassword">
              Mật khẩu hiện tại
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-12 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showCurrentPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="newPassword">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-12 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showNewPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className={strength.minLength ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>- Tối thiểu 8 ký tự</div>
              <div className={strength.hasUppercase ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>- Có ít nhất 1 chữ in hoa</div>
              <div className={strength.hasLowercase ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>- Có ít nhất 1 chữ thường</div>
              <div className={strength.hasNumber ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>- Có ít nhất 1 chữ số</div>
              <div className={strength.hasSpecialChar ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>- Có ít nhất 1 ký tự đặc biệt</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="confirmPassword">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-12 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Đang cập nhật..." : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
