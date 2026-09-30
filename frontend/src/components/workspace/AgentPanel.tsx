import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Play, Square, Check, X, RotateCcw, ShieldAlert } from 'lucide-react';
import { agentApi, type AgentRun } from '../../api';
import { Button } from '../common/Button';

const ACTIVE = new Set(['PLANNING', 'EDITING', 'BUILDING', 'TESTING', 'DIAGNOSING', 'FIXING', 'VERIFYING']);
const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

/** Phase 9 agent control surface.
 *
 *  Every value rendered here is read back from the server. The panel never
 *  advances a state itself: it shows what the run row actually says, so a
 *  stalled loop looks stalled rather than animated. */
export const AgentPanel: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [task, setTask] = useState('');
  const [run, setRun] = useState<AgentRun | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const running = run ? ACTIVE.has(run.state) : false;

  const refresh = useCallback(async (runId: string) => {
    try {
      const res = await agentApi.get(runId);
      setRun(res.data ?? null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // Poll only while the run is genuinely active, so an idle panel costs nothing.
  useEffect(() => {
    if (!run || !running) {
      if (timer.current) window.clearInterval(timer.current);
      return;
    }
    timer.current = window.setInterval(() => void refresh(run.id), 1500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [run, running, refresh]);

  const start = async () => {
    if (!task.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await agentApi.create({ project_id: projectId, task: task.trim() });
      setRun(res.data ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (run) await refresh(run.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="agent-panel" data-testid="agent-panel">
      {!run && (
        <div className="agent-composer">
          <label className="agent-task-label" htmlFor="agent-task">Task for the agent</label>
          <textarea
            id="agent-task"
            className="input agent-task"
            rows={3}
            placeholder="e.g. add a health endpoint and make sure the build still passes"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          <div className="agent-actions">
            <Button variant="primary" leftIcon={<Play size={13} />} onClick={() => void start()} disabled={busy || !task.trim()}>
              Start agent run
            </Button>
          </div>
        </div>
      )}

      {error && <p className="agent-error" role="alert">{error}</p>}

      {run && (
        <>
          <div className="agent-status">
            <span className={`agent-state agent-state--${run.state.toLowerCase()}`}>{run.state}</span>
            <span className="agent-task-echo">{run.task}</span>
          </div>

          <dl className="agent-meters">
            <div><dt>iteration</dt><dd>{run.iteration}/{run.max_iterations}</dd></div>
            <div><dt>repairs</dt><dd>{run.repair_attempts}/{run.max_repair_attempts}</dd></div>
            <div><dt>tokens</dt><dd>{run.tokens_used}/{run.max_tokens}</dd></div>
          </dl>

          {run.terminal_reason && <p className="agent-reason">{run.terminal_reason}</p>}

          <ol className="agent-steps" aria-label="Agent run steps">
            {run.steps.map((step, index) => (
              <li key={`${step.state}-${index}`} className="agent-step">
                <span className="agent-step-state">{step.state}</span>
                <span className="agent-step-detail">{step.detail}</span>
              </li>
            ))}
          </ol>

          {run.approval_state === 'PENDING' && (
            <div className="agent-approval" data-testid="agent-approval">
              <p className="agent-approval-note">
                <ShieldAlert size={13} /> These changes are proposed, not committed. Nothing lands in git until you approve.
              </p>
              <ul className="agent-proposals">
                {run.commit_proposals.map((p) => <li key={p.path}><code>{p.path}</code></li>)}
              </ul>
              <label className="agent-task-label" htmlFor="agent-commit-message">Commit message (required)</label>
              <input
                id="agent-commit-message"
                className="input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="agent: add health endpoint"
              />
              <div className="agent-actions">
                <Button
                  variant="primary"
                  leftIcon={<Check size={13} />}
                  disabled={busy || !message.trim()}
                  onClick={() => void act(() => agentApi.approve(run.id, message.trim()))}
                >
                  Approve commits
                </Button>
                <Button variant="secondary" leftIcon={<X size={13} />} disabled={busy} onClick={() => void act(() => agentApi.reject(run.id))}>
                  Reject
                </Button>
              </div>
            </div>
          )}

          <div className="agent-actions">
            {running && (
              <Button variant="secondary" leftIcon={<Square size={13} />} disabled={busy} onClick={() => void act(() => agentApi.cancel(run.id))}>
                Stop
              </Button>
            )}
            {TERMINAL.has(run.state) && (
              <Button variant="secondary" leftIcon={<RotateCcw size={13} />} disabled={busy} onClick={() => void act(() => agentApi.retry(run.id))}>
                Retry
              </Button>
            )}
          </div>

          <p className="agent-policy">
            <Bot size={12} /> The agent never does this without asking: {run.never_automatic.join(', ')}.
          </p>
        </>
      )}
    </div>
  );
};

