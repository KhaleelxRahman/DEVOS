import React from 'react';
import {
  Sparkles,
  Cpu,
  FileCode2,
  FolderTree,
  ListTodo,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Spinner, Button } from '../common';

export interface PlanningStage {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  icon: React.ReactNode;
}

interface BuildProgressCardProps {
  progressPercent: number;
  currentStep: string;
  logs: string[];
  isPlanning: boolean;
  planComplete: boolean;
  onOpenWorkspace?: () => void;
}

export const BuildProgressCard: React.FC<BuildProgressCardProps> = ({
  progressPercent,
  currentStep,
  logs,
  isPlanning,
  planComplete,
  onOpenWorkspace,
}) => {
  const stages: PlanningStage[] = [
    {
      id: 'st-prd',
      label: 'PRD Synthesis',
      description: 'Scope & User Needs',
      status:
        progressPercent >= 30
          ? 'completed'
          : isPlanning && progressPercent >= 10
          ? 'running'
          : 'pending',
      icon: <FileCode2 size={13} />,
    },
    {
      id: 'st-arch',
      label: 'Architecture Topology',
      description: 'System Topology & Stack',
      status:
        progressPercent >= 55
          ? 'completed'
          : isPlanning && progressPercent >= 30
          ? 'running'
          : 'pending',
      icon: <Cpu size={13} />,
    },
    {
      id: 'st-tree',
      label: 'Folder Scaffolding',
      description: 'Directory Blueprint',
      status:
        progressPercent >= 80
          ? 'completed'
          : isPlanning && progressPercent >= 55
          ? 'running'
          : 'pending',
      icon: <FolderTree size={13} />,
    },
    {
      id: 'st-tasks',
      label: 'Sprint Roadmap',
      description: 'Milestone Queue & Epics',
      status:
        planComplete || progressPercent >= 100
          ? 'completed'
          : isPlanning && progressPercent >= 80
          ? 'running'
          : 'pending',
      icon: <ListTodo size={13} />,
    },
  ];

  return (
    <div
      id="factory-build-progress-card"
      style={{
        background: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header with progress percentage */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPlanning ? (
            <Spinner size={16} />
          ) : planComplete ? (
            <CheckCircle2 size={16} color="#10b981" />
          ) : (
            <Sparkles size={16} color="var(--color-accent)" />
          )}
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {isPlanning
                ? 'AI App Factory Planning Engine'
                : planComplete
                ? 'Planning Phase Complete'
                : 'Ready for Generation'}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {currentStep || 'Synthesizing specification & module architecture...'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
            {progressPercent}%
          </span>
          {planComplete && onOpenWorkspace && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenWorkspace}
              rightIcon={<ArrowRight size={12} />}
              style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
            >
              Open Workspace
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: 6,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: planComplete
              ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
            transition: 'width 300ms ease-out',
            borderRadius: 'var(--radius-full)',
          }}
        />
      </div>

      {/* 4 Pipeline Stages Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 'var(--space-2)',
        }}
      >
        {stages.map((stage) => {
          const isDone = stage.status === 'completed';
          const isCurrent = stage.status === 'running';

          return (
            <div
              key={stage.id}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                background: isDone
                  ? 'rgba(16, 185, 129, 0.08)'
                  : isCurrent
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'var(--color-surface)',
                border: isDone
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : isCurrent
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                transition: 'all 200ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: isDone ? '#10b981' : isCurrent ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                >
                  {stage.icon}
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {stage.label}
                  </span>
                </div>
                {isDone ? (
                  <CheckCircle2 size={12} color="#10b981" />
                ) : isCurrent ? (
                  <Spinner size={10} />
                ) : (
                  <Clock size={11} color="var(--color-text-muted)" />
                )}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                {stage.description}
              </span>
            </div>
          );
        })}
      </div>

      {/* Terminal Logs Stream */}
      {logs.length > 0 && (
        <div
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            maxHeight: '90px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            lineHeight: 1.4,
            color: 'var(--color-text-secondary)',
          }}
        >
          {logs.map((log, index) => (
            <div key={index} style={{ color: index === logs.length - 1 ? 'var(--color-accent)' : 'inherit' }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
