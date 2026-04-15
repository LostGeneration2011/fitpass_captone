'use client';

import { ReactNode } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'warning'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'btn btn-danger';
      case 'warning':
        return 'btn btn-warning';
      case 'info':
        return 'btn btn-primary';
      default:
        return 'btn btn-warning';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-yellow-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="card max-w-md w-full mx-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getIconColor()}`}>
            {type === 'danger' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {type === 'warning' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {type === 'info' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="card-title text-lg mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="btn btn-secondary"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={getConfirmButtonClass()}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}