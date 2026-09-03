import React, { useState } from 'react';
import {
  GitBranch,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  FolderGit2,
  Activity,
  GitPullRequest,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProjectSummaryProps {
  project?: {
    id: string;
    name: string;
    description?: string;
    default_branch?: string;
  } | null;
}

export const ProjectSummary: React.FC<ProjectSummaryProps> = ({ project }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'builds' | 'commits' | 'branches'>('builds');

  const projectName = project?.name || 'DEVOS Cloud Core';
  const defaultBranch = project?.default_branch || 'main';

  // Mock repository statistics
  const repoStats = {
    totalCommits: 148,
    weeklyCommits: '+18 this week',
    activeBranch: defaultBranch,
    branchStatus: 'Up to date with origin',
    buildHealth: '99.2%',
    buildStatus: 'Passing',
    avgBuildTime: '180ms',
    openPRs: 2,
    openIssues: 0,
    lastDeployTime: '12 mins ago',
  };

  // Mock recent builds
  const recentBuilds = [
    {
      id: 'b-8912',
      branch: defaultBranch,
      commit: 'a8f3b90',
      message: 'feat(core): optimize Monaco editor bundle splitting & HMR',
      status: 'success',
      duration: '0.18s',
      timestamp: '12 mins ago',
      author: 'DevOS Bot',
    },
    {
      id: 'b-8911',
      branch: defaultBranch,
      commit: 'c7d2e11',
      message: 'refactor(ui): apply Claude-inspired dark glassmorphism layout',
      status: 'success',
      duration: '0.22s',
      timestamp: '1 hour ago',
      author: 'Alex Engineer',
    },
    {
      id: 'b-8910',
      branch: 'feature/ai-command',
      commit: 'f3a190b',
      message: 'fix(git): resolve edge case in diff tree parsing',
      status: 'warning',
      duration: '0.31s',
      timestamp: '3 hours ago',
      author: 'Alex Engineer',
    },
  ];

  // Mock recent commits
  const recentCommits = [
    {
      hash: 'a8f3b90',
      message: 'feat(core): optimize Monaco editor bundle splitting & HMR',
      author: 'DevOS Bot',
      time: '12 mins ago',
      branch: defaultBranch,
    },
    {
      hash: 'c7d2e11',
      message: 'refactor(ui): apply Claude-inspired dark glassmorphism layout',
      author: 'Alex Engineer',
      time: '1 hour ago',
      branch: defaultBranch,
    },
    {
      hash: 'f3a190b',
      message: 'fix(git): resolve edge case in diff tree parsing',
      author: 'Alex Engineer',
      time: '3 hours ago',
      branch: 'feature/ai-command',
    },
  ];

  // Mock branch list
  const activeBranches = [
    { name: defaultBranch, isDefault: true, commitsAhead: 0, commitsBehind: 0, lastActive: '12 mins ago' },
    { name: 'feature/ai-command', isDefault: false, commitsAhead: 4, commitsBehind: 1, lastActive: '3 hours ago' },
    { name: 'fix/linter-types', isDefault: false, commitsAhead: 1, commitsBehind: 0, lastActive: '1 day ago' },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-6 shadow-xl"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">{projectName}</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Healthy</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live repository telemetry &amp; continuous integration metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-950 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all text-xs flex items-center gap-1.5"
            title="Refresh repository statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline font-medium">Sync Data</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Commits */}
        <div className="bg-slate-950/80 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Commits</span>
            <GitCommit className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{repoStats.totalCommits}</div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>{repoStats.weeklyCommits}</span>
            </div>
          </div>
        </div>

        {/* Active Branch */}
        <div className="bg-slate-950/80 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Branch</span>
            <GitBranch className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white font-mono truncate">{repoStats.activeBranch}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
              {repoStats.branchStatus}
            </div>
          </div>
        </div>

        {/* Build Health */}
        <div className="bg-slate-950/80 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Build Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{repoStats.buildHealth}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Avg duration: <span className="text-white font-mono">{repoStats.avgBuildTime}</span>
            </div>
          </div>
        </div>

        {/* Open PRs & Issues */}
        <div className="bg-slate-950/80 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pull Requests</span>
            <GitPullRequest className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-300">{repoStats.openPRs} Open</div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              0 blocking review issues
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for Recent Builds, Commits, and Branches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex gap-2">
            {(
              [
                { id: 'builds', label: 'Recent Builds', count: recentBuilds.length },
                { id: 'commits', label: 'Commit History', count: recentCommits.length },
                { id: 'branches', label: 'Branches', count: activeBranches.length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-slate-300 font-mono">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Last deploy: <strong className="text-slate-300 font-normal">{repoStats.lastDeployTime}</strong>
          </span>
        </div>

        {/* Tab Contents */}
        {activeTab === 'builds' && (
          <div className="space-y-2">
            {recentBuilds.map((build) => (
              <div
                key={build.id}
                className="flex items-center justify-between p-3 bg-slate-950/60 border border-white/5 rounded-xl text-xs gap-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {build.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white font-bold">{build.id}</span>
                      <span className="px-1.5 py-0.2 bg-slate-900 border border-white/10 text-slate-400 rounded text-[10px] font-mono">
                        {build.branch}
                      </span>
                    </div>
                    <p className="text-slate-400 truncate mt-0.5">{build.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-slate-500 font-mono text-[11px]">
                  <span className="text-slate-400">{build.duration}</span>
                  <span className="hidden sm:inline">{build.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'commits' && (
          <div className="space-y-2">
            {recentCommits.map((c) => (
              <div
                key={c.hash}
                className="flex items-center justify-between p-3 bg-slate-950/60 border border-white/5 rounded-xl text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <GitCommit className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="font-mono text-blue-400 font-semibold shrink-0">{c.hash}</span>
                  <span className="text-slate-300 truncate">{c.message}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-slate-500 text-[11px]">
                  <span className="text-slate-400">{c.author}</span>
                  <span>&bull;</span>
                  <span>{c.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-2">
            {activeBranches.map((b) => (
              <div
                key={b.name}
                className="flex items-center justify-between p-3 bg-slate-950/60 border border-white/5 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono text-white font-semibold">{b.name}</span>
                  {b.isDefault && (
                    <span className="px-1.5 py-0.2 bg-blue-500/10 text-blue-400 text-[10px] font-semibold rounded border border-blue-500/20">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>Active {b.lastActive}</span>
                  {b.commitsAhead > 0 && (
                    <span className="text-emerald-400 font-mono">+{b.commitsAhead} ahead</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
