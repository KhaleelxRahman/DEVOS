import React from 'react';

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

interface CodeViewerProps {
  tabs: OpenTab[];
  activeTabPath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onContentChange?: (path: string, newContent: string) => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  tabs,
  activeTabPath,
  onSelectTab,
  onCloseTab,
}) => {
  const activeTab = tabs.find((t) => t.path === activeTabPath) || tabs[0];

  if (!activeTab) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-text-muted)',
          fontSize: '13px',
        }}
      >
        Select a file from the explorer to open in editor
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          background: 'var(--color-surface-elevated)',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => onSelectTab(tab.path)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              background: tab.path === activeTabPath ? 'var(--color-surface)' : 'transparent',
              color: tab.path === activeTabPath ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderRight: '1px solid var(--color-border)',
            }}
          >
            <span>{tab.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.path);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Code content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: 'var(--color-bg)' }}>
        <pre
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-text-primary)',
            lineHeight: 1.5,
          }}
        >
          {activeTab.content}
        </pre>
      </div>
    </div>
  );
};
