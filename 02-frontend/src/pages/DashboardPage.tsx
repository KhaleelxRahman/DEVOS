import React, { useEffect, useState } from 'react';
import { Plus, Bot, Terminal, FolderGit2 } from 'lucide-react';
import { Card, Button, Badge } from '../components/common';
import { useProject } from '../hooks/useProject';
import { Link } from 'react-router-dom';
import { activityApi } from '../api';
import { Activity } from '../types/activity';

export const DashboardPage: React.FC = () => {
  const { activeProject } = useProject();
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    activityApi
      .list()
      .then((res) => setActivity(res.data?.activities || []))
      .catch(() => setActivity([]));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Developer Command Center</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Unified project workspace with context-aware AI assistance.
          </p>
        </div>
        <Link to="/projects">
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            New Project
          </Button>
        </Link>
      </div>

      {/* Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card
          title="Active Project"
          subtitle={activeProject ? activeProject.name : 'No project currently selected'}
          action={<Badge variant={activeProject ? 'success' : 'default'}>{activeProject ? 'Loaded' : 'Idle'}</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            {activeProject?.description || 'Select or create a project to load files, Git status, and AI context.'}
          </p>
          <Link to="/workspace">
            <Button variant="secondary" size="sm" leftIcon={<FolderGit2 size={14} />}>
              Open Workspace
            </Button>
          </Link>
        </Card>

        <Card
          title="Project Context AI"
          subtitle="Context-Aware Intelligence"
          action={<Badge variant="accent"><Bot size={12} /> Ready</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Ask questions about code, debugging, or workflows with automatic project context.
          </p>
          <Link to="/workspace">
            <Button variant="secondary" size="sm" leftIcon={<Bot size={14} />}>
              Ask Assistant
            </Button>
          </Link>
        </Card>

        <Card
          title="Development Terminal"
          subtitle="Project-scoped execution"
          action={<Badge variant="default"><Terminal size={12} /> Sandbox</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Execute development builds and tests safely within your active project workspace.
          </p>
          <Link to="/workspace">
            <Button variant="secondary" size="sm" leftIcon={<Terminal size={14} />}>
              Launch Terminal
            </Button>
          </Link>
        </Card>
      </div>

      <Card title="Recent Activity" subtitle="Tracked developer activity">
        {activity.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No activity yet. Open a workspace, run commands, or chat with the assistant.
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
