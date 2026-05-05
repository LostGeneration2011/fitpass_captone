'use client';

import { useEffect, useRef, useState } from 'react';
import { Bars3Icon, BellIcon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, UserCircleIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';
import { apiPatch, apiGet, API_BASE_URL } from '@/lib/api';
import { io } from 'socket.io-client';
import Link from 'next/link';

interface NavbarProps {
  toggleSidebar?: () => void;
  toggleDarkMode?: () => void;
  isDarkMode?: boolean;
  title?: string;
}

export default function Navbar({ toggleSidebar, toggleDarkMode, isDarkMode, title }: NavbarProps) {
  const { user, logout, updateUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarTouched, setAvatarTouched] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const hasShownUnreadNetworkWarning = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const extractUnreadCount = (payload: any) => {
    if (typeof payload?.unreadCount === 'number') return payload.unreadCount;
    if (typeof payload?.data?.unreadCount === 'number') return payload.data.unreadCount;
    if (typeof payload?.count === 'number') return payload.count;
    return 0;
  };

  useEffect(() => {
    setFullName(user?.fullName || '');
    loadUnreadCount();
  }, [user?.fullName]);

  const loadUnreadCount = async () => {
    try {
      const response = await apiGet('/notifications/unread/count', { suppressErrorLog: true });
      setUnreadNotifications(extractUnreadCount(response));
      hasShownUnreadNetworkWarning.current = false;
    } catch (error) {
      setUnreadNotifications(0);
      if (!hasShownUnreadNetworkWarning.current) {
        console.warn('Notifications service is temporarily unavailable.');
        hasShownUnreadNetworkWarning.current = true;
      }
    }
  };

  useEffect(() => {
    const handleUnreadChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ unreadCount?: number }>;
      if (typeof customEvent.detail?.unreadCount === 'number') {
        setUnreadNotifications(customEvent.detail.unreadCount);
        return;
      }

      loadUnreadCount();
    };

    const pollingInterval = setInterval(loadUnreadCount, 30000);

    window.addEventListener('notifications:unread-changed', handleUnreadChanged as EventListener);
    window.addEventListener('focus', loadUnreadCount);

    // Real-time badge via Socket.IO
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('fitpass_admin_token') : null;
    const wsBaseUrl = API_BASE_URL.replace(/\/api$/, '');
    const socket = io(wsBaseUrl + '/ws', {
      auth: { token: adminToken },
      transports: ['websocket'],
      reconnectionAttempts: 3,
    });
    socket.on('notification', () => {
      setUnreadNotifications((prev) => prev + 1);
    });

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('notifications:unread-changed', handleUnreadChanged as EventListener);
      window.removeEventListener('focus', loadUnreadCount);
      socket.disconnect();
    };
  }, []);

  // Close dropdown on outside click or ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // only close if modal is open
        if (showProfileModal) setShowProfileModal(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setShowProfileModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 flex w-full bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700 transition-colors duration-300">
        <div className="flex flex-grow items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
          {/* Left side - Mobile menu toggle and title */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 lg:hidden transition-colors"
            >
              <Bars3Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            
            {title && (
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white lg:text-2xl">
                {title}
              </h1>
            )}
          </div>

          {/* Right side - User info, dark mode toggle and notifications */}
          <div className="flex items-center gap-3 2xsm:gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              {isDarkMode ? (
                <SunIcon className="h-5 w-5 text-yellow-500" />
              ) : (
                <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
            {/* Notifications */}
            <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              {unreadNotifications > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 z-10 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                  <span className="absolute -top-1 -right-1 z-10 h-5 w-5 animate-ping rounded-full bg-red-500 opacity-75"></span>
                </>
              )}
            </Link>

            {/* User Dropdown */}
            <div className="relative flex items-center gap-3" ref={menuRef}>
              <div className="hidden text-right lg:block">
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  {user?.fullName || 'Người dùng'}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{user?.role || 'ADMIN'}</span>
              </div>
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-sm ring-2 ring-transparent hover:ring-blue-200 dark:hover:ring-blue-500 transition"
                aria-label="Mở menu người dùng"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {user?.fullName?.charAt(0) || 'A'}
                  </span>
                )}
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-12 w-72 rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.fullName || 'Quản trị viên'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || 'admin@fitpass.com'}</p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                      {user?.role || 'ADMIN'}
                    </span>
                  </div>

                  <div className="py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowProfileModal(true);
                        setProfileError('');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition text-left"
                    >
                      <UserCircleIcon className="h-5 w-5 text-gray-500" />
                      Hồ sơ và Avatar
                    </button>
                    <a
                      href="/security"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition"
                    >
                      <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
                      Bảo mật và Mật khẩu
                    </a>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700"></div>

                  <div className="py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hồ sơ và Avatar Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            ref={modalRef}
            className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Hồ sơ và Avatar</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật thông tin hiển thị. Email chỉ để xem.</p>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Đóng popup hồ sơ"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-6">
              {/* Avatar uploader (preview only; persistence requires backend endpoint) */}
              <div className="md:col-span-1">
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 p-4 text-center dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Xem trước avatar" className="h-full w-full object-cover" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span>{(fullName || user?.fullName || 'A').charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Ảnh đại diện</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG/JPG tối đa 5MB.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 cursor-pointer transition">
                    <PhotoIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Tải lên</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          setProfileError('Ảnh đại diện quá lớn (tối đa 5MB).');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAvatarPreview(reader.result as string);
                          setAvatarTouched(true);
                          setProfileError('');
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {avatarPreview && (
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-600"
                      onClick={() => {
                        setAvatarPreview(null);
                        setAvatarTouched(true);
                      }}
                    >
                      Xóa avatar
                    </button>
                  )}
                </div>
              </div>

              {/* Form fields */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email (chỉ để xem)</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>

              </div>
            </div>

            {profileError && (
              <div className="px-6 pb-2 text-sm text-red-500">{profileError}</div>
            )}

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Hủy
                </button>
                <button
                  onClick={async () => {
                    if (!fullName.trim()) {
                      setProfileError('Họ và tên là bắt buộc.');
                      return;
                    }
                    setProfileError('');
                    setIsSavingProfile(true);
                    try {
                      if (user?.id) {
                        const payload: any = { fullName };
                        if (avatarTouched) {
                          payload.avatar = avatarPreview ?? null;
                        }

                        const updated = await apiPatch(`/users/${user.id}`, payload);
                        if (updated?.user) {
                          updateUser(updated.user);
                          setFullName(updated.user.fullName);
                          setAvatarPreview(null);
                          setAvatarTouched(false);
                        }
                      }
                      setShowProfileModal(false);
                    } catch (err: any) {
                      setProfileError(err.response?.data?.error || err.message || 'Cập nhật hồ sơ thất bại.');
                    } finally {
                      setIsSavingProfile(false);
                    }
                  }}
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}