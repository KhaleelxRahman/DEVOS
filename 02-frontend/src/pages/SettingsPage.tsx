import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, Star, GitFork } from 'lucide-react';
import { Card, Button, Badge, Spinner, Input } from '../components/common';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { githubApi, healthApi, GithubRepository } from '../api';
import { projectsApi } from '../api';
import { useProject } from '../hooks/useProject';
import { useSeo } from '../hooks/useSeo';

export const SettingsPage: React.FC = () => {
  useSeo({ title: 'Settings', noindex: true });

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [github, setGithub] = useState<{ connected: boolean; username: string | null } | null>(null);
  const [githubError, setGithubError] = useState('');
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [repositoryError, setRepositoryError] = useState('');
  const [repositorySearch, setRepositorySearch] = useState('');
  const [repositoryPage, setRepositoryPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setActiveProject } = useProject();
  const pageSize = 6;

  const loadRepositories = () => {
    setIsRefreshing(true);
    setRepositoryError('');
    githubApi.getRepos()
      .then((res) => setRepositories(res.data?.repositories || []))
      .catch((err) => setRepositoryError(err.message || 'Unable to load repositories'))
      .finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    githubApi
      .getConnection()
      .then((res) => setGithub(res.data || { connected: false, username: null }))
      .catch((err) => setGithubError(err.message || 'Unable to check GitHub connection'));
    loadRepositories();
    healthApi
      .check()
      .then((res) => setApiStatus(res.data?.status || null))
      .catch(() => setApiStatus('unreachable'));
  }, []);

  const filteredRepositories = useMemo(() => {
    const query = repositorySearch.trim().toLowerCase();
    return repositories.filter((repo) => !query || `${repo.name} ${repo.full_name} ${repo.language || ''}`.toLowerCase().includes(query));
  }, [repositories, repositorySearch]);
  const pageCount = Math.max(1, Math.ceil(filteredRepositories.length / pageSize));
  const visibleRepositories = filteredRepositories.slice((repositoryPage - 1) * pageSize, repositoryPage * pageSize);

  const openRepository = async (repo: GithubRepository) => {
    try {
      const res = await projectsApi.create({ name: repo.name, description: repo.description || '', repository_url: repo.html_url });
      if (res.success && res.data) {
        setActiveProject(res.data);
        navigate('/app/workspace');
      }
    } catch (err) {
      setRepositoryError(err instanceof Error ? err.message : 'Unable to open repository workspace');
    }
  };

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
                onClick={() => githubApi.disconnect()
                  .then(() => setGithub({ connected: false, username: null }))
                  .catch((err) => setGithubError(err.message || 'Unable to disconnect GitHub'))}
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
          ) : apiStatus === 'online' ? (
            <Badge variant="success">healthy</Badge>
          ) : (
            <Badge variant="error">{apiStatus}</Badge>
          )}
        </span>
      </Card>

      {github?.connected && (
        <Card title="GitHub Repositories" subtitle="Browse repositories available to your connected account" style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Input aria-label="Search repositories" placeholder="Search repositories" value={repositorySearch}
              onChange={(event) => { setRepositorySearch(event.target.value); setRepositoryPage(1); }} />
            <Button variant="secondary" size="sm" onClick={loadRepositories} disabled={isRefreshing} aria-label="Refresh repositories">
              <RefreshCw size={16} />
            </Button>
          </div>
          {repositoryError && <p style={{ color: 'var(--color-error)' }}>{repositoryError}</p>}
          {isRefreshing && repositories.length === 0 && <Spinner size={18} />}
          {!isRefreshing && !repositoryError && visibleRepositories.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No repositories match your search.</p>}
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {visibleRepositories.map((repo) => (
              <div key={repo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                {repo.avatar_url && <img src={repo.avatar_url} alt="" width={32} height={32} style={{ borderRadius: '50%', flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <strong>{repo.full_name}</strong>
                  <p style={{ color: 'var(--color-text-muted)', margin: 'var(--space-1) 0', overflowWrap: 'anywhere' }}>{repo.description || 'No description'}</p>
                  <small style={{ color: 'var(--color-text-muted)' }}>{repo.language || 'Unknown'} · <Star size={12} /> {repo.stars} · <GitFork size={12} /> {repo.forks} · Updated {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'unknown'}</small>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <Button variant="secondary" size="sm" onClick={() => openRepository(repo)}>Open workspace</Button>
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${repo.full_name} on GitHub`}><ExternalLink size={16} /></a>
                </div>
              </div>
            ))}
          </div>
          {pageCount > 1 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
            <Button variant="secondary" size="sm" disabled={repositoryPage === 1} onClick={() => setRepositoryPage((page) => page - 1)}>Previous</Button>
            <span aria-live="polite">Page {repositoryPage} of {pageCount}</span>
            <Button variant="secondary" size="sm" disabled={repositoryPage === pageCount} onClick={() => setRepositoryPage((page) => page + 1)}>Next</Button>
          </div>}
        </Card>
      )}
    </div>
  );
};
