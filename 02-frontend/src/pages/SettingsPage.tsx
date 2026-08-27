import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Spinner } from '../components/common';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { githubApi, healthApi } from '../api';
import { useSeo } from '../hooks/useSeo';

export const SettingsPage: React.FC = () => {
  useSeo({ title: 'Settings', noindex: true });

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [github, setGithub] = useState<{ connected: boolean; username: string | null } | null>(null);
  const [githubError, setGithubError] = useState('');
  const [apiStatus, setApiStatus] = useState<string | null>(null);

  useEffect(() => {
    githubApi
      .getConnection()
      .then((res) => setGithub(res.data || { connected: false, username: null }))
      .catch((err) => setGithubError(err.message || 'Unable to check GitHub connection'));
    healthApi
      .check()
      .then((res) => setApiStatus(res.data?.status || null))
      .catch(() => setApiStatus('unreachable'));
  }, []);

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

      <Card title="GitHub Connection" subtitle="Repository integration status" style={{ marginBottom: 'var(--space-4)' }}>
        {githubError && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>{githubError}</p>}
        {!github && !githubError && <Spinner size={16} />}
        {github && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
            <span>
              {github.connected ? (
                <>
                  <Badge variant="success">Connected</Badge>{' '}
                  <span style={{ color: 'var(--color-text-secondary)' }}>as {github.username}</span>
                </>
              ) : (
                <>
                  <Badge variant="warning">Not connected</Badge>{' '}
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Connect GitHub via OAuth to browse and import repositories.
                  </span>
                </>
              )}
            </span>
            {github.connected && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => githubApi.disconnect().then(() => setGithub({ connected: false, username: null }))}
              >
                Disconnect
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card title="Backend Status" subtitle="DEVOS API health">
        <span style={{ fontSize: 'var(--font-size-sm)' }}>
          {apiStatus === null ? (
            <Spinner size={14} />
          ) : apiStatus === 'healthy' ? (
            <Badge variant="success">healthy</Badge>
          ) : (
            <Badge variant="error">{apiStatus}</Badge>
          )}
        </span>
      </Card>
    </div>
  );
};
