import React, { useCallback, useEffect, useState } from 'react';
import { GitBranch, GitCommitHorizontal, RefreshCw } from 'lucide-react';
import { gitApi } from '../../api';
import { GitStatus } from '../../types/git';
import { Spinner, Button } from '../common';

interface GitPanelProps {
  projectId: string;
}

interface LogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({ projectId }) => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<{ current: string; branches: string[] } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [diff, setDiff] = useState<string>('');
  const [showDiff, setShowDiff] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [statusRes, branchRes, logRes] = await Promise.all([
        gitApi.getStatus(projectId),
        gitApi.getBranches(projectId),
        gitApi.getLog(projectId, 10),
      ]);
      setStatus(statusRes.data || null);
      setBranches(branchRes.data || null);
      setLog(logRes.data?.commits || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Git state');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<any>, successMessage: string) => {
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(successMessage);
      await load();
    } catch (err: any) {
      setError(err.message || 'Git operation failed');
    } finally {
      setIsBusy(false);
    }
  };

  const toggleDiff = async () => {
    if (!showDiff) {
      try {
        const res = await gitApi.getDiff(projectId);
        setDiff(res.data?.diff || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load diff');
        return;
      }
    }
    setShowDiff(!showDiff);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
        <Spinner size={18} />
      </div>
    );
  }

  const changedFiles = [
    ...(status?.added.map((f) => ({ file: f, kind: 'staged' })) || []),
    ...(status?.modified.map((f) => ({ file: f, kind: 'modified' })) || []),
    ...(status?.deleted.map((f) => ({ file: f, kind: 'deleted' })) || []),
    ...(status?.untracked.map((f) => ({ file: f, kind: 'untracked' })) || []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, fontSize: 12, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)' }}>
          <GitBranch size={13} />
          <strong style={{ color: 'var(--color-text-primary)' }}>{branches?.current || status?.branch || '—'}</strong>
          {status?.is_clean && <span style={{ color: 'var(--color-success)' }}>clean</span>}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={isBusy} aria-label="Refresh git status">
          <RefreshCw size={12} />
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-error)', margin: '4px 0' }} role="alert">{error}</p>}
      {notice && <p style={{ color: 'var(--color-success)', margin: '4px 0' }} role="status">{notice}</p>}

      {branches && branches.branches.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', gap: 6 }}>
          <select
            className="input"
            style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
            value={branches.current}
            aria-label="Switch branch"
            onChange={(e) => run(() => gitApi.checkout(projectId, e.target.value), `Switched to ${e.target.value}`)}
            disabled={isBusy}
          >
            {branches.branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <input
            className="input"
            style={{ width: 110, fontSize: 12, padding: '4px 8px' }}
            placeholder="new branch"
            aria-label="New branch name"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={isBusy || !newBranch.trim()}
            onClick={() => run(() => gitApi.checkout(projectId, newBranch.trim(), true), `Created ${newBranch.trim()}`)}
          >
            +
          </Button>
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <div style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>Changes ({changedFiles.length})</div>
        {changedFiles.length === 0 && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Working tree clean</p>}
        {changedFiles.map(({ file, kind }) => (
          <div key={`${kind}-${file}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: kind === 'staged' ? 'var(--color-success)' : kind === 'deleted' ? 'var(--color-error)' : 'var(--color-warning)' }}>
                {kind === 'staged' ? 'A' : kind === 'modified' ? 'M' : kind === 'deleted' ? 'D' : 'U'}
              </span>{' '}
              {file}
            </span>
            {kind !== 'staged' ? (
              <button className="btn btn-secondary btn-sm" disabled={isBusy} onClick={() => run(() => gitApi.stage(projectId, [file]), `Staged ${file}`)}>stage</button>
            ) : (
              <button className="btn btn-secondary btn-sm" disabled={isBusy} onClick={() => run(() => gitApi.unstage(projectId, [file]), `Unstaged ${file}`)}>unstage</button>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (commitMessage.trim()) {
            run(() => gitApi.commit(projectId, commitMessage.trim()), 'Committed').then(() => setCommitMessage(''));
          }
        }}
        style={{ display: 'flex', gap: 6, marginBottom: 8 }}
      >
        <input
          className="input"
          style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
          placeholder="Commit message"
          aria-label="Commit message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <Button type="submit" variant="primary" size="sm" disabled={isBusy || !commitMessage.trim()}>
          Commit
        </Button>
      </form>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <Button variant="secondary" size="sm" onClick={toggleDiff} disabled={isBusy}>
          {showDiff ? 'Hide diff' : 'Diff'}
        </Button>
        <Button variant="secondary" size="sm" disabled={isBusy} onClick={() => run(() => gitApi.pull(projectId), 'Pulled')}>
          Pull
        </Button>
        <Button variant="secondary" size="sm" disabled={isBusy} onClick={() => run(() => gitApi.push(projectId), 'Pushed')}>
          Push
        </Button>
      </div>

      {showDiff && (
        <pre style={{ background: 'var(--color-background)', padding: 8, borderRadius: 6, overflowX: 'auto', color: 'var(--color-text-secondary)', maxHeight: 180 }}>
          {diff || 'No changes'}
        </pre>
      )}

      <div style={{ color: 'var(--color-text-muted)', margin: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <GitCommitHorizontal size={12} /> Recent commits
      </div>
      {log.length === 0 && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No commits yet</p>}
      {log.map((entry) => (
        <div key={entry.hash} style={{ marginBottom: 4 }}>
          <span style={{ color: 'var(--color-accent)' }}>{entry.hash}</span>{' '}
          <span>{entry.message}</span>{' '}
          <span style={{ color: 'var(--color-text-muted)' }}>— {entry.author}</span>
        </div>
      ))}
    </div>
  );
};
