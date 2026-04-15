'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoading() {
  const [showTimeout, setShowTimeout] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Show timeout message after 5 seconds
    const timeoutTimer = setTimeout(() => {
      setShowTimeout(true);
    }, 5000);

    // Force redirect after 10 seconds to prevent infinite loading
    const forceRedirectTimer = setTimeout(() => {
      console.warn('Loading timeout - forcing redirect to login');
      localStorage.clear();
      sessionStorage.clear();
      router.push('/login');
    }, 10000);

    return () => {
      clearTimeout(timeoutTimer);
      clearTimeout(forceRedirectTimer);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-boxdark-2 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg mb-6 relative">
          <span className="text-3xl font-bold text-white">F</span>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold text-black dark:text-white mb-2">FitPass Admin</h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          {showTimeout ? 'Taking longer than usual...' : 'Loading dashboard...'}
        </p>
        <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-1 mx-auto">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full animate-pulse" style={{width: '70%'}}></div>
        </div>
        {showTimeout && (
          <button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              router.push('/login');
            }}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Reset Session
          </button>
        )}
      </div>
    </div>
  );
}