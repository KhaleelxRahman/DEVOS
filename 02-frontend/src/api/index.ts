import { apiClient } from './client';
import { User, LoginPayload, RegisterPayload } from '../types/auth';
import { Project, CreateProjectPayload, UpdateProjectPayload } from '../types/project';
import { FileNode, FileContent } from '../types/file';
import { GitStatus, GitDiff } from '../types/git';
import { AIChatPayload, Conversation } from '../types/ai';
import { TerminalExecutePayload, TerminalResult } from '../types/terminal';
import { Activity } from '../types/activity';

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
  getConnection: () => apiClient.get<{ connected: boolean; username: string | null }>('/github/connection'),
  disconnect: () => apiClient.delete('/github/connection'),
  getRepos: () => apiClient.get<{ connected: boolean; repositories: any[] }>('/github/repos'),
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
