import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type User } from '../api/client';

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{ error?: string; details?: Record<string, string[]>; message?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  // Restore session on mount
  useEffect(() => {
    authApi.me()
      .then((res) => setState({ user: res.data?.user ?? null, loading: false }))
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res.error) return { error: res.error };
    setState({ user: res.data?.user ?? null, loading: false });
    return {};
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, loading: false });
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const res = await authApi.signup(email, password);
    if (res.error) return { error: res.error, details: res.details };
    return { message: res.data?.message };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
