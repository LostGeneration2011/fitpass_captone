'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import Toast from '@/components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: 'error' | 'success' | 'warning' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'error' | 'success' | 'warning' | 'info' }>>([]);

  const showToast = (message: string, type: 'error' | 'success' | 'warning' | 'info' = 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast, index) => (
          <div key={toast.id} style={{ top: `${20 + index * 80}px` }} className="absolute">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}