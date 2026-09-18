import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, RefreshCw, RotateCcw, Square } from 'lucide-react';
import { ExecutionRecord, executionApi } from '../../api';

interface HistoryPanelProps {
  projectId: string;
}

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'BLOCKED', 'STOPPED']);
const CANCELLABLE = new Set(['QUEUED', 'PREPARING', 'STARTING', 'RUNNING', 'READY']);
const RETRYABLE = new Set(['FAILED', 'CANCELLED', 'TIMED_OUT']);

function statusColor(status: string): string {
  if (status === 'COMPLETED') return 'var(--color-success)';
  if (status === 'FAILED' || status === 'TIMED_OUT') return 'var(--color-error)';
  if (status === 'CANCELLED' || status === 'BLOCKED' || status === 'STOPPED') return 'var(--color-warning)';
  return 'var(--color-accent)';
}

/** Real elapsed wall-clock time from the recorded timestamps (2A-2E data). */
function formatDuration(record: ExecutionRecord): string {
  if (!record.started_at || !record.completed_at) return '—';
  const ms = new Date(record.completed_at).getTime() - new Date(record.started_at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ projectId }) => {
  const [records, setRecords] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExecutionRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await executionApi.list(projectId, 50);
      setRecords(res.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load execution history');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setExpandedId(null);
    setDetail(null);
    void load();
  }, [load]);

  const toggle = async (executionId: string) => {
    if (expandedId === executionId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(executionId);
    setDetail(null);
    try {
      const res = await executionApi.get(projectId, executionId);
      setDetail(res.data ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load execution details');
      setExpandedId(null);
    }
  };

  const act = async (executionId: string, action: 'cancel' | 'retry') => {
    setBusyId(executionId);
    setError(null);
    try {
      await (action === 'cancel'
        ? executionApi.cancel(projectId, executionId)
        : executionApi.retry(projectId, executionId));
      await load();
      if (expandedId === executionId) {
        const res = await executionApi.get(projectId, executionId);
        setDetail(res.data ?? null);
      }
    } catch (err: any) {
      setError(err.message || `${action} failed`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Past executions recorded by the engine (newest first)
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh execution history"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-error)', margin: 0, fontSize: 12 }} role="alert">{error}</p>}
      {!loading && !error && records.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 12 }}>
          No executions yet. Run a terminal command or a quality operation to populate history.
        </p>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {records.map((record) => {
          const expanded = expandedId === record.execution_id;
          const shown = expanded && detail ? detail : record;
          return (
            <li key={record.execution_id} style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 8 }}>
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => void toggle(record.execution_id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void toggle(record.execution_id);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexWrap: 'wrap' }}
              >
                {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {record.execution_type}
                </span>
                <code style={{ fontSize: 11, flex: 1, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {record.command}
                </code>
                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(record.status) }}>
                  {record.status}
                </span>
                {record.exit_code !== null && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>exit {record.exit_code}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={11} /> {formatDuration(record)}
                </span>
                {(record.retry_count ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>attempt {record.retry_count}</span>
                )}
              </div>

              {TERMINAL_STATES.has(record.status) && record.status !== 'COMPLETED' && record.failure_reason && (
                <p style={{ color: 'var(--color-error)', fontSize: 11, margin: '4px 0 0 21px' }}>
                  {record.failure_reason}
                </p>
              )}

              {expanded && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 21 }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    <span>id: <code>{shown.execution_id}</code></span>
                    <span>created: {formatTime(shown.created_at)}</span>
                    <span>started: {formatTime(shown.started_at)}</span>
                    <span>completed: {formatTime(shown.completed_at)}</span>
                    <span>exit: {shown.exit_code ?? '—'}</span>
                    <span>pid: {shown.process_id ?? '—'}</span>
                    <span>attempt: {shown.retry_count ?? 0}</span>
                    {shown.parent_execution_id && <span>parent: <code>{shown.parent_execution_id}</code></span>}
                    <span>cwd: <code>{shown.working_directory}</code></span>
                  </div>

                  {shown.failure_reason && (
                    <p style={{ color: 'var(--color-error)', fontSize: 11, margin: 0 }}>
                      Failure: {shown.failure_reason}
                      {shown.timed_out ? ' (timed out)' : shown.cancelled ? ' (cancelled)' : ''}
                    </p>
                  )}

                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>stdout</p>
                    <pre style={{ background: 'var(--color-background)', padding: 8, borderRadius: 6, overflowX: 'auto', maxHeight: 140, margin: 0, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {shown.stdout || '(empty)'}
                    </pre>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>stderr</p>
                    <pre style={{ background: 'var(--color-background)', padding: 8, borderRadius: 6, overflowX: 'auto', maxHeight: 140, margin: 0, fontSize: 11, color: 'var(--color-warning)' }}>
                      {shown.stderr || '(empty)'}
                    </pre>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {CANCELLABLE.has(shown.status) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void act(shown.execution_id, 'cancel')}
                        disabled={busyId === shown.execution_id}
                        aria-label="Cancel execution"
                      >
                        <Square size={11} /> Cancel
                      </button>
                    )}
                    {RETRYABLE.has(shown.status) && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => void act(shown.execution_id, 'retry')}
                        disabled={busyId === shown.execution_id}
                        aria-label="Retry execution"
                      >
                        <RotateCcw size={11} /> Retry
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};