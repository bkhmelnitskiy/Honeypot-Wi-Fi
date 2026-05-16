import { apiFetch } from './client';
import type { LoginResponse, UserProfile } from './types';

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, display_name: string) {
  return apiFetch<{ user_id: string; email: string; display_name: string; created_at: string }>(
    '/auth/register',
    {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email, password, display_name }),
    },
  );
}

export function logout(refresh_token: string) {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  });
}

export function getMe() {
  return apiFetch<UserProfile>('/users/me');
}

export function updateMe(payload: {
  display_name?: string;
  current_password?: string;
  new_password?: string;
}) {
  return apiFetch<UserProfile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteMe(password: string) {
  return apiFetch<void>('/users/me', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}
