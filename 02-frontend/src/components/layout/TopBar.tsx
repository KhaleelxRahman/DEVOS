import React from 'react';
import { Terminal, Bot, GitBranch, FolderGit2, Menu, X } from 'lucide-react';
import { Badge } from '../common/Badge';

export interface TopBarProps {
  activeProjectName?: string;
  gitBranch?: string;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeProjectName,
  gitBranch = 'main',
  menuOpen = false,
  onMenuToggle,
}) => {
  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <button className="app-menu-toggle" onClick={onMenuToggle} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Terminal size={18} color="var(--color-accent)" />
        <span>DEVOS v1.0.0</span>
        <span className="top-bar-badge">v1.0 MVP</span>
      </div>

      <div className="top-bar-center">
        {activeProjectName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FolderGit2 size={16} color="var(--color-text-secondary)" />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{activeProjectName}</span>
            <Badge variant="default" icon={<GitBranch size={12} />}>
              {gitBranch}
            </Badge>
          </div>
        ) : (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>No Active Project</span>
        )}
      </div>

      <div className="top-bar-actions">
        <Badge variant="accent" icon={<Bot size={12} />}>
          AI Ready
        </Badge>
      </div>
    </header>
  );
};
