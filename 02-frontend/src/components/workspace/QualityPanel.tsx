import React, { useCallback, useEffect, useState } from 'react';
import { Hammer, Play } from 'lucide-react';
import { qualityApi, QualityOperation } from '../../api';
import { Spinner, Badge } from '../common';

interface QualityPanelProps {
  projectId: string;
}

interface OperationResult {
  operation: string;
  status: string;
  exit_code: number | null;
  duration_ms: number | null;
  stdout: string | null;
  stderr: string | null;
  failure_reason: string | null;
}

const finalDuration = (result: OperationResult): number =>
  Math.round(result.duration_ms || 0);

export const QualityPanel: React.FC<QualityPanelProps> = ({ projectId }) => {
  const [operations, setOperations] = useState<QualityOperation[]>([]);
  const [results, setResults] = useState<Record<string, OperationResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await qualityApi.listOperations(projectId);
      setOperations(res.data?.operations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load quality operations');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const run = async (operation: string) => {
    setRunning(operation);
    setError('');
    try {
      const res = await qualityApi.runOperation(projectId, operation);
      const record = res.data!;
      setResults((prev) => ({
        ...prev,
        [operation]: {
          operation,
          status: record.status,
          exit_code: record.exit_code,
          duration_ms: record.started_at && record.completed_at
            ? new Date(record.completed_at).getTime() - new Date(record.started_at).getTime()
            : null,
          stdout: record.stdout,
          stderr: record.stderr,
          failure_reason: record.failure_reason,
        },
      }));
    } catch (err: any) {
      const message = err.message || 'Quality operation failed';
      // Server-side refusals (unsupported/unavailable) are surfaced honestly.
      setError(message);
    } finally {
      setRunning(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
        <Spinner size={16} />
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Hammer size={12} /> Quality
      </div>
      {error && <p style={{ color: 'var(--color-error)' }} role="alert">{error}</p>}
      {operations.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No project configuration detected</p>
      )}
      {operations.map((op) => {
        const result = results[op.operation];
        const failed = result != null && (result.status === 'FAILED' || result.status === 'TIMED_OUT'
          || (result.exit_code != null && result.exit_code !== 0));
        return (
          <div key={op.operation} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{op.operation}</span>
                {op.command && (
                  <code style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {op.command}
                  </code>
                )}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {result && (
                  <Badge variant={failed ? 'error' : 'success'}>
                    {result.status}{result.exit_code != null ? ` · exit ${result.exit_code}` : ''}
                    {result.duration_ms != null ? ` · ${finalDuration(result)}ms` : ''}
                  </Badge>
                )}
                {op.supported && op.available && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={running !== null}
                    onClick={() => run(op.operation)}
                    aria-label={`Run ${op.operation.toLowerCase()} quality operation`}
                  >
                    {running === op.operation ? <Spinner size={10} /> : <Play size={12} />}
                  </button>
                )}
              </span>
            </div>
            {!op.supported && op.reason && (
              <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0' }}>{op.reason}</p>
            )}
            {op.supported && !op.available && op.reason && (
              <p style={{ color: 'var(--color-warning)', margin: '4px 0 0' }}>{op.reason}</p>
            )}
            {result && (
              <pre style={{ background: 'var(--color-background)', padding: 8, borderRadius: 6, overflowX: 'auto', maxHeight: 160, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                {result.stdout || result.stderr || result.failure_reason || '(no output)'}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
};