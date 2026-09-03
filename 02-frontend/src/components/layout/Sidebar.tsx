import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderGit2, Code2, Settings, User, Bot, Github, Rocket } from 'lucide-react';

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark"><Code2 size={17} /></span>
        <span>DEVOS</span>
      </div>
      <div className="sidebar-nav">
        <span className="sidebar-section-title">Workspace</span>
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
        <NavLink to="/app/workspace#ai-command-center" className="sidebar-item" onClick={onNavigate}>
          <Bot size={16} />
          <span>AI Command Center</span>
        </NavLink>
        <NavLink to="/app/projects?github=1" className="sidebar-item" onClick={onNavigate}>
          <Github size={16} />
          <span>GitHub</span>
        </NavLink>
        <NavLink to="/app/projects?deploy=1" className="sidebar-item" onClick={onNavigate}>
          <Rocket size={16} />
          <span>Deploy</span>
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
