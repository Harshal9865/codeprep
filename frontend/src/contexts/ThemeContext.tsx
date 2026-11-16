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

function readStoredTheme(): ThemeMode | null {
  try {
    const raw = localStorage.getItem('codeprep_theme');
    if (typeof raw === 'string' && VALID_THEMES.has(raw as ThemeMode)) {
      return raw as ThemeMode;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
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
    return readStoredTheme() || 'dark';
  });
  const themeRef = useRef<ThemeMode>(theme);
  themeRef.current = theme;

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

    void apiRequest('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ themePreference: valid }),
    }).catch(() => {
      // Offline / transient network errors stay safely persisted in localStorage
    });
  }, []);

  // Only push local theme up to server on session load; never overwrite user's chosen local theme
  useEffect(() => {
    const handleSync = (event: Event) => {
      const custom = event as CustomEvent<string | { theme?: string }>;
      const rawDetail = custom.detail;
      const incomingRaw = typeof rawDetail === 'string' ? rawDetail : rawDetail?.theme;
      const serverTheme = normalizeTheme(incomingRaw);
      const localTheme = readStoredTheme();

      if (localTheme) {
        if (localTheme !== serverTheme) {
          persistThemePreference(localTheme);
        }
        if (themeRef.current !== localTheme) {
          applyThemeToDom(localTheme);
          setThemeState(localTheme);
        }
        return;
      }

      // First-time browser with no stored preference adopts server theme once
      applyThemeToDom(serverTheme);
      setThemeState(serverTheme);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'codeprep_theme' && e.newValue && VALID_THEMES.has(e.newValue as ThemeMode)) {
        const next = e.newValue as ThemeMode;
        if (next !== themeRef.current) {
          applyThemeToDom(next);
          setThemeState(next);
        }
      }
    };

    window.addEventListener('codeprep-theme-sync', handleSync);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('codeprep-theme-sync', handleSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [persistThemePreference]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      const valid = normalizeTheme(mode);
      applyThemeToDom(valid);
      setThemeState(valid);
      persistThemePreference(valid);
    },
    [persistThemePreference]
  );

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
