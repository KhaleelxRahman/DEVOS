import React from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export const Breadcrumbs: React.FC<{ items: Crumb[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-4)' }}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', listStyle: 'none', padding: 0, margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              {i > 0 && <span aria-hidden="true">/</span>}
              {!isLast && crumb.to ? (
                <Link to={crumb.to} style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} style={isLast ? { color: 'var(--color-text-primary)' } : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
