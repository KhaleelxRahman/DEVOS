import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Bot, GitBranch, FolderGit2, Menu, X, Settings, Wifi, WifiOff, ChevronDown, Rocket, Github } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Link } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import { projectsApi } from '../../api';
import { Project } from '../../types/project';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const { setActiveProject } = useProject();

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    projectsApi.list().then((res) => setProjects(res.data?.projects || [])).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchProject = (project: Project) => {
    setActiveProject(project);
    setSwitcherOpen(false);
  };

  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <button className="app-menu-toggle" onClick={onMenuToggle} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Terminal size={18} color="var(--color-accent)" />
        <span>DEVOS</span>
      </div>

      <div className="top-bar-center">
        {/* Project Switcher */}
        <div className="project-switcher" ref={switcherRef}>
          <button
            type="button"
            className="project-switcher-trigger"
            onClick={() => setSwitcherOpen((open) => !open)}
            aria-expanded={switcherOpen}
            aria-label="Switch project"
          >
            <FolderGit2 size={14} />
            <span className="project-switcher-name">{activeProjectName || 'Select project'}</span>
            <ChevronDown size={12} className={`project-switcher-chevron ${switcherOpen ? 'open' : ''}`} />
          </button>
          {switcherOpen && (
            <div className="project-switcher-dropdown" role="listbox" aria-label="Projects">
              {projects.length === 0 && (
                <div className="project-switcher-empty">No projects yet</div>
              )}
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`project-switcher-item ${project.name === activeProjectName ? 'active' : ''}`}
                  onClick={() => handleSwitchProject(project)}
                  role="option"
                  aria-selected={project.name === activeProjectName}
                >
                  <FolderGit2 size={13} />
                  <span className="project-switcher-item-name">{project.name}</span>
                  <span className="project-switcher-item-branch">{project.default_branch || 'main'}</span>
                </button>
              ))}
              <Link
                to="/app/projects"
                className="project-switcher-create"
                onClick={() => setSwitcherOpen(false)}
              >
                <FolderGit2 size={13} />
                <span>View all projects</span>
              </Link>
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="top-bar-status">
          <Badge variant="default" icon={<GitBranch size={11} />}>
            {gitBranch}
          </Badge>
          <Badge variant="accent" icon={<Bot size={11} />}>
            AI Ready
          </Badge>
          <Badge variant="default" icon={online ? <Wifi size={11} /> : <WifiOff size={11} />}>
            {online ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      <div className="top-bar-actions">
        <Link className="top-bar-icon-action" to="/app/projects?github=1" aria-label="GitHub" title="GitHub">
          <Github size={15} />
        </Link>
        <Link className="top-bar-icon-action" to="/app/projects?deploy=1" aria-label="Deploy" title="Deploy">
          <Rocket size={15} />
        </Link>
        <Link className="top-bar-icon-action" to="/app/settings" aria-label="Open settings" title="Settings">
          <Settings size={15} />
        </Link>
      </div>
    </header>
  );
};
