import React, { useEffect, useState } from 'react';
import { FolderGit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { EmptyState, Card } from '../components/common';
import { filesApi, projectsApi } from '../api';
import { FileExplorer } from '../components/workspace/FileExplorer';
import { CodeViewer, OpenTab } from '../components/workspace/CodeViewer';
import { TerminalPanel } from '../components/workspace/TerminalPanel';
import { GitPanel } from '../components/workspace/GitPanel';
import { AIPanel } from '../components/workspace/AIPanel';
import { TestingPanel } from '../components/workspace/TestingPanel';
import { useToast } from '../components/common/Toast';
import { useSeo } from '../hooks/useSeo';
import { RepositoryDashboard } from '../components/workspace/RepositoryDashboard';

export const WorkspacePage: React.FC = () => {
  useSeo({ title: 'Workspace', noindex: true });

  const { activeProject, setActiveProject } = useProject();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [fileRefreshToken, setFileRefreshToken] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (activeProject) return;
    const projectId = localStorage.getItem('devos_active_project_id');
    if (!projectId) return;
    let cancelled = false;
    projectsApi.get(projectId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setActiveProject(res.data);
        } else {
          throw new Error('Project unavailable');
        }
      })
      .catch(() => {
        // BUG-001: a stale stored project id (deleted project, cleared data,
        // or another account) must never leave a broken state — clear it and
        // send the user back to the project list with a friendly message.
        if (cancelled) return;
        localStorage.removeItem('devos_active_project_id');
        toast('Project no longer exists.', 'info');
        navigate('/app/projects', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [activeProject, setActiveProject, navigate, toast]);

  if (!activeProject) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <EmptyState
          icon={<FolderGit2 size={48} />}
          title="No Project Selected"
          description="Open or select a project to launch the integrated workspace containing file explorer, code viewer, AI assistant, terminal, and Git inspector."
          actionLabel="View Projects"
          onAction={() => navigate('/app/projects')}
        />
      </div>
    );
  }

  const openFile = async (path: string) => {
    setActivePath(path);
    if (tabs.some((t) => t.path === path)) return;
    setTabs((prev) => [...prev, { path, content: null, isLoading: true, error: '' }]);
    try {
      const res = await filesApi.getFile(activeProject.id, path);
      setTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, content: res.data!, isLoading: false } : t))
      );
    } catch (err: any) {
      setTabs((prev) =>
        prev.map((t) =>
          t.path === path ? { ...t, isLoading: false, error: err.message || 'Failed to load file' } : t
        )
      );
    }
  };

  const closeTab = (path: string) => {
    const remaining = tabs.filter((t) => t.path !== path);
    setTabs(remaining);
    if (activePath === path) {
      setActivePath(remaining.length ? remaining[remaining.length - 1].path : null);
    }
  };

  const saveFile = async (path: string, content: string): Promise<boolean> => {
    try {
      const res = await filesApi.saveFile(activeProject.id, path, content);
      setTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, content: res.data! } : t))
      );
      toast(`Saved ${path}`, 'success');
      return true;
    } catch (err: any) {
      toast(err.message || `Failed to save ${path}`, 'error');
      return false;
    }
  };

  const activeTab = tabs.find((t) => t.path === activePath);
  const activeFileForAI: { path: string; content: string; language?: string } | null =
    activeTab?.content
      ? {
          path: activeTab.content.path,
          content: activeTab.content.content,
          language: activeTab.content.language,
        }
      : null;

  const panelStyle: React.CSSProperties = { overflow: 'hidden', display: 'flex', flexDirection: 'column' };

  return (
    <div className="workspace-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
            Workspace: {activeProject.name}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
            Default Branch: {activeProject.default_branch || 'main'}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 240px) 1fr minmax(260px, 340px)',
          gridTemplateRows: 'minmax(280px, 1fr) minmax(180px, 32%)',
          gap: 'var(--space-3)',
          flex: 1,
          minHeight: 480,
        }}
        className="workspace-grid"
      >
        <Card title="Files" subtitle="Project Explorer" style={panelStyle}>
          <FileExplorer projectId={activeProject.id} onSelectFile={openFile} activeFile={activePath} refreshToken={fileRefreshToken} />
        </Card>

        <Card title="Code Viewer" subtitle="View & edit" style={panelStyle}>
          <CodeViewer tabs={tabs} activePath={activePath} onActivate={setActivePath} onClose={closeTab} onSave={saveFile} />
        </Card>

        <Card id="ai-command-center" title="AI Assistant" subtitle="Context Engine" style={panelStyle}>
          <AIPanel projectId={activeProject.id} activeFile={activeFileForAI} onWorkspaceChanged={() => setFileRefreshToken((value) => value + 1)} />
        </Card>

        <Card title="Terminal" subtitle="Sandboxed · allowlisted commands" style={{ ...panelStyle, gridColumn: 'span 2' }}>
          <TerminalPanel projectId={activeProject.id} />
        </Card>

        <Card title="Git & Tests" subtitle="Version control + Testing Center" style={panelStyle}>
          <GitPanel projectId={activeProject.id} />
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
          <TestingPanel projectId={activeProject.id} />
        </Card>
      </div>
      <RepositoryDashboard project={activeProject} />
    </div>
  );
};
