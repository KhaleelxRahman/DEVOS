import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Github, RefreshCw, Search, Layers, GitCommitHorizontal, Database } from 'lucide-react';
import {
  GithubRepository,
  RepoArchitecture,
  RepoIndexState,
  RepoSymbolMatch,
  RepoTextHit,
  gitApi,
  githubApi,
  repoIndexApi,
} from '../../api';
import { Project } from '../../types/project';
import { Badge, Button, Card, Spinner } from '../common';

type Surface = 'overview' | 'architecture' | 'search' | 'timeline';

const surfaces: { id: Surface; label: string }[] = [
  { id: 'overview', label: 'Repository & Index' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'search', label: 'Symbols & Search' },
  { id: 'timeline', label: 'Commit Timeline' },
];

interface RepositoryDashboardProps {
  project: Project;
}

export const RepositoryDashboard: React.FC<RepositoryDashboardProps> = ({ project }) => {
  const [surface, setSurface] = useState<Surface>('overview');
  const [connection, setConnection] = useState<{ connected: boolean; username: string | null } | null>(null);
  const [repository, setRepository] = useState<GithubRepository | null>(null);
  const [indexState, setIndexState] = useState<RepoIndexState | null>(null);
  const [architecture, setArchitecture] = useState<RepoArchitecture | null>(null);
  const [commits, setCommits] = useState<{ hash: string; author: string; date: string; message: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'symbols' | 'text' | 'semantic'>('symbols');
  const [symbolHits, setSymbolHits] = useState<RepoSymbolMatch[]>([]);
  const [textHits, setTextHits] = useState<RepoTextHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [connectionResponse, indexRes, archRes, logRes] = await Promise.all([
        githubApi.getConnection().catch(() => ({ data: { connected: false, username: null } })),
        repoIndexApi.getState(project.id, true).catch(() => null),
        repoIndexApi.getArchitecture(project.id).catch(() => null),
        gitApi.getLog(project.id, 25).catch(() => null),
      ]);
      if (indexRes?.data) setIndexState(indexRes.data);
      if (archRes?.data) setArchitecture(archRes.data);
      if (logRes?.data?.commits) setCommits(logRes.data.commits);

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
  }, [project.id, project.name, project.repository_url]);

  useEffect(() => { load(); }, [load]);

  const handleRebuildIndex = async () => {
    setIsIndexing(true);
    setError('');
    try {
      const res = await repoIndexApi.build(project.id);
      if (res.data) setIndexState(res.data);
      const archRes = await repoIndexApi.getArchitecture(project.id).catch(() => null);
      if (archRes?.data) setArchitecture(archRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to rebuild repository index');
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setError('');
    try {
      if (searchMode === 'symbols') {
        const res = await repoIndexApi.searchSymbols(project.id, q);
        setSymbolHits(res.data || []);
        setTextHits([]);
      } else if (searchMode === 'text') {
        const res = await repoIndexApi.searchText(project.id, q);
        setTextHits(res.data || []);
        setSymbolHits([]);
      } else {
        const res = await repoIndexApi.searchSemantic(project.id, q);
        setTextHits(res.data || []);
        setSymbolHits([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const availability = useMemo(() => {
    if (!connection?.connected) return 'Connect GitHub in Settings to link remote repository metadata.';
    if (!project.repository_url) return 'No remote GitHub URL is linked to this project.';
    if (!repository) return 'This repository is not available to the connected GitHub account.';
    return '';
  }, [connection, project.repository_url, repository]);

  return (
    <Card
      title="Repository dashboard"
      subtitle="GitHub integration, Phase 6 Repository Brain index, architecture & symbol search"
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

          {surface === 'overview' && (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {availability ? (
                <p role="status" style={{ color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Github size={14} /> {availability}
                </p>
              ) : repository ? (
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
              ) : null}

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Database size={14} /> Repository Brain Index
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => void handleRebuildIndex()} isLoading={isIndexing}>
                    Rebuild Index
                  </Button>
                </div>
                {indexState ? (
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    <span>Files indexed: <strong>{indexState.file_count}</strong></span>
                    <span>Symbols extracted: <strong>{indexState.symbol_count}</strong></span>
                    <span>Generation: <strong>#{indexState.generation}</strong></span>
                    {Object.keys(indexState.languages || {}).length > 0 && (
                      <span>
                        Languages:{' '}
                        {Object.entries(indexState.languages)
                          .map(([lang, count]) => `${lang} (${count})`)
                          .join(', ')}
                      </span>
                    )}
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--font-size-sm)' }}>
                    Click &ldquo;Rebuild Index&rdquo; to index workspace files and symbols.
                  </p>
                )}
              </div>
            </div>
          )}

          {surface === 'architecture' && (
            <div style={{ display: 'grid', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Layers size={14} /> Workspace Architecture Summary
              </div>
              {architecture ? (
                <>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', color: 'var(--color-text-secondary)' }}>
                    <span>Total symbols: <strong>{architecture.total_symbols}</strong></span>
                    {Object.entries(architecture.symbols_by_kind || {}).map(([kind, count]) => (
                      <span key={kind}>{kind}: <strong>{count}</strong></span>
                    ))}
                  </div>
                  {architecture.internal_modules.length > 0 && (
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>Internal modules ({architecture.internal_modules.length})</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {architecture.internal_modules.map((mod) => (
                          <code key={mod} style={{ background: 'var(--color-background)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{mod}</code>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No indexed architecture data yet. Rebuild the index on the Repository tab.</p>
              )}
            </div>
          )}

          {surface === 'search' && (
            <div style={{ display: 'grid', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <select
                  className="input"
                  style={{ width: 140, fontSize: 12 }}
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value as 'symbols' | 'text' | 'semantic')}
                  aria-label="Search mode"
                >
                  <option value="symbols">Symbols</option>
                  <option value="text">Exact Text</option>
                  <option value="semantic">Semantic</option>
                </select>
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 160, fontSize: 12 }}
                  placeholder="Search symbols, text, or ask a question…"
                  aria-label="Repository search query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" variant="primary" size="sm" isLoading={isSearching} disabled={!searchQuery.trim()}>
                  <Search size={13} /> Search
                </Button>
              </form>
              {symbolHits.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                  {symbolHits.map((hit, idx) => (
                    <li key={`${hit.path}-${hit.line}-${idx}`} style={{ background: 'var(--color-background)', padding: 8, borderRadius: 6 }}>
                      <strong>{hit.name}</strong> <Badge variant="default">{hit.kind}</Badge>{' '}
                      <code style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{hit.path}:{hit.line}</code>
                      {hit.signature && <pre style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-secondary)' }}>{hit.signature}</pre>}
                    </li>
                  ))}
                </ul>
              )}
              {textHits.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                  {textHits.map((hit, idx) => (
                    <li key={`${hit.path}-${hit.line || idx}`} style={{ background: 'var(--color-background)', padding: 8, borderRadius: 6 }}>
                      <code style={{ fontSize: 11, color: 'var(--color-accent)' }}>{hit.path}{hit.line ? `:${hit.line}` : ''}</code>
                      {hit.snippet && <pre style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{hit.snippet}</pre>}
                    </li>
                  ))}
                </ul>
              )}
              {!isSearching && symbolHits.length === 0 && textHits.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Enter a query above to search indexed symbols, text, or semantic matches.</p>
              )}
            </div>
          )}

          {surface === 'timeline' && (
            <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <GitCommitHorizontal size={14} /> Local Git Commit Timeline
              </div>
              {commits.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No commits recorded in this workspace yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                  {commits.map((c) => (
                    <li key={c.hash} style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 6 }}>
                      <code style={{ color: 'var(--color-accent)' }}>{c.hash.slice(0, 8)}</code>{' '}
                      <strong>{c.message}</strong>{' '}
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                        — {c.author} ({c.date ? new Date(c.date).toLocaleString() : ''})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
};
