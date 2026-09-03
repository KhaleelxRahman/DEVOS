export type MessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id?: string;
  role: MessageRole;
  content: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  messages?: AIMessage[];
}

export interface AIChatPayload {
  message: string;
  conversation_id?: string;
  current_file?: string;
}

export type PlannerRequirementKey =
  | 'projectName' | 'category' | 'platform' | 'targetUsers' | 'auth'
  | 'database' | 'deployment' | 'payment' | 'notifications' | 'ai'
  | 'storage' | 'offline' | 'security';

export interface PlannerIntent {
  projectName: string;
  category: string;
  platform: string;
  targetUsers: string;
  auth: string;
  database: string;
  deployment: string;
  payment: string;
  notifications: string;
  ai: string;
  storage: string;
  offline: string;
  security: string;
}
