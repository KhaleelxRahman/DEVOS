import { apiClient } from './client';
import {
  User,
  LoginPayload,
  RegisterPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  ProjectMember,
  ProjectComment,
  FileVersion,
} from '../types/auth';
import { Project, CreateProjectPayload, UpdateProjectPayload } from '../types/project';
import { FileNode, FileContent } from '../types/file';
import {
  GitStatus,
  GitDiff,
  GitCommit,
  GitSyncResult,
  AICommitSuggestion,
  AICodeReviewResult,
  PullRequestPayload,
  PullRequestResult,
  ReleasePayload,
  ReleaseResult,
  WorkflowRun,
  CIExplainResult,
} from '../types/git';
import { AIChatPayload, Conversation } from '../types/ai';
import { TerminalExecutePayload, TerminalResult } from '../types/terminal';
import { Activity } from '../types/activity';

export interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch?: string | null;
  description?: string | null;
  html_url: string;
  avatar_url?: string | null;
  stars: number;
  forks: number;
  language?: string | null;
  updated_at?: string | null;
}

export * from './client';

export const authApi = {
  register: (payload: RegisterPayload) => apiClient.post<{ user: User; token: string; refresh_token?: string }>('/auth/register', payload),
  login: (payload: LoginPayload) => apiClient.post<{ user: User; token: string; refresh_token?: string }>('/auth/login', payload),
  logout: () => apiClient.post('/auth/logout'),
  refresh: (refreshToken: string) => apiClient.post<{ user: User; token: string }>('/auth/refresh', { refresh_token: refreshToken }),
  forgotPassword: (payload: ForgotPasswordPayload) => apiClient.post<{ message: string }>('/auth/forgot-password', payload),
  resetPassword: (payload: ResetPasswordPayload) => apiClient.post<{ message: string }>('/auth/reset-password', payload),
  me: () => apiClient.get<{ user: User }>('/auth/me'),
};

export const profileApi = {
  get: () => apiClient.get<{ user: User }>('/profile'),
  update: (payload: UpdateProfilePayload) => apiClient.put<{ user: User }>('/profile', payload),
};

export const collaborationApi = {
  getMembers: (projectId: string) => apiClient.get<{ members: ProjectMember[] }>(`/projects/${projectId}/members`),
  inviteMember: (projectId: string, payload: { email: string; role: 'admin' | 'editor' | 'viewer' }) =>
    apiClient.post<{ member: ProjectMember }>(`/projects/${projectId}/members`, payload),
  removeMember: (projectId: string, memberId: string) =>
    apiClient.delete(`/projects/${projectId}/members/${memberId}`),
  getComments: (projectId: string) => apiClient.get<{ comments: ProjectComment[] }>(`/projects/${projectId}/comments`),
  addComment: (projectId: string, payload: { comment: string; file_path?: string; line_number?: number }) =>
    apiClient.post<{ comment: ProjectComment }>(`/projects/${projectId}/comments`, payload),
};

export const fileHistoryApi = {
  getHistory: (projectId: string, filePath: string) =>
    apiClient.get<{ versions: FileVersion[] }>(`/projects/${projectId}/files/${encodeURIComponent(filePath)}/history`),
  restoreVersion: (projectId: string, filePath: string, versionId: string) =>
    apiClient.post<FileContent>(`/projects/${projectId}/files/${encodeURIComponent(filePath)}/restore`, { version_id: versionId }),
};

export const memoryApi = {
  get: (projectId?: string) => apiClient.get<{ memory: any; conversations_count: number; decisions: string[] }>(`/memory${projectId ? `?project_id=${projectId}` : ''}`),
};

export const userDeploymentsApi = {
  list: () => apiClient.get<{ deployments: any[] }>('/deployments'),
};


export const projectsApi = {
  list: () => apiClient.get<{ projects: Project[] }>('/projects'),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),
  create: (payload: CreateProjectPayload) => apiClient.post<Project>('/projects', payload),
  update: (id: string, payload: UpdateProjectPayload) => apiClient.patch<Project>(`/projects/${id}`, payload),
  delete: (id: string) => apiClient.delete(`/projects/${id}`),
  getContext: (id: string) => apiClient.get<any>(`/projects/${id}/context`),
  getActivity: (id: string) => apiClient.get<{ activities: Activity[] }>(`/projects/${id}/activity`),
};

export const filesApi = {
  getTree: (projectId: string) => apiClient.get<{ files: FileNode[] }>(`/projects/${projectId}/files`),
  getFile: (projectId: string, filePath: string) => apiClient.get<FileContent>(`/projects/${projectId}/files/${filePath}`),
  search: (projectId: string, query: string) => apiClient.get<{ results: string[] }>(`/projects/${projectId}/files/search?q=${encodeURIComponent(query)}`),
  createFile: (projectId: string, parentPath: string, name: string, content = '') =>
    apiClient.post<FileContent>(`/projects/${projectId}/files/file`, { parent_path: parentPath, name, content }),
  createFolder: (projectId: string, parentPath: string, name: string) =>
    apiClient.post<{ path: string }>(`/projects/${projectId}/files/folder`, { parent_path: parentPath, name }),
  saveFile: (projectId: string, filePath: string, content: string) =>
    apiClient.put<FileContent>(`/projects/${projectId}/files/${filePath}`, { content }),
  rename: (projectId: string, path: string, newName: string) =>
    apiClient.post<{ path: string }>(`/projects/${projectId}/files/rename`, { path, new_name: newName }),
  deleteEntry: (projectId: string, filePath: string) =>
    apiClient.delete(`/projects/${projectId}/files/${filePath}`),
  upload: (projectId: string, parentPath: string, files: FileList | globalThis.File[]) => {
    const form = new FormData();
    form.append('parent_path', parentPath);
    Array.from(files).forEach((f) => form.append('files', f, f.name));
    return apiClient.postForm<{ uploaded: string[]; errors: string[] }>(`/projects/${projectId}/files/upload`, form);
  },
};

export const gitApi = {
  getStatus: (projectId: string) => apiClient.get<GitStatus>(`/projects/${projectId}/git/status`),
  getDiff: (projectId: string) => apiClient.get<GitDiff>(`/projects/${projectId}/git/diff`),
  commit: (projectId: string, message: string) => apiClient.post<{ commit: GitCommit; commit_hash: string; ahead: number }>(`/projects/${projectId}/git/commit`, { message }),
  getBranches: (projectId: string) => apiClient.get<{ current: string; branches: string[]; remote?: string }>(`/projects/${projectId}/git/branches`),
  getLog: (projectId: string, limit = 20) => apiClient.get<{ commits: GitCommit[] }>(`/projects/${projectId}/git/log?limit=${limit}`),
  stage: (projectId: string, files: string[]) => apiClient.post<{ staged: string[]; modified: string[]; untracked: string[] }>(`/projects/${projectId}/git/stage`, { files }),
  unstage: (projectId: string, files: string[]) => apiClient.post<{ staged: string[]; modified: string[] }>(`/projects/${projectId}/git/unstage`, { files }),
  discard: (projectId: string, files: string[]) => apiClient.post<{ modified: string[]; untracked: string[]; message: string }>(`/projects/${projectId}/git/discard`, { files }),
  checkout: (projectId: string, branch: string, create = false) => apiClient.post<{ branch: string; branches: string[]; message: string }>(`/projects/${projectId}/git/checkout`, { branch, create }),
  branch: (projectId: string, payload: { action: 'create' | 'rename' | 'delete'; name?: string; old_name?: string }) => apiClient.post<{ branch?: string; deleted?: string; branches: string[] }>(`/projects/${projectId}/git/branch`, payload),
  pull: (projectId: string, branch?: string) => apiClient.post<GitSyncResult>(`/projects/${projectId}/git/pull`, { branch }),
  push: (projectId: string, branch?: string) => apiClient.post<GitSyncResult>(`/projects/${projectId}/git/push`, { branch }),
  fetch: (projectId: string) => apiClient.post<GitSyncResult>(`/projects/${projectId}/git/fetch`),
  createTag: (projectId: string, payload: ReleasePayload) => apiClient.post<{ tag: ReleaseResult; tags: any[]; message: string }>(`/projects/${projectId}/git/tag`, payload),
  getTags: (projectId: string) => apiClient.get<{ tags: ReleaseResult[] }>(`/projects/${projectId}/git/tags`),
  generateCommitMessage: (projectId: string, payload?: { files?: string[]; context_hint?: string }) => apiClient.post<AICommitSuggestion>(`/projects/${projectId}/git/ai/commit`, payload || {}),
  reviewCode: (projectId: string, payload?: { staged_files?: string[]; diff_text?: string }) => apiClient.post<AICodeReviewResult>(`/projects/${projectId}/git/ai/review`, payload || {}),
  createPR: (projectId: string, payload: PullRequestPayload) => apiClient.post<PullRequestResult>(`/projects/${projectId}/github/pr`, payload),
  getPRs: (projectId: string) => apiClient.get<{ pull_requests: PullRequestResult[] }>(`/projects/${projectId}/github/prs`),
  generatePR: (projectId: string, payload?: { head_branch?: string; base_branch?: string; context?: string }) => apiClient.post<{ title: string; summary: string; changes: string[]; testing_notes: string; checklist: string[] }>(`/projects/${projectId}/github/ai/pr`, payload || {}),
  generateReleaseNotes: (projectId: string, payload?: { tag_name?: string; version_type?: 'patch' | 'minor' | 'major' }) => apiClient.post<{ title: string; notes: string; breaking_changes: string[] }>(`/projects/${projectId}/git/ai/release-notes`, payload || {}),
};

export const githubWorkflowsApi = {
  list: (projectId: string) => apiClient.get<{ workflows: WorkflowRun[]; active_branch: string }>(`/projects/${projectId}/github/workflows`),
  trigger: (projectId: string, workflowId: string) => apiClient.post<{ workflow: WorkflowRun; message: string }>(`/projects/${projectId}/github/workflows/trigger`, { workflow_id: workflowId }),
  explainFailure: (projectId: string, payload: { workflow_id: string; logs?: string; failure_reason?: string }) => apiClient.post<CIExplainResult>(`/projects/${projectId}/github/ai/ci-explain`, payload),
};

export const aiApi = {
  chat: (projectId: string, payload: AIChatPayload) => apiClient.post<{ message: any; conversation_id: string }>(`/projects/${projectId}/ai/chat`, payload),
  getConversations: (projectId: string) => apiClient.get<{ conversations: Conversation[] }>(`/projects/${projectId}/ai/conversations`),
  createConversation: (projectId: string) => apiClient.post<Conversation>(`/projects/${projectId}/ai/conversations`),
  getMessages: (projectId: string, conversationId: string) =>
    apiClient.get<{ messages: { role: string; content: string; provider?: string }[] }>(`/projects/${projectId}/ai/conversations/${conversationId}/messages`),
  getProvider: (projectId: string) =>
    apiClient.get<{ provider: string; model: string; is_mock: boolean; configured: boolean }>(`/projects/${projectId}/ai/provider`),
  runAction: (projectId: string, payload: { action: string; code: string; file_path?: string; language?: string }) =>
    apiClient.post<{ role: string; content: string; provider: string }>(`/projects/${projectId}/ai/actions`, payload),
};

export const terminalApi = {
  execute: (projectId: string, payload: TerminalExecutePayload) => apiClient.post<TerminalResult>(`/projects/${projectId}/terminal/execute`, payload),
  getHistory: (projectId: string) => apiClient.get<{ history: any[] }>(`/projects/${projectId}/terminal/history`),
};

export const activityApi = {
  list: () => apiClient.get<{ activities: Activity[] }>('/activity'),
};

export const githubApi = {
  connect: () => apiClient.post<{ authorization_url: string }>('/github/connect'),
  getConnection: () => apiClient.get<{ connected: boolean; username: string | null }>('/github/connection'),
  disconnect: () => apiClient.delete('/github/connection'),
  getRepos: () => apiClient.get<{ connected: boolean; repositories: GithubRepository[] }>('/github/repositories'),
};

export const testingApi = {
  listJobs: (projectId: string) =>
    apiClient.get<{ jobs: { id: string; label: string; available: boolean; timeout_seconds: number }[] }>(
      `/projects/${projectId}/testing/jobs`
    ),
  runJob: (projectId: string, jobId: string) =>
    apiClient.post<{
      job: string; label: string; status: string; exit_code: number;
      duration_ms: number; stdout: string; stderr: string;
    }>(`/projects/${projectId}/testing/run/${jobId}`),
};

export const healthApi = {
  check: () => apiClient.get<{ status: string; service: string }>('/health'),
};

export const commandCenterApi = {
  generate: (payload: { prompt: string; tech_stack?: string; project_type?: string }) =>
    apiClient.post<any>('/ai/command-center/generate', payload),
  scaffold: (blueprint: any) =>
    apiClient.post<{ project: Project; files_count: number; message: string }>('/ai/command-center/scaffold', { blueprint }),
};

export const debugApi = {
  analyze: (projectId: string, payload: { error_message?: string; stack_trace?: string; file_path?: string; code?: string }) =>
    apiClient.post<{
      root_cause: string;
      affected_file: string;
      line_number: number;
      suggested_fix: string;
      patch_code: string;
      explanation: string;
    }>(`/projects/${projectId}/debug/analyze`, payload),
};

export const gitReviewApi = {
  reviewDiff: (projectId: string, payload: { diff_text?: string; staged_files?: string[] }) =>
    apiClient.post<{
      commit_message: string;
      summary: string;
      quality_score: number;
      highlights: string[];
      potential_risks: string[];
    }>(`/projects/${projectId}/git/review-diff`, payload),
};

export const deploymentApi = {
  list: (projectId: string) =>
    apiClient.get<{ deployments: any[] }>(`/projects/${projectId}/deployments`),
  deploy: (projectId: string, payload: { target: 'vercel' | 'netlify' | 'github_pages' | 'cloud_run'; branch?: string }) =>
    apiClient.post<any>(`/projects/${projectId}/deployments`, payload),
  rollback: (projectId: string, deploymentId: string) =>
    apiClient.post<any>(`/projects/${projectId}/deployments/rollback`, { deployment_id: deploymentId }),
};

export const architectureApi = {
  get: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/architecture`),
};

export const publicApi = {
  joinWaitlist: (email: string, name?: string) =>
    apiClient.post<{ status: string }>('/waitlist', { email, name: name || undefined }),
  submitContact: (payload: { name: string; email: string; subject: string; message: string; website?: string }) =>
    apiClient.post<{ status: string }>('/contact', payload),
};

export const generatorApi = {
  generatePRD: (payload: { prompt: string; project_name?: string; preferences?: string }) =>
    apiClient.post<any>('/generate/prd', payload),
  generateArchitecture: (payload: { prompt: string; prd?: any; tech_stack?: string }) =>
    apiClient.post<any>('/generate/architecture', payload),
  generateFolderTree: (payload: { prompt: string; architecture?: any }) =>
    apiClient.post<any>('/generate/folder-tree', payload),
  generateTasks: (payload: { prompt: string; prd?: any; architecture?: any }) =>
    apiClient.post<any>('/generate/tasks', payload),
  generateFiles: (payload: { prompt: string; project_id?: string; project_name?: string }) =>
    apiClient.post<any>('/generate/files', payload),
};

export const aiActionApi = {
  runAction: (payload: {
    action: string;
    code: string;
    language?: string;
    file_path?: string;
    target_language?: string;
    custom_prompt?: string;
  }) => apiClient.post<any>('/ai/action', payload),
  getContext: (projectId: string) => apiClient.get<any>(`/ai/context/${projectId}`),
  updateContext: (payload: {
    project_id: string;
    decisions?: string[];
    open_files?: string[];
    terminal_output?: string[];
    memory?: any;
  }) => apiClient.post<any>('/ai/context', payload),
};

export const smartDebugApi = {
  fixError: (payload: {
    error_message: string;
    stack_trace?: string;
    file_path?: string;
    code?: string;
    runtime_type?: string;
  }) => apiClient.post<any>('/debug/fix', payload),
};

export const appApi = {
  plan: (payload: { prompt: string; tech_stack?: string; template_id?: string; project_name?: string }) =>
    apiClient.post<{
      prd: any;
      userStories?: any[];
      architecture: any;
      folderStructure: string[];
      databaseSchema?: any;
      apiPlan?: any;
      componentTree?: any;
      techStack: string;
      sprintTasks: any[];
      testingPlan?: any;
      deploymentChecklist?: any;
    }>('/app/plan', payload),

  scaffold: (payload: {
    prompt: string;
    tech_stack?: string;
    template_id?: string;
    project_name?: string;
    plan?: any;
  }) =>
    apiClient.post<{
      project: any;
      files_count: number;
      files: string[];
      message: string;
    }>('/app/scaffold', payload),

  generate: (payload: {
    prompt: string;
    project_id: string;
    tech_stack?: string;
  }) =>
    apiClient.post<{
      files: Array<{ path: string; name: string; content: string; language: string; size?: number }>;
      count: number;
      message: string;
    }>('/app/generate', payload),

  build: (payload: { project_id: string; command?: string }) =>
    apiClient.post<{
      status: 'success' | 'failed';
      exit_code: number;
      duration_ms: number;
      logs: string[];
      error?: any;
      artifacts?: string[];
    }>('/app/build', payload),

  fix: (payload: {
    project_id: string;
    error_message?: string;
    file_path?: string;
    code?: string;
    stack_trace?: string;
  }) =>
    apiClient.post<{
      fixed: boolean;
      analysis: any;
      message: string;
    }>('/app/fix', payload),

  deploy: (payload: {
    project_id: string;
    target: 'vercel' | 'netlify' | 'github_pages' | 'cloud_run';
    branch?: string;
  }) =>
    apiClient.post<{
      id: string;
      project_id: string;
      target: string;
      url: string;
      branch: string;
      status: string;
      logs: string[];
      deployed_at: string;
    }>('/deploy', payload),

  startupAssets: (payload: {
    project_id?: string;
    prompt: string;
    app_name?: string;
  }) =>
    apiClient.post<{
      pitch_deck: Array<{ slide: number; title: string; content: string; key_metric: string }>;
      demo_script: Array<{ step: number; time: string; action: string; talking_point: string; wow_factor: string }>;
      judge_summary: {
        innovation_score: string;
        technical_depth: string;
        market_viability: string;
        key_highlights: string[];
      };
      investor_memo: string;
      technical_whitepaper: string;
    }>('/app/startup-assets', payload),

  getMarketplaceApps: () =>
    apiClient.get<{
      apps: Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        techStack: string;
        stars: number;
        deployStatus: string;
        liveUrl: string;
        lastCommit: string;
        lastUpdated: string;
        isCustom: boolean;
      }>;
      total: number;
    }>('/marketplace/apps'),
};


