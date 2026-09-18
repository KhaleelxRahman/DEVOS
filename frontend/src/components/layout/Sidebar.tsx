import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderGit2, Code2, Settings, User, Bot, Github, Rocket, PanelLeftClose, PanelLeftOpen, Plus, MessageSquare, Trash2, Pin } from 'lucide-react';
import { useProject } from '../../hooks/useProject';
import { aiApi } from '../../api';
import { Conversation } from '../../types/ai';

export const Sidebar: React.FC<{ onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }> = ({ onNavigate, collapsed = false, onToggle }) => {
  const { activeProject } = useProject();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!activeProject) {
      setConversations([]);
      return;
    }
    aiApi.getConversations(activeProject.id)
      .then((res) => setConversations(res.data?.conversations || []))
      .catch(() => setConversations([]));
  }, [activeProject]);

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeProject) return;
    try {
      await aiApi.deleteConversation(activeProject.id, conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch {
      // silently fail
    }
  };

  const handlePinConversation = async (e: React.MouseEvent, conversationId: string, isPinned: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeProject) return;
    try {
      await aiApi.updateConversation(activeProject.id, conversationId, { is_pinned: !isPinned });
      setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, is_pinned: !isPinned } : c));
    } catch {
      // silently fail
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark"><Code2 size={17} /></span>
        {!collapsed && <span>DEVOS</span>}
        <button className="sidebar-collapse" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {!collapsed && (
        <NavLink
          to="/app/dashboard"
          className="sidebar-new-btn"
          onClick={onNavigate}
          title="New conversation"
        >
          <Plus size={14} />
          <span>New</span>
        </NavLink>
      )}

      <div className="sidebar-nav">
        <span className="sidebar-section-title">Workspace</span>
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
          title={collapsed ? 'Home' : undefined}
        >
          <LayoutDashboard size={16} />
          {!collapsed && <span>Home</span>}
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
        <NavLink to="/app/workspace#ai-command-center" className="sidebar-item" onClick={onNavigate} title={collapsed ? 'AI' : undefined}>
          <Bot size={16} />
          {!collapsed && <span>AI</span>}
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

      {!collapsed && conversations.length > 0 && (
        <div className="sidebar-nav sidebar-conversations">
          <span className="sidebar-section-title">Chats</span>
          <div className="sidebar-conversations-list">
            {conversations.slice(0, 8).map((conversation) => (
              <NavLink
                key={conversation.id}
                to="/app/workspace#ai-command-center"
                className="sidebar-conversation-item"
                onClick={onNavigate}
                title={conversation.title}
              >
                <MessageSquare size={13} />
                <span className="sidebar-conversation-title">{conversation.title}</span>
                <div className="sidebar-conversation-actions">
                  <button
                    type="button"
                    aria-label={conversation.is_pinned ? 'Unpin' : 'Pin'}
                    onClick={(e) => handlePinConversation(e, conversation.id, !!conversation.is_pinned)}
                  >
                    <Pin size={11} className={conversation.is_pinned ? 'pinned' : ''} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={(e) => handleDeleteConversation(e, conversation.id)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      )}

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
