import React, { useState, useEffect } from 'react';
import { History, Star, Trash2, ArrowUpRight, Copy } from 'lucide-react';
import { useToast } from '../common/Toast';

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  timestamp: string;
  isFavorite?: boolean;
  project_name?: string;
}

const STORAGE_KEY = 'devos_prompt_history';

interface PromptHistoryProps {
  onSelectPrompt: (prompt: string) => void;
  currentPrompt?: string;
}

export const PromptHistory: React.FC<PromptHistoryProps> = ({ onSelectPrompt, currentPrompt }) => {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const { toast } = useToast();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        const initial: PromptHistoryItem[] = [
          {
            id: 'ph_1',
            prompt: 'Build an Expense Tracker with monthly budgeting, charts, and CSV export',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            isFavorite: true,
            project_name: 'expense-tracker',
          },
          {
            id: 'ph_2',
            prompt: 'Build an AI Chat app with Gemini streaming responses, Monaco code previews, and session history',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            isFavorite: true,
            project_name: 'ai-chat-app',
          },
          {
            id: 'ph_3',
            prompt: 'Build a modern Developer Portfolio with dark mode, interactive project showcases, blog markdown reader, and contact form',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            isFavorite: false,
            project_name: 'developer-portfolio',
          },
        ];
        setHistory(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = (items: PromptHistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveHistory(updated);
    toast('Prompt favorites updated', 'info');
  };

  const deletePrompt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
    toast('Prompt removed from history', 'info');
  };

  const copyPrompt = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast('Prompt copied to clipboard', 'info');
  };

  const displayedHistory =
    activeTab === 'favorites' ? history.filter((h) => h.isFavorite) : history;

  if (history.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={14} className="text-slate-400" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Prompt Memory & Favorites
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: 4,
              border: 'none',
              background: activeTab === 'all' ? 'var(--color-surface-elevated)' : 'transparent',
              color: activeTab === 'all' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Recent ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: 4,
              border: 'none',
              background: activeTab === 'favorites' ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
              color: activeTab === 'favorites' ? '#facc15' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Star size={10} fill={activeTab === 'favorites' ? '#facc15' : 'none'} />
            Favorites ({history.filter((h) => h.isFavorite).length})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
        {displayedHistory.map((item) => {
          const isSelected = item.prompt === currentPrompt;
          return (
            <div
              key={item.id}
              onClick={() => onSelectPrompt(item.prompt)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-surface-elevated)',
                border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, marginRight: 8 }}>
                <button
                  onClick={(e) => toggleFavorite(item.id, e)}
                  title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: item.isFavorite ? '#facc15' : 'var(--color-text-muted)',
                    display: 'flex',
                    flexShrink: 0,
                  }}
                >
                  <Star size={12} fill={item.isFavorite ? '#facc15' : 'none'} />
                </button>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.prompt}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={(e) => copyPrompt(item.prompt, e)}
                  title="Copy Prompt"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                >
                  <Copy size={11} />
                </button>
                <button
                  onClick={(e) => deletePrompt(item.id, e)}
                  title="Delete from history"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                >
                  <Trash2 size={11} />
                </button>
                <ArrowUpRight size={11} color="var(--color-accent)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
