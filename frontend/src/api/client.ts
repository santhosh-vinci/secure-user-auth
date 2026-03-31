// In production set VITE_API_URL=https://api.yourdomain.com
// In dev the Vite proxy forwards /api → localhost:4000
const BASE_URL = (import.meta.env.VITE_API_URL ?? '') + '/api';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const method = (options.method ?? 'GET').toUpperCase();
  const isStateMutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (isStateMutating) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include', // always send cookies
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { error: json.error ?? 'An unexpected error occurred.', details: json.details };
    }

    return { data: json };
  } catch {
    return { error: 'Network error. Please check your connection.' };
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: string;
}

export const authApi = {
  signup: (email: string, password: string) =>
    request<{ message: string; details?: Record<string, string[]> }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ message: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User }>('/auth/me'),

  verifyEmail: (token: string) =>
    request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};
