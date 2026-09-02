export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  technologies: string[];
  repository_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  members?: any[];
  owner_name?: string;
  storage_bytes?: number;
}

export interface ProjectContext {
  project_id: string;
  name: string;
  files_count: number;
  languages: string[];
  summary: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  technologies?: string[];
  template?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  technologies?: string[];
}
