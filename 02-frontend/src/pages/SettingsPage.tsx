import React from 'react';
import { Card, Button } from '../components/common';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Settings</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-6)' }}>
        Manage account and workspace preferences.
      </p>

      <Card title="Account Profile" subtitle="Your DEVOS developer identity" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: 'var(--font-size-xs)' }}>Name</span>
            <span style={{ fontWeight: 500 }}>{user?.name || 'Developer'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: 'var(--font-size-xs)' }}>Email</span>
            <span style={{ fontWeight: 500 }}>{user?.email || 'developer@example.com'}</span>
          </div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <Button variant="danger" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
