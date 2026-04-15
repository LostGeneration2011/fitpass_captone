'use client';

import { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

export default function Toast({ message, type = 'error', duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    const baseStyles = 'fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 p-4 transition-all duration-300 ease-in-out transform';
    
    if (isAnimating) {
      return `${baseStyles} translate-x-full opacity-0`;
    }
    
    switch (type) {
      case 'error':
        return `${baseStyles} border-red-500 animate-slide-in-right`;
      case 'success':
        return `${baseStyles} border-green-500 animate-slide-in-right`;
      case 'warning':
        return `${baseStyles} border-yellow-500 animate-slide-in-right`;
      case 'info':
        return `${baseStyles} border-blue-500 animate-slide-in-right`;
      default:
        return `${baseStyles} border-red-500 animate-slide-in-right`;
    }
  };

  const getIconAndColor = () => {
    switch (type) {
      case 'error':
        return {
          icon: '❌',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50'
        };
      case 'success':
        return {
          icon: '✅',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50'
        };
      case 'warning':
        return {
          icon: '⚠️',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50'
        };
      default:
        return {
          icon: '❌',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50'
        };
    }
  };

  const { icon, textColor, bgColor } = getIconAndColor();

  return (
    <div className={`${getToastStyles()} ${bgColor}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-lg">{icon}</span>
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={() => {
              setIsAnimating(true);
              setTimeout(() => {
                setIsVisible(false);
                onClose?.();
              }, 300);
            }}
            className={`inline-flex ${textColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}