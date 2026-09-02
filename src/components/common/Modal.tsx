import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth,
  size = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSizeMaxWidth = () => {
    if (maxWidth) return maxWidth;
    switch (size) {
      case 'sm':
        return '420px';
      case 'lg':
        return '720px';
      case 'xl':
        return '900px';
      case 'md':
      default:
        return '560px';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: getSizeMaxWidth(),
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-elevated)',
          }}
        >
          <div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block' }}>
              {title}
            </span>
            {subtitle && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                {subtitle}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-surface-elevated)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
