export type ThemeMode = 'dark' | 'light' | 'leetcode' | 'vscode' | 'tokyo' | 'monokai';

export interface ThemeMeta {
  id: ThemeMode;
  label: string;
  subtitle: string;
  isDark: boolean;
  swatches: [string, string, string]; // canvas, surface, primary accent
}

export const THEME_OPTIONS: ThemeMeta[] = [
  {
    id: 'dark',
    label: 'Pitch Black',
    subtitle: 'OLED pure black contrast',
    isDark: true,
    swatches: ['#020202', '#09090b', '#ffa116'],
  },
  {
    id: 'light',
    label: 'Daylight',
    subtitle: 'Clean high-contrast light',
    isDark: false,
    swatches: ['#f1f5f9', '#ffffff', '#ea580c'],
  },
  {
    id: 'leetcode',
    label: 'LeetCode Classic',
    subtitle: 'Signature dark slate & amber',
    isDark: true,
    swatches: ['#1a1a1a', '#282828', '#ffa116'],
  },
  {
    id: 'vscode',
    label: 'VS Code Dark+',
    subtitle: 'IDE charcoal & azure blue',
    isDark: true,
    swatches: ['#1e1e1e', '#252526', '#3794ff'],
  },
  {
    id: 'tokyo',
    label: 'Tokyo Night',
    subtitle: 'Midnight ink & indigo',
    isDark: true,
    swatches: ['#16161e', '#1a1b26', '#7aa2f7'],
  },
  {
    id: 'monokai',
    label: 'Monokai Carbon',
    subtitle: 'Obsidian carbon & gold',
    isDark: true,
    swatches: ['#19181a', '#221f22', '#ffd866'],
  },
];

export interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  themeMeta: ThemeMeta;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}
