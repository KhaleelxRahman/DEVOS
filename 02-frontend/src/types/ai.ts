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
