import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const VARIANT_STYLES: Record<ToastVariant, { border: string; color: string }> = {
  success: { border: 'var(--color-success)', color: 'var(--color-success)' },
  error: { border: 'var(--color-error)', color: 'var(--color-error)' },
  info: { border: 'var(--color-accent)', color: 'var(--color-accent)' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, variant, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        style={{
          position: 'fixed', bottom: 'var(--space-4)', right: 'var(--space-4)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxWidth: 360,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              backgroundColor: 'var(--color-surface)', border: `1px solid ${VARIANT_STYLES[t.variant].border}`,
              borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center',
            }}
          >
            <span aria-hidden="true" style={{ color: VARIANT_STYLES[t.variant].color, fontWeight: 700 }}>
              {t.variant === 'success' ? '✓' : t.variant === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
