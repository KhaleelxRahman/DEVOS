export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  is_active: boolean;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  created_at: string;
  last_login?: string;
  interests?: string[];
  github_username?: string | null;
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
  onboarding_completed?: boolean;
}

export interface AuthSession {
  user: User;
  token?: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface LoginPayload {
  email: string;
  password?: string;
  remember_me?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  interests?: string[];
  remember_me?: boolean;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface UpdateProfilePayload {
  name?: string;
  avatar?: string;
  interests?: string[];
  password?: string;
  current_password?: string;
  github_username?: string | null;
  onboarding_completed?: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
  is_online?: boolean;
}

export interface ProjectComment {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  file_path?: string;
  line_number?: number;
  comment: string;
  created_at: string;
}

export interface FileVersion {
  id: string;
  file_path: string;
  content: string;
  size: number;
  commit_message?: string;
  created_at: string;
  created_by: string;
}

export interface TerminalTabSession {
  id: string;
  name: string;
  command_history: string[];
  created_at: string;
}

