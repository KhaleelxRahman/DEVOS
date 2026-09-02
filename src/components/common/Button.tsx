import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled,
  style,
  className = '',
  ...props
}) => {
  const getPadding = () => {
    switch (size) {
      case 'xs':
        return '2px 6px';
      case 'sm':
        return '4px 8px';
      case 'lg':
        return '10px 20px';
      case 'md':
      default:
        return '6px 12px';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'xs':
        return '10px';
      case 'sm':
        return '11px';
      case 'lg':
        return '14px';
      case 'md':
      default:
        return '12px';
    }
  };

  const getColors = () => {
    switch (variant) {
      case 'secondary':
        return {
          background: 'var(--color-surface-elevated)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          border: '1px solid transparent',
        };
      case 'danger':
        return {
          background: '#dc2626',
          color: '#ffffff',
          border: '1px solid #b91c1c',
        };
      case 'primary':
      default:
        return {
          background: 'var(--color-accent)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
    }
  };

  const colors = getColors();

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: getPadding(),
        fontSize: getFontSize(),
        fontWeight: 600,
        borderRadius: 'var(--radius-md)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 150ms ease',
        ...colors,
        ...style,
      }}
    >
      {leftIcon && <span style={{ display: 'inline-flex' }}>{leftIcon}</span>}
      {children}
      {rightIcon && <span style={{ display: 'inline-flex' }}>{rightIcon}</span>}
    </button>
  );
};
