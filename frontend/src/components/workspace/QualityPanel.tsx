import React, { useCallback, useEffect, useState } from 'react';
import { Hammer, Play, Wrench } from 'lucide-react';
import {
  DiagnosisResult,
  QualityOperation,
  RepairProposal,
  RepairVerification,
  diagnosticsApi,
  qualityApi,
  repairsApi,
} from '../../api';
import { Spinner, Badge } from '../common';

interface QualityPanelProps {
  projectId: string;
}

interface OperationResult {
  execution_id: string;
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
  const [diagnoses, setDiagnoses] = useState<Record<string, DiagnosisResult>>({});
  const [proposals, setProposals] = useState<Record<string, RepairProposal>>({});
  const [verifications, setVerifications] = useState<Record<string, RepairVerification>>({});
  const [diagBusy, setDiagBusy] = useState<string | null>(null);

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
          execution_id: record.execution_id,
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

  const diagnoseAndPropose = async (operation: string, executionId: string) => {
    setDiagBusy(operation);
    setError('');
    try {
      const [diagRes, propRes] = await Promise.all([
        diagnosticsApi.diagnoseExecution(projectId, executionId),
        repairsApi.propose(projectId, executionId).catch(() => null),
      ]);
      if (diagRes.success && diagRes.data) {
        setDiagnoses((prev) => ({ ...prev, [operation]: diagRes.data! }));
      }
      if (propRes?.success && propRes.data) {
        setProposals((prev) => ({ ...prev, [operation]: propRes.data! }));
      }
    } catch (err: any) {
      setError(err.message || 'Unable to diagnose quality failure');
    } finally {
      setDiagBusy(null);
    }
  };

  const verifyRepair = async (operation: string, executionId: string) => {
    setDiagBusy(operation);
    setError('');
    try {
      const res = await repairsApi.verify(projectId, executionId);
      if (res.success && res.data) {
        setVerifications((prev) => ({ ...prev, [operation]: res.data! }));
      }
    } catch (err: any) {
      setError(err.message || 'Repair verification failed');
    } finally {
      setDiagBusy(null);
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
              <>
                <pre style={{ background: 'var(--color-background)', padding: 8, borderRadius: 6, overflowX: 'auto', maxHeight: 160, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                  {result.stdout || result.stderr || result.failure_reason || '(no output)'}
                </pre>
                {failed && result.execution_id && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={diagBusy === op.operation}
                        onClick={() => void diagnoseAndPropose(op.operation, result.execution_id)}
                      >
                        <Wrench size={11} /> {diagBusy === op.operation ? 'Diagnosing…' : 'Diagnose & Repair'}
                      </button>
                    </div>
                    {diagnoses[op.operation] && (
                      <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 6, padding: 8, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <strong>{diagnoses[op.operation].category.statement}: {diagnoses[op.operation].problem.statement}</strong>
                        {diagnoses[op.operation].suggested_fix && (
                          <span style={{ color: 'var(--color-accent)' }}>
                            Suggested fix: {diagnoses[op.operation].suggested_fix?.statement}
                          </span>
                        )}
                        {proposals[op.operation]?.supported && proposals[op.operation].changes.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={diagBusy === op.operation}
                              onClick={() => void verifyRepair(op.operation, result.execution_id)}
                            >
                              <Wrench size={11} /> Apply &amp; Verify Repair
                            </button>
                          </div>
                        )}
                        {verifications[op.operation] && (
                          <span style={{ color: verifications[op.operation].verified ? 'var(--color-success)' : 'var(--color-warning)' }}>
                            {verifications[op.operation].outcome}: {verifications[op.operation].reason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};