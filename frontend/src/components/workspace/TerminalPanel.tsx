import React, { useEffect, useRef, useState } from 'react';
import { Ban, CheckCircle2, Clipboard, Eraser, History, Play, Plus, TerminalSquare, X } from 'lucide-react';
import { terminalApi } from '../../api';

interface TerminalPanelProps {
  projectId: string;
}

interface TerminalEntry {
  input: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}
interface TerminalTab { id: number; label: string; entries: TerminalEntry[]; }

// Mirrors the backend allowlist so users get instant feedback before calling
// the API. The backend remains the authoritative enforcer.
const BLOCKED_NOTE = 'Allowed: git, npm, node, python, python3, pip, pip3, pytest, cargo, ls, dir, echo, cat, pwd, tree';

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ projectId }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([{ id: 1, label: 'Terminal 1', entries: [] }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const entries = activeTab.entries;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries, isRunning]);

  const updateEntries = (next: TerminalEntry[] | ((previous: TerminalEntry[]) => TerminalEntry[])) => {
    setTabs((previous) => previous.map((tab) => tab.id === activeTabId
      ? { ...tab, entries: typeof next === 'function' ? next(tab.entries) : next }
      : tab));
  };

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isRunning) return;

    const [command, ...args] = trimmed.split(/\s+/);
    setInput('');
    setHistory((previous) => [...previous.filter((item) => item !== trimmed), trimmed].slice(-50));
    setHistoryIndex(-1);
    setIsRunning(true);
    try {
      const res = await terminalApi.execute(projectId, { command, args });
      const data = res.data!;
      updateEntries((prev) => [
        ...prev,
        { input: trimmed, stdout: data.stdout, stderr: data.stderr, exitCode: data.exit_code },
      ]);
    } catch (err: any) {
      updateEntries((prev) => [
        ...prev,
        { input: trimmed, stdout: '', stderr: '', exitCode: null, error: err.message || 'Execution failed' },
      ]);
    } finally {
      setIsRunning(false);
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
            {entry.exitCode === 0 && <div className="terminal-entry-status success"><CheckCircle2 size={12} /> completed</div>}
            {entry.exitCode !== null && entry.exitCode !== 0 && <div className="terminal-entry-status failure"><Ban size={12} /> exit code: {entry.exitCode}</div>}
          </div>
        ))}
        {isRunning && <p className="terminal-running"><span className="terminal-running-dot" />Running command…</p>}
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
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateEntries([])} aria-label="Clear terminal">
          <Eraser size={12} />
        </button>
      </form>
    </div>
  );
};
