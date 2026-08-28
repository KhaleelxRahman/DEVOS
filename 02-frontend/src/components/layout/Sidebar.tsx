import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderGit2, Code2, Settings, User } from 'lucide-react';

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-nav">
        <span className="sidebar-section-title">Main Navigation</span>
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/app/projects"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <FolderGit2 size={16} />
          <span>Projects</span>
        </NavLink>
        <NavLink
          to="/app/workspace"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <Code2 size={16} />
          <span>Workspace</span>
        </NavLink>
      </div>

      <div className="sidebar-nav">
        <span className="sidebar-section-title">Preferences</span>
        <NavLink
          to="/app/settings"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>
        <div className="sidebar-item" style={{ cursor: 'default' }}>
          <User size={16} />
          <span>Developer</span>
        </div>
      </div>
    </aside>
  );
};
