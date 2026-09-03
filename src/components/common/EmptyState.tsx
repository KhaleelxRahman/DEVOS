import React, { useEffect, useState } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 16,
        color: 'var(--color-text-muted)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px dashed var(--color-border)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      {icon && (
        <div style={{ 
          width: 64, 
          height: 64, 
          borderRadius: '50%', 
          background: 'rgba(59, 130, 246, 0.05)', 
          border: '1px solid rgba(59, 130, 246, 0.1)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#3b82f6',
          marginBottom: 8,
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)',
        }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {title}
      </div>
      {description && (
        <p style={{ margin: 0, fontSize: '14px', maxWidth: 360, lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {action ? (
        <div style={{ marginTop: 12 }}>{action}</div>
      ) : actionLabel && onAction ? (
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
