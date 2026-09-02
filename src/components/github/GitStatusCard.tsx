import React from 'react';
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { GitStatus } from '../../types/git';

interface GitStatusCardProps {
  status: GitStatus | null;
  isLoading: boolean;
  onRefresh: () => void;
  activeFilter: 'all' | 'modified' | 'staged' | 'untracked';
  onFilterChange: (filter: 'all' | 'modified' | 'staged' | 'untracked') => void;
}

export const GitStatusCard: React.FC<GitStatusCardProps> = ({
  status,
  isLoading,
  onRefresh,
  activeFilter,
  onFilterChange,
}) => {
  const stagedCount = status?.staged?.length || 0;
  const modifiedCount = status?.modified?.length || 0;
  const untrackedCount = status?.untracked?.length || 0;
  const totalChanges = stagedCount + modifiedCount + untrackedCount;
  const isClean = status?.is_clean ?? (totalChanges === 0);

  return (
    <div
      id="git-status-card"
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Header with branch, remote, and refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            <GitBranch size={13} />
            <span>{status?.branch || 'main'}</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              color: 'var(--color-text-muted)',
            }}
          >
            <Globe size={11} />
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {status?.remote || 'origin'} ({status?.remote_url?.replace('https://github.com/', '') || 'upstream'})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isClean ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '11px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              <CheckCircle2 size={11} />
              Tree Clean
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '11px',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              <AlertCircle size={11} />
              {totalChanges} uncommitted
            </span>
          )}

          <button
            id="git-refresh-status-btn"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Git Status"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '4px 6px',
              color: 'var(--color-text-muted)',
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={12} className={isLoading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* Last Commit & Ahead/Behind info */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 6,
          padding: '8px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <GitCommit size={13} color="var(--color-accent)" style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>
            {status?.last_commit?.hash || 'c8f3b21'}
          </span>
          <span
            style={{
              color: 'var(--color-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {status?.last_commit?.message || 'feat(git): autonomous workspace commit'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span
            title={`${status?.ahead || 0} commits ahead of remote`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              color: (status?.ahead || 0) > 0 ? '#38bdf8' : 'var(--color-text-muted)',
              fontWeight: (status?.ahead || 0) > 0 ? 600 : 400,
            }}
          >
            <ArrowUp size={11} /> {status?.ahead || 0}
          </span>
          <span
            title={`${status?.behind || 0} commits behind remote`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              color: (status?.behind || 0) > 0 ? '#f43f5e' : 'var(--color-text-muted)',
              fontWeight: (status?.behind || 0) > 0 ? 600 : 400,
            }}
          >
            <ArrowDown size={11} /> {status?.behind || 0}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: 8,
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'all', label: 'All Changes', count: totalChanges },
          { key: 'staged', label: 'Staged', count: stagedCount, color: '#10b981' },
          { key: 'modified', label: 'Modified', count: modifiedCount, color: '#38bdf8' },
          { key: 'untracked', label: 'Untracked', count: untrackedCount, color: '#94a3b8' },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              id={`git-filter-${tab.key}-btn`}
              onClick={() => onFilterChange(tab.key as any)}
              style={{
                background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: '11px',
                color: isActive ? '#38bdf8' : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  padding: '1px 5px',
                  borderRadius: 10,
                  fontSize: '10px',
                  fontWeight: 600,
                  color: tab.color || 'inherit',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
