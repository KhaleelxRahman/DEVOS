import { apiClient } from '../api/client';

export function getAISuggestion(code: string) {
  return apiClient.post('/ai/suggest', { code });
}
