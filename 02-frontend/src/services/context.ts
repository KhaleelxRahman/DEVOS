import { apiClient } from '../api/client';

export function searchProjectContext(query: string) {
  return apiClient.post('/context/search', { query });
}
