import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  style,
  ...props
}) => {
  const getStyle = () => {
    switch (variant) {
      case 'accent':
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          color: 'var(--color-accent)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        };
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        };
      case 'warning':
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        };
      case 'danger':
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
        };
      case 'default':
      default:
        return {
          background: 'var(--color-surface-elevated)',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
        };
    }
  };

  return (
    <span
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'sm' ? '1px 5px' : '2px 7px',
        fontSize: size === 'sm' ? '10px' : '11px',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        lineHeight: 1.2,
        ...getStyle(),
        ...style,
      }}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </span>
  );
};
