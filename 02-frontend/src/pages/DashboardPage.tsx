import React, { useEffect, useState } from 'react';
import { Plus, Bot, Terminal, FolderGit2, GitBranch, Rocket, Clock3 } from 'lucide-react';
import { Card, Button, Badge } from '../components/common';
import { useProject } from '../hooks/useProject';
import { Link } from 'react-router-dom';
import { activityApi, projectsApi } from '../api';
import { Activity } from '../types/activity';
import { Project } from '../types/project';
import { useSeo } from '../hooks/useSeo';

export const DashboardPage: React.FC = () => {
  useSeo({ title: 'Dashboard', noindex: true });

  const { activeProject } = useProject();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    activityApi
      .list()
      .then((res) => setActivity(res.data?.activities || []))
      .catch(() => setActivity([]));
    projectsApi.list().then((res) => setProjects(res.data?.projects || [])).catch(() => setProjects([]));
  }, []);

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Good to see you, developer.</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Your projects, context, and delivery pipeline in one focused workspace.
          </p>
        </div>
        <Link to="/app/projects">
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            Create Project
          </Button>
        </Link>
      </div>

      <div className="dashboard-grid dashboard-grid-primary">
        <Card
          title="Active project"
          subtitle={activeProject ? activeProject.name : 'No project currently selected'}
          action={<Badge variant={activeProject ? 'success' : 'default'}>{activeProject ? 'Loaded' : 'Idle'}</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            {activeProject?.description || 'Select a project to load files, Git status, and AI context.'}
          </p>
          <Link to="/app/workspace">
            <Button variant="secondary" size="sm" leftIcon={<FolderGit2 size={14} />}>
              Open workspace
            </Button>
          </Link>
        </Card>

        <Card
          title="AI queue"
          subtitle="Context-aware intelligence"
          action={<Badge variant="accent"><Bot size={12} /> Ready</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Your assistant is ready to explain, debug, refactor, and test the active file.
          </p>
          <Link to="/app/workspace">
            <Button variant="secondary" size="sm" leftIcon={<Bot size={14} />}>
              Open AI command center
            </Button>
          </Link>
        </Card>

        <Card
          title="Build status"
          subtitle="Project-scoped execution"
          action={<Badge variant="default"><Terminal size={12} /> Sandbox</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Run allowlisted commands and testing jobs from the integrated terminal.
          </p>
          <Link to="/app/workspace">
            <Button variant="secondary" size="sm" leftIcon={<Terminal size={14} />}>
              Launch terminal
            </Button>
          </Link>
        </Card>
      </div>

      <div className="dashboard-grid dashboard-grid-status">
        <Card title="Git status" subtitle="Working tree">
          <div className="status-value"><GitBranch size={18} /> {activeProject ? activeProject.default_branch || 'main' : '—'}</div>
          <p className="status-caption">{activeProject ? 'Connected to the active project' : 'Choose a project to inspect Git'}</p>
        </Card>
        <Card title="Deploy status" subtitle="Release readiness">
          <div className="status-value"><Rocket size={18} /> {activeProject ? 'Ready' : 'Waiting'}</div>
          <p className="status-caption">Deployment controls stay scoped to your project.</p>
        </Card>
        <Card title="Recent projects" subtitle={`${projects.length} available`}>
          {projects.slice(0, 3).map((project) => <div className="project-row" key={project.id}><FolderGit2 size={14} /><span>{project.name}</span><Clock3 size={12} /></div>)}
          {!projects.length && <p className="status-caption">Create your first project to get started.</p>}
        </Card>
      </div>

      <Card title="Recent activity" subtitle="Tracked developer activity">
        {activity.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No activity yet. Open a workspace, run a command, or chat with the assistant.
          </p>
        ) : (
          activity.slice(0, 8).map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', padding: '4px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{a.activity_type}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};
