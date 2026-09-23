import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FilePenLine,
  FilePlus2,
  FileText,
  FileX2,
  ListChecks,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';
import { builderApi } from '../../api';
import {
  ApplyStatusResponse,
  BuilderStreamEvent,
  ClassifiedRequirement,
  GeneratedPlan,
  RequirementsClassification,
  StatusResponse,
  SummaryResponse,
  isTerminalBuilderStatus,
} from '../../types/builder';
import { Button, MarkdownContent } from '../common';

interface BuilderPanelProps {
  projectId: string;
  /** Refreshes the Explorer/file tree after real files have been applied. */
  onWorkspaceChanged?: () => void;
  /** Opens an applied generated file in the Monaco code viewer. */
  onOpenFile?: (path: string) => void;
}

type PanelMode = 'idle' | 'classifying' | 'planning' | 'generating' | 'viewing';

const STATUS_LABELS: Record<string, string> = {
  IDLE: 'Idle',
  PLANNING: 'Planning',
  GENERATING: 'Generating',
  APPLYING: 'Applying',
  SYNCING: 'Syncing',
  COMPLETED: 'Completed',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  BLOCKED: 'Blocked',
};

const STATUS_TONES: Record<string, string> = {
  IDLE: '',
  PLANNING: 'is-active',
  GENERATING: 'is-active',
  APPLYING: 'is-active',
  SYNCING: 'is-active',
  COMPLETED: 'is-success',
  PARTIAL: 'is-warning',
  FAILED: 'is-error',
  CANCELLED: '',
  BLOCKED: 'is-error',
};

const REQUIREMENT_ORDER: ClassifiedRequirement['classification'][] = [
  'EXPLICIT',
  'INFERRED',
  'OPTIONAL',
  'UNSUPPORTED',
];

const MAX_LOG_EVENTS = 100;
const POLL_INTERVAL_MS = 2000;
const MAX_STATUS_POLLS = 60;

const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const sortRequirements = (requirements: ClassifiedRequirement[]): ClassifiedRequirement[] =>
  [...requirements].sort(
    (a, b) =>
      REQUIREMENT_ORDER.indexOf(a.classification) - REQUIREMENT_ORDER.indexOf(b.classification),
  );

export const BuilderPanel: React.FC<BuilderPanelProps> = ({
  projectId,
  onWorkspaceChanged,
  onOpenFile,
}) => {
  const [mode, setMode] = useState<PanelMode>('idle');
  const [prompt, setPrompt] = useState('');
  const [classification, setClassification] = useState<RequirementsClassification | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [events, setEvents] = useState<BuilderStreamEvent[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [applyStatus, setApplyStatus] = useState<ApplyStatusResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const statusRef = useRef<StatusResponse | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const backendStatus = status?.status ?? null;
  const isTerminal = backendStatus ? isTerminalBuilderStatus(backendStatus) : false;
  const canApply = backendStatus === 'COMPLETED' || backendStatus === 'PARTIAL';
  const isBusy = isLoading || isApplying || isCancelling;

  const updateStatus = useCallback((next: StatusResponse | null) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const appendEvent = useCallback((event: BuilderStreamEvent) => {
    setEvents((prev) => [...prev.slice(-(MAX_LOG_EVENTS - 1)), event]);
  }, []);

  const resetPanel = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setClassification(null);
    setPlan(null);
    setGenerationId(null);
    updateStatus(null);
    setEvents([]);
    setSummary(null);
    setApplyStatus(null);
    setError('');
    setMode('idle');
  }, [updateStatus]);

  const fetchSummary = useCallback(
    async (id: string) => {
      try {
        const res = await builderApi.summary(projectId, id);
        if (res.success && res.data) {
          setSummary(res.data);
        } else {
          setError(res.error?.message || 'Unable to load the generation summary.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load the generation summary.');
      }
    },
    [projectId],
  );

  const pollStatusFallback = useCallback(
    async (id: string, signal?: AbortSignal) => {
      for (let attempt = 0; attempt < MAX_STATUS_POLLS; attempt += 1) {
        if (signal?.aborted) return;
        await sleep(POLL_INTERVAL_MS);
        if (signal?.aborted) return;
        try {
          const res = await builderApi.status(projectId, id);
          if (res.success && res.data) {
            updateStatus(res.data);
            if (isTerminalBuilderStatus(res.data.status)) {
              void fetchSummary(id);
              return;
            }
          }
        } catch {
          // Transient network error: keep polling until the attempt cap.
        }
      }
      setError('Generation status stopped updating. Retry the build or start a new one.');
    },
    [projectId, updateStatus, fetchSummary],
  );

  const subscribeToStream = useCallback(
    async (id: string) => {
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;
      try {
        await builderApi.stream(
          projectId,
          id,
          (event, data) => {
            appendEvent({ event, data });
            if (event === 'status' || event === 'finished') {
              updateStatus({
                generation_request_id: id,
                project_id: projectId,
                status: asString(data.status) ?? 'IDLE',
                started_at: asString(data.started_at),
                completed_at: asString(data.completed_at),
              });
            }
            if (event === 'error') {
              setError(asString(data.message) ?? 'Generation stream reported an error.');
            }
          },
          controller.signal,
        );
        // The backend closes the SSE connection after the terminal event.
        const last = statusRef.current;
        if (last && isTerminalBuilderStatus(last.status)) {
          void fetchSummary(id);
        } else if (!controller.signal.aborted) {
          appendEvent({
            event: 'info',
            data: { message: 'Stream closed before completion; falling back to status polling.' },
          });
          void pollStatusFallback(id, controller.signal);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        appendEvent({
          event: 'error',
          data: { message: err instanceof Error ? err.message : 'Generation stream failed.' },
        });
        void pollStatusFallback(id, controller.signal);
      }
    },
    [projectId, appendEvent, updateStatus, fetchSummary, pollStatusFallback],
  );

  const runAnalysis = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isBusy) return;
    setError('');
    setClassification(null);
    setPlan(null);
    setMode('classifying');
    setIsLoading(true);
    try {
      const classifyRes = await builderApi.classify(projectId, { prompt: trimmed });
      if (!classifyRes.success || !classifyRes.data) {
        setError(classifyRes.error?.message || 'Classification failed.');
        setMode('idle');
        return;
      }
      setClassification(classifyRes.data);
      setMode('planning');
      const planRes = await builderApi.plan(projectId, { prompt: trimmed });
      if (!planRes.success || !planRes.data) {
        setError(planRes.error?.message || 'Planning failed.');
        return;
      }
      setPlan(planRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis request failed.');
      setMode('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const startGeneration = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isBusy) return;
    setError('');
    setEvents([]);
    setSummary(null);
    setApplyStatus(null);
    setIsLoading(true);
    try {
      // Retry reuses the same generation_request_id: the backend replaces the
      // previous terminal transaction instead of creating an unrelated record.
      const res = await builderApi.start(projectId, {
        prompt: trimmed,
        generation_request_id: generationId ?? undefined,
      });
      if (!res.success || !res.data) {
        setError(res.error?.message || 'Failed to start generation.');
        return;
      }
      setGenerationId(res.data.generation_request_id);
      updateStatus(res.data);
      setMode('generating');
      void subscribeToStream(res.data.generation_request_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelGeneration = async () => {
    if (!generationId || isCancelling) return;
    setIsCancelling(true);
    setError('');
    try {
      const res = await builderApi.cancel(projectId, generationId);
      if (res.success && res.data) {
        updateStatus(res.data);
      } else {
        setError(res.error?.message || 'Cancel failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel request failed.');
    } finally {
      setIsCancelling(false);
    }
  };

  const applyGeneration = async () => {
    if (!generationId || !canApply || isApplying) return;
    setIsApplying(true);
    setError('');
    try {
      const res = await builderApi.apply(projectId, generationId);
      if (res.success && res.data) {
        setApplyStatus(res.data);
        if (res.data.applied_files.length === 0 && res.data.failed_operations.length > 0) {
          setError(`Apply reported failures: ${res.data.failed_operations.join('; ')}`);
        }
        onWorkspaceChanged?.();
        const firstApplied = res.data.applied_files[0];
        if (firstApplied && onOpenFile) {
          // FileService stores generated files at the project root; open the
          // real stored path rather than the manifest path.
          onOpenFile(firstApplied.split("/").pop() ?? firstApplied);
        }
      } else {
        setError(res.error?.message || 'Apply failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply request failed.');
    } finally {
      setIsApplying(false);
    }
  };

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isTerminal && mode === 'generating') {
      setMode('viewing');
    }
  }, [isTerminal, mode]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [events]);

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void runAnalysis();
    }
  };

  const statusBadge = backendStatus ? (
    <span className={`builder-status-badge ${STATUS_TONES[backendStatus] ?? ''}`.trim()}>
      {STATUS_LABELS[backendStatus] ?? backendStatus}
    </span>
  ) : null;

  const renderRequirements = () => {
    if (!classification) return null;
    const requirements = sortRequirements(classification.requirements);
    return (
      <div className="builder-section">
        <h4 className="builder-section-title">
          <ListChecks size={13} />
          Requirements
        </h4>
        {requirements.length === 0 ? (
          <p className="builder-empty">No requirements were returned for this prompt.</p>
        ) : (
          <ul className="builder-requirements">
            {requirements.map((req) => (
              <li key={req.key} className="builder-requirement">
                <span className={`builder-req-badge ${req.classification}`}>{req.classification}</span>
                <span>
                  <strong>{req.label}:</strong> {req.value}
                </span>
              </li>
            ))}
          </ul>
        )}
        {classification.unsupported.length > 0 && (
          <p className="builder-unsupported-note">
            Unsupported (blocked, not substituted): {classification.unsupported.join(', ')}
          </p>
        )}
      </div>
    );
  };

  const renderPlan = () => {
    if (!plan) return null;
    return (
      <div className="builder-section">
        <h4 className="builder-section-title">
          <FileText size={13} />
          Build Plan
        </h4>
        <MarkdownContent content={plan.plan} />
        {plan.files.length > 0 && (
          <>
            <h4 className="builder-section-title" style={{ marginTop: 10 }}>
              <FilePlus2 size={13} />
              Planned Files ({plan.files.length})
            </h4>
            <ul className="builder-files">
              {plan.files.map((file) => (
                <li key={file} className="builder-file-item">
                  <FileText size={11} />
                  <span>{file}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="builder-panel">
      {error && (
        <div className="builder-error" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {(mode === 'idle' || mode === 'classifying') && (
        <form
          className="builder-prompt-form"
          onSubmit={(e) => {
            e.preventDefault();
            void runAnalysis();
          }}
        >
          <label className="builder-prompt-label" htmlFor="builder-prompt-input">
            Describe what to build
          </label>
          <textarea
            id="builder-prompt-input"
            className="builder-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handlePromptKeyDown}
            placeholder="e.g. Build a task tracker with a REST API, PostgreSQL persistence, and a React UI."
            disabled={isBusy}
            rows={3}
          />
          <div className="builder-actions">
            <Button type="submit" isLoading={mode === 'classifying' && isLoading} disabled={isBusy || !prompt.trim()}>
              Analyze &amp; Plan
            </Button>
            <span className="builder-empty">Ctrl+Enter to analyze</span>
          </div>
        </form>
      )}

      {mode === 'planning' && (
        <div className="builder-stack">
          {statusBadge && <div className="builder-row">{statusBadge}</div>}
          {renderRequirements()}
          {renderPlan()}
          {isLoading && <p className="builder-empty">Building plan…</p>}
          {!plan && !isLoading && (
            <p className="builder-empty">Planning failed. Edit the prompt and try again.</p>
          )}
          <div className="builder-actions">
            {plan && (
              <Button onClick={() => void startGeneration()} disabled={isBusy || !prompt.trim()}>
                <Play size={13} />
                Start Generation
              </Button>
            )}
            <Button variant="secondary" onClick={() => setMode('idle')} disabled={isBusy}>
              <RotateCcw size={13} />
              Edit Prompt
            </Button>
          </div>
        </div>
      )}

      {mode === 'generating' && (
        <div className="builder-stack">
          <div className="builder-row" role="status" aria-live="polite">
            {statusBadge}
            {status?.started_at && (
              <span className="builder-empty">
                Started: {new Date(status.started_at).toLocaleTimeString()}
              </span>
            )}
            {!isTerminal && (
              <span className="builder-empty">Events appear as the backend reports them.</span>
            )}
          </div>
          <div className="builder-section">
            <h4 className="builder-section-title">Generation Events</h4>
            <div ref={logRef} className="builder-log" role="log" aria-live="polite">
              {events.length === 0 ? (
                <p className="builder-empty">Waiting for the first event…</p>
              ) : (
                events.map((evt, i) => (
                  <div key={`${evt.event}-${i}`} className="builder-log-line">
                    [{evt.event}]{' '}
                    {evt.data.status !== undefined
                      ? String(evt.data.status)
                      : (asString(evt.data.message) ?? '')}
                  </div>
                ))
              )}
            </div>
          </div>
          {!isTerminal && (
            <div className="builder-actions">
              <Button
                variant="danger"
                onClick={() => void cancelGeneration()}
                isLoading={isCancelling}
                disabled={isCancelling}
              >
                {!isCancelling && <Square size={13} />}
                {isCancelling ? 'Cancelling…' : 'Cancel Generation'}
              </Button>
            </div>
          )}
        </div>
      )}

      {mode === 'viewing' && (
        <div className="builder-stack">
          <div className="builder-row" role="status" aria-live="polite">
            {statusBadge}
            {status?.completed_at && (
              <span className="builder-empty">
                Completed: {new Date(status.completed_at).toLocaleTimeString()}
              </span>
            )}
          </div>

          {(backendStatus === 'FAILED' || backendStatus === 'CANCELLED' || backendStatus === 'BLOCKED') && (
            <div className="builder-error" role="alert">
              <AlertCircle size={14} />
              <span>
                Generation {STATUS_LABELS[backendStatus]?.toLowerCase() ?? backendStatus}. No
                changes were applied.
              </span>
            </div>
          )}

          {backendStatus === 'PARTIAL' && (
            <div className="builder-section">
              <h4 className="builder-section-title">Partial Generation</h4>
              <p className="builder-empty">
                Some files were generated but the run reported failures. Review the summary, then
                apply only if acceptable.
              </p>
            </div>
          )}

          {summary && (
            <div className="builder-section">
              <h4 className="builder-section-title">
                <FileText size={13} />
                Change Summary
              </h4>
              <p className="builder-empty">{summary.summary}</p>
              {summary.created_files.length > 0 && (
                <div className="builder-file-group">
                  <h4>
                    <CheckCircle2 size={11} />
                    Created ({summary.created_files.length})
                  </h4>
                  <ul className="builder-files">
                    {summary.created_files.map((file) => (
                      <li key={file} className="builder-file-item">
                        {onOpenFile ? (
                          <button
                            type="button"
                            className="builder-file-link"
                            onClick={() => onOpenFile(file.split("/").pop() ?? file)}
                          >
                            {file}
                          </button>
                        ) : (
                          <span>{file}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.modified_files.length > 0 && (
                <div className="builder-file-group">
                  <h4>
                    <FilePenLine size={11} />
                    Modified ({summary.modified_files.length})
                  </h4>
                  <ul className="builder-files">
                    {summary.modified_files.map((file) => (
                      <li key={file} className="builder-file-item">
                        {onOpenFile ? (
                          <button
                            type="button"
                            className="builder-file-link"
                            onClick={() => onOpenFile(file.split("/").pop() ?? file)}
                          >
                            {file}
                          </button>
                        ) : (
                          <span>{file}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.deleted_files.length > 0 && (
                <div className="builder-file-group">
                  <h4>
                    <FileX2 size={11} />
                    Deleted ({summary.deleted_files.length})
                  </h4>
                  <ul className="builder-files">
                    {summary.deleted_files.map((file) => (
                      <li key={file} className="builder-file-item">
                        <span>{file}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.diff && summary.diff !== '(no file changes)' && (
                <pre className="builder-diff">{summary.diff}</pre>
              )}
            </div>
          )}

          {applyStatus && (
            <div className="builder-section">
              <h4 className="builder-section-title">Apply Result</h4>
              {applyStatus.applied_files.length > 0 && (
                <p className="builder-empty">Applied: {applyStatus.applied_files.join(', ')}</p>
              )}
              {applyStatus.modified_files.length > 0 && (
                <p className="builder-empty">Modified: {applyStatus.modified_files.join(', ')}</p>
              )}
              {applyStatus.failed_operations.length > 0 && (
                <div className="builder-file-group">
                  <h4>Failed operations</h4>
                  <ul className="builder-files">
                    {applyStatus.failed_operations.map((op, i) => (
                      <li key={`${op}-${i}`} className="builder-file-item builder-file-item-error">
                        <span>{op}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="builder-actions">
            {canApply && (
              <Button onClick={() => void applyGeneration()} isLoading={isApplying} disabled={isBusy}>
                Apply to Workspace
              </Button>
            )}
            <Button variant="secondary" onClick={resetPanel}>
              <RotateCcw size={13} />
              New Build
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};