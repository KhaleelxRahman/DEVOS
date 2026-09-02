export interface GitCommit {
  hash: string;
  author: string;
  message: string;
  date: string;
}

export interface GitStatus {
  branch: string;
  remote?: string;
  is_clean: boolean;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  staged: string[];
  ahead: number;
  behind: number;
  last_commit?: GitCommit | null;
  remote_url?: string;
}

export interface GitDiff {
  diff: string;
  stats?: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
}

export interface BranchInfo {
  name: string;
  is_current: boolean;
  last_commit?: string;
  last_commit_date?: string;
  upstream?: string;
  is_remote?: boolean;
}

export interface GitSyncResult {
  success: boolean;
  action: 'push' | 'pull' | 'fetch' | 'sync';
  output: string;
  error?: string;
  timestamp: string;
  branch: string;
  commits_transferred?: number;
}

export interface AICommitSuggestion {
  message: string;
  type: 'feat' | 'fix' | 'docs' | 'refactor' | 'perf' | 'test' | 'chore' | 'ci';
  scope: string;
  description: string;
  full_conventional: string;
  reasoning: string;
}

export interface AICodeReviewSuggestion {
  id: string;
  file: string;
  line?: number;
  severity: 'info' | 'warning' | 'critical';
  category: 'quality' | 'typescript' | 'security' | 'performance' | 'dead-code';
  title: string;
  description: string;
  suggested_fix?: string;
}

export interface AICodeReviewResult {
  summary: string;
  risk_level: 'low' | 'medium' | 'high';
  ready_to_push_score: number; // 0 - 100
  suggestions: AICodeReviewSuggestion[];
  passed_checks: string[];
  reviewed_at: string;
}

export interface PullRequestPayload {
  title: string;
  description: string;
  base_branch: string;
  head_branch: string;
  summary?: string;
  testing_notes?: string;
  labels?: string[];
  draft?: boolean;
}

export interface PullRequestResult {
  id: number;
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  base_branch: string;
  head_branch: string;
  author: string;
  created_at: string;
  changed_files: number;
  additions: number;
  deletions: number;
}

export interface ReleasePayload {
  tag_name: string;
  title: string;
  notes: string;
  target_branch?: string;
  version_type: 'patch' | 'minor' | 'major';
  update_changelog?: boolean;
}

export interface ReleaseResult {
  id: string;
  tag_name: string;
  title: string;
  notes: string;
  changelog_diff?: string;
  created_at: string;
  author: string;
  published: boolean;
}

export interface WorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  duration?: string;
}

export interface WorkflowRun {
  id: string;
  name: string;
  workflow_file: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled';
  branch: string;
  commit_hash: string;
  commit_message: string;
  author: string;
  started_at: string;
  completed_at?: string;
  duration: string;
  steps: WorkflowStep[];
  failure_reason?: string;
  logs?: string;
}

export interface CIExplainResult {
  root_cause: string;
  failed_step: string;
  explanation: string;
  recommended_fix: string;
  code_snippet?: string;
}
