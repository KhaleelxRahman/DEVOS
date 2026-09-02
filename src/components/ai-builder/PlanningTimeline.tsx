import React from 'react';
import {
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface TimelineStage {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: string;
}

interface PlanningTimelineProps {
  stages: TimelineStage[];
  activeStageId?: string;
  progressPercent: number;
}

export const PlanningTimeline: React.FC<PlanningTimelineProps> = ({
  stages,
  progressPercent,
}) => {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} className="text-blue-400" />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Autonomous Execution Pipeline
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 600 }}>
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      <div
        style={{
          height: 6,
          background: 'rgba(255, 255, 255, 0.06)',
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
            transition: 'width 0.3s ease',
            borderRadius: 3,
          }}
        />
      </div>

      {/* Stages Grid / Steps */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 'var(--space-2)',
        }}
      >
        {stages.map((st, idx) => {
          const isRunning = st.status === 'running';
          const isCompleted = st.status === 'completed';

          return (
            <div
              key={st.id}
              style={{
                background: isRunning
                  ? 'rgba(59, 130, 246, 0.12)'
                  : isCompleted
                  ? 'rgba(16, 185, 129, 0.08)'
                  : 'var(--color-surface-elevated)',
                border: isRunning
                  ? '1px solid var(--color-accent)'
                  : isCompleted
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    color: isRunning
                      ? 'var(--color-accent)'
                      : isCompleted
                      ? '#34d399'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {isRunning ? (
                    <Loader2 size={13} className="animate-spin text-blue-400" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    st.icon
                  )}
                </div>
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    color: isCompleted ? '#34d399' : isRunning ? '#93c5fd' : 'var(--color-text-muted)',
                    fontWeight: 600,
                  }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isRunning
                      ? 'var(--color-accent)'
                      : isCompleted
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                    display: 'block',
                    lineHeight: 1.2,
                  }}
                >
                  {st.label}
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    marginTop: 2,
                  }}
                >
                  {st.description}
                </span>
              </div>

              {st.duration && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  <Clock size={9} color="var(--color-text-muted)" />
                  <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {st.duration}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
