'use client';

import { useEffect } from 'react';

export default function DevLoadingHelper() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'development') {
      const loadingStartTime = Date.now();
      
      // Check if we've been loading for too long
      const checkLoadingTimeout = setInterval(() => {
        const loadingTime = Date.now() - loadingStartTime;
        
        if (loadingTime > 8000) { // 8 seconds
          console.warn('🚨 Development Warning: App has been loading for more than 8 seconds');
          console.log('💡 Try refreshing the page or clearing localStorage');
          console.log('🛠️ If this persists, check:');
          console.log('   - Backend server is running');
          console.log('   - No authentication loops');
          console.log('   - No infinite re-renders');
          
          // Show browser notification if possible
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('FitPass Dev Warning', {
              body: 'App loading taking too long. Check console.',
              icon: '/favicon.ico'
            });
          }
          
          clearInterval(checkLoadingTimeout);
        }
      }, 1000);
      
      return () => clearInterval(checkLoadingTimeout);
    }
  }, []);

  return null; // This component doesn't render anything
}