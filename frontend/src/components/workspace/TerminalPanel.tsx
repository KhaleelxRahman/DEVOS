import React, { useEffect, useRef, useState } from 'react';
import { Ban, CheckCircle2, Clipboard, Eraser, History, Play, Plus, Square, TerminalSquare, X } from 'lucide-react';
import { executionApi } from '../../api';

interface TerminalPanelProps {
  projectId: string;
}

interface TerminalEntry {
  input: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
  // Phase 2H: the real backend execution state for this entry. 'CANCELLED' is
  // kept distinct from a non-zero exit so a user-stopped run is never shown
  // as a failure.
  status?: string;
  executionId?: string;
}

interface TerminalTab { id: number; label: string; entries: TerminalEntry[]; }

// Mirrors the backend allowlist so users get instant feedback before calling
// the API. The backend remains the authoritative enforcer.
const BLOCKED_NOTE = 'Allowed: git, npm, node, python, python3, pip, pip3, pytest, cargo, ls, dir, echo, cat, pwd, tree';

// States the backend will no longer transition out of on its own
// (backend/app/services/execution_service.py -> cancel_execution).
const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED', 'TIMED_OUT'];
const isTerminalStatus = (status: string | null) => !!status && TERMINAL_STATUSES.includes(status);
const POLL_INTERVAL_MS = 1000;

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ projectId }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: 1, label: 'Terminal 1', entries: [] }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // Phase 2H: identity + live state of the execution the Stop button can act
  // on. Null whenever nothing is in flight, which is what disables Stop.
  const [runningExecutionId, setRunningExecutionId] = useState<string | null>(null);
  const [runningStatus, setRunningStatus] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The command text for the in-flight run, so the cancel path can render the
  // entry without re-deriving it from state.
  const runningLabelRef = useRef<string>('');
  // A completed entry is appended exactly once, whether it came from the poll
  // loop or from the cancel response. Without this the user could see the
  // same run rendered twice when Stop races the poll.
  const settledRef = useRef<Set<string>>(new Set());
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const entries = activeTab.entries;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries, isRunning]);

  // Never leave a poll timer running after unmount.
  useEffect(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const updateEntries = (next: TerminalEntry[] | ((previous: TerminalEntry[]) => TerminalEntry[])) => {
    setTabs((previous) => previous.map((tab) => tab.id === activeTabId
      ? { ...tab, entries: typeof next === 'function' ? next(tab.entries) : next }
      : tab));
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  const settle = (executionId: string, record: {
    status: string;
    exit_code: number | null;
    stdout: string | null;
    stderr: string | null;
    failure_reason: string | null;
  }, label: string) => {
    if (settledRef.current.has(executionId)) return;
    settledRef.current.add(executionId);
    updateEntries((prev) => [...prev, {
      input: label,
      stdout: record.stdout || '',
      stderr: record.stderr || '',
      exitCode: record.exit_code,
      status: record.status,
      executionId,
      error: record.status === 'CANCELLED'
        ? 'Execution cancelled by user'
        : record.status === 'TIMED_OUT'
          ? (record.failure_reason || 'Execution timed out')
          : record.status === 'BLOCKED'
            ? (record.failure_reason || 'Command is blocked by the execution policy')
            : (record.status === 'FAILED' && record.exit_code === null)
              ? (record.failure_reason || 'Execution failed')
              : undefined,
    }]);
    setIsRunning(false);
    setRunningExecutionId(null);
    setRunningStatus(null);
  };

  const pollUntilTerminal = (executionId: string, label: string) => {
    stopPolling();
    pollRef.current = setTimeout(async () => {
      if (settledRef.current.has(executionId)) return;
      try {
        const res = await executionApi.get(projectId, executionId);
        const record = res.data!;
        if (isTerminalStatus(record.status)) {
          settle(executionId, record, label);
          return;
        }
        setRunningStatus(record.status);
        pollUntilTerminal(executionId, label);
      } catch {
        // Transient read failure: keep polling rather than strand the UI in a
        // running state with no way to stop it.
        pollUntilTerminal(executionId, label);
      }
    }, POLL_INTERVAL_MS);
  };

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isRunning) return;

    const [command, ...args] = trimmed.split(/\s+/);
    setInput('');
    setHistory((previous) => [...previous.filter((item) => item !== trimmed), trimmed].slice(-50));
    setHistoryIndex(-1);
    setCancelError(null);
    setIsRunning(true);
    runningLabelRef.current = trimmed;

    let executionId: string | null = null;
    const failEntry = (message: string) => {
      if (executionId && settledRef.current.has(executionId)) return;
      if (executionId) settledRef.current.add(executionId);
      updateEntries((prev) => [...prev, {
        input: trimmed,
        stdout: '',
        stderr: '',
        exitCode: null,
        status: 'FAILED',
        executionId: executionId || undefined,
        error: message,
      }]);
      setIsRunning(false);
      setRunningExecutionId(null);
      setRunningStatus(null);
    };

    try {
      // Phase 2H: route through the execution lifecycle instead of the legacy
      // blocking /terminal/execute path, so the run has a server-side id the
      // Stop button can cancel. workspace_id must equal project_id, and the
      // working directory is the project root.
      const created = await executionApi.create(projectId, {
        execution_type: 'CUSTOM_SAFE_COMMAND',
        command,
        arguments: args,
        working_directory: '.',
        workspace_id: projectId,
      });
      executionId = created.data!.execution_id;
      setRunningExecutionId(executionId);
      setRunningStatus(created.data!.status);
      settledRef.current.delete(executionId);

      // /run blocks for the life of the process, so it is deliberately not
      // awaited; the poll loop is what drives the UI.
      executionApi.run(projectId, executionId).catch((err: any) => {
        failEntry(err?.message || 'Execution failed');
      });

      pollUntilTerminal(executionId, trimmed);
    } catch (err: any) {
      // create() itself failed (policy BLOCKED, bad workspace, network error).
      // There is no execution to cancel, so report it inline and reset.
      failEntry(err?.message || 'Execution failed');
    }
  };

  const stop = async () => {
    if (!runningExecutionId || isCancelling) return;
    setIsCancelling(true);
    setCancelError(null);
    stopPolling();
    const executionId = runningExecutionId;
    const label = runningLabelRef.current;
    try {
      const res = await executionApi.cancel(projectId, executionId);
      settle(executionId, res.data!, label);
    } catch (err: any) {
      // An already-completed run rejects with "Cannot cancel execution in X
      // state". That is expected and must not crash the panel, so re-read the
      // record and render whatever the backend actually settled on.
      setCancelError(err?.message || 'Failed to cancel execution');
      try {
        const current = await executionApi.get(projectId, executionId);
        if (isTerminalStatus(current.data!.status)) {
          settle(executionId, current.data!, label);
        } else {
          // Still live: resume watching it rather than dropping the run.
          pollUntilTerminal(executionId, label);
        }
      } catch {
        setIsRunning(false);
        setRunningExecutionId(null);
        setRunningStatus(null);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (!history.length) return;
      const nextIndex = event.key === 'ArrowUp'
        ? Math.min(historyIndex + 1, history.length - 1)
        : Math.max(historyIndex - 1, -1);
      setHistoryIndex(nextIndex);
      setInput(nextIndex === -1 ? '' : history[history.length - 1 - nextIndex]);
      return;
    }
    if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      updateEntries([]);
    }
    if (event.key === 'c' && event.ctrlKey && event.shiftKey) {
      event.preventDefault();
      void navigator.clipboard.writeText(entries.map((entry) => `$ ${entry.input}\n${entry.stdout || entry.stderr || entry.error || ''}`).join('\n'));
    }
  };

  const copyOutput = () => {
    void navigator.clipboard.writeText(entries.map((entry) => `$ ${entry.input}\n${entry.stdout || entry.stderr || entry.error || ''}`).join('\n'));
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-tabs" role="tablist" aria-label="Terminal sessions">
        {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={tab.id === activeTabId} className={`terminal-tab ${tab.id === activeTabId ? 'active' : ''}`} onClick={() => setActiveTabId(tab.id)}>
          <TerminalSquare size={12} />{tab.label}
          {tabs.length > 1 && <span
            role="button"
            tabIndex={0}
            className="terminal-tab-close"
            aria-label={`Close ${tab.label}`}
            onClick={(event) => {
              event.stopPropagation();
              setTabs((previous) => previous.filter((item) => item.id !== tab.id));
              if (tab.id === activeTabId) setActiveTabId(tabs.find((item) => item.id !== tab.id)?.id || 1);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                setTabs((previous) => previous.filter((item) => item.id !== tab.id));
                if (tab.id === activeTabId) setActiveTabId(tabs.find((item) => item.id !== tab.id)?.id || 1);
              }
            }}
          ><X size={11} /></span>}
        </button>)}
        <button className="terminal-tab-add" aria-label="New terminal" onClick={() => { const id = Math.max(...tabs.map((tab) => tab.id)) + 1; setTabs((previous) => [...previous, { id, label: `Terminal ${id}`, entries: [] }]); setActiveTabId(id); }}><Plus size={13} /></button>
        <button className="terminal-copy" aria-label="Copy terminal output" onClick={copyOutput}><Clipboard size={12} /> Copy</button>
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          background: 'var(--color-background)',
          borderRadius: 6,
          padding: 10,
          fontFamily: 'monospace',
          fontSize: 12,
          marginBottom: 8,
        }}
        aria-live="polite"
      >
        {entries.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Project-scoped sandbox terminal. {BLOCKED_NOTE}
          </p>
        )}
        {entries.map((entry, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ color: 'var(--color-accent)' }}>$ {entry.input}</div>
            {entry.stdout && <pre style={{ margin: 0, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{entry.stdout}</pre>}
            {entry.stderr && <pre style={{ margin: 0, color: 'var(--color-warning)', whiteSpace: 'pre-wrap' }}>{entry.stderr}</pre>}
            {entry.error && (
              <div style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Ban size={12} /> {entry.error}
              </div>
            )}
            {entry.status === 'CANCELLED' && (
              <div className="terminal-entry-status cancelled">
                <Ban size={12} /> cancelled by user
              </div>
            )}
            {entry.status === 'TIMED_OUT' && (
              <div className="terminal-entry-status failure"><Ban size={12} /> timed out</div>
            )}
            {entry.status === 'COMPLETED' && entry.exitCode === 0 && (
              <div className="terminal-entry-status success"><CheckCircle2 size={12} /> completed</div>
            )}
            {entry.exitCode !== null && entry.exitCode !== 0 && entry.status !== 'CANCELLED' && (
              <div className="terminal-entry-status failure"><Ban size={12} /> exit code: {entry.exitCode}</div>
            )}
          </div>
        ))}
        {isRunning && <p className="terminal-running"><span className="terminal-running-dot" />Running command…{runningStatus && runningStatus !== 'RUNNING' ? ` (${runningStatus})` : ''}</p>}
        {cancelError && (
          <p className="terminal-cancel-error" role="alert">
            <Ban size={12} /> {cancelError}
          </p>
        )}
      </div>

      <form onSubmit={run} style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, padding: '6px 10px' }}
          placeholder="git status"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          aria-label="Terminal command"
          disabled={isRunning}
        />
        {history.length > 0 && <span className="terminal-history-hint" title="Use arrow keys to browse command history"><History size={12} /> {history.length}</span>}
        <button type="submit" className="btn btn-primary btn-sm" disabled={isRunning || !input.trim()} aria-label="Run command">
          <Play size={12} />
        </button>
        {runningExecutionId && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={stop}
            disabled={isCancelling}
            aria-label="Stop running command"
            title="Stop the running execution"
          >
            <Square size={12} /> {isCancelling ? 'Stopping…' : 'Stop'}
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateEntries([])} aria-label="Clear terminal">
          <Eraser size={12} />
        </button>
      </form>
    </div>
  );
};
