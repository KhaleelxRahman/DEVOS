import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  Terminal as TermIcon,
  Sparkles,
  Bug,
  GitBranch,
  Rocket,
  Presentation,
  LayoutGrid,
  FileCode2,
  TestTube,
  History,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { EmptyState, Button, Badge } from '../components/common';
import { filesApi, projectsApi } from '../api';
import { ProfessionalFileExplorer } from '../components/workspace/ProfessionalFileExplorer';
import { MonacoEditorPro } from '../components/workspace/MonacoEditorPro';
import { RealTerminal } from '../components/workspace/RealTerminal';
import { EnterpriseAIPanel } from '../components/workspace/EnterpriseAIPanel';
import { DebugCenterPanel } from '../components/workspace/DebugCenterPanel';
import { GitHubProPanel } from '../components/workspace/GitHubProPanel';
import { DeployCenterPanel } from '../components/workspace/DeployCenterPanel';
import { TestingPanel } from '../components/workspace/TestingPanel';
import { OfficeKitModal } from '../components/presentation/OfficeKitModal';
import { IQOOFloatingAI } from '../components/mobile/IQOOFloatingAI';
import { FileVersionModal } from '../components/workspace/FileVersionModal';
import { TeamCollaborationModal } from '../components/collaboration/TeamCollaborationModal';
import { useToast } from '../components/common/Toast';
import { useSeo } from '../hooks/useSeo';
import { OpenTab } from '../components/workspace/CodeViewer';

type RightTabType = 'ai' | 'debug' | 'git' | 'deploy' | 'test';
type LayoutMode = 'default' | 'editor-focus' | 'terminal-focus';

export const WorkspacePage: React.FC = () => {
  useSeo({ title: 'Pro Workspace — DEVOS', noindex: true });

  const { activeProject, setActiveProject } = useProject();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTabType>('ai');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');
  const [isOfficeKitOpen, setIsOfficeKitOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (activeProject) return;
    const projectId = localStorage.getItem('devos_active_project_id');
    if (!projectId) return;
    projectsApi
      .get(projectId)
      .then((res) => {
        if (res.success && res.data) setActiveProject(res.data);
      })
      .catch(() => localStorage.removeItem('devos_active_project_id'));
  }, [activeProject, setActiveProject]);

  // Auto open first file if activePath is empty
  useEffect(() => {
    if (!activeProject || tabs.length > 0) return;
    filesApi.getTree(activeProject.id).then((res) => {
      if (res.success && res.data?.files?.length) {
        const findFirstFile = (nodes: any[]): string | null => {
          for (const n of nodes) {
            if (n.type === 'file') return n.path;
            if (n.children) {
              const child = findFirstFile(n.children);
              if (child) return child;
            }
          }
          return null;
        };
        const first = findFirstFile(res.data.files);
        if (first) openFile(first);
      }
    });
  }, [activeProject]);

  if (!activeProject) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <EmptyState
          icon={<FolderGit2 size={48} />}
          title="No Project Selected"
          description="Open or select a project to launch the integrated workspace containing file explorer, Monaco editor, AI assistant, xterm terminal, and deployment center."
          actionLabel="View Projects"
          onAction={() => navigate('/app/projects')}
        />
      </div>
    );
  }

  const openFile = async (path: string) => {
    setActivePath(path);
    if (tabs.some((t) => t.path === path)) return;
    const fileName = path.split('/').pop() || path;
    const ext = fileName.split('.').pop() || 'typescript';
    setTabs((prev) => [...prev, { path, name: fileName, content: '', language: ext, isLoading: true, error: '' }]);
    try {
      const res = await filesApi.getFile(activeProject.id, path);
      const contentStr = typeof res.data === 'string' ? res.data : (res.data?.content || '');
      setTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, content: contentStr, isLoading: false } : t))
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
      const savedStr = typeof res.data === 'string' ? res.data : (res.data?.content || content);
      setTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, content: savedStr, isDirty: false } : t))
      );
      toast(`Saved ${path}`, 'success');
      return true;
    } catch (err: any) {
      toast(err.message || `Failed to save ${path}`, 'error');
      return false;
    }
  };

  const handleApplyAICode = async (code: string) => {
    if (!activePath) {
      toast('Please open a file first in Monaco to apply code', 'warning');
      return;
    }
    const ok = await saveFile(activePath, code);
    if (ok) {
      toast('Code patch applied directly to workspace!', 'success');
    }
  };

  const activeTab = tabs.find((t) => t.path === activePath);
  const panelStyle: React.CSSProperties = { overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-2)' }}>
      {/* Workspace Header & Action Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <FolderGit2 size={15} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h1 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                {activeProject.name}
              </h1>
              <Badge variant="accent" icon={<GitBranch size={10} />}>
                {activeProject.default_branch || 'main'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Controls: Presentation Mode, Version History, Team Access, Layout Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activePath && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              leftIcon={<History size={13} />}
              title="View file revisions & restore earlier snapshots"
            >
              Version History
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCollabOpen(true)}
            leftIcon={<Users size={13} />}
            title="Team members, presence & code discussions"
          >
            Team ({activeProject.members?.length || 1})
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsOfficeKitOpen(true)}
            leftIcon={<Presentation size={13} />}
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(109, 40, 217, 0.15) 100%)',
              borderColor: '#8b5cf6',
              color: '#c4b5fd',
            }}
          >
            Presentation / Judge Mode
          </Button>

          {/* Layout switcher */}
          <div style={{ display: 'flex', background: 'var(--color-surface-elevated)', borderRadius: 6, padding: 2, border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setLayoutMode('default')}
              title="Default Split View"
              style={{
                background: layoutMode === 'default' ? 'var(--color-accent)' : 'transparent',
                border: 'none',
                borderRadius: 4,
                color: layoutMode === 'default' ? '#fff' : 'var(--color-text-muted)',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setLayoutMode('editor-focus')}
              title="Editor Focus View"
              style={{
                background: layoutMode === 'editor-focus' ? 'var(--color-accent)' : 'transparent',
                border: 'none',
                borderRadius: 4,
                color: layoutMode === 'editor-focus' ? '#fff' : 'var(--color-text-muted)',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <FileCode2 size={13} />
            </button>
            <button
              onClick={() => setLayoutMode('terminal-focus')}
              title="Terminal Focus View"
              style={{
                background: layoutMode === 'terminal-focus' ? 'var(--color-accent)' : 'transparent',
                border: 'none',
                borderRadius: 4,
                color: layoutMode === 'terminal-focus' ? '#fff' : 'var(--color-text-muted)',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <TermIcon size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            layoutMode === 'editor-focus'
              ? '220px 1fr'
              : layoutMode === 'terminal-focus'
              ? '220px 1fr'
              : 'minmax(200px, 230px) 1fr minmax(280px, 350px)',
          gridTemplateRows:
            layoutMode === 'editor-focus'
              ? '1fr'
              : layoutMode === 'terminal-focus'
              ? '1fr'
              : 'minmax(320px, 1fr) minmax(180px, 34%)',
          gap: 'var(--space-2)',
          flex: 1,
          minHeight: 520,
        }}
        className="workspace-grid"
      >
        {/* Left Column: Repository Files */}
        <div
          style={{
            ...panelStyle,
            gridRow: layoutMode === 'default' ? 'span 2' : 'span 1',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <ProfessionalFileExplorer
            projectId={activeProject.id}
            activeFile={activePath}
            onSelectFile={openFile}
          />
        </div>

        {/* Center Column - Top: Monaco Editor Pro */}
        {layoutMode !== 'terminal-focus' && (
          <div
            style={{
              ...panelStyle,
              gridRow: layoutMode === 'editor-focus' ? 'span 1' : '1',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <MonacoEditorPro
              tabs={tabs}
              activePath={activePath}
              projectId={activeProject.id}
              onActivate={setActivePath}
              onClose={closeTab}
              onSave={saveFile}
              onApplyAICode={handleApplyAICode}
            />
          </div>
        )}

        {/* Center Column - Bottom / Focus: Real xterm Terminal */}
        {layoutMode !== 'editor-focus' && (
          <div
            style={{
              ...panelStyle,
              gridColumn: layoutMode === 'terminal-focus' ? '2' : '2',
              gridRow: layoutMode === 'terminal-focus' ? 'span 1' : '2',
              background: '#090d16',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <RealTerminal projectId={activeProject.id} projectName={activeProject.name} />
          </div>
        )}

        {/* Right Column: Multi-tab Tool Center (AI Assistant, Debug, Git, Deploy, Testing) */}
        {layoutMode === 'default' && (
          <div
            style={{
              ...panelStyle,
              gridRow: 'span 2',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Tab Pill Headers */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-elevated)',
                padding: '4px 6px',
                gap: 2,
                overflowX: 'auto',
              }}
            >
              {[
                { key: 'ai', label: 'AI Assistant', icon: <Sparkles size={12} color="var(--color-accent)" /> },
                { key: 'debug', label: 'Debug', icon: <Bug size={12} color="#ef4444" /> },
                { key: 'git', label: 'Git Pro', icon: <GitBranch size={12} color="#f59e0b" /> },
                { key: 'deploy', label: 'Deploy', icon: <Rocket size={12} color="#10b981" /> },
                { key: 'test', label: 'Tests', icon: <TestTube size={12} color="#8b5cf6" /> },
              ].map((tab) => {
                const isActive = rightTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setRightTab(tab.key as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '11px',
                      fontWeight: isActive ? 600 : 400,
                      background: isActive ? 'var(--color-surface)' : 'transparent',
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      border: isActive ? '1px solid var(--color-border-strong)' : '1px solid transparent',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Panel Content */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {rightTab === 'ai' && (
                <EnterpriseAIPanel
                  projectId={activeProject.id}
                  activeFilePath={activePath}
                  activeFileContent={activeTab?.content}
                  onApplyCodeToEditor={handleApplyAICode}
                />
              )}
              {rightTab === 'debug' && (
                <DebugCenterPanel
                  projectId={activeProject.id}
                  activeFilePath={activePath}
                  activeCode={activeTab?.content}
                  onApplyFix={handleApplyAICode}
                />
              )}
              {rightTab === 'git' && (
                <GitHubProPanel projectId={activeProject.id} />
              )}
              {rightTab === 'deploy' && (
                <DeployCenterPanel projectId={activeProject.id} projectName={activeProject.name} />
              )}
              {rightTab === 'test' && (
                <div style={{ padding: '12px', height: '100%', overflowY: 'auto' }}>
                  <TestingPanel projectId={activeProject.id} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Presentation Mode / Judge Evaluation Modal */}
      <OfficeKitModal
        isOpen={isOfficeKitOpen}
        onClose={() => setIsOfficeKitOpen(false)}
        projectName={activeProject.name}
      />

      {/* Cloud File Version History & Snapshot Restore */}
      {activePath && (
        <FileVersionModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          projectId={activeProject.id}
          filePath={activePath}
          onRestoreComplete={(content) => {
            setTabs((prev) =>
              prev.map((t) => (t.path === activePath ? { ...t, content, isDirty: false } : t))
            );
          }}
        />
      )}

      {/* Team Collaboration & Online Presence Modal */}
      <TeamCollaborationModal
        isOpen={isCollabOpen}
        onClose={() => setIsCollabOpen(false)}
      />

      {/* Floating AI Assistant for iQOO Mobile screens */}
      <IQOOFloatingAI
        projectId={activeProject.id}
        activeFilePath={activePath}
        onApplyCode={handleApplyAICode}
      />
    </div>
  );
};
