import React, { useEffect, useState } from 'react';
import { Terminal, Bot, GitBranch, FolderGit2, Menu, X, Search, Settings, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Link } from 'react-router-dom';

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
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <button className="app-menu-toggle" onClick={onMenuToggle} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Terminal size={18} color="var(--color-accent)" />
        <span>DEVOS</span>
        <span className="top-bar-badge">WORKSPACE</span>
      </div>

      <div className="top-bar-center">
        <div className="command-bar" role="search">
          <Search size={14} />
          <span>Search files, commands, and projects</span>
          <kbd>⌘ K</kbd>
        </div>
        {activeProjectName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FolderGit2 size={16} color="var(--color-text-secondary)" />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{activeProjectName}</span>
            <Badge variant="default" icon={<GitBranch size={12} />}>
              {gitBranch}
            </Badge>
            <Badge variant="default" icon={online ? <Wifi size={12} /> : <WifiOff size={12} />}>
              {online ? 'Online' : 'Offline'}
            </Badge>
          </div>
        ) : (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>No active project</span>
        )}
      </div>

      <div className="top-bar-actions">
        <Badge variant="accent" icon={<Bot size={12} />}>
          AI Ready
        </Badge>
        <Link className="top-bar-icon-action" to="/app/settings" aria-label="Open settings" title="Settings">
          <Settings size={15} />
        </Link>
      </div>
    </header>
  );
};
