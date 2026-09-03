import React, { useState } from 'react';
import { Bot, Sparkles, X, Send, Check } from 'lucide-react';
import { aiApi } from '../../api';
import { Spinner, Button } from '../common';
import { useToast } from '../common/Toast';

interface MobileFloatingAIProps {
  projectId: string;
  activeFilePath: string | null;
  onApplyCode?: (code: string) => void;
}

export const MobileFloatingAI: React.FC<MobileFloatingAIProps> = ({ projectId, activeFilePath, onApplyCode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const { toast } = useToast();

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt || prompt).trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await aiApi.chat(projectId, {
        prompt: `[Mobile Trigger] ${text}`,
        file_path: activeFilePath || undefined,
      });

      if (res.success && res.data) {
        setResponse(res.data.message?.content || 'Completed');
        setPrompt('');
      }
    } catch (err: any) {
      toast(err.message || 'AI request failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const extractCode = (markdown: string): string | undefined => {
    const match = markdown.match(/```(?:typescript|javascript|python|tsx|jsx|json|css|html)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : undefined;
  };

  const extractedCode = response ? extractCode(response) : undefined;

  return (
    <>
      {/* Floating Trigger Button (visible on mobile / small viewport) */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Floating Assistant"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: '#ffffff',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 90,
          transition: 'all 200ms ease',
        }}
      >
        <Sparkles size={24} />
      </button>

      {/* Mobile Drawer/Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 15, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '600px',
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border-strong)',
              borderRadius: '24px 24px 0 0',
              padding: '20px',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '80vh',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Bot size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Quick AI Copilot
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Gemini 3.7 &bull; Touch &amp; Voice Optimized
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Action Chips */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {[
                { label: 'Fix Bug', prompt: 'Find and fix bugs in active file' },
                { label: 'Add Types', prompt: 'Add complete TypeScript interfaces and typings' },
                { label: 'Generate Tests', prompt: 'Generate unit tests for active file' },
                { label: 'Explain Flow', prompt: 'Explain the high-level architecture of active file' },
                { label: 'Optimize O(n)', prompt: 'Optimize time and memory complexity of active file' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  disabled={isLoading}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Response view */}
            {response && (
              <div style={{ background: 'var(--color-surface-elevated)', padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-text-primary)', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {response}
                {extractedCode && onApplyCode && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onApplyCode(extractedCode);
                        setIsOpen(false);
                      }}
                      leftIcon={<Check size={12} />}
                    >
                      Apply Code to Monaco
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Input Bar */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Gemini anything on mobile…"
                style={{
                  flex: 1,
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: 'var(--color-text-primary)',
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSend()}
                disabled={!prompt.trim() || isLoading}
                leftIcon={isLoading ? <Spinner size={12} /> : <Send size={12} />}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
