import type { ApiProblem, Page, PageQuery } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * FE-01: Das Access-Token lebt nur im Modulspeicher. Kein localStorage,
 * kein sessionStorage - sonst ist es per XSS abgreifbar und ueberlebt den
 * Tab-Schluss. Nach einem Reload wird ueber das httpOnly-Refresh-Cookie
 * eine neue Session geholt (siehe auth/AuthProvider.tsx).
 */
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(problem.title);
    this.name = 'ApiError';
    this.problem = problem;
  }

  /** Feldfehler fuer die Formularanzeige. */
  fieldError(field: string): string | undefined {
    return this.problem.errors?.[field]?.[0];
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Fuer multipart/form-data (CSV-Upload). */
  formData?: FormData;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    // Noetig, damit das Refresh-Cookie mitgeht.
    credentials: 'include',
    body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    signal: options.signal,
  });

  if (response.status === 401) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw new ApiError(await readProblem(response));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readProblem(response: Response): Promise<ApiProblem> {
  try {
    const body = (await response.json()) as Partial<ApiProblem>;
    return {
      type: body.type ?? 'about:blank',
      title: body.title ?? response.statusText,
      status: body.status ?? response.status,
      detail: body.detail,
      errors: body.errors,
      correlationId: body.correlationId ?? response.headers.get('x-correlation-id') ?? undefined,
    };
  } catch {
    return { type: 'about:blank', title: response.statusText, status: response.status };
  }
}

export function toQueryString(query: object = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', formData }),
  list: <T>(path: string, query?: PageQuery) => request<Page<T>>(`${path}${toQueryString(query)}`),
};
