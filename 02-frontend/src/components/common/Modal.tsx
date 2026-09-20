import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 'var(--space-4)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        style={{
          width: '100%',
          maxWidth: 500,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-strong)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 id="modal-title" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h2>
            {description && <p id="modal-description" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" style={{ padding: 4 }}>
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        <div style={{ marginBottom: footer ? 'var(--space-6)' : 0 }}>
          {children}
        </div>

        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
