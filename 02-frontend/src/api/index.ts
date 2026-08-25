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
};

export const gitApi = {
  getStatus: (projectId: string) => apiClient.get<GitStatus>(`/projects/${projectId}/git/status`),
  getDiff: (projectId: string) => apiClient.get<GitDiff>(`/projects/${projectId}/git/diff`),
  commit: (projectId: string, message: string) => apiClient.post(`/projects/${projectId}/git/commit`, { message }),
};

export const aiApi = {
  chat: (projectId: string, payload: AIChatPayload) => apiClient.post<{ message: any; conversation_id: string }>(`/projects/${projectId}/ai/chat`, payload),
  getConversations: (projectId: string) => apiClient.get<{ conversations: Conversation[] }>(`/projects/${projectId}/ai/conversations`),
};

export const terminalApi = {
  execute: (projectId: string, payload: TerminalExecutePayload) => apiClient.post<TerminalResult>(`/projects/${projectId}/terminal/execute`, payload),
  getHistory: (projectId: string) => apiClient.get<{ history: any[] }>(`/projects/${projectId}/terminal/history`),
};

export const activityApi = {
  list: () => apiClient.get<{ activities: Activity[] }>('/activity'),
};

export const healthApi = {
  check: () => apiClient.get<{ status: string; service: string }>('http://localhost:8000/health'),
};
