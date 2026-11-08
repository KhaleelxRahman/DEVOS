import { ApiResponse } from '../types/api';

// Default to same-origin requests locally, while production uses the deployed
// API if the hosting provider has not injected VITE_API_BASE_URL or VITE_API_URL at build time.
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const API_BASE_URL = rawApiUrl
  ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`)
  : (import.meta.env.PROD ? 'https://devos-backend-f3ub.onrender.com/api/v1' : '/api/v1');
export { API_BASE_URL };

// ---------------------------------------------------------------------------
// Phase 10 A2 - mid-session 401 recovery.
//
// Before this, an expired token left the user inside a half-rendered workspace
// with a Retry button that could never succeed: the token was only cleared by
// AuthContext's mount-time effect, which does not re-run during a session.
//
// The rule is a single transition, not a per-call retry. A 401 is an
// authentication-state change, so the token is dropped and React state is
// cleared exactly once; `ProtectedRoute` (which already sends unauthenticated
// users to /login) performs the navigation. Nothing is ever retried.
// ---------------------------------------------------------------------------

/** Set by the client, owned by AuthContext, which holds the React state. */
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let recoveryInProgress = false;

/**
 * Requests that must NOT trigger the recovery transition. Login/register 401
 * are ordinary credential failures the form already renders, logout 401 means
 * the user is already unauthenticated, and `me` is the session bootstrap that
 * AuthContext already handles - treating any of them as expiry would redirect
 * /login to /login or nag a first-time visitor.
 */
const AUTH_EXEMPT_PATHS = ['/auth/login', '/auth/register', '/auth/logout', '/auth/me'];

/** Read by the login screen to explain why the user was returned here. */
export const SESSION_EXPIRED_KEY = 'devos_session_expired';
export const CACHED_USER_KEY = 'devos_user';

const REQUEST_TIMEOUT_MS = 15_000;
const GET_COALESCE_TTL_MS = 300;
const COLD_START_STATUSES = new Set([502, 503, 504]);

const inflightGets = new Map<string, Promise<ApiResponse<any>>>();
const recentGetCache = new Map<string, { expiresAt: number; value: ApiResponse<any> }>();

export function clearApiCache(): void {
  inflightGets.clear();
  recentGetCache.clear();
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/**
 * Called after a successful login so a later expiry can be recovered again.
 * Deliberately NOT a permanent lock - each genuine expiry needs one recovery.
 */
export function resetAuthRecovery(): void {
  recoveryInProgress = false;
  clearApiCache();
}

export function isAuthRecoveryInProgress(): boolean {
  return recoveryInProgress;
}

function isAuthExempt(endpoint: string): boolean {
  return AUTH_EXEMPT_PATHS.some((path) => endpoint.includes(path));
}

function handleUnauthorized(): void {
  // A burst of in-flight requests all 401 together; only the first one may act.
  if (recoveryInProgress) return;
  recoveryInProgress = true;

  clearApiCache();
  localStorage.removeItem('devos_token');
  localStorage.removeItem(CACHED_USER_KEY);
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
  } catch {
    // Private-mode storage denial must not block the recovery transition.
  }
  unauthorizedHandler?.();
}

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

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...options,
        signal: options.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET') {
      clearApiCache();
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = this.getHeaders(options.headers || {}, !isFormData);

    try {
      let response = await this.fetchWithTimeout(url, {
        ...options,
        headers,
      });

      if (COLD_START_STATUSES.has(response.status) && (method === 'GET' || endpoint.includes('/auth/'))) {
        await new Promise((r) => setTimeout(r, 300));
        response = await this.fetchWithTimeout(url, {
          ...options,
          headers,
        });
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Phase 10 A2: one 401 anywhere in an authenticated session ends it.
        // No retry - a dead token cannot answer a second identical request.
        if (response.status === 401 && !isAuthExempt(endpoint)) {
          handleUnauthorized();
        }
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
      if (err?.name === 'AbortError') {
        throw new ApiError('Request timed out. Please try again.', 'TIMEOUT_ERROR', 0);
      }
      throw new ApiError(err.message || 'Network error occurred', 'NETWORK_ERROR', 0);
    }
  }

  public get<T>(endpoint: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('devos_token') || '';
    const cacheKey = `${token}::${endpoint}`;
    const now = Date.now();
    const cached = recentGetCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return Promise.resolve(cached.value as ApiResponse<T>);
    }
    const existing = inflightGets.get(cacheKey);
    if (existing) {
      return existing as Promise<ApiResponse<T>>;
    }
    const promise = this.request<T>(endpoint, { method: 'GET', headers })
      .then((res) => {
        recentGetCache.set(cacheKey, {
          expiresAt: Date.now() + GET_COALESCE_TTL_MS,
          value: res,
        });
        return res;
      })
      .finally(() => {
        inflightGets.delete(cacheKey);
      });
    inflightGets.set(cacheKey, promise);
    return promise;
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
      // Phase 10 A2: a stream that 401s is the same expiry as any other call.
      if (response.status === 401 && !isAuthExempt(endpoint)) {
        handleUnauthorized();
      }
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
      // Phase 10 A2: same expiry contract for the GET-based SSE stream.
      if (response.status === 401 && !isAuthExempt(endpoint)) {
        handleUnauthorized();
      }
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
