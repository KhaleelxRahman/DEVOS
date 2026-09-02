import React, { useEffect, useState } from 'react';
import {
  Bot,
  FolderGit2,
  Sparkles,
  Rocket,
  Users,
  Activity as ActivityIcon,
  Plus,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/common';
import { useProject } from '../hooks/useProject';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { activityApi, projectsApi } from '../api';
import { Activity } from '../types/activity';
import { useSeo } from '../hooks/useSeo';
import { AICommandCenter } from '../components/command-center/AICommandCenter';
import { TeamCollaborationModal } from '../components/collaboration/TeamCollaborationModal';

export const DashboardPage: React.FC = () => {
  useSeo({ title: 'Dashboard — DEVOS Developer Operating System', noindex: true });

  const { activeProject, setActiveProject } = useProject();
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    activityApi
      .list()
      .then((res) => setActivity(res.data?.activities || []))
      .catch(() => setActivity([]));

    projectsApi
      .list()
      .then((res) => {
        if (res.success && res.data?.projects) {
          setProjects(res.data.projects);
          if (!activeProject && res.data.projects.length > 0) {
            setActiveProject(res.data.projects[0]);
          }
        }
      })
      .catch(() => {});
  }, [activeProject, setActiveProject]);

  const handleOpenProject = (proj: any) => {
    setActiveProject(proj);
    localStorage.setItem('devos_active_project_id', proj.id);
    navigate('/app/workspace');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Top Banner: AI Build Command Center */}
      <AICommandCenter onScaffoldComplete={() => navigate('/app/workspace')} />

      {/* User Session / Workspace Identity Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--space-6)',
          alignItems: 'center',
        }}
      >
        {/* Profile Info */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
            }}
          >
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'KR'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                {user ? user.name : 'Md Khaleel Ur Rahman'}
              </h2>
              {user && (
                <Badge variant="accent" size="sm">
                  {user.role || 'OWNER'}
                </Badge>
              )}
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', margin: '4px 0 8px 0', fontWeight: 600 }}>
              {user ? (user.github_username ? `@${user.github_username} • Cloud Developer` : 'Cloud Developer Workspace') : 'Founder • AI & Full Stack Developer'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              <Users size={13} color="var(--color-text-secondary)" />
              <span>Team <strong>Quantum Coders</strong>: Uzair Ali, Syed Mustafa Hussain Hashmi</span>
            </div>
          </div>
        </div>

        {/* Live Metric Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
          <div style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-accent)' }}>
              {projects.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Active Projects</div>
          </div>
          <div style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>0.18s</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Build Latency</div>
          </div>
          <div style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>Gemini 3.7</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Pro Engine</div>
          </div>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Recent Projects &amp; Workspaces
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
              Jump straight into your isolated repositories and cloud workspaces
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeProject && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCollabModal(true)}
                leftIcon={<Users size={14} />}
              >
                Team Access
              </Button>
            )}
            <Link to="/app/workspace">
              <Button variant="ghost" size="sm">Open Workspace</Button>
            </Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
              }}
            >
              <FolderGit2 size={24} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Your Workspace is Fresh &amp; Ready
              </h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', margin: 0, maxWidth: '440px' }}>
                No projects created yet for your account. Use the AI Command Center above to scaffold a full application or start with a clean slate.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/workspace')}
              leftIcon={<Plus size={14} />}
            >
              Launch Blank Project
            </Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {projects.slice(0, 3).map((proj) => {
              const isCurrent = activeProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj)}
                  style={{
                    background: 'var(--color-surface)',
                    border: isCurrent ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: isCurrent ? '0 0 0 1px var(--color-accent)' : 'none',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FolderGit2 size={16} color="var(--color-accent)" />
                        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {proj.name}
                        </h4>
                      </div>
                      <Badge variant={isCurrent ? 'accent' : 'default'}>
                        {isCurrent ? 'Active' : 'Ready'}
                      </Badge>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {proj.description || 'Modern full-stack application workspace.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {proj.technologies?.slice(0, 2).map((t: string) => (
                        <span key={t} style={{ fontSize: '10px', background: 'var(--color-surface-elevated)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-text-muted)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <Button variant="secondary" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleOpenProject(proj); }}>
                      Open
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Action Workspace Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        <Card
          title="Active Workspace"
          subtitle={activeProject ? activeProject.name : 'No project selected'}
          action={<Badge variant={activeProject ? 'success' : 'default'}>{activeProject ? 'Synchronized' : 'Idle'}</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            {activeProject?.description || 'Instant Monaco Editor, real sandboxed xterm shell, and auto-deploy pipeline.'}
          </p>
          <Link to="/app/workspace">
            <Button variant="primary" size="sm" leftIcon={<FolderGit2 size={14} />}>
              Launch Pro Workspace
            </Button>
          </Link>
        </Card>

        <Card
          title="AI Diagnostics & Fix"
          subtitle="Gemini 3.7 Root-Cause Analysis"
          action={<Badge variant="accent"><Sparkles size={12} /> Active</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Automated stack trace debugging, compiler fix patches, and zero-downtime hot reloading.
          </p>
          <Link to="/app/workspace">
            <Button variant="secondary" size="sm" leftIcon={<Bot size={14} />}>
              Open Debug Center
            </Button>
          </Link>
        </Card>

        <Card
          title="Cloud Deployments"
          subtitle="Vercel • Netlify • Cloud Run"
          action={<Badge variant="default"><Rocket size={12} /> Edge CDN</Badge>}
        >
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Push code to Git branches and trigger automatic edge container deployments with live previews.
          </p>
          <Link to="/app/workspace">
            <Button variant="secondary" size="sm" leftIcon={<Rocket size={14} />}>
              Deploy Center
            </Button>
          </Link>
        </Card>
      </div>

      {/* Tracked Activity Logs */}
      <Card title="Tracked Developer Activity" subtitle="Real-time audit log of commits, builds, and AI generations">
        {activity.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
            No activity yet. Use the AI Command Center above to scaffold your next application!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activity.slice(0, 6).map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 'var(--font-size-xs)',
                  padding: '8px 12px',
                  background: 'var(--color-surface)',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ActivityIcon size={14} color="var(--color-accent)" />
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{a.activity_type}</span>
                </div>
                <span style={{ color: 'var(--color-text-muted)' }}>{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Team Collaboration Modal */}
      <TeamCollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
      />
    </div>
  );
};
