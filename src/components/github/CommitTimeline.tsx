import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  GitBranch,
  Copy,
  ExternalLink,
  Check,
  User,
  Clock,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { gitApi, githubApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';

interface CommitTimelineProps {
  projectId: string;
}

interface CommitItem {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export const CommitTimeline: React.FC<CommitTimelineProps> = ({ projectId }) => {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const { toast } = useToast();

  const loadCommits = async () => {
    setIsLoading(true);
    try {
      const res = await gitApi.getLog(projectId);
      if (res.success && res.data?.logs) {
        setCommits(res.data.logs);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCommits();
  }, [projectId]);

  const handleCopySha = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast(`Copied SHA '${hash}' to clipboard`, 'success');
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleCheckoutCommit = async (hash: string) => {
    try {
      const res = await githubApi.runGitOp(projectId, 'checkout', hash);
      if (res.success) {
        toast(`Checked out commit detached HEAD @ ${hash.substring(0, 7)}`, 'success');
        loadCommits();
      }
    } catch {
      toast('Failed to checkout commit', 'error');
    }
  };

  return (
    <div
      id="commit-timeline-panel"
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GitCommit size={15} color="#38bdf8" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Commit History & Timeline ({commits.length})
          </span>
        </div>

        <button
          onClick={loadCommits}
          style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0 }}
          title="Refresh Commits"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Spinner size={18} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
          {commits.map((c, idx) => {
            const shortSha = c.hash.substring(0, 7);
            const authorName = c.author.split('<')[0].trim();
            const avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

            return (
              <div
                key={c.hash + idx}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  alignItems: 'flex-start',
                }}
              >
                <img
                  src={avatarUrl}
                  alt={authorName}
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                />

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', wordBreak: 'break-word' }}>
                    {c.message}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '11px', color: '#94a3b8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={11} /> {authorName}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {new Date(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => handleCopySha(c.hash)}
                    title="Copy SHA"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 4,
                      padding: '3px 7px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#38bdf8',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedHash === c.hash ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                    <span>{shortSha}</span>
                  </button>

                  <button
                    onClick={() => handleCheckoutCommit(c.hash)}
                    title="Checkout Commit"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 4,
                      padding: '3px 6px',
                      color: '#34d399',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={12} />
                  </button>

                  <a
                    href={`https://github.com/mdkhaleelurrahman51/devos-cloud-ide/commit/${c.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '3px 6px',
                    }}
                    title="Open on GitHub"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
