import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ThemeMode, ThemeContextType, THEME_OPTIONS } from '../types/theme';
import { apiRequest } from '../services/api';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_THEMES = new Set<ThemeMode>(THEME_OPTIONS.map((t) => t.id));

function normalizeTheme(value: unknown): ThemeMode {
  if (typeof value === 'string' && VALID_THEMES.has(value as ThemeMode)) {
    return value as ThemeMode;
  }
  return 'dark';
}

function applyThemeToDom(mode: ThemeMode) {
  const meta = THEME_OPTIONS.find((t) => t.id === mode) || THEME_OPTIONS[0];
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  if (meta.isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  try {
    localStorage.setItem('codeprep_theme', mode);
  } catch {
    // Ignore storage errors
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return normalizeTheme(localStorage.getItem('codeprep_theme'));
  });
  const manualSwitchAtRef = useRef<number>(0);

  const themeMeta = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  const resolvedTheme: 'dark' | 'light' = themeMeta.isDark ? 'dark' : 'light';

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  // Listen for DB preference sync events emitted when user signs in or loads profile
  useEffect(() => {
    const handleSync = (event: Event) => {
      // Never override an explicit manual theme switch performed recently in this session
      if (Date.now() - manualSwitchAtRef.current < 10_000) {
        return;
      }
      const custom = event as CustomEvent<string>;
      const nextTheme = normalizeTheme(custom.detail);
      applyThemeToDom(nextTheme);
      setThemeState(nextTheme);
    };
    window.addEventListener('codeprep-theme-sync', handleSync);
    return () => window.removeEventListener('codeprep-theme-sync', handleSync);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    const valid = normalizeTheme(mode);
    manualSwitchAtRef.current = Date.now();
    applyThemeToDom(valid);
    setThemeState(valid);

    // Persist selected theme directly to SQLite User profile when signed in
    let hasSession = false;
    try {
      hasSession =
        Boolean(localStorage.getItem('codeprep_access_token')) ||
        sessionStorage.getItem('codeprep_authenticated') === '1';
    } catch {
      hasSession = false;
    }

    if (hasSession) {
      apiRequest<{ user?: { id: string } }>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ themePreference: valid }),
        skipAuthRefresh: true,
      })
        .then((res) => {
          if (res?.user) {
            window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: res.user }));
          }
        })
        .catch(() => {
          // Offline / transient network errors stay locally cached in localStorage
        });
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const idx = THEME_OPTIONS.findIndex((t) => t.id === theme);
    const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length];
    setTheme(next.id);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, themeMeta, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
