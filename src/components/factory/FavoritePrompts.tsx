import React from 'react';
import { Star, Trash2 } from 'lucide-react';

export interface FavoritePromptItem {
  id: string;
  prompt: string;
  templateId?: string;
  title?: string;
  techStack?: string;
}

interface FavoritePromptsProps {
  favorites: FavoritePromptItem[];
  onSelectPrompt: (item: FavoritePromptItem) => void;
  onRemoveFavorite: (id: string) => void;
}

export const FavoritePrompts: React.FC<FavoritePromptsProps> = ({
  favorites,
  onSelectPrompt,
  onRemoveFavorite,
}) => {
  if (favorites.length === 0) {
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
          <Star size={14} color="#f59e0b" />
          <span>No favorites starred yet</span>
        </div>
        <p style={{ margin: 0, fontSize: '11px' }}>
          Star your most useful architectural prompts to quickly regenerate apps.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Star size={13} color="#f59e0b" fill="#f59e0b" />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Starred Favorites ({favorites.length})
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '6px' }}>
        {favorites.map((item) => (
          <div
            key={item.id}
            id={`favorite-prompt-item-${item.id}`}
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
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" style={{ flexShrink: 0 }} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {item.title || item.prompt}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFavorite(item.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: 2,
                flexShrink: 0,
              }}
              title="Remove favorite"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
