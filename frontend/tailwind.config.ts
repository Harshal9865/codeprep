import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          high: 'var(--bg-surface-high)',
          subtle: 'var(--bg-surface-subtle)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          default: 'var(--border-default)',
          DEFAULT: 'var(--border-default)',
          active: 'var(--border-active)',
          hover: 'var(--border-hover)',
          strong: 'var(--border-hover)',
        },
        info: '#38bdf8',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          subtle: 'var(--color-primary-subtle)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          subtle: 'var(--color-success-subtle)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          subtle: 'var(--color-warning-subtle)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          subtle: 'var(--color-danger-subtle)',
        },
        dark: {
          bg: 'var(--bg-canvas)',
          surface: 'var(--bg-surface)',
          border: 'var(--border-default)',
          borderLight: 'var(--border-subtle)',
          textPrimary: 'var(--text-primary)',
          textSecondary: 'var(--text-secondary)',
          textTertiary: 'var(--text-muted)',
        },
        accent: {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-primary-hover)',
        },
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      borderColor: {
        DEFAULT: 'var(--border-default)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        luminous: '0 0 24px -4px rgba(37, 115, 230, 0.35)',
        monolith: '0 25px 50px -12px rgba(15, 23, 42, 0.45)',
      },
    },
  },
  plugins: [],
} satisfies Config;

