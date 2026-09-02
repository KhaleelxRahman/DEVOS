import React, { useState } from 'react';
import {
  Check,
  X,
  Sparkles,
  Bug,
} from 'lucide-react';
import { Button, Spinner } from '../common';
import { smartDebugApi } from '../../api';
import { useToast } from '../common/Toast';

export interface SmartErrorRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
  stackTrace?: string;
  filePath?: string;
  code?: string;
  onApplyFix: (filePath: string, patchCode: string) => void;
}

export const SmartErrorRecoveryModal: React.FC<SmartErrorRecoveryModalProps> = ({
  isOpen,
  onClose,
  errorMessage,
  stackTrace,
  filePath = 'src/index.ts',
  code = '',
  onApplyFix,
}) => {
  const [runtimeType, setRuntimeType] = useState<string>('typescript');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [recoveryData, setRecoveryData] = useState<{
    root_cause: string;
    file: string;
    line: number;
    suggested_fix: string;
    patch_code: string;
    explanation: string;
    can_one_click_apply: boolean;
  } | null>(null);

  const { toast } = useToast();

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setRecoveryData(null);

    try {
      const res = await smartDebugApi.fixError({
        error_message: errorMessage,
        stack_trace: stackTrace,
        file_path: filePath,
        code,
        runtime_type: runtimeType,
      });

      if (res.success && res.data) {
        setRecoveryData(res.data);
        toast('Error root-cause and auto-patch generated!', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to analyze error', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!recoveryData?.patch_code) return;
    onApplyFix(recoveryData.file || filePath, recoveryData.patch_code);
    toast(`Fix applied to ${recoveryData.file || filePath}!`, 'success');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'linear-gradient(90deg, #3b0764 0%, #0f172a 100%)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Bug size={16} />
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                Smart Error Recovery Engine
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  marginLeft: 8,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                ONE-CLICK AUTO-FIX
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Runtime Selector Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 18px',
            background: '#090d16',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Runtime Environment:</span>
            {['typescript', 'react', 'vite', 'node', 'python'].map((env) => (
              <button
                key={env}
                onClick={() => setRuntimeType(env)}
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: runtimeType === env ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: runtimeType === env ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: runtimeType === env ? '#93c5fd' : '#64748b',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                }}
              >
                {env}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            leftIcon={isAnalyzing ? <Spinner size={12} /> : <Sparkles size={12} />}
          >
            {isAnalyzing ? 'Diagnosing...' : 'Analyze & Propose Fix'}
          </Button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* Error Message Box */}
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#f87171', textTransform: 'uppercase', marginBottom: 2 }}>
              Captured Error Message
            </div>
            <div style={{ fontSize: '12px', color: '#fecaca', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
              {errorMessage || 'Uncaught diagnostic error in build process'}
            </div>
          </div>

          {/* Diagnosis & Proposed Fix */}
          {recoveryData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 8,
                }}
              >
                <div style={{ padding: '8px 12px', background: '#090d16', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Root Cause</div>
                  <div style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: 600, marginTop: 2 }}>
                    {recoveryData.root_cause}
                  </div>
                </div>

                <div style={{ padding: '8px 12px', background: '#090d16', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Target Location</div>
                  <div style={{ fontSize: '12px', color: '#93c5fd', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {recoveryData.file}:{recoveryData.line}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', marginBottom: 2 }}>
                  Actionable Suggested Fix
                </div>
                <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5 }}>
                  {recoveryData.suggested_fix}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} />
                  <span>Proposed Code Patch Preview</span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '12px',
                    background: '#090d16',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: '#a7f3d0',
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {recoveryData.patch_code}
                </pre>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '12px',
                background: '#090d16',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              {isAnalyzing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Spinner size={20} />
                  <span>Analyzing root-cause with Gemini 3.7 Diagnostics...</span>
                </div>
              ) : (
                'Click "Analyze & Propose Fix" to generate root-cause and auto-patch preview.'
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#090d16',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            Close
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={!recoveryData?.patch_code}
            leftIcon={<Check size={13} />}
          >
            One-Click Apply Fix to Code
          </Button>
        </div>
      </div>
    </div>
  );
};
