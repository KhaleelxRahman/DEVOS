import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common';
import { FileQuestion } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';
import { useAuth } from '../hooks/useAuth';

export const NotFoundPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  useSeo({
    title: 'Page Not Found',
    description: 'The requested page does not exist.',
    noindex: true,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <EmptyState
        icon={<FileQuestion size={48} />}
        title="404 — Page Not Found"
        description="This page does not exist. It may have moved, or the link is incorrect."
        headingLevel="h1"
      />
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Link to="/" className="site-btn site-btn-primary">Return Home</Link>
        <button className="site-btn site-btn-ghost" onClick={() => window.history.back()}>Go Back</button>
        {isAuthenticated && (
          <Link to="/app/dashboard" className="site-btn site-btn-ghost">Open Workspace</Link>
        )}
      </div>
    </div>
  );
};
