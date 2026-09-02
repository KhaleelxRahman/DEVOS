import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  UploadCloud,
  ShieldCheck,
  GitPullRequest,
  Tag,
  Workflow,
} from 'lucide-react';
import { gitApi } from '../../api';
import { GitStatus } from '../../types/git';

// Sub-components
import { GitStatusCard } from '../github/GitStatusCard';
import { BranchManager } from '../github/BranchManager';
import { CommitGenerator } from '../github/CommitGenerator';
import { PushPullPanel } from '../github/PushPullPanel';
import { CodeReviewPanel } from '../github/CodeReviewPanel';
import { PullRequestWizard } from '../github/PullRequestWizard';
import { ReleaseManager } from '../github/ReleaseManager';
import { WorkflowMonitor } from '../github/WorkflowMonitor';

interface GitHubProPanelProps {
  projectId: string;
}

type TabType = 'changes' | 'sync' | 'branches' | 'review' | 'prs' | 'releases' | 'cicd';

export const GitHubProPanel: React.FC<GitHubProPanelProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('changes');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<string[]>(['main']);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'modified' | 'staged' | 'untracked'>('all');

  const loadGitStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await gitApi.getStatus(projectId);
      if (res.success && res.data) {
        setStatus(res.data);
        if (res.data.branch) setCurrentBranch(res.data.branch);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await gitApi.getBranches(projectId);
      if (res.success && res.data) {
        if (res.data.branches?.length) setBranches(res.data.branches);
        if (res.data.current) setCurrentBranch(res.data.current);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadGitStatus();
    loadBranches();
  }, [projectId]);

  const handleBranchChange = (newBranch: string) => {
    setCurrentBranch(newBranch);
    loadGitStatus();
    loadBranches();
  };

  const handleCommitSuccess = () => {
    loadGitStatus();
  };

  const handleSyncComplete = () => {
    loadGitStatus();
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'changes',
      label: 'Changes',
      icon: <GitCommit size={13} />,
      badge: (status?.staged?.length || 0) + (status?.modified?.length || 0) + (status?.untracked?.length || 0),
    },
    {
      id: 'sync',
      label: 'Push & Pull',
      icon: <UploadCloud size={13} />,
      badge: (status?.ahead || 0) > 0 ? `+${status?.ahead}` : undefined,
    },
    {
      id: 'branches',
      label: 'Branches',
      icon: <GitBranch size={13} />,
      badge: branches.length,
    },
    {
      id: 'review',
      label: 'AI Review',
      icon: <ShieldCheck size={13} />,
    },
    {
      id: 'prs',
      label: 'Pull Requests',
      icon: <GitPullRequest size={13} />,
    },
    {
      id: 'releases',
      label: 'Releases',
      icon: <Tag size={13} />,
    },
    {
      id: 'cicd',
      label: 'CI/CD',
      icon: <Workflow size={13} />,
    },
  ];

  return (
    <div
      id="github-pro-workspace-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Top Fixed Area: Git Status Card */}
      <div style={{ padding: '10px 12px 6px 12px', flexShrink: 0 }}>
        <GitStatusCard
          status={status}
          isLoading={isLoadingStatus}
          onRefresh={loadGitStatus}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      {/* Nav Tabs Bar */}
      <div
        id="github-pro-navigation-tabs"
        style={{
          display: 'flex',
          gap: 2,
          padding: '4px 12px',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
          flexShrink: 0,
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`github-tab-${tab.id}-btn`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 9px',
                borderRadius: '4px 4px 0 0',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                color: isActive ? '#38bdf8' : 'var(--color-text-muted)',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== 0 ? (
                <span
                  style={{
                    background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#38bdf8' : 'var(--color-text-secondary)',
                    padding: '1px 5px',
                    borderRadius: 8,
                    fontSize: '9px',
                    fontWeight: 700,
                  }}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Scrollable Tab Content View */}
      <div
        id="github-pro-tab-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {activeTab === 'changes' && (
          <CommitGenerator
            projectId={projectId}
            status={status}
            onCommitSuccess={handleCommitSuccess}
            onStageChange={loadGitStatus}
          />
        )}

        {activeTab === 'sync' && (
          <PushPullPanel
            projectId={projectId}
            status={status}
            onSyncComplete={handleSyncComplete}
          />
        )}

        {activeTab === 'branches' && (
          <BranchManager
            projectId={projectId}
            currentBranch={currentBranch}
            branches={branches}
            onBranchChanged={handleBranchChange}
          />
        )}

        {activeTab === 'review' && (
          <CodeReviewPanel
            projectId={projectId}
            status={status}
          />
        )}

        {activeTab === 'prs' && (
          <PullRequestWizard
            projectId={projectId}
            currentBranch={currentBranch}
            branches={branches}
          />
        )}

        {activeTab === 'releases' && (
          <ReleaseManager
            projectId={projectId}
          />
        )}

        {activeTab === 'cicd' && (
          <WorkflowMonitor
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
};
