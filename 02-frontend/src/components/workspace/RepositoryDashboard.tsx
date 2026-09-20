import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Github, RefreshCw } from 'lucide-react';
import { githubApi, GithubRepository } from '../../api';
import { Project } from '../../types/project';
import { Badge, Button, Card, Spinner } from '../common';

type Surface = 'overview' | 'review' | 'pulls' | 'docs' | 'timeline' | 'tasks' | 'releases';

const surfaces: { id: Surface; label: string }[] = [
  { id: 'overview', label: 'Repository' },
  { id: 'review', label: 'Review' },
  { id: 'pulls', label: 'Pull requests' },
  { id: 'docs', label: 'Docs' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'releases', label: 'Releases' },
];

interface RepositoryDashboardProps {
  project: Project;
}

export const RepositoryDashboard: React.FC<RepositoryDashboardProps> = ({ project }) => {
  const [surface, setSurface] = useState<Surface>('overview');
  const [connection, setConnection] = useState<{ connected: boolean; username: string | null } | null>(null);
  const [repository, setRepository] = useState<GithubRepository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const connectionResponse = await githubApi.getConnection();
      const currentConnection = connectionResponse.data || { connected: false, username: null };
      setConnection(currentConnection);
      if (!currentConnection.connected) {
        setRepository(null);
        return;
      }
      const response = await githubApi.getRepos();
      const repositories = response.data?.repositories || [];
      const configuredUrl = project.repository_url?.replace(/\/$/, '').toLowerCase();
      setRepository(
        repositories.find((repo) => repo.html_url.replace(/\/$/, '').toLowerCase() === configuredUrl) ||
        repositories.find((repo) => repo.name.toLowerCase() === project.name.toLowerCase()) ||
        null
      );
    } catch (err: any) {
      setError(err?.message || 'Repository data is unavailable right now.');
      setRepository(null);
    } finally {
      setLoading(false);
    }
  }, [project.name, project.repository_url]);

  useEffect(() => { load(); }, [load]);

  const availability = useMemo(() => {
    if (!connection?.connected) return 'Connect GitHub to load repository data.';
    if (!project.repository_url) return 'No repository is linked to this project.';
    if (!repository) return 'This repository is not available to the connected GitHub account.';
    return '';
  }, [connection, project.repository_url, repository]);

  return (
    <Card
      title="Repository dashboard"
      subtitle="Review GitHub context without changing remote state"
      action={<Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Refresh repository dashboard"><RefreshCw size={14} /></Button>}
    >
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5)' }}><Spinner size={20} /></div>}
      {!loading && (
        <>
          <div role="tablist" aria-label="Repository surfaces" style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-4)' }}>
            {surfaces.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={surface === item.id}
                className={`btn btn-ghost ${surface === item.id ? 'active' : ''}`}
                style={{ borderBottom: surface === item.id ? '2px solid var(--color-accent)' : '2px solid transparent', borderRadius: 0 }}
                onClick={() => setSurface(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {error && <p role="alert" style={{ color: 'var(--color-error)' }}>{error}</p>}
          {availability && <p role="status" style={{ color: 'var(--color-text-muted)', margin: 0 }}>{availability}</p>}
          {!availability && surface === 'overview' && repository && (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {repository.avatar_url && <img src={repository.avatar_url} alt="" width={40} height={40} style={{ borderRadius: '50%' }} />}
                <div>
                  <strong>{repository.full_name}</strong>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>{repository.description || 'No description provided.'}</div>
                </div>
                <Badge variant={repository.private ? 'warning' : 'success'}>{repository.private ? 'Private' : 'Public'}</Badge>
                <a href={repository.html_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${repository.full_name} on GitHub`} style={{ marginLeft: 'auto' }}><ExternalLink size={16} /></a>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-5)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                <span>Default branch: <strong>{repository.default_branch || project.default_branch || 'main'}</strong></span>
                <span>★ {repository.stars}</span><span>Forks {repository.forks}</span>
                {repository.language && <span>{repository.language}</span>}
              </div>
            </div>
          )}
          {!availability && surface !== 'overview' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
              <Github size={16} /> {surfaces.find((item) => item.id === surface)?.label} data is not available from the connected GitHub API.
            </div>
          )}
        </>
      )}
    </Card>
  );
};
