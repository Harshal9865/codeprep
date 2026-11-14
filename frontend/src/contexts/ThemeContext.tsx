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

  const persistThemePreference = useCallback((valid: ThemeMode) => {
    let hasSession = false;
    try {
      hasSession =
        Boolean(localStorage.getItem('codeprep_access_token')) ||
        sessionStorage.getItem('codeprep_authenticated') === '1';
    } catch {
      hasSession = false;
    }

    if (!hasSession) return;

    apiRequest<{ user?: { id: string } }>('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ themePreference: valid }),
    })
      .then((res) => {
        try {
          localStorage.removeItem('codeprep_theme_dirty');
        } catch {}
        if (res?.user) {
          window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: res.user }));
        }
      })
      .catch(() => {
        // Offline / transient network errors stay cached in localStorage
      });
  }, []);

  // Listen for DB preference sync events emitted on login or initial status check
  useEffect(() => {
    const handleSync = (event: Event) => {
      const custom = event as CustomEvent<string | { theme?: string; force?: boolean }>;
      const rawDetail = custom.detail;
      const incomingRaw = typeof rawDetail === 'string' ? rawDetail : rawDetail?.theme;
      const isForced = typeof rawDetail === 'object' && rawDetail !== null && Boolean(rawDetail.force);
      const nextTheme = normalizeTheme(incomingRaw);

      let localSavedRaw: string | null = null;
      let hasPendingLocalEdit = false;
      try {
        localSavedRaw = localStorage.getItem('codeprep_theme');
        hasPendingLocalEdit = localStorage.getItem('codeprep_theme_dirty') === '1';
      } catch {}

      const hasValidLocalTheme =
        typeof localSavedRaw === 'string' && VALID_THEMES.has(localSavedRaw as ThemeMode);

      // Never overwrite an explicit local theme choice on passive page refresh;
      // instead push the local choice back up to the user's profile if out of sync.
      if (!isForced && (Date.now() - manualSwitchAtRef.current < 10_000 || hasValidLocalTheme || hasPendingLocalEdit)) {
        const activeLocal = normalizeTheme(localSavedRaw);
        if (hasPendingLocalEdit || (hasValidLocalTheme && activeLocal !== nextTheme)) {
          persistThemePreference(activeLocal);
        }
        return;
      }

      try {
        localStorage.removeItem('codeprep_theme_dirty');
      } catch {}
      applyThemeToDom(nextTheme);
      setThemeState(nextTheme);
    };
    window.addEventListener('codeprep-theme-sync', handleSync);
    return () => window.removeEventListener('codeprep-theme-sync', handleSync);
  }, [persistThemePreference]);

  const setTheme = useCallback((mode: ThemeMode) => {
    const valid = normalizeTheme(mode);
    manualSwitchAtRef.current = Date.now();
    try {
      localStorage.setItem('codeprep_theme_dirty', '1');
    } catch {}
    applyThemeToDom(valid);
    setThemeState(valid);
    persistThemePreference(valid);
  }, [persistThemePreference]);

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
