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
  Link2,
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
  const isConnected = Boolean(status?.remote || status?.branch);

  return (
    <div
      id="git-status-card"
      className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-xl"
    >
      {/* Header with branch, remote, connection state and refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold font-mono">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{status?.branch || 'main'}</span>
          </div>

          <div className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Globe className="w-3 h-3" />
            <span className="truncate max-w-[180px]">
              {status?.remote || 'origin'} ({status?.remote_url?.replace('https://github.com/', '') || 'upstream'})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isConnected ? (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/25 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Reconnect GitHub</span>
            </button>
          ) : isClean ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3" />
              Tree Clean
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              <AlertCircle className="w-3 h-3" />
              {totalChanges} uncommitted
            </span>
          )}

          <button
            id="git-refresh-status-btn"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Git Status"
            className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Last Commit & Ahead/Behind info */}
      <div className="bg-slate-950/60 rounded-xl p-2.5 flex justify-between items-center gap-2 text-xs border border-white/5">
        <div className="flex items-center gap-2 overflow-hidden">
          <GitCommit className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-mono text-blue-400 font-semibold shrink-0">
            {status?.last_commit?.hash || 'c8f3b21'}
          </span>
          <span className="text-slate-400 truncate">
            {status?.last_commit?.message || 'feat(git): autonomous workspace commit'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            title={`${status?.ahead || 0} commits ahead of remote`}
            className={`inline-flex items-center gap-0.5 ${
              (status?.ahead || 0) > 0 ? 'text-blue-400 font-semibold' : 'text-slate-500'
            }`}
          >
            <ArrowUp className="w-3 h-3" /> {status?.ahead || 0}
          </span>
          <span
            title={`${status?.behind || 0} commits behind remote`}
            className={`inline-flex items-center gap-0.5 ${
              (status?.behind || 0) > 0 ? 'text-rose-400 font-semibold' : 'text-slate-500'
            }`}
          >
            <ArrowDown className="w-3 h-3" /> {status?.behind || 0}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 pt-1 overflow-x-auto">
        {[
          { key: 'all', label: 'All Changes', count: totalChanges },
          { key: 'staged', label: 'Staged', count: stagedCount, color: 'text-emerald-400' },
          { key: 'modified', label: 'Modified', count: modifiedCount, color: 'text-blue-400' },
          { key: 'untracked', label: 'Untracked', count: untrackedCount, color: 'text-slate-400' },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              id={`git-filter-${tab.key}-btn`}
              onClick={() => onFilterChange(tab.key as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950 ${tab.color || 'text-slate-300'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
