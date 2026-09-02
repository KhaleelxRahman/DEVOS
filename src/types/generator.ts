export interface PRDSpec {
  title: string;
  summary: string;
  problem: string;
  target_users: string[];
  key_features: string[];
  mvp_scope: string[];
  future_scope: string[];
  non_functional_requirements: string[];
}

export interface ArchitectureSpec {
  pattern: string;
  frontend_stack: string;
  backend_stack: string;
  database_layer: string;
  authentication_flow: string;
  ai_pipeline: string;
  components: Array<{
    name: string;
    responsibility: string;
    tech?: string;
  }>;
  security: string[];
}

export interface FolderTreeSpec {
  tree: string[];
  description: string;
}

export interface TaskItem {
  id: string;
  title: string;
  category: 'Architecture' | 'Frontend' | 'Backend' | 'Database' | 'Testing' | 'DevOps';
  status: 'pending' | 'in_progress' | 'completed';
  file_path?: string;
  code_hint?: string;
}

export interface GenerationPhase {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp?: string;
}

export interface GeneratedSourceFile {
  path: string;
  name: string;
  content: string;
  language: string;
  category?: string;
}

export interface FullProjectPlan {
  project_name: string;
  description: string;
  tech_stack: string[];
  prd: PRDSpec;
  architecture: ArchitectureSpec;
  folder_structure: string[];
  roadmap: Array<{
    phase: string;
    title: string;
    duration: string;
    milestones: string[];
  }>;
  tasks: TaskItem[];
  initial_files: GeneratedSourceFile[];
}

export interface AICodeActionPayload {
  action:
    | 'explain'
    | 'rewrite'
    | 'fix'
    | 'optimize'
    | 'comments'
    | 'tests'
    | 'convert'
    | 'docs'
    | 'api'
    | 'performance';
  code: string;
  language?: string;
  file_path?: string;
  target_language?: string;
  custom_prompt?: string;
}

export interface AICodeActionResult {
  modified_code: string;
  explanation: string;
  preview_diff?: string;
  suggestions?: string[];
}

export interface SmartErrorRecoveryPayload {
  error_message: string;
  stack_trace?: string;
  file_path?: string;
  code?: string;
  runtime_type?: 'vite' | 'typescript' | 'react' | 'node' | 'python';
}

export interface SmartErrorRecoveryResult {
  root_cause: string;
  file: string;
  line: number;
  suggested_fix: string;
  patch_code: string;
  explanation: string;
  can_one_click_apply: boolean;
}

export interface AIMemoryContext {
  project_id: string;
  decisions: string[];
  open_files: string[];
  terminal_output: string[];
  memory: Record<string, any>;
  last_updated: string;
}
