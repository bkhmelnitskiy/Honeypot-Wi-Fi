import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { ApiError, setUnauthorizedHandler } from '../api/client';
import type { UserProfile } from '../api/types';
import { clearTokens, getAccessToken, getRefreshToken, setTokens, setUserId } from './storage';

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const access = await getAccessToken();
      if (access) {
        try {
          await refreshUser();
        } catch {
          await clearTokens();
        }
      }
      setLoading(false);
    })();
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await setTokens(res.access_token, res.refresh_token);
    await setUserId(res.user_id);
    await refreshUser();
  }, [refreshUser]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    await authApi.register(email, password, displayName);
    await signIn(email, password);
  }, [signIn]);

  const signOut = useCallback(async () => {
    const refresh = await getRefreshToken();
    if (refresh) {
      try { await authApi.logout(refresh); } catch { /* ignore network errors */ }
    }
    await clearTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut, refreshUser }),
    [user, loading, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
