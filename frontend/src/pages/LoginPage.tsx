import React from 'react';
import { Code2 } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-dvh w-full overflow-x-hidden flex flex-col bg-canvas text-text-primary select-none transition-colors">
      {/* Compact Header with Theme Switcher */}
      <header className="h-12 shrink-0 px-4 sm:px-6 border-b border-border-subtle bg-surface flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary-subtle flex items-center justify-center text-primary">
            <Code2 className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-bold text-base tracking-tight text-text-primary">
            CodePrep
          </span>
        </div>

        <ThemeToggle compact />
      </header>

      {/* Main Centered Container (Fits single screen cleanly; allows safe scroll only on ultra-short viewports) */}
      <main className="relative flex-1 min-h-0 flex items-center justify-center px-4 py-3 sm:py-4">
        {/* Subtle Ambient Grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative z-10 w-full flex items-center justify-center animate-fade-up">
          <LoginForm />
        </div>
      </main>

      {/* Minimal Status Footer */}
      <footer className="h-9 shrink-0 px-4 border-t border-border-subtle bg-surface flex items-center justify-center gap-3 text-xs font-mono text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          <span>Server Connected</span>
        </span>
        <span className="text-border-default">•</span>
        <span>C++17 &amp; SQLite Judge</span>
      </footer>
    </div>
  );
};
