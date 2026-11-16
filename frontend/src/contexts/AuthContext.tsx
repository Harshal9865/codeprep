import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthContextType } from '../types/auth';
import { apiRequest } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function postAuthSyncMessage(type: 'LOGIN' | 'LOGOUT'): void {
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('codeprep_auth_sync');
    channel.postMessage({ type });
    channel.close();
  } catch {
    // Restricted WebViews or browsers without BroadcastChannel support
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<boolean>(false);
  const [userCount, setUserCount] = useState<number>(0);
  const [maxUsers, setMaxUsers] = useState<number>(100);
  const [remainingSlots, setRemainingSlots] = useState<number>(99);

  const applyUserSession = useCallback((nextUser: User | null, forceThemeSync = false) => {
    setUser(nextUser);
    try {
      sessionStorage.setItem('codeprep_authenticated', nextUser ? '1' : '0');
    } catch {
      // Ignore storage errors
    }
    if (nextUser?.themePreference) {
      window.dispatchEvent(
        new CustomEvent('codeprep-theme-sync', {
          detail: { theme: nextUser.themePreference, force: forceThemeSync },
        })
      );
    }
  }, []);

  const fetchAuthStatus = useCallback(async () => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 50000) : null;

    try {
      const statusRes = await apiRequest<{
        isRegistrationAllowed: boolean;
        userCount?: number;
        maxUsers?: number;
        remainingSlots?: number;
        authenticated?: boolean;
        user?: User | null;
        accessToken?: string;
      }>('/auth/status', controller ? { signal: controller.signal } : {});
      setIsRegistrationAllowed(statusRes.isRegistrationAllowed);
      if (typeof statusRes.userCount === 'number') setUserCount(statusRes.userCount);
      if (typeof statusRes.maxUsers === 'number') setMaxUsers(statusRes.maxUsers);
      if (typeof statusRes.remainingSlots === 'number') {
        setRemainingSlots(statusRes.remainingSlots);
      } else {
        setRemainingSlots(statusRes.isRegistrationAllowed ? 1 : 0);
      }

      if (statusRes.accessToken) {
        try {
          localStorage.setItem('codeprep_access_token', statusRes.accessToken);
        } catch {}
      }

      if (statusRes.user) {
        applyUserSession(statusRes.user);
        return;
      }

      try {
        localStorage.removeItem('codeprep_access_token');
      } catch {}
      applyUserSession(null);
    } catch {
      applyUserSession(null);
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [applyUserSession]);

  useEffect(() => {
    fetchAuthStatus();

    // Multi-tab logout synchronization via BroadcastChannel (guarded for mobile WebViews)
    let authChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        authChannel = new BroadcastChannel('codeprep_auth_sync');
        authChannel.onmessage = (event) => {
          if (event.data?.type === 'LOGOUT') {
            setUser(null);
          } else if (event.data?.type === 'LOGIN') {
            fetchAuthStatus();
          }
        };
      }
    } catch {
      authChannel = null;
    }

    const handleCustomLogout = () => {
      try {
        localStorage.removeItem('codeprep_access_token');
        sessionStorage.setItem('codeprep_authenticated', '0');
      } catch { }
      setUser(null);
    };
    const handleUserUpdated = (event: Event) => {
      const custom = event as CustomEvent<User>;
      if (custom.detail && custom.detail.id) {
        applyUserSession(custom.detail, false);
      }
    };

    window.addEventListener('codeprep:auth:logout', handleCustomLogout);
    window.addEventListener('codeprep:user-updated', handleUserUpdated);

    return () => {
      try {
        authChannel?.close();
      } catch {}
      window.removeEventListener('codeprep:auth:logout', handleCustomLogout);
      window.removeEventListener('codeprep:user-updated', handleUserUpdated);
    };
  }, [fetchAuthStatus, applyUserSession]);

  const login = async (email: string, password: string, rememberMe = true) => {
    const res = await apiRequest<{ user: User; accessToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
    if (res.accessToken) {
      try { localStorage.setItem('codeprep_access_token', res.accessToken); } catch { }
    }
    applyUserSession(res.user);
    postAuthSyncMessage('LOGIN');
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const res = await apiRequest<{ user: User; accessToken?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    if (res.accessToken) {
      try { localStorage.setItem('codeprep_access_token', res.accessToken); } catch { }
    }
    applyUserSession(res.user);
    await fetchAuthStatus();
    postAuthSyncMessage('LOGIN');
  };

  const quickLogin = async (email?: string) => {
    const res = await apiRequest<{ user: User; accessToken?: string }>('/auth/quick-login', {
      method: 'POST',
      body: JSON.stringify(email ? { email } : {}),
    });
    if (res.accessToken) {
      try { localStorage.setItem('codeprep_access_token', res.accessToken); } catch { }
    }
    applyUserSession(res.user);
    postAuthSyncMessage('LOGIN');
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with local client teardown regardless
    } finally {
      try {
        localStorage.removeItem('codeprep_access_token');
        sessionStorage.setItem('codeprep_authenticated', '0');
      } catch { }
      setUser(null);
      postAuthSyncMessage('LOGOUT');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isRegistrationAllowed,
        userCount,
        maxUsers,
        remainingSlots,
        login,
        register,
        quickLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

