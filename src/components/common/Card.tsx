import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  elevated?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  title,
  subtitle,
  action,
  style,
  ...props
}) => {
  return (
    <div
      {...props}
      style={{
        background: elevated ? 'var(--color-surface-elevated)' : 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {(title || subtitle || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div>
            {title && (
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {subtitle}
              </div>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
