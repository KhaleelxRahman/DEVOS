import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowUpRight,
  Code2,
  Cpu,
  Layers,
  Database,
  Shield,
  Sparkles,
} from 'lucide-react';
import { TaskItem } from '../../types/generator';

interface TaskQueueProps {
  tasks: TaskItem[];
  onToggleTask?: (taskId: string) => void;
  onOpenFile?: (filePath: string) => void;
  isReadOnly?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Architecture: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', icon: <Layers size={12} /> },
  Frontend: { bg: 'rgba(59, 130, 246, 0.15)', text: '#93c5fd', icon: <Code2 size={12} /> },
  Backend: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', icon: <Cpu size={12} /> },
  Database: { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', icon: <Database size={12} /> },
  Testing: { bg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', icon: <Shield size={12} /> },
  DevOps: { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf', icon: <Sparkles size={12} /> },
};

export const TaskQueue: React.FC<TaskQueueProps> = ({
  tasks,
  onToggleTask,
  onOpenFile,
  isReadOnly = false,
}) => {
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Autonomous Task Queue
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--color-accent)',
              fontWeight: 600,
            }}
          >
            {completedCount}/{tasks.length} Completed
          </span>
        </div>

        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
          {progressPercent}% Complete
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {tasks.map((task) => {
          const isCompleted = task.status === 'completed';
          const isInProgress = task.status === 'in_progress';
          const catMeta = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Frontend;

          return (
            <div
              key={task.id}
              onClick={() => onToggleTask && !isReadOnly && onToggleTask(task.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: isCompleted
                  ? 'rgba(16, 185, 129, 0.05)'
                  : isInProgress
                  ? 'rgba(59, 130, 246, 0.08)'
                  : 'var(--color-surface-elevated)',
                border: isCompleted
                  ? '1px solid rgba(16, 185, 129, 0.2)'
                  : isInProgress
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                cursor: isReadOnly ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleTask && !isReadOnly) onToggleTask(task.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: isReadOnly ? 'default' : 'pointer',
                    color: isCompleted ? '#34d399' : isInProgress ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    marginTop: 2,
                    display: 'flex',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={15} />
                  ) : isInProgress ? (
                    <Clock size={15} />
                  ) : (
                    <Circle size={15} />
                  )}
                </button>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                      }}
                    >
                      {task.title}
                    </span>

                    <span
                      style={{
                        fontSize: '9px',
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: catMeta.bg,
                        color: catMeta.text,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      {catMeta.icon}
                      {task.category}
                    </span>
                  </div>

                  {task.code_hint && (
                    <div
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {task.code_hint}
                    </div>
                  )}
                </div>
              </div>

              {task.file_path && onOpenFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFile(task.file_path!);
                  }}
                  title={`Open ${task.file_path}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-accent)',
                    cursor: 'pointer',
                    marginLeft: 8,
                    flexShrink: 0,
                  }}
                >
                  <span>{task.file_path.split('/').pop()}</span>
                  <ArrowUpRight size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
