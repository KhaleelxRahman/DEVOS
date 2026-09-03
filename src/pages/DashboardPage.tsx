import React, { useEffect, useState } from 'react';
import {
  Bot,
  FolderGit2,
  Sparkles,
  Rocket,
  Users,
  Activity as ActivityIcon,
  Plus,
  ArrowRight,
  ShieldCheck,
  Code2,
  Terminal,
  Clock,
  Zap,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/common';
import { useProject } from '../hooks/useProject';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { activityApi, projectsApi } from '../api';
import { Activity } from '../types/activity';
import { useSeo } from '../hooks/useSeo';
import { AICommandCenter } from '../components/command-center/AICommandCenter';
import { TeamCollaborationModal } from '../components/collaboration/TeamCollaborationModal';
import { motion } from 'framer-motion';

export const DashboardPage: React.FC = () => {
  useSeo({ title: 'Dashboard — DEVOS Developer Operating System', noindex: true });

  const { activeProject, setActiveProject, projects } = useProject();
  const { user, openProfileModal } = useAuth();
  const location = useLocation();
  const [activity, setActivity] = useState<Activity[]>([]);
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeActivity = Array.isArray(activity) ? activity : [];
  const [showCollabModal, setShowCollabModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/app/profile' || location.pathname === '/app/settings') {
      openProfileModal();
    }
  }, [location.pathname]);

  useEffect(() => {
    activityApi
      .list()
      .then((res) => setActivity(res.data?.activities || []))
      .catch(() => setActivity([]));
  }, []);

  const handleOpenProject = (proj: any) => {
    setActiveProject(proj);
    localStorage.setItem('devos_active_project_id', proj.id);
    navigate('/app/workspace');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-slate-100 font-sans">
      
      {/* Top Banner: AI Build Command Center */}
      <AICommandCenter onScaffoldComplete={() => navigate('/app/workspace')} />

      {/* User Session / Workspace Identity Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Profile Info */}
        <div className="md:col-span-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg shadow-blue-500/30 border border-white/20 shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'KR'}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {user ? user.name : 'Guest Developer'}
              </h2>
              {user && (
                <span className="px-2.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                  {user.role || 'OWNER'}
                </span>
              )}
            </div>
            <p className="text-sm text-blue-400 font-medium mt-1">
              {user ? (user.github_username ? `@${user.github_username} • Cloud Environment` : 'DEVOS Cloud Workspace') : 'Cloud Developer Workspace'}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>JWT Encrypted Session • Enterprise Cloud Container Active</span>
            </div>
          </div>
        </div>

        {/* Live Metric Stats */}
        <div className="md:col-span-4 grid grid-cols-3 gap-3">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 text-center">
            <div className="text-lg font-extrabold text-blue-400">
              {safeProjects.length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Projects</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 text-center">
            <div className="text-lg font-extrabold text-emerald-400">0.18s</div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Build</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 text-center">
            <div className="text-lg font-extrabold text-purple-400">Gemini</div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">AI Engine</div>
          </div>
        </div>
      </motion.div>

      {/* Recent Projects Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Recent Projects &amp; Workspaces
            </h3>
            <p className="text-xs text-slate-400">
              Jump straight into your isolated repositories and cloud workspaces
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeProject && (
              <Button
                variant="secondary"
                size="sm"
                className="h-9 px-3 rounded-xl bg-slate-800 text-xs text-slate-200"
                onClick={() => setShowCollabModal(true)}
              >
                <Users className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                <span>Team Access</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-xl text-xs text-slate-300 hover:text-white"
              onClick={() => navigate('/app/workspace')}
            >
              Open Workspace IDE
            </Button>
          </div>
        </div>

        {safeProjects.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Your Workspace is Ready</h4>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                No projects created yet for your account. Use the AI Command Center above to scaffold a full application or launch a clean slate.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/workspace')}
              className="mt-2 h-9 px-4 rounded-xl bg-blue-600 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Launch Blank Project</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeProjects.slice(0, 3).map((proj) => {
              const isCurrent = activeProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj)}
                  className={`bg-slate-900/60 border ${
                    isCurrent ? 'border-blue-500/60 ring-1 ring-blue-500/30' : 'border-white/10 hover:border-white/20'
                  } rounded-2xl p-5 cursor-pointer flex flex-col justify-between gap-4 transition-all hover:-translate-y-0.5 shadow-lg backdrop-blur-xl`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <h4 className="font-bold text-sm text-white truncate max-w-[180px]">
                          {proj.name}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        isCurrent ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isCurrent ? 'Active' : 'Ready'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {proj.description || 'Modern full-stack application workspace.'}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <div className="flex gap-1.5 flex-wrap">
                      {(Array.isArray(proj.technologies) ? proj.technologies : []).slice(0, 2).map((t: string) => (
                        <span key={t} className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md text-slate-400 font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2.5 text-xs rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleOpenProject(proj);
                      }}
                    >
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Workspace</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold rounded-full border border-emerald-500/20">
              {activeProject ? 'Synchronized' : 'Idle'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">
            {activeProject ? activeProject.name : 'No project selected'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {activeProject?.description || 'Instant Monaco Editor, real sandboxed xterm shell, and auto-deploy pipeline.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            className="w-full h-9 rounded-xl bg-blue-600 text-xs font-semibold"
            onClick={() => navigate('/app/workspace')}
          >
            <Code2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Launch Pro Workspace</span>
          </Button>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Diagnostics</span>
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-semibold rounded-full border border-purple-500/20">
              Active
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">Gemini Root-Cause Analysis</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automated stack trace debugging, compiler fix patches, and zero-downtime hot reloading.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full h-9 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200"
            onClick={() => navigate('/app/workspace')}
          >
            <Bot className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
            <span>Open Debug Center</span>
          </Button>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cloud Deployments</span>
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-semibold rounded-full border border-amber-500/20">
              Edge CDN
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">Vercel • Netlify • Cloud Run</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Push code to Git branches and trigger automatic edge container deployments with live previews.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full h-9 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200"
            onClick={() => navigate('/app/workspace')}
          >
            <Rocket className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            <span>Deploy Center</span>
          </Button>
        </div>
      </div>

      {/* Tracked Activity Logs */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">Tracked Developer Activity</h4>
            <p className="text-xs text-slate-400">Real-time audit log of commits, builds, and AI generations</p>
          </div>
          <Zap className="w-4 h-4 text-blue-400" />
        </div>

        {safeActivity.length === 0 ? (
          <p className="text-xs text-slate-500">
            No activity logged yet. Use the AI Command Center above to scaffold your next application!
          </p>
        ) : (
          <div className="space-y-2">
            {safeActivity.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-xs p-3 bg-slate-950/80 border border-white/5 rounded-xl text-slate-300"
              >
                <div className="flex items-center gap-2.5">
                  <ActivityIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold text-white">{a.activity_type}</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Collaboration Modal */}
      <TeamCollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
      />
    </div>
  );
};
