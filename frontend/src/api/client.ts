import { ApiResponse } from '../types/api';

// Default to same-origin requests locally, while production uses the deployed
// API if the hosting provider has not injected VITE_API_BASE_URL at build time.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://devos-backend-f3ub.onrender.com/api/v1' : '/api/v1');
export { API_BASE_URL };

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

class ApiClient {
  private getHeaders(customHeaders: HeadersInit = {}, json = true): HeadersInit {
    const headers: Record<string, string> = {
      ...((customHeaders as Record<string, string>) || {}),
    };
    if (json) {
      headers['Content-Type'] = 'application/json';
    }

    const token = localStorage.getItem('devos_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = this.getHeaders(options.headers || {}, !isFormData);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorCode = data?.error?.code || `HTTP_${response.status}`;
        const errorMessage = data?.error?.message || response.statusText || 'An unexpected error occurred';
        throw new ApiError(errorMessage, errorCode, response.status);
      }

      if (data === null || typeof data !== 'object') {
        throw new ApiError(
          'Received an unexpected response from the server',
          'INVALID_RESPONSE',
          response.status
        );
      }

      return data as ApiResponse<T>;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(err.message || 'Network error occurred', 'NETWORK_ERROR', 0);
    }
  }

  public get<T>(endpoint: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public post<T>(endpoint: string, body?: any, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public put<T>(endpoint: string, body?: any, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public patch<T>(endpoint: string, body?: any, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public postForm<T>(endpoint: string, form: FormData, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: form, headers });
  }

  public delete<T>(endpoint: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  public async stream(
    endpoint: string,
    body: unknown,
    onEvent: (event: string, data: Record<string, unknown>) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders({}, true),
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => null);
      throw new ApiError(
        data?.error?.message || response.statusText || 'Streaming request failed',
        data?.error?.code || `HTTP_${response.status}`,
        response.status,
      );
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      frames.forEach((frame) => {
        const event = frame.match(/^event: (.+)$/m)?.[1];
        const data = frame.match(/^data: (.+)$/m)?.[1];
        if (event && data) onEvent(event, JSON.parse(data) as Record<string, unknown>);
      });
      if (done) break;
    }
  }

  /**
   * GET-based SSE stream (builder generation) that carries the Authorization
   * header — unlike EventSource, which cannot set custom headers. Frames may
   * be `event: X\ndata: {...}` or data-only `data: {"event": "X", ...}`.
   */
  public async streamGet(
    endpoint: string,
    onEvent: (event: string, data: Record<string, unknown>) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders({}, false),
      signal,
    });
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => null);
      throw new ApiError(
        data?.error?.message || response.statusText || 'Streaming request failed',
        data?.error?.code || `HTTP_${response.status}`,
        response.status,
      );
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const dispatch = (frame: string) => {
      const dataLine = frame.match(/^data: (.+)$/m)?.[1];
      if (!dataLine) return;
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(dataLine) as Record<string, unknown>;
      } catch {
        return;
      }
      const eventName =
        frame.match(/^event: (.+)$/m)?.[1] ||
        (typeof payload.event === 'string' ? payload.event : 'message');
      const data =
        payload.data && typeof payload.data === 'object'
          ? (payload.data as Record<string, unknown>)
          : payload;
      onEvent(eventName, data);
    };
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      frames.forEach(dispatch);
      if (done) {
        if (buffer.trim()) dispatch(buffer);
        break;
      }
    }
  }
}

export const apiClient = new ApiClient();
