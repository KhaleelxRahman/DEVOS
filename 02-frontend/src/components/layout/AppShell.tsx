import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useProject } from '../../hooks/useProject';
import { CommandPalette } from './CommandPalette';
import { Project } from '../../types/project';

export const AppShell: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('devos_sidebar_collapsed') === 'true');
  const { activeProject, setActiveProject } = useProject();
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    const handleSetActiveProject = (event: CustomEvent<Project>) => {
      setActiveProject(event.detail);
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('devos:setActiveProject', handleSetActiveProject as EventListener);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('devos:setActiveProject', handleSetActiveProject as EventListener);
    };
  }, [menuOpen]);
  useEffect(() => {
    localStorage.setItem('devos_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  return (
    <div className="app-shell">
      <TopBar
        activeProjectName={activeProject?.name}
        gitBranch={activeProject?.default_branch || 'main'}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
      />
      <div className="app-body">
        <Sidebar onNavigate={() => setMenuOpen(false)} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)} />
        {menuOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};
