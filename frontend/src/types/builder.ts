export interface ClassifiedRequirement {
  key: string;
  label: string;
  value: string;
  classification: 'EXPLICIT' | 'INFERRED' | 'OPTIONAL' | 'UNSUPPORTED';
  reason?: string | null;
}

export interface NormalizedBuildSpec {
  app_name: string;
  summary: string;
  stack: Record<string, string>;
  requirements: ClassifiedRequirement[];
  unsupported: string[];
  missing_environment: string[];
  plan: string[];
  files: string[];
}

export interface RequirementsClassification {
  project_id: string;
  prompt: string;
  requirements: ClassifiedRequirement[];
  plan: string;
  stack: Record<string, string>;
  unsupported: string[];
  mode: string;
}

export interface GeneratedPlan {
  project_id: string;
  prompt: string;
  plan: string;
  spec: NormalizedBuildSpec;
  files: string[];
}

export interface StatusResponse {
  generation_request_id: string;
  project_id: string;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface BuilderStreamEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface SummaryResponse {
  generation_request_id: string;
  project_id: string;
  status: string;
  summary: string;
  created_files: string[];
  modified_files: string[];
  deleted_files: string[];
  diff: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface ApplyStatusResponse {
  generation_request_id: string;
  project_id: string;
  applied_files: string[];
  modified_files: string[];
  failed_operations: string[];
  status: string;
}

export interface CreateGenerationRequest {
  prompt: string;
  generation_request_id?: string | null;
  project_name?: string | null;
  mode?: string;
}

export type BuilderStatus =
  | 'IDLE'
  | 'PLANNING'
  | 'GENERATING'
  | 'APPLYING'
  | 'SYNCING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED';

export const TERMINAL_BUILDER_STATUSES: BuilderStatus[] = [
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
  'BLOCKED',
];

export const isTerminalBuilderStatus = (status: string): boolean =>
  TERMINAL_BUILDER_STATUSES.includes(status as BuilderStatus);
