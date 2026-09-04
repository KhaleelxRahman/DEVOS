import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderGit2, Code2, Settings, User, Bot, Github, Rocket, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const Sidebar: React.FC<{ onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }> = ({ onNavigate, collapsed = false, onToggle }) => {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark"><Code2 size={17} /></span>
        {!collapsed && <span>DEVOS</span>}
        <button className="sidebar-collapse" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      <div className="sidebar-nav">
        <span className="sidebar-section-title">Workspace</span>
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard size={16} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink
          to="/app/projects"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
          title={collapsed ? 'Projects' : undefined}
        >
          <FolderGit2 size={16} />
          {!collapsed && <span>Projects</span>}
        </NavLink>
        <NavLink
          to="/app/workspace"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
          title={collapsed ? 'Workspace' : undefined}
        >
          <Code2 size={16} />
          {!collapsed && <span>Workspace</span>}
        </NavLink>
        <NavLink to="/app/workspace#ai-command-center" className="sidebar-item" onClick={onNavigate} title={collapsed ? 'AI Command Center' : undefined}>
          <Bot size={16} />
          {!collapsed && <span>AI Command Center</span>}
        </NavLink>
        <NavLink to="/app/projects?github=1" className="sidebar-item" onClick={onNavigate} title={collapsed ? 'GitHub' : undefined}>
          <Github size={16} />
          {!collapsed && <span>GitHub</span>}
        </NavLink>
        <NavLink to="/app/projects?deploy=1" className="sidebar-item" onClick={onNavigate} title={collapsed ? 'Deploy' : undefined}>
          <Rocket size={16} />
          {!collapsed && <span>Deploy</span>}
        </NavLink>
      </div>

      <div className="sidebar-nav">
        <span className="sidebar-section-title">Preferences</span>
        <NavLink
          to="/app/settings"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={16} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
        <div className="sidebar-item" style={{ cursor: 'default' }}>
          <User size={16} />
          {!collapsed && <span>Developer</span>}
        </div>
      </div>
    </aside>
  );
};
