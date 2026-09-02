import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { githubWorkflowsApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';
import { WorkflowRun, CIExplainResult } from '../../types/git';

interface WorkflowMonitorProps {
  projectId: string;
}

export const WorkflowMonitor: React.FC<WorkflowMonitorProps> = ({ projectId }) => {
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeExplainId, setActiveExplainId] = useState<string | null>(null);
  const [explainResult, setExplainResult] = useState<{ [wfId: string]: CIExplainResult }>({});
  const [isExplaining, setIsExplaining] = useState(false);
  const { toast } = useToast();

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await githubWorkflowsApi.list(projectId);
      if (res.success && res.data?.workflows) {
        setWorkflows(res.data.workflows);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [projectId]);

  const handleTrigger = async (workflowId: string) => {
    try {
      const res = await githubWorkflowsApi.trigger(projectId, workflowId);
      if (res.success && res.data) {
        toast(`Triggered workflow '${res.data.workflow.name}'`, 'success');
        fetchWorkflows();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to trigger workflow', 'error');
    }
  };

  const handleExplainFailure = async (wf: WorkflowRun) => {
    setActiveExplainId(wf.id);
    setIsExplaining(true);
    try {
      const failedStep = wf.steps?.find((s) => s.conclusion === 'failure')?.name || 'Build & Test';
      const res = await githubWorkflowsApi.explainFailure(projectId, {
        workflow_id: wf.id,
        failure_reason: `Workflow '${wf.name}' failed at step '${failedStep}'`,
        logs: wf.steps?.map((s) => `[${s.name}] -> status: ${s.status}, conclusion: ${s.conclusion || 'none'} (${s.duration || ''})`).join('\n'),
      });
      if (res.success && res.data) {
        setExplainResult((prev) => ({ ...prev, [wf.id]: res.data! }));
        toast('Gemini diagnosed workflow failure & suggested patch!', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to explain CI failure', 'error');
    } finally {
      setIsExplaining(false);
    }
  };

  const getStatusIcon = (status: string, conclusion?: string) => {
    if (conclusion === 'success') {
      return <CheckCircle2 size={13} color="#10b981" />;
    }
    if (conclusion === 'failure') {
      return <XCircle size={13} color="#ef4444" />;
    }
    if (status === 'in_progress') {
      return <Spinner size={12} />;
    }
    return <Clock size={13} color="var(--color-text-muted)" />;
  };

  return (
    <div
      id="workflow-monitor-panel"
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Workflow size={14} color="#38bdf8" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            CI/CD Intelligence & Actions ({workflows.length})
          </span>
        </div>

        <button
          id="refresh-workflows-btn"
          onClick={fetchWorkflows}
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: isLoading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '11px',
          }}
        >
          <RefreshCw size={12} className={isLoading ? 'spin-icon' : ''} />
          <span>Sync</span>
        </button>
      </div>

      {/* Workflows List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
        {workflows.map((wf) => {
          const hasExplain = explainResult[wf.id];
          const isFailed = wf.conclusion === 'failure';

          return (
            <div
              key={wf.id}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: isFailed ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 6,
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {/* Workflow Main Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {getStatusIcon(wf.status, wf.conclusion)}
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {wf.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    {wf.commit_hash}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isFailed && (
                    <button
                      id={`ai-explain-ci-${wf.id}-btn`}
                      onClick={() => handleExplainFailure(wf)}
                      disabled={isExplaining && activeExplainId === wf.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 3,
                        padding: '2px 6px',
                        fontSize: '10px',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={10} />
                      <span>{isExplaining && activeExplainId === wf.id ? 'Diagnosing...' : 'AI Explain'}</span>
                    </button>
                  )}

                  <button
                    id={`trigger-ci-${wf.id}-btn`}
                    onClick={() => handleTrigger(wf.id)}
                    title="Dispatch workflow run"
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 3,
                      padding: '2px 6px',
                      fontSize: '10px',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Play size={9} />
                    <span>Run</span>
                  </button>
                </div>
              </div>

              {/* Steps Progress Matrix */}
              {wf.steps && wf.steps.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {wf.steps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        background:
                          step.conclusion === 'success'
                            ? 'rgba(16, 185, 129, 0.1)'
                            : step.conclusion === 'failure'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${
                          step.conclusion === 'success'
                            ? 'rgba(16, 185, 129, 0.25)'
                            : step.conclusion === 'failure'
                            ? 'rgba(239, 68, 68, 0.4)'
                            : 'rgba(255, 255, 255, 0.1)'
                        }`,
                        borderRadius: 3,
                        padding: '1px 5px',
                        fontSize: '9px',
                        color:
                          step.conclusion === 'success'
                            ? '#34d399'
                            : step.conclusion === 'failure'
                            ? '#f87171'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      {getStatusIcon(step.status, step.conclusion)}
                      <span>{step.name}</span>
                      {step.duration && <span style={{ opacity: 0.7 }}>({step.duration})</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* AI CI Failure Diagnostic Box */}
              {hasExplain && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontSize: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fca5a5', fontWeight: 600 }}>
                    <AlertTriangle size={11} />
                    <span>Root Cause: {hasExplain.root_cause} (Step: {hasExplain.failed_step})</span>
                  </div>
                  <div style={{ color: '#38bdf8' }}>{hasExplain.explanation}</div>
                  <div style={{ color: '#34d399' }}>Fix: {hasExplain.recommended_fix}</div>

                  {hasExplain.code_snippet && (
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: 3,
                        padding: '4px 6px',
                        fontFamily: 'monospace',
                        color: '#34d399',
                        fontSize: '9px',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {hasExplain.code_snippet}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {workflows.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', textAlign: 'center', padding: '8px' }}>
            No workflows found for this repository.
          </div>
        )}
      </div>
    </div>
  );
};
