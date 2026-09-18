export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  technologies?: string[] | null;
  repository_url?: string | null;
  repository_provider?: string | null;
  repository_id?: string | null;
  default_branch?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  technologies?: string[];
  repository_url?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  technologies?: string[];
  repository_url?: string;
}
