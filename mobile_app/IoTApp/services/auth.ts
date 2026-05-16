import {
  api,
  type AuthTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  storeTokens,
  storeUser,
} from './api';

export type User = {
  user_id: string;
  email: string;
  display_name: string;
};

export type UserProfile = User & {
  created_at: string;
  total_scans: number;
  total_networks_scanned: number;
};

type LoginResponse = AuthTokens & User;

export async function login(email: string, password: string): Promise<User> {
  const res = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  storeTokens({
    access_token: res.access_token,
    refresh_token: res.refresh_token,
    expires_in: res.expires_in,
    refresh_expires_in: res.refresh_expires_in,
  });
  const user: User = { user_id: res.user_id, email, display_name: res.display_name };
  storeUser(user);
  return user;
}

export async function register(email: string, password: string, display_name: string): Promise<void> {
  await api('/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, display_name },
  });
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  try {
    if (refresh) {
      await api('/auth/logout', {
        method: 'POST',
        body: { refresh_token: refresh },
      });
    }
  } catch {
    // Best-effort: token is cleared locally regardless of server response.
  }
  clearTokens();
}

export async function getProfile(): Promise<UserProfile> {
  return api<UserProfile>('/users/me');
}

export async function updateProfile(patch: {
  display_name?: string;
  current_password?: string;
  new_password?: string;
}): Promise<User> {
  const res = await api<User & { updated_at: string }>('/users/me', {
    method: 'PATCH',
    body: patch,
  });
  const cached = getStoredUser();
  storeUser({
    user_id: res.user_id,
    email: res.email ?? cached?.email ?? '',
    display_name: res.display_name,
  });
  return res;
}

export async function deleteAccount(password: string): Promise<void> {
  await api('/users/me', { method: 'DELETE', body: { password } });
  clearTokens();
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function currentUser(): User | null {
  return getStoredUser();
}
