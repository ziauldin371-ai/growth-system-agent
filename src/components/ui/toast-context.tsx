'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ToastItem {
  id: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  fixAction?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    fixAction?: { label: string; onClick: () => void }
  ) => void;
  success: (message: string) => void;
  error: (message: string, fixAction?: { label: string; onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      fixAction?: { label: string; onClick: () => void }
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, fixAction }]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string) => showToast(message, 'success'),
    [showToast]
  );

  const error = useCallback(
    (message: string, fixAction?: { label: string; onClick: () => void }) =>
      showToast(message, 'error', fixAction),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error }}>
      {children}

      {/* Toast Notification Container */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-center justify-between gap-3 text-sm font-medium transition-all transform translate-y-0 ${
                isError
                  ? 'bg-error-container text-on-error-container border-error/40'
                  : isSuccess
                  ? 'bg-emerald-950 text-emerald-100 border-emerald-500/40'
                  : isWarning
                  ? 'bg-amber-950 text-amber-100 border-amber-500/40'
                  : 'bg-surface-container-high text-on-surface border-outline-variant/40'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="material-symbols-outlined text-[18px] shrink-0">
                  {isError
                    ? 'error'
                    : isSuccess
                    ? 'check_circle'
                    : isWarning
                    ? 'warning'
                    : 'info'}
                </span>
                <span className="truncate">{toast.message}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {toast.fixAction && (
                  <button
                    onClick={() => {
                      toast.fixAction?.onClick();
                      removeToast(toast.id);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors border border-outline-variant/30"
                  >
                    {toast.fixAction.label}
                  </button>
                )}
                <button
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="p-1 rounded-lg hover:bg-black/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
    };
  }
  return context;
}

