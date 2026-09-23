import React from 'react';

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => {
  return (
    <div
      className={`spinner ${className}`.trim()}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
};
