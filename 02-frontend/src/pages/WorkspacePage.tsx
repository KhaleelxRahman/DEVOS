import React from 'react';
import { useProject } from '../hooks/useProject';
import { EmptyState, Card } from '../components/common';
import { FolderGit2, Code2, Bot, Terminal, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WorkspacePage: React.FC = () => {
  const { activeProject } = useProject();

  if (!activeProject) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <EmptyState
          icon={<FolderGit2 size={48} />}
          title="No Project Selected"
          description="Open or select a project to launch the integrated workspace containing file explorer, code viewer, AI assistant, terminal, and Git inspector."
          actionLabel="View Projects"
          onAction={() => {}}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
            Workspace: {activeProject.name}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
            ID: {activeProject.id} &bull; Default Branch: {activeProject.default_branch || 'main'}
          </p>
        </div>
        <Link to="/projects" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)' }}>
          Switch Project
        </Link>
      </div>

      {/* Workspace Panel Placeholders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr 320px',
          gridTemplateRows: '1fr 180px',
          gap: 'var(--space-3)',
          flex: 1,
          minHeight: 450,
        }}
      >
        {/* File Explorer Panel */}
        <Card
          title="Files"
          subtitle="Project Structure"
          style={{ overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            <FolderGit2 size={16} />
            <span>File Explorer (Phase 6)</span>
          </div>
        </Card>

        {/* Code Viewer Panel */}
        <Card
          title="Code Viewer"
          subtitle="Read-only syntax display"
          style={{ overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: 'var(--space-2)' }}>
            <Code2 size={24} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>Select a file to view code</span>
          </div>
        </Card>

        {/* AI Assistant Panel */}
        <Card
          title="AI Assistant"
          subtitle="Project Context Engine"
          style={{ overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: 'var(--space-2)' }}>
            <Bot size={24} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>AI Assistant ready</span>
          </div>
        </Card>

        {/* Terminal Panel */}
        <Card
          title="Terminal"
          subtitle="Sandbox Console"
          style={{ gridColumn: 'span 2', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            <Terminal size={16} />
            <span>Terminal ready for development commands</span>
          </div>
        </Card>

        {/* Git Panel */}
        <Card
          title="Git Status"
          subtitle="Working Tree"
          style={{ overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            <GitBranch size={16} />
            <span>Working tree clean</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
