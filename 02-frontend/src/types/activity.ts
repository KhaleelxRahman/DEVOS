export interface Activity {
  id: string;
  user_id: string;
  project_id?: string | null;
  activity_type: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}
