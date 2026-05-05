'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import AdminGuard from '@/components/AdminGuard';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import DevLoadingHelper from '@/components/DevLoadingHelper';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isClearSessionPage = pathname === '/clear-session';
  const isForgotPasswordPage = pathname === '/forgot-password';
  const isResetPasswordPage = pathname === '/reset-password';

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', (!darkMode).toString());
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  useEffect(() => {
    // Prevent hydration mismatch by checking if we're on the client
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      setDarkMode(savedDarkMode);
      document.documentElement.classList.toggle('dark', savedDarkMode);
    }
  }, []);

  return (
    <>
      <DevLoadingHelper />
      <ToastProvider>
        <AuthProvider>
          {isLoginPage || isClearSessionPage || isForgotPasswordPage || isResetPasswordPage ? (
            <div className="relative">
              {children}
            </div>
          ) : (
            <AdminGuard>
              <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

                {/* Main Content Area */}
                <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden lg:ml-72">
                  {/* Navbar */}
                  <Navbar
                    toggleSidebar={toggleSidebar}
                    toggleDarkMode={toggleDarkMode}
                    isDarkMode={darkMode}
                  />

                  {/* Page Content */}
                  <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10">
                    {children}
                  </main>
                </div>
              </div>
            </AdminGuard>
          )}
        </AuthProvider>
      </ToastProvider>
    </>
  );
}
