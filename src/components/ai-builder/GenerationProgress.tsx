import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Loader2, FileCode } from 'lucide-react';

interface GenerationProgressProps {
  logs: string[];
  currentStep: string;
  filesGeneratedCount: number;
  isComplete: boolean;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  logs,
  currentStep,
  filesGeneratedCount,
  isComplete,
}) => {
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div
      style={{
        background: '#090d16',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: '#0d1322',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TerminalIcon size={12} color="var(--color-accent)" />
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#93c5fd', fontWeight: 600 }}>
            DEVOS Autonomous Synthesis Log
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileCode size={11} color="#34d399" />
            <span style={{ fontSize: '10px', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              {filesGeneratedCount} files generated
            </span>
          </div>

          <span
            style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: 4,
              background: isComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: isComplete ? '#34d399' : '#93c5fd',
              fontWeight: 600,
            }}
          >
            {isComplete ? 'READY' : 'SYNTHESIZING'}
          </span>
        </div>
      </div>

      <div
        style={{
          padding: '10px 12px',
          maxHeight: 140,
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: '#cbd5e1',
          lineHeight: 1.6,
        }}
      >
        {logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ color: '#64748b' }}>&gt;</span>
            <span style={{ color: log.includes('✓') || log.includes('Success') ? '#34d399' : log.includes('...') ? '#93c5fd' : '#cbd5e1' }}>
              {log}
            </span>
          </div>
        ))}
        {!isComplete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#93c5fd', marginTop: 4 }}>
            <Loader2 size={11} className="animate-spin" />
            <span>{currentStep}</span>
          </div>
        )}
        <div ref={terminalBottomRef} />
      </div>
    </div>
  );
};
