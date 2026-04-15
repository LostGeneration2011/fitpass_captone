import React from 'react';
import { Platform } from 'react-native';

export const WebContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        border: '1px solid #334155'
      }}>
        {children}
      </div>
    </div>
  );
};