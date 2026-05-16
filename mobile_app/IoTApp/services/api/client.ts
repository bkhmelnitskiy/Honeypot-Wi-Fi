import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../auth/storage';
import type { ApiErrorBody, AuthTokens } from './types';

export const API_BASE_URL = 'http://209.250.226.32/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: { field: string; reason: string }[];

  constructor(status: number, code: string, message: string, details?: ApiErrorBody['details']) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = await getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as AuthTokens;
      await setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

type FetchOpts = RequestInit & { skipAuth?: boolean; retryOn401?: boolean };

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { skipAuth, retryOn401 = true, headers: extraHeaders, ...rest } = opts;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const access = await getAccessToken();
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers });

  if (res.status === 401 && !skipAuth && retryOn401) {
    const ok = await refreshAccessToken();
    if (ok) {
      return apiFetch<T>(path, { ...opts, retryOn401: false });
    }
    await clearTokens();
    onUnauthorized?.();
    throw new ApiError(401, 'UNAUTHORIZED', 'Sesja wygasła, zaloguj się ponownie.');
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '0');
    throw new ApiError(429, 'RATE_LIMITED', `Za dużo prób, spróbuj ponownie za ${retryAfter}s.`);
  }

  if (!res.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = await res.json();
    } catch {
      // serwer nie zwrócił JSON-a
    }
    throw new ApiError(
      res.status,
      body.error ?? 'UNKNOWN',
      body.message ?? res.statusText,
      body.details,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
