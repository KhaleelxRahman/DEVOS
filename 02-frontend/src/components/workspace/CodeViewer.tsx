import React from 'react';
import { X } from 'lucide-react';
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
}

export type { OpenTab };

export const CodeViewer: React.FC<CodeViewerProps> = ({ tabs, activePath, onActivate, onClose }) => {
  const active = tabs.find((t) => t.path === activePath) || null;

  if (tabs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: 8 }}>
        <span style={{ fontSize: 13 }}>Select a file from the explorer to view its contents</span>
      </div>
    );
  }

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
                onClose(tab.path);
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
      {active?.error && <p style={{ color: 'var(--color-error)', fontSize: 12 }}>{active.error}</p>}
      {active?.content && (
        <>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            {active.content.path} &bull; {active.content.language || 'plaintext'} &bull; {active.content.size} bytes
          </div>
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
        </>
      )}
    </div>
  );
};
