'use client';

import { useEffect } from 'react';
import { clearAdminSession } from '@/lib/session';

export default function ClearSessionPage() {
  useEffect(() => {
    // Clear all admin session data
    clearAdminSession();
    
    // Reload to root to trigger proper auth flow
    window.location.href = '/';
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div>Clearing session and redirecting...</div>
      </div>
    </div>
  );
}