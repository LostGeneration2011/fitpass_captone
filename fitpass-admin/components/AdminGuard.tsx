'use client';

import { useAuth } from '@/lib/auth';
import AdminLoading from './AdminLoading';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AdminLoading />;
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-100">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-500 mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">Admin access required to view this page</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}