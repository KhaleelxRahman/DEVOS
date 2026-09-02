import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Star,
  CornerDownLeft,
  X,
  Sliders,
  Code2,
} from 'lucide-react';
import { Button, Spinner } from '../common';
import { VoiceButton } from './VoiceButton';

interface PromptInputProps {
  prompt: string;
  onChangePrompt: (val: string) => void;
  techStack: string;
  onChangeTechStack: (val: string) => void;
  onSubmit: () => void;
  isPlanning: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  onChangePrompt,
  techStack,
  onChangeTechStack,
  onSubmit,
  isPlanning,
  isFavorite,
  onToggleFavorite,
}) => {
  const [showStackSelector, setShowStackSelector] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const availableStacks = [
    'React 18 + TypeScript + Vite + Express',
    'React 18 + TypeScript + Recharts + Tailwind',
    'React 18 + TypeScript + LocalStorage',
    'React 18 + TypeScript + Gemini 3.7 API',
    'React 18 + TypeScript + Express + PostgreSQL Schema',
    'FastAPI + React 18 + TypeScript',
    'Node.js + TypeScript + Express REST',
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
      if (prompt.trim() && !isPlanning) {
        onSubmit();
      }
    }
  };

  return (
    <div
      id="factory-prompt-input-container"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
      }}
    >
      {/* Top action row: Tech stack pill + Favorite toggle + Clear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowStackSelector(!showStackSelector)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <Code2 size={12} color="var(--color-accent)" />
            <span>{techStack}</span>
            <Sliders size={10} style={{ marginLeft: 2 }} />
          </button>

          {showStackSelector && (
            <div
              style={{
                position: 'absolute',
                top: 28,
                left: 0,
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 50,
                padding: '4px',
                width: 320,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Select Architecture Framework
              </div>
              {availableStacks.map((stk) => (
                <button
                  key={stk}
                  type="button"
                  onClick={() => {
                    onChangeTechStack(stk);
                    setShowStackSelector(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 4,
                    background: techStack === stk ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: 'none',
                    color: techStack === stk ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    fontSize: '11px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span>{stk}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            id="factory-favorite-btn"
            onClick={onToggleFavorite}
            title={isFavorite ? 'Starred in Favorites' : 'Star this prompt'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              background: isFavorite ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-surface-elevated)',
              border: isFavorite ? '1px solid #f59e0b' : '1px solid var(--color-border)',
              color: isFavorite ? '#f59e0b' : 'var(--color-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <Star size={13} fill={isFavorite ? '#f59e0b' : 'none'} />
            <span>{isFavorite ? 'Starred' : 'Star'}</span>
          </button>

          {prompt.length > 0 && (
            <button
              type="button"
              onClick={() => onChangePrompt('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear prompt"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          id="factory-prompt-textarea"
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to build today? (e.g. Build an Expense Tracker with monthly budgeting, charts, and CSV export)"
          rows={3}
          disabled={isPlanning}
          style={{
            width: '100%',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            lineHeight: 1.5,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 150ms ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {/* Footer controls: Voice button + Quick tips + Submit */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <VoiceButton onTranscript={(txt) => onChangePrompt(txt)} disabled={isPlanning} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Press <strong>Enter</strong> to begin architecture planning
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            id="factory-generate-plan-btn"
            variant="primary"
            size="md"
            onClick={onSubmit}
            disabled={!prompt.trim() || isPlanning}
            leftIcon={isPlanning ? <Spinner size={14} /> : <Sparkles size={14} />}
            rightIcon={<CornerDownLeft size={12} />}
            style={{ fontWeight: 700 }}
          >
            {isPlanning ? 'Planning Engine Running…' : 'Generate Full App Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
};
