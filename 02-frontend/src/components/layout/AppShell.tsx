import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useProject } from '../../hooks/useProject';
import { CommandPalette } from './CommandPalette';

export const AppShell: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { activeProject } = useProject();
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);
  return (
    <div className="app-shell">
      <TopBar
        activeProjectName={activeProject?.name}
        gitBranch={activeProject?.default_branch || 'main'}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
      />
      <div className="app-body">
        <Sidebar onNavigate={() => setMenuOpen(false)} />
        {menuOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};
