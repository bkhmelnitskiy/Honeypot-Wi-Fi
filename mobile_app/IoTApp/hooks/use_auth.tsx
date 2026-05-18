import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  currentUser,
  isAuthenticated as checkAuthenticated,
  login as svcLogin,
  logout as svcLogout,
  register as svcRegister,
  type User,
} from '@/services/auth';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshUser = useCallback(() => {
    setUser(currentUser());
  }, []);

  useEffect(() => {
    setUser(currentUser());
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await svcLogin(email, password);
    setUser(u);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    await svcRegister(email, password, displayName);
  }, []);

  const logout = useCallback(async () => {
    await svcLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user || checkAuthenticated(),
      isReady,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isReady, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
