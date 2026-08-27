import React, { useEffect, useRef, useState } from 'react';
import { Ban, Eraser, Play } from 'lucide-react';
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

// Mirrors the backend allowlist so users get instant feedback before calling
// the API. The backend remains the authoritative enforcer.
const BLOCKED_NOTE = 'Allowed: git, npm, node, python, python3, pip, pip3, pytest, cargo, ls, dir, echo, cat, pwd, tree';

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ projectId }) => {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries, isRunning]);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isRunning) return;

    const [command, ...args] = trimmed.split(/\s+/);
    setInput('');
    setIsRunning(true);
    try {
      const res = await terminalApi.execute(projectId, { command, args });
      const data = res.data!;
      setEntries((prev) => [
        ...prev,
        { input: trimmed, stdout: data.stdout, stderr: data.stderr, exitCode: data.exit_code },
      ]);
    } catch (err: any) {
      setEntries((prev) => [
        ...prev,
        { input: trimmed, stdout: '', stderr: '', exitCode: null, error: err.message || 'Execution failed' },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
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
            {entry.exitCode !== null && entry.exitCode !== 0 && (
              <div style={{ color: 'var(--color-error)' }}>exit code: {entry.exitCode}</div>
            )}
          </div>
        ))}
        {isRunning && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Running...</p>}
      </div>

      <form onSubmit={run} style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, padding: '6px 10px' }}
          placeholder="git status"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Terminal command"
          disabled={isRunning}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={isRunning || !input.trim()} aria-label="Run command">
          <Play size={12} />
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEntries([])} aria-label="Clear terminal">
          <Eraser size={12} />
        </button>
      </form>
    </div>
  );
};
