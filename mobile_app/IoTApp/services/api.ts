import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { SecureStore } from './secure_store';

export type ApiError = {
  status: number;
  error: string;
  message: string;
  details?: unknown;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
};

const TOKEN_KEYS = {
  access: 'auth.access_token',
  refresh: 'auth.refresh_token',
  user_id: 'auth.user_id',
  display_name: 'auth.display_name',
  email: 'auth.email',
};

export function storeTokens(t: AuthTokens) {
  SecureStore.set(TOKEN_KEYS.access, t.access_token);
  SecureStore.set(TOKEN_KEYS.refresh, t.refresh_token);
}

export function clearTokens() {
  SecureStore.delete(TOKEN_KEYS.access);
  SecureStore.delete(TOKEN_KEYS.refresh);
  SecureStore.delete(TOKEN_KEYS.user_id);
  SecureStore.delete(TOKEN_KEYS.display_name);
  SecureStore.delete(TOKEN_KEYS.email);
}

export function getAccessToken() {
  return SecureStore.get(TOKEN_KEYS.access);
}

export function getRefreshToken() {
  return SecureStore.get(TOKEN_KEYS.refresh);
}

export function storeUser(user: { user_id: string; email: string; display_name: string }) {
  SecureStore.set(TOKEN_KEYS.user_id, user.user_id);
  SecureStore.set(TOKEN_KEYS.email, user.email);
  SecureStore.set(TOKEN_KEYS.display_name, user.display_name);
}

export function getStoredUser() {
  const user_id = SecureStore.get(TOKEN_KEYS.user_id);
  if (!user_id) return null;
  return {
    user_id,
    email: SecureStore.get(TOKEN_KEYS.email) ?? '',
    display_name: SecureStore.get(TOKEN_KEYS.display_name) ?? '',
  };
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// Follow 3xx redirects manually so the HTTP method is preserved.
// Default `fetch` behaviour silently rewrites POST → GET on 301/302/303 per
// WHATWG spec, which makes the redirected request hit endpoints that only
// accept POST (e.g. nginx-added trailing slash) and reply with 405.
async function fetchFollowingRedirects(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  maxRedirects = 5,
): Promise<Response> {
  let currentUrl = input;
  let currentInit: RequestInit = { ...init, redirect: 'manual' };
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetchWithTimeout(currentUrl, currentInit, timeoutMs);
    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect) return res;
    const location = res.headers.get('location');
    if (!location) return res;
    const next = new URL(location, currentUrl).toString();
    if (__DEV__) {
      console.warn(
        `[api] ${currentInit.method ?? 'GET'} ${currentUrl} -> ${res.status} ${next} (re-issuing with same method)`,
      );
    }
    currentUrl = next;
  }
  throw {
    status: 0,
    error: 'TOO_MANY_REDIRECTS',
    message: `Exceeded ${maxRedirects} redirects starting at ${input}`,
  };
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined | null>;
  // Disable refresh-on-401 retry (used by the refresh call itself).
  noRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = getRefreshToken();
  if (!refresh) return false;
  refreshInFlight = (async () => {
    try {
      const res = await api<AuthTokens>('/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refresh },
        noRefresh: true,
      });
      storeTokens(res);
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, query, noRefresh = false } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = buildUrl(path, query);
  const requestBody = body !== undefined ? JSON.stringify(body) : undefined;

  if (__DEV__) {
    console.log(`[api] -> ${method} ${url}`);
  }

  const res = await fetchFollowingRedirects(
    url,
    { method, headers, body: requestBody },
    REQUEST_TIMEOUT_MS,
  );

  if (res.status === 401 && auth && !noRefresh) {
    const ok = await refreshAccessToken();
    if (ok) {
      return api<T>(path, { ...opts, noRefresh: true });
    }
  }

  if (res.status === 204) return undefined as T;

  let payload: any = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      error: payload?.error ?? `HTTP_${res.status}`,
      message: payload?.message ?? `Request failed (${res.status})`,
      details: payload?.details,
    };
    throw err;
  }
  return payload as T;
}
