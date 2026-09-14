import { apiClient } from './client';
import { User, LoginPayload, RegisterPayload } from '../types/auth';
import { Project, CreateProjectPayload, UpdateProjectPayload } from '../types/project';
import { FileNode, FileContent } from '../types/file';
import { GitStatus, GitDiff } from '../types/git';
import { AIChatPayload, Conversation } from '../types/ai';
import { TerminalExecutePayload, TerminalResult } from '../types/terminal';
import { Activity } from '../types/activity';
import {
  ApplyStatusResponse,
  GeneratedPlan,
  RequirementsClassification,
  StatusResponse,
  SummaryResponse,
} from '../types/builder';

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
  register: (payload: RegisterPayload) => apiClient.post<{ user: User; token: string }>('/auth/register', payload),
  login: (payload: LoginPayload) => apiClient.post<{ user: User; token: string }>('/auth/login', payload),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get<{ user: User }>('/auth/me'),
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
  move: (projectId: string, path: string, destinationParent: string) =>
    apiClient.post<{ path: string }>(`/projects/${projectId}/files/move`, { path, destination_parent: destinationParent }),
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
  commit: (projectId: string, message: string) => apiClient.post(`/projects/${projectId}/git/commit`, { message }),
  getBranches: (projectId: string) => apiClient.get<{ current: string; branches: string[] }>(`/projects/${projectId}/git/branches`),
  getLog: (projectId: string, limit = 20) => apiClient.get<{ commits: { hash: string; author: string; date: string; message: string }[] }>(`/projects/${projectId}/git/log?limit=${limit}`),
  stage: (projectId: string, files: string[]) => apiClient.post(`/projects/${projectId}/git/stage`, { files }),
  unstage: (projectId: string, files: string[]) => apiClient.post(`/projects/${projectId}/git/unstage`, { files }),
  checkout: (projectId: string, branch: string, create = false) => apiClient.post(`/projects/${projectId}/git/checkout`, { branch, create }),
  pull: (projectId: string) => apiClient.post(`/projects/${projectId}/git/pull`),
  push: (projectId: string) => apiClient.post(`/projects/${projectId}/git/push`),
};

export const aiApi = {
  chat: (projectId: string, payload: AIChatPayload) => apiClient.post<{ message: any; conversation_id: string }>(`/projects/${projectId}/ai/chat`, payload),
  chatStream: (
    projectId: string,
    payload: AIChatPayload,
    onEvent: (event: string, data: Record<string, unknown>) => void,
    signal?: AbortSignal,
  ) => apiClient.stream(`/projects/${projectId}/ai/chat/stream`, payload, onEvent, signal),
  getConversations: (projectId: string, query?: string) => apiClient.get<{ conversations: Conversation[] }>(`/projects/${projectId}/ai/conversations${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  createConversation: (projectId: string) => apiClient.post<Conversation>(`/projects/${projectId}/ai/conversations`),
  updateConversation: (projectId: string, id: string, payload: { title?: string; is_pinned?: boolean }) =>
    apiClient.patch<Conversation>(`/projects/${projectId}/ai/conversations/${id}`, payload),
  deleteConversation: (projectId: string, id: string) =>
    apiClient.delete(`/projects/${projectId}/ai/conversations/${id}`),
  getMessages: (projectId: string, conversationId: string) =>
    apiClient.get<{ messages: { role: string; content: string; provider?: string; created_at?: string }[] }>(`/projects/${projectId}/ai/conversations/${conversationId}/messages`),
  getProvider: (projectId: string) =>
    apiClient.get<{ provider: string; model: string; is_mock: boolean; configured: boolean }>(`/projects/${projectId}/ai/provider`),
  runAction: (projectId: string, payload: { action: string; code: string; file_path?: string; language?: string }) =>
    apiClient.post<{ role: string; content: string; provider: string }>(`/projects/${projectId}/ai/actions`, payload),
  listArtifacts: (projectId: string) =>
    apiClient.get<{ artifacts: Artifact[] }>(`/projects/${projectId}/ai/artifacts`),
  createArtifact: (projectId: string, payload: Omit<Artifact, 'id' | 'project_id' | 'created_at' | 'updated_at'>) =>
    apiClient.post<Artifact>(`/projects/${projectId}/ai/artifacts`, payload),
  deleteArtifact: (projectId: string, artifactId: string) =>
    apiClient.delete(`/projects/${projectId}/ai/artifacts/${artifactId}`),
};

export interface Artifact {
  id: string;
  project_id: string;
  conversation_id?: string | null;
  message_id?: string | null;
  name: string;
  kind: 'code' | 'markdown' | 'json' | 'html' | 'mermaid' | 'svg' | 'text';
  content: string;
  mime_type?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
}

export const terminalApi = {
  execute: (projectId: string, payload: TerminalExecutePayload) => apiClient.post<TerminalResult>(`/projects/${projectId}/terminal/execute`, payload),
  getHistory: (projectId: string) => apiClient.get<{ history: any[] }>(`/projects/${projectId}/terminal/history`),
};

export interface ExecutionCreateRequest {
  execution_type: string;
  command: string;
  arguments?: string[] | null;
  working_directory: string;
  workspace_id: string;
  execution_id?: string | null;
}

export interface ExecutionRecord {
  execution_id: string;
  request_id: string | null;
  user_id: string;
  project_id: string;
  workspace_id: string;
  execution_type: string;
  command: string;
  arguments: string[] | null;
  working_directory: string;
  status: string;
  exit_code: number | null;
  failure_reason: string | null;
  timed_out: boolean;
  cancelled: boolean;
  stdout: string | null;
  stderr: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export const executionApi = {
  create: (projectId: string, payload: ExecutionCreateRequest) =>
    apiClient.post<ExecutionRecord>(`/projects/${projectId}/executions`, payload),
  run: (projectId: string, executionId: string) =>
    apiClient.post<ExecutionRecord>(`/projects/${projectId}/executions/${executionId}/run`),
  cancel: (projectId: string, executionId: string) =>
    apiClient.post<ExecutionRecord>(`/projects/${projectId}/executions/${executionId}/cancel`),
  get: (projectId: string, executionId: string) =>
    apiClient.get<ExecutionRecord>(`/projects/${projectId}/executions/${executionId}`),
};

export interface QualityOperation {
  operation: string;
  supported: boolean;
  available: boolean;
  command: string | null;
  arguments: string[] | null;
  source: string | null;
  reason: string | null;
}

export const qualityApi = {
  listOperations: (projectId: string) =>
    apiClient.get<{ project_id: string; operations: QualityOperation[] }>(
      `/projects/${projectId}/executions/quality/operations`
    ),
  runOperation: (projectId: string, operation: string) =>
    apiClient.post<ExecutionRecord>(`/projects/${projectId}/executions/quality/${operation}`),
};

export interface PreviewInfo {
  execution_id: string;
  project_id: string;
  url: string | null;
  port: number | null;
  status: string;
  exit_code: number | null;
  failure_reason: string | null;
  stdout: string | null;
  stderr: string | null;
}

export const previewApi = {
  start: (projectId: string) =>
    apiClient.post<PreviewInfo>(`/projects/${projectId}/preview`),
  status: (projectId: string) =>
    apiClient.get<PreviewInfo>(`/projects/${projectId}/preview/status`),
  stop: (projectId: string) =>
    apiClient.post<PreviewInfo>(`/projects/${projectId}/preview/stop`),
};

export const activityApi = {
  list: () => apiClient.get<{ activities: Activity[] }>('/activity'),
};

export const builderApi = {
  classify: (projectId: string, payload: { prompt: string; mode?: string }) =>
    apiClient.post<RequirementsClassification>(
      `/projects/${projectId}/builder/classify`,
      { prompt: payload.prompt, mode: payload.mode || 'build' }
    ),
  plan: (projectId: string, payload: { prompt: string; mode?: string }) =>
    apiClient.post<GeneratedPlan>(
      `/projects/${projectId}/builder/plan`,
      { prompt: payload.prompt, mode: payload.mode || 'build' }
    ),
  start: (projectId: string, payload: { prompt: string; generation_request_id?: string; project_name?: string; mode?: string }) =>
    apiClient.post<StatusResponse>(
      `/projects/${projectId}/builder/start`,
      {
        prompt: payload.prompt,
        generation_request_id: payload.generation_request_id || undefined,
        project_name: payload.project_name || undefined,
        mode: payload.mode || 'build',
      }
    ),
  status: (projectId: string, generationRequestId: string) =>
    apiClient.get<StatusResponse>(
      `/projects/${projectId}/builder/status/${generationRequestId}`
    ),
  stream: (
    projectId: string,
    generationRequestId: string,
    onEvent: (event: string, data: Record<string, unknown>) => void,
    signal?: AbortSignal,
  ) =>
    apiClient.streamGet(
      `/projects/${projectId}/builder/stream/${generationRequestId}`,
      onEvent,
      signal
    ),
  summary: (projectId: string, generationRequestId: string) =>
    apiClient.get<SummaryResponse>(
      `/projects/${projectId}/builder/summary/${generationRequestId}`
    ),
  apply: (projectId: string, generationRequestId: string) =>
    apiClient.post<ApplyStatusResponse>(
      `/projects/${projectId}/builder/apply/${generationRequestId}`
    ),
  cancel: (projectId: string, generationRequestId: string) =>
    apiClient.post<StatusResponse>(
      `/projects/${projectId}/builder/cancel/${generationRequestId}`
    ),
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

export const publicApi = {
  joinWaitlist: (email: string, name?: string) =>
    apiClient.post<{ status: string }>('/waitlist', { email, name: name || undefined }),
  submitContact: (payload: { name: string; email: string; subject: string; message: string; website?: string }) =>
    apiClient.post<{ status: string }>('/contact', payload),
};
