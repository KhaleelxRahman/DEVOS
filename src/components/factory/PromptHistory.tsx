import React from 'react';
import { History, Trash2, Clock, Sparkles } from 'lucide-react';

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  templateId?: string;
  timestamp: string;
  techStack?: string;
}

interface PromptHistoryProps {
  history: PromptHistoryItem[];
  onSelectPrompt: (item: PromptHistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const PromptHistory: React.FC<PromptHistoryProps> = ({
  history,
  onSelectPrompt,
  onClearHistory,
  onDeleteItem,
}) => {
  if (history.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
          <History size={14} />
          <span>No previous prompts yet</span>
        </div>
        <p style={{ margin: 0, fontSize: '11px' }}>
          Prompts submitted into the AI Factory will be recorded here for instant replay.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={13} color="var(--color-accent)" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Previous Prompts ({history.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <Trash2 size={11} />
          <span>Clear</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
        {history.map((item) => (
          <div
            key={item.id}
            id={`prompt-history-item-${item.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onClick={() => onSelectPrompt(item)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <Sparkles size={12} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {item.prompt}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} />
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                }}
                title="Remove from history"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
