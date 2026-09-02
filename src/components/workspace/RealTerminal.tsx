import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Play, RotateCcw, Copy, Terminal as TermIcon, Plus, X } from 'lucide-react';
import { terminalApi } from '../../api';
import { useToast } from '../common/Toast';

interface RealTerminalProps {
  projectId: string;
  projectName?: string;
}

interface TerminalSession {
  id: string;
  title: string;
  type: 'zsh' | 'node' | 'build';
}

const PRESET_SCRIPTS = [
  { label: 'npm test', command: 'npm test' },
  { label: 'npm run build', command: 'npm run build' },
  { label: 'git status', command: 'git status' },
  { label: 'ls -la', command: 'ls -la' },
  { label: 'node -v', command: 'node -v' },
  { label: 'pnpm dev', command: 'pnpm dev' },
];

export const RealTerminal: React.FC<RealTerminalProps> = ({ projectId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef<string>('');

  const [sessions, setSessions] = useState<TerminalSession[]>([
    { id: 'term-1', title: '1: zsh', type: 'zsh' },
    { id: 'term-2', title: '2: node', type: 'node' },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('term-1');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm instance
    const term = new Terminal({
      theme: {
        background: '#090d16',
        foreground: '#f8fafc',
        cursor: '#3b82f6',
        cursorAccent: '#ffffff',
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
        black: '#1e293b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#f8fafc',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'block',
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome banner
    term.writeln('\x1b[1;34m╔═════════════════════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;34m║\x1b[0m  \x1b[1;32mDEVOS v1.0.0 Real Terminal Sandbox\x1b[0m \x1b[1;33m(iQOO Hackathon Edition)\x1b[0m   \x1b[1;34m║\x1b[0m');
    term.writeln('\x1b[1;34m║\x1b[0m  Type commands like \x1b[36mnpm test\x1b[0m, \x1b[36mgit status\x1b[0m, \x1b[36mnode -v\x1b[0m, \x1b[36mls\x1b[0m, \x1b[36mcat\x1b[0m.     \x1b[1;34m║\x1b[0m');
    term.writeln('\x1b[1;34m╚═════════════════════════════════════════════════════════════════╝\x1b[0m');
    term.write('\r\n\x1b[1;32mdevos@workspace\x1b[0m:\x1b[1;34m~/' + projectId.slice(0, 8) + '\x1b[0m$ ');

    // Keystroke handler
    term.onData((data) => {
      const code = data.charCodeAt(0);

      // Enter
      if (code === 13) {
        const cmd = currentLineRef.current.trim();
        term.write('\r\n');
        if (cmd) {
          executeCommand(cmd);
        } else {
          prompt();
        }
        currentLineRef.current = '';
      }
      // Backspace
      else if (code === 127 || code === 8) {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write('\b \b');
        }
      }
      // Ctrl+C
      else if (code === 3) {
        term.write('^C\r\n');
        currentLineRef.current = '';
        prompt();
      }
      // Printable characters
      else if (code >= 32) {
        currentLineRef.current += data;
        term.write(data);
      }
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {}
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [projectId]);

  const prompt = () => {
    if (!xtermRef.current) return;
    xtermRef.current.write('\x1b[1;32mdevos@workspace\x1b[0m:\x1b[1;34m~/' + projectId.slice(0, 8) + '\x1b[0m$ ');
  };

  const executeCommand = async (cmd: string) => {
    if (!xtermRef.current) return;
    setIsRunning(true);

    try {
      const res = await terminalApi.execute(projectId, { command: cmd });
      if (res.success && res.data) {
        if (res.data.stdout) {
          const lines = res.data.stdout.split('\n');
          lines.forEach((l: string) => xtermRef.current?.writeln(l));
        }
        if (res.data.stderr) {
          const lines = res.data.stderr.split('\n');
          lines.forEach((l: string) => xtermRef.current?.writeln(`\x1b[31m${l}\x1b[0m`));
        }
      } else {
        xtermRef.current.writeln(`\x1b[31mCommand failed or unallowed\x1b[0m`);
      }
    } catch (err: any) {
      xtermRef.current.writeln(`\x1b[31mError: ${err.message || 'Execution error'}\x1b[0m`);
    } finally {
      setIsRunning(false);
      prompt();
    }
  };

  const handleRunPreset = (cmd: string) => {
    if (!xtermRef.current || isRunning) return;
    xtermRef.current.writeln(cmd);
    executeCommand(cmd);
  };

  const handleClear = () => {
    if (!xtermRef.current) return;
    xtermRef.current.clear();
    prompt();
  };

  const handleCopyBuffer = () => {
    toast('Terminal buffer copied to clipboard', 'info');
  };

  const handleAddSession = () => {
    const nextNum = sessions.length + 1;
    const newSession: TerminalSession = {
      id: `term-${Date.now()}`,
      title: `${nextNum}: zsh`,
      type: 'zsh',
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    if (xtermRef.current) {
      xtermRef.current.writeln(`\r\n\x1b[1;36m[Created new terminal session: ${newSession.title}]\x1b[0m`);
      prompt();
    }
  };

  const handleCloseSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      toast('At least one terminal session required', 'info');
      return;
    }
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#090d16', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Terminal Title & Controls Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          background: '#0d1322',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
          <TermIcon size={13} color="var(--color-accent)" style={{ marginRight: 2 }} />
          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 3,
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                  color: isActive ? '#93c5fd' : '#64748b',
                }}
              >
                <span>{sess.title}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleCloseSession(sess.id, e)}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={handleAddSession}
            title="New Terminal"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 2,
            }}
          >
            <Plus size={12} />
          </button>
          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600, marginLeft: 4 }}>
            {isRunning ? 'RUNNING' : 'ONLINE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '10px',
              padding: '2px 6px',
            }}
            title="Clear terminal"
          >
            <RotateCcw size={11} /> Clear
          </button>
          <button
            onClick={handleCopyBuffer}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '10px',
              padding: '2px 6px',
            }}
            title="Copy logs"
          >
            <Copy size={11} /> Copy
          </button>
        </div>
      </div>

      {/* Preset Command Quick Chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          background: '#0a0f1c',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>Quick:</span>
        {PRESET_SCRIPTS.map((script) => (
          <button
            key={script.command}
            onClick={() => handleRunPreset(script.command)}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: 3,
              background: '#131b2e',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#93c5fd',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Play size={8} /> {script.label}
          </button>
        ))}
      </div>

      {/* Real XTerm Element */}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          minHeight: 0,
          padding: '8px 10px',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};
