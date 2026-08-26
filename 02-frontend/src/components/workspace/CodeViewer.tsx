import React, { useEffect, useState } from 'react';
import { Save, X, Pencil } from 'lucide-react';
import { FileContent } from '../../types/file';
import { Spinner } from '../common';

interface OpenTab {
  path: string;
  content: FileContent | null;
  isLoading: boolean;
  error: string;
}

interface CodeViewerProps {
  tabs: OpenTab[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
  onSave: (path: string, content: string) => Promise<boolean>;
}

export type { OpenTab };

export const CodeViewer: React.FC<CodeViewerProps> = ({ tabs, activePath, onActivate, onClose, onSave }) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const active = tabs.find((t) => t.path === activePath) || null;

  // Leaving the tab or closing it discards the in-progress edit.
  useEffect(() => {
    setEditing(null);
    setDraft('');
  }, [activePath, tabs.length]);

  const startEdit = () => {
    if (!active?.content) return;
    setDraft(active.content.content);
    setEditing(active.path);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const ok = await onSave(editing, draft);
    setSaving(false);
    if (ok) {
      setEditing(null);
      setDraft('');
    }
  };

  const requestClose = (path: string) => {
    if (editing === path && !window.confirm(`Discard unsaved changes to ${path}?`)) {
      return;
    }
    onClose(path);
  };

  if (tabs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: 8 }}>
        <span style={{ fontSize: 13 }}>Select a file from the explorer to view its contents</span>
      </div>
    );
  }

  const isEditingActive = Boolean(active && editing === active.path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }} role="tablist">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            role="tab"
            aria-selected={tab.path === activePath}
            className={`editor-tab ${tab.path === activePath ? 'active' : ''}`}
            onClick={() => onActivate(tab.path)}
          >
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tab.path.split('/').pop()}
            </span>
            <button
              className="editor-tab-close"
              aria-label={`Close ${tab.path}`}
              onClick={(e) => {
                e.stopPropagation();
                requestClose(tab.path);
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {active?.isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spinner size={20} />
        </div>
      )}
      {active?.error && <p style={{ color: 'var(--color-error)', fontSize: 12 }} role="alert">{active.error}</p>}
      {active?.content && (
        <>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>
              {active.content.path} &bull; {active.content.language || 'plaintext'} &bull; {active.content.size} bytes
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {isEditingActive ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving} aria-label="Save file">
                    <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(null); setDraft(''); }} disabled={saving}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={startEdit} aria-label={`Edit ${active.content.path}`}>
                  <Pencil size={12} /> Edit
                </button>
              )}
            </span>
          </div>
          {isEditingActive ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={`Editing ${active.content.path}`}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: 0,
                margin: 0,
                padding: 12,
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono, monospace)',
                resize: 'none',
              }}
            />
          ) : (
            <pre
              tabIndex={0}
              style={{
                flex: 1,
                overflow: 'auto',
                minHeight: 0,
                margin: 0,
                padding: 12,
                background: 'var(--color-background)',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              <code>{active.content.content}</code>
            </pre>
          )}
        </>
      )}
    </div>
  );
};
