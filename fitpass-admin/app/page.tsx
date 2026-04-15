'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Simply redirect to dashboard, let AuthProvider handle auth logic
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg mb-6">
          <span className="text-3xl font-bold text-white">F</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">FitPass Admin</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Fitness Management Dashboard</p>
        <div className="animate-pulse">
          <div className="h-2 w-32 bg-gradient-to-r from-purple-400 to-blue-400 rounded mx-auto"></div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading...</p>
      </div>
    </div>
  );
}

