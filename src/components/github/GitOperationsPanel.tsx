import React, { useState } from 'react';
import {
  GitCommit,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Terminal as TerminalIcon,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import { githubApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';

interface GitOperationsPanelProps {
  projectId: string;
}

export const GitOperationsPanel: React.FC<GitOperationsPanelProps> = ({ projectId }) => {
  const [logs, setLogs] = useState<string[]>(['$ git status\nOn branch main\nYour branch is up to date with origin/main.']);
  const [commitMessage, setCommitMessage] = useState('');
  const [activeOp, setActiveOp] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRunGit = async (operation: 'status' | 'add' | 'commit' | 'push' | 'pull' | 'fetch') => {
    setActiveOp(operation);
    try {
      const res = await githubApi.runGitOp(projectId, operation, commitMessage || undefined);
      if (res.success && res.data) {
        const data = res.data;
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [
          `[${timestamp}] $ git ${operation}${operation === 'commit' && commitMessage ? ` -m "${commitMessage}"` : ''}\n${data.log}`,
          ...prev,
        ]);
        toast(`Git operation '${operation}' executed!`, 'success');
        if (operation === 'commit') setCommitMessage('');
      }
    } catch {
      toast(`Git operation '${operation}' failed`, 'error');
    } finally {
      setActiveOp(null);
    }
  };

  return (
    <div
      id="git-operations-panel"
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
          <TerminalIcon size={15} color="#38bdf8" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Git Terminal & Operations Center
          </span>
        </div>
      </div>

      {/* Operation Control Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
        <button
          onClick={() => handleRunGit('status')}
          disabled={activeOp !== null}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {activeOp === 'status' ? <Spinner size={11} /> : <CheckCircle2 size={11} />}
          <span>git status</span>
        </button>

        <button
          onClick={() => handleRunGit('add')}
          disabled={activeOp !== null}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            color: '#c084fc',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {activeOp === 'add' ? <Spinner size={11} /> : <GitBranch size={11} />}
          <span>git add .</span>
        </button>

        <button
          onClick={() => handleRunGit('push')}
          disabled={activeOp !== null}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {activeOp === 'push' ? <Spinner size={11} /> : <UploadCloud size={11} />}
          <span>git push</span>
        </button>

        <button
          onClick={() => handleRunGit('pull')}
          disabled={activeOp !== null}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {activeOp === 'pull' ? <Spinner size={11} /> : <DownloadCloud size={11} />}
          <span>git pull</span>
        </button>

        <button
          onClick={() => handleRunGit('fetch')}
          disabled={activeOp !== null}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#cbd5e1',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {activeOp === 'fetch' ? <Spinner size={11} /> : <RefreshCw size={11} />}
          <span>git fetch</span>
        </button>
      </div>

      {/* Commit Input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          placeholder="Commit message (for git commit)..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(2, 6, 23, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: '12px',
            color: '#fff',
            outline: 'none',
          }}
        />
        <button
          onClick={() => handleRunGit('commit')}
          disabled={activeOp !== null || !commitMessage.trim()}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            border: 'none',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <GitCommit size={12} />
          <span>Commit</span>
        </button>
      </div>

      {/* Real-time Output Log Terminal */}
      <div
        style={{
          background: '#020617',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          padding: '10px 12px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#38bdf8',
          maxHeight: 180,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {logs.map((log, i) => (
          <div key={i} style={{ borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: 6 }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};
