import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderGit2, Code2, Settings, User } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-nav">
        <span className="sidebar-section-title">Main Navigation</span>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <FolderGit2 size={16} />
          <span>Projects</span>
        </NavLink>
        <NavLink
          to="/workspace"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <Code2 size={16} />
          <span>Workspace</span>
        </NavLink>
      </div>

      <div className="sidebar-nav">
        <span className="sidebar-section-title">Preferences</span>
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
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
