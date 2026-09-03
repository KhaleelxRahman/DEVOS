import React from 'react';
import { FileCode, PlusCircle, Edit3, Trash2, ExternalLink, ArrowRight } from 'lucide-react';

export interface FileChange {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  linesAdded?: number;
  linesRemoved?: number;
  timestamp: string;
}

interface FileChangesPanelProps {
  fileChanges: FileChange[];
  onSelectFile: (path: string) => void;
}

export const FileChangesPanel: React.FC<FileChangesPanelProps> = ({ fileChanges, onSelectFile }) => {
  const defaultChanges: FileChange[] = [
    { path: 'src/App.tsx', type: 'modified', linesAdded: 24, linesRemoved: 6, timestamp: 'Just now' },
    { path: 'src/pages/public/LoginPage.tsx', type: 'created', linesAdded: 280, linesRemoved: 0, timestamp: '1m ago' },
    { path: 'src/pages/public/SignupPage.tsx', type: 'created', linesAdded: 295, linesRemoved: 0, timestamp: '1m ago' },
    { path: 'src/components/command-center/AutonomousAICommandCenter.tsx', type: 'created', linesAdded: 320, linesRemoved: 0, timestamp: 'Just now' },
  ];

  const changesToRender = fileChanges.length > 0 ? fileChanges : defaultChanges;

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileCode size={14} color="#60a5fa" />
          <span>Live Workspace File Changes ({changesToRender.length})</span>
        </div>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Click file to open in Monaco</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {changesToRender.map((change, idx) => {
          let badgeColor = '#3b82f6';
          let badgeText = 'Modified';
          let icon = <Edit3 size={12} color="#60a5fa" />;

          if (change.type === 'created') {
            badgeColor = '#10b981';
            badgeText = 'Created';
            icon = <PlusCircle size={12} color="#34d399" />;
          } else if (change.type === 'deleted') {
            badgeColor = '#ef4444';
            badgeText = 'Deleted';
            icon = <Trash2 size={12} color="#fca5a5" />;
          }

          return (
            <div
              key={idx}
              onClick={() => onSelectFile(change.path)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {icon}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#f8fafc',
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {change.path}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', gap: 6, marginTop: 2 }}>
                    <span>{change.timestamp}</span>
                    {change.linesAdded !== undefined && <span style={{ color: '#34d399' }}>+{change.linesAdded}</span>}
                    {change.linesRemoved !== undefined && change.linesRemoved > 0 && <span style={{ color: '#fca5a5' }}>-{change.linesRemoved}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: `${badgeColor}20`,
                    color: badgeColor,
                  }}
                >
                  {badgeText}
                </span>
                <ExternalLink size={12} color="#64748b" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
