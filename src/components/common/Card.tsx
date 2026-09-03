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
        background: elevated ? 'rgba(17, 24, 39, 0.72)' : 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(37, 99, 235, 0.12)',
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
