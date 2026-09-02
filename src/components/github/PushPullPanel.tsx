import React, { useState } from 'react';
import {
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Terminal,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { gitApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';
import { GitStatus } from '../../types/git';

interface PushPullPanelProps {
  projectId: string;
  status: GitStatus | null;
  onSyncComplete: () => void;
}

export const PushPullPanel: React.FC<PushPullPanelProps> = ({
  projectId,
  status,
  onSyncComplete,
}) => {
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const { toast } = useToast();

  const appendLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalOutput((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 40)]);
  };

  const handlePush = async () => {
    setIsPushing(true);
    appendLog(`git push origin ${status?.branch || 'main'} --progress`);
    try {
      const res = await gitApi.push(projectId, status?.branch);
      if (res.success && res.data) {
        if (res.data.output) {
          const lines = res.data.output.split('\n');
          lines.forEach((l: string) => l.trim() && appendLog(l));
        }
        toast(`Pushed successfully to remote origin/${status?.branch || 'main'}`, 'success');
        onSyncComplete();
      }
    } catch (err: any) {
      appendLog(`fatal: ${err.message || 'Push failed'}`);
      toast(err.message || 'Push failed', 'error');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    appendLog(`git pull origin ${status?.branch || 'main'}`);
    try {
      const res = await gitApi.pull(projectId, status?.branch);
      if (res.success && res.data) {
        if (res.data.output) {
          const lines = res.data.output.split('\n');
          lines.forEach((l: string) => l.trim() && appendLog(l));
        }
        toast(`Pulled changes from origin/${status?.branch || 'main'}`, 'success');
        onSyncComplete();
      }
    } catch (err: any) {
      appendLog(`fatal: ${err.message || 'Pull failed'}`);
      toast(err.message || 'Pull failed', 'error');
    } finally {
      setIsPulling(false);
    }
  };

  const handleFetch = async () => {
    setIsFetching(true);
    appendLog(`git fetch origin`);
    try {
      const res = await gitApi.fetch(projectId);
      if (res.success && res.data) {
        if (res.data.output) {
          const lines = res.data.output.split('\n');
          lines.forEach((l: string) => l.trim() && appendLog(l));
        }
        toast('Fetched updates from remote origin', 'success');
        onSyncComplete();
      }
    } catch (err: any) {
      appendLog(`fatal: ${err.message || 'Fetch failed'}`);
      toast(err.message || 'Fetch failed', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  const isSyncing = isPushing || isPulling || isFetching;

  return (
    <div
      id="push-pull-panel"
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header with quick stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UploadCloud size={14} color="#10b981" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Push & Pull Center
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11px' }}>
          <span
            style={{
              color: (status?.ahead || 0) > 0 ? '#38bdf8' : 'var(--color-text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <ArrowUp size={11} /> {status?.ahead || 0} ahead
          </span>
          <span
            style={{
              color: (status?.behind || 0) > 0 ? '#f43f5e' : 'var(--color-text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <ArrowDown size={11} /> {status?.behind || 0} behind
          </span>
        </div>
      </div>

      {/* Sync Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <button
          id="git-push-btn"
          onClick={handlePush}
          disabled={isSyncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 4,
            padding: '6px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#34d399',
            cursor: isSyncing ? 'wait' : 'pointer',
          }}
        >
          {isPushing ? <Spinner size={12} /> : <UploadCloud size={13} />}
          <span>Push</span>
        </button>

        <button
          id="git-pull-btn"
          onClick={handlePull}
          disabled={isSyncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: 4,
            padding: '6px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#38bdf8',
            cursor: isSyncing ? 'wait' : 'pointer',
          }}
        >
          {isPulling ? <Spinner size={12} /> : <DownloadCloud size={13} />}
          <span>Pull</span>
        </button>

        <button
          id="git-fetch-btn"
          onClick={handleFetch}
          disabled={isSyncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 4,
            padding: '6px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#fbbf24',
            cursor: isSyncing ? 'wait' : 'pointer',
          }}
        >
          {isFetching ? <Spinner size={12} /> : <RefreshCw size={12} />}
          <span>Fetch</span>
        </button>
      </div>

      {/* Terminal Stream Console */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--color-text-muted)' }}>
          <Terminal size={11} />
          <span>Git Sync Output Log</span>
        </div>

        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            lineHeight: 1.4,
            color: '#94a3b8',
            maxHeight: 90,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column-reverse',
          }}
        >
          {terminalOutput.length > 0 ? (
            terminalOutput.map((log, idx) => (
              <div key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {log}
              </div>
            ))
          ) : (
            <div style={{ color: 'rgba(255, 255, 255, 0.2)' }}>No sync actions executed yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
