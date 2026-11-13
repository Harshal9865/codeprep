import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthContextType } from '../types/auth';
import { apiRequest } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<boolean>(false);

  const applyUserSession = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    try {
      sessionStorage.setItem('codeprep_authenticated', nextUser ? '1' : '0');
    } catch {
      // Ignore storage errors
    }
    if (nextUser?.themePreference) {
      window.dispatchEvent(
        new CustomEvent('codeprep-theme-sync', { detail: nextUser.themePreference })
      );
    }
  }, []);

  const fetchAuthStatus = useCallback(async () => {
    try {
      const statusRes = await apiRequest<{
        isRegistrationAllowed: boolean;
        authenticated?: boolean;
        user?: User | null;
      }>('/auth/status');
      setIsRegistrationAllowed(statusRes.isRegistrationAllowed);

      if (statusRes.user) {
        applyUserSession(statusRes.user);
        return;
      }

      let hasLocalToken = false;
      try {
        hasLocalToken = !!localStorage.getItem('codeprep_access_token');
      } catch {}

      if (hasLocalToken) {
        const meRes = await apiRequest<{ user: User }>('/auth/me');
        applyUserSession(meRes.user);
      } else {
        applyUserSession(null);
      }
    } catch {
      applyUserSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyUserSession]);

  useEffect(() => {
    fetchAuthStatus();

    // Multi-tab logout synchronization via BroadcastChannel
    const authChannel = new BroadcastChannel('codeprep_auth_sync');
    authChannel.onmessage = (event) => {
      if (event.data?.type === 'LOGOUT') {
        setUser(null);
      } else if (event.data?.type === 'LOGIN') {
        fetchAuthStatus();
      }
    };

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
        setUser(custom.detail);
      }
    };

    window.addEventListener('codeprep:auth:logout', handleCustomLogout);
    window.addEventListener('codeprep:user-updated', handleUserUpdated);

    return () => {
      authChannel.close();
      window.removeEventListener('codeprep:auth:logout', handleCustomLogout);
      window.removeEventListener('codeprep:user-updated', handleUserUpdated);
    };
  }, [fetchAuthStatus]);

  const login = async (email: string, password: string, rememberMe = true) => {
    const res = await apiRequest<{ user: User; accessToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
    if (res.accessToken) {
      try { localStorage.setItem('codeprep_access_token', res.accessToken); } catch { }
    }
    applyUserSession(res.user);

    const authChannel = new BroadcastChannel('codeprep_auth_sync');
    authChannel.postMessage({ type: 'LOGIN' });
    authChannel.close();
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
    setIsRegistrationAllowed(false);

    const authChannel = new BroadcastChannel('codeprep_auth_sync');
    authChannel.postMessage({ type: 'LOGIN' });
    authChannel.close();
  };

  const quickLogin = async () => {
    const res = await apiRequest<{ user: User; accessToken?: string }>('/auth/quick-login', {
      method: 'POST',
    });
    if (res.accessToken) {
      try { localStorage.setItem('codeprep_access_token', res.accessToken); } catch { }
    }
    applyUserSession(res.user);

    const authChannel = new BroadcastChannel('codeprep_auth_sync');
    authChannel.postMessage({ type: 'LOGIN' });
    authChannel.close();
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
      const authChannel = new BroadcastChannel('codeprep_auth_sync');
      authChannel.postMessage({ type: 'LOGOUT' });
      authChannel.close();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isRegistrationAllowed,
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

