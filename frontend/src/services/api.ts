const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || '/api';

interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

let activeRefreshPromise: Promise<boolean> | null = null;

async function refreshSessionSingleFlight(): Promise<boolean> {
  if (!activeRefreshPromise) {
    activeRefreshPromise = (async () => {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!refreshRes.ok) {
          try {
            localStorage.removeItem('codeprep_access_token');
          } catch {}
          window.dispatchEvent(new CustomEvent('codeprep:auth:logout'));
          return false;
        }

        try {
          const payload = (await refreshRes.json()) as { accessToken?: string };
          if (payload?.accessToken) {
            localStorage.setItem('codeprep_access_token', payload.accessToken);
          }
        } catch {
          // Cookie-only refresh is still valid
        }

        return true;
      } catch {
        try {
          localStorage.removeItem('codeprep_access_token');
        } catch {}
        window.dispatchEvent(new CustomEvent('codeprep:auth:logout'));
        return false;
      } finally {
        activeRefreshPromise = null;
      }
    })();
  }
  return activeRefreshPromise;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Dual auth fallback: attach token from localStorage if present
  try {
    const localToken = localStorage.getItem('codeprep_access_token');
    if (localToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${localToken}`);
    }
  } catch {
    // LocalStorage unavailable
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes httpOnly cookies
  });

  // Handle Token Refresh on 401 (single-flight + localStorage token sync)
  if (
    response.status === 401 &&
    !options.skipAuthRefresh &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/quick-login') &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/status') &&
    !endpoint.includes('/auth/register')
  ) {
    const refreshed = await refreshSessionSingleFlight();
    if (refreshed) {
      return apiRequest<T>(endpoint, { ...options, skipAuthRefresh: true });
    }
  }

  let data: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = (data as { error?: string })?.error;
    if (!errorMessage && typeof data === 'string' && data.trim().length > 0 && !data.includes('<html') && !data.includes('<!DOCTYPE')) {
      errorMessage = data.trim();
    }
    if (!errorMessage) {
      if (response.status === 500 || response.status === 503) {
        errorMessage = 'Backend server is not running on port 5000. Please launch it using run.bat.';
      } else {
        errorMessage = `Request failed with status ${response.status}`;
      }
    }
    throw new ApiError(errorMessage, response.status, data);
  }

  const method = (options.method || 'GET').toUpperCase();
  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    (endpoint.includes('/submissions/submit') ||
      endpoint.includes('/problems/') ||
      endpoint.includes('/study/timer/unlock') ||
      endpoint.includes('/user/profile'))
  ) {
    window.dispatchEvent(new CustomEvent('codeprep:backup-dirty'));
  }

  return data as T;
}

