import React from 'react';
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
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        gap: 10,
        color: 'var(--color-text-muted)',
      }}
    >
      {icon && <div style={{ marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {title}
      </div>
      {description && (
        <p style={{ margin: 0, fontSize: '12px', maxWidth: 400, lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {action ? (
        <div style={{ marginTop: 8 }}>{action}</div>
      ) : actionLabel && onAction ? (
        <div style={{ marginTop: 8 }}>
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
