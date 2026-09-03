import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, Circle, Loader2, AlertCircle, ArrowRight, Terminal, Layers, Sparkles } from 'lucide-react';

export interface TaskItem {
  id: string;
  phase: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
}

interface TaskQueuePanelProps {
  tasks: TaskItem[];
  logs: string[];
  onExecuteCommand: (prompt: string) => void;
  onRetryTask?: (taskId: string) => void;
  isExecuting: boolean;
}

export const TaskQueuePanel: React.FC<TaskQueuePanelProps> = ({
  tasks,
  logs,
  onExecuteCommand,
  onRetryTask,
  isExecuting,
}) => {
  const [promptInput, setPromptInput] = useState('');

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isExecuting) return;
    onExecuteCommand(promptInput.trim());
  };

  const QUICK_PROMPTS = [
    'Create an Expense Tracker with monthly budgeting, charts & CSV export',
    'Build a Todo App using React, Express, PostgreSQL & JWT Auth',
    'Build an AI Chat App with Gemini streaming & prompt templates',
  ];

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflowY: 'auto' }}>
      {/* One-Command Execution Form */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} color="#60a5fa" />
          <span>One-Command Autonomous Builder</span>
        </div>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px 0' }}>
          Enter a high-level requirement. DEVOS will analyze, plan, generate code, test, fix &amp; prepare deployment automatically.
        </p>

        <form onSubmit={handleRun} style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="e.g. Build an Expense Tracker with React & Node..."
            disabled={isExecuting}
            style={{
              flex: 1,
              height: 38,
              padding: '0 12px',
              borderRadius: 8,
              background: 'rgba(2, 6, 23, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isExecuting || !promptInput.trim()}
            style={{
              height: 38,
              padding: '0 14px',
              borderRadius: 8,
              background: isExecuting ? 'rgba(37, 99, 235, 0.5)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
          >
            {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{isExecuting ? 'Running' : 'Execute'}</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPromptInput(qp)}
              disabled={isExecuting}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: '10px',
                color: '#94a3b8',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms ease',
              }}
            >
              + {qp.split(' ')[1]} {qp.split(' ')[2]}
            </button>
          ))}
        </div>
      </div>

      {/* Persistent Execution Queue */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={14} color="#3b82f6" />
            <span>Execution Queue ({tasks.filter((t) => t.status === 'completed').length}/{tasks.length})</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((task) => {
            let statusIcon = <Circle size={14} color="#64748b" />;
            let statusBg = 'rgba(255, 255, 255, 0.02)';
            let statusBorder = 'rgba(255, 255, 255, 0.08)';

            if (task.status === 'running') {
              statusIcon = <Loader2 size={14} color="#60a5fa" className="animate-spin" />;
              statusBg = 'rgba(37, 99, 235, 0.12)';
              statusBorder = 'rgba(59, 130, 246, 0.4)';
            } else if (task.status === 'completed') {
              statusIcon = <CheckCircle2 size={14} color="#34d399" />;
              statusBg = 'rgba(16, 185, 129, 0.08)';
              statusBorder = 'rgba(16, 185, 129, 0.25)';
            } else if (task.status === 'failed') {
              statusIcon = <AlertCircle size={14} color="#fca5a5" />;
              statusBg = 'rgba(239, 68, 68, 0.12)';
              statusBorder = 'rgba(239, 68, 68, 0.3)';
            }

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: statusBg,
                  border: `1px solid ${statusBorder}`,
                  transition: 'all 200ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}>{statusIcon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>
                        {task.phase}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'capitalize' }}>
                          {task.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRetryTask && onRetryTask(task.id)}
                          style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#93c5fd',
                            fontSize: '9px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                      {task.description}
                    </div>
                    {task.output && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '4px 6px',
                          borderRadius: 4,
                          background: 'rgba(2, 6, 23, 0.6)',
                          fontSize: '10px',
                          color: '#34d399',
                          fontFamily: 'monospace',
                        }}
                      >
                        ✓ {task.output}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Live Agent Logs Stream */}
      {logs.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Terminal size={12} color="#f59e0b" />
            <span>Agent Execution Log</span>
          </div>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: '#020617',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxHeight: 140,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '10px',
              color: '#38bdf8',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {logs.map((log, i) => (
              <div key={i} style={{ opacity: i === logs.length - 1 ? 1 : 0.7 }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
