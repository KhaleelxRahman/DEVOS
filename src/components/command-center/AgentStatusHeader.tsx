import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, RefreshCw, Cpu, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Clock, Wrench, Rocket } from 'lucide-react';

export type AgentState =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'generating'
  | 'building'
  | 'testing'
  | 'fixing'
  | 'deploying'
  | 'completed'
  | 'error';

interface AgentStatusHeaderProps {
  agentState: AgentState;
  currentTaskName: string;
  progressPercent: number;
  onRunOneCommand: (prompt: string) => void;
  onReset: () => void;
  isExecuting: boolean;
}

export const AgentStatusHeader: React.FC<AgentStatusHeaderProps> = ({
  agentState,
  currentTaskName,
  progressPercent,
  onReset,
  isExecuting,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: any;
    if (isExecuting) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isExecuting]);

  const getStatusBadge = () => {
    switch (agentState) {
      case 'analyzing':
        return { label: 'Analyzing Repository', color: '#3b82f6', icon: <Cpu size={12} className="animate-spin" />, eta: '4s' };
      case 'planning':
        return { label: 'Planning Architecture', color: '#8b5cf6', icon: <Sparkles size={12} className="animate-pulse" />, eta: '6s' };
      case 'generating':
        return { label: 'Generating Code', color: '#60a5fa', icon: <Zap size={12} className="animate-pulse" />, eta: '12s' };
      case 'building':
        return { label: 'Running Build', color: '#f59e0b', icon: <RefreshCw size={12} className="animate-spin" />, eta: '8s' };
      case 'testing':
        return { label: 'Testing Endpoints', color: '#38bdf8', icon: <ShieldCheck size={12} />, eta: '5s' };
      case 'fixing':
        return { label: 'Fixing Errors', color: '#f97316', icon: <Wrench size={12} className="animate-bounce" />, eta: '10s' };
      case 'deploying':
        return { label: 'Deploying Release', color: '#a855f7', icon: <Rocket size={12} className="animate-pulse" />, eta: '7s' };
      case 'completed':
        return { label: 'Autonomous Core Ready', color: '#10b981', icon: <CheckCircle2 size={12} />, eta: 'Done' };
      case 'error':
        return { label: 'Error Recovery Mode', color: '#ef4444', icon: <AlertTriangle size={12} />, eta: 'Paused' };
      default:
        return { label: 'Idle / Standing By', color: '#64748b', icon: <ShieldCheck size={12} />, eta: 'Ready' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98))',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Top row: Agent Name & Live Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 12px rgba(37, 99, 235, 0.5)',
            }}
          >
            <Sparkles size={15} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              DEVOS Autonomous Agent
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Repository-Aware AI Engineer</div>
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 9999,
            background: `${badge.color}15`,
            border: `1px solid ${badge.color}40`,
            color: badge.color,
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Progress Bar & Time Metrics */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
            {currentTaskName || 'Awaiting command...'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '10px' }}>
            {isExecuting && (
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Clock size={10} /> {elapsedSeconds}s (ETA: {badge.eta})
              </span>
            )}
            <span style={{ fontWeight: 700, color: '#60a5fa' }}>{progressPercent}%</span>
          </div>
        </div>
        <div style={{ width: '100%', height: 5, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
              boxShadow: '0 0 10px rgba(96, 165, 250, 0.6)',
            }}
          />
        </div>
      </div>

      {/* Controls row */}
      {isExecuting && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button
            onClick={onReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} /> Reset Agent
          </button>
        </div>
      )}
    </div>
  );
};
