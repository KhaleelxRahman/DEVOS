export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  total?: number;
  page?: number;
  limit?: number;
}
