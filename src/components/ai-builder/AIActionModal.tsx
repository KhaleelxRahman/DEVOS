import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Check,
  X,
  Code2,
  BookOpen,
  Zap,
  ShieldCheck,
  FileCode2,
} from 'lucide-react';
import { Button, Spinner } from '../common';
import { aiActionApi } from '../../api';
import { useToast } from '../common/Toast';

export interface AIActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCode: string;
  filePath: string;
  language: string;
  onApplyCode: (newCode: string) => void;
  initialAction?: string;
}

const ACTION_PRESETS = [
  { id: 'explain', label: 'Explain Code', icon: <BookOpen size={13} />, desc: 'Walkthrough architectural flow & contracts' },
  { id: 'rewrite', label: 'Rewrite Selection', icon: <Sparkles size={13} />, desc: 'Clean, idiomatic TypeScript refactor' },
  { id: 'fix', label: 'Fix Bug', icon: <ShieldCheck size={13} />, desc: 'Auto-detect edge cases & fix errors' },
  { id: 'optimize', label: 'Optimize Performance', icon: <Zap size={13} />, desc: 'Memoize loops & reduce allocations' },
  { id: 'tests', label: 'Generate Tests', icon: <Code2 size={13} />, desc: 'Unit tests using Vitest / Jest' },
  { id: 'comments', label: 'Add JSDoc Comments', icon: <FileCode2 size={13} />, desc: 'Document functions & interfaces' },
  { id: 'api', label: 'Generate API Route', icon: <Bot size={13} />, desc: 'Create typed REST endpoint from schema' },
];

export const AIActionModal: React.FC<AIActionModalProps> = ({
  isOpen,
  onClose,
  selectedCode,
  filePath,
  language,
  onApplyCode,
  initialAction = 'explain',
}) => {
  const [currentAction, setCurrentAction] = useState<string>(initialAction);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [targetLanguage] = useState<string>('typescript');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    modified_code: string;
    explanation: string;
    suggestions: string[];
  } | null>(null);

  const { toast } = useToast();

  if (!isOpen) return null;

  const handleRunAction = async (actionToRun = currentAction) => {
    setIsLoading(true);
    setResult(null);

    try {
      const res = await aiActionApi.runAction({
        action: actionToRun,
        code: selectedCode,
        language,
        file_path: filePath,
        target_language: targetLanguage,
        custom_prompt: customPrompt,
      });

      if (res.success && res.data) {
        setResult(res.data);
        toast(`Action "${actionToRun}" completed!`, 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to execute AI code action', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!result?.modified_code) return;
    onApplyCode(result.modified_code);
    toast('Code applied directly to active Monaco buffer!', 'success');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
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
          maxWidth: '850px',
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
            padding: '12px 18px',
            background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Sparkles size={14} />
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                Monaco AI Code Action
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
                {filePath || 'Active File'} &bull; {language}
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

        {/* Action Picker Strip */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 18px',
            background: '#090d16',
            borderBottom: '1px solid var(--color-border)',
            overflowX: 'auto',
          }}
        >
          {ACTION_PRESETS.map((act) => {
            const isSelected = act.id === currentAction;
            return (
              <button
                key={act.id}
                onClick={() => {
                  setCurrentAction(act.id);
                  handleRunAction(act.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: isSelected ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: isSelected ? '#93c5fd' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {act.icon}
                <span>{act.label}</span>
              </button>
            );
          })}
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
          {/* Custom Instruction Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Optional refinement prompt (e.g. Ensure strict runtime validation using Zod schemas)"
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunAction();
              }}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleRunAction()}
              disabled={isLoading}
              leftIcon={isLoading ? <Spinner size={12} /> : <Sparkles size={12} />}
            >
              {isLoading ? 'Executing...' : 'Run Action'}
            </Button>
          </div>

          {/* Results Comparison View */}
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Explanation Banner */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', marginBottom: 2 }}>
                  AI Explanation
                </div>
                <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5 }}>
                  {result.explanation}
                </div>
                {result.suggestions && result.suggestions.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {result.suggestions.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '10px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#cbd5e1',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        &bull; {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Code Difference */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Original Selection */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                    Original Buffer
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '10px',
                      background: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: '#94a3b8',
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}
                  >
                    {selectedCode || '// No code selected (Entire file buffer evaluated)'}
                  </pre>
                </div>

                {/* Proposed Modification */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} />
                    <span>Proposed Patch Preview</span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '10px',
                      background: '#090d16',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: '#a7f3d0',
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}
                  >
                    {result.modified_code}
                  </pre>
                </div>
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
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Spinner size={20} />
                  <span>Synthesizing code action with Gemini 3.7...</span>
                </div>
              ) : (
                'Select an action above or hit "Run Action" to inspect proposed refactorings and diffs.'
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
            Cancel
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={!result?.modified_code}
              leftIcon={<Check size={13} />}
            >
              Apply to Monaco Editor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
