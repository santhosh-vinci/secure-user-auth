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

  // Restore session on mount — cancelled flag prevents setState after unmount
  useEffect(() => {
    let cancelled = false;
    authApi.me()
      .then((res) => { if (!cancelled) setState({ user: res.data?.user ?? null, loading: false }); })
      .catch(() => { if (!cancelled) setState({ user: null, loading: false }); });
    return () => { cancelled = true; };
  }, []);

  // Sync logout across browser tabs
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'logout_broadcast') {
        setState({ user: null, loading: false });
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res.error) return { error: res.error };
    setState({ user: res.data?.user ?? null, loading: false });
    return {};
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    localStorage.setItem('logout_broadcast', Date.now().toString());
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
