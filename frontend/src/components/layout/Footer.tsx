import React from 'react';
import { Code2 } from 'lucide-react';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const go = (tab: string) => {
    onNavigate?.(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-border-subtle bg-surface/95 mt-auto select-none">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        {/* Left: Brand & Concise Context */}
        <div className="flex flex-wrap items-center gap-2.5 text-text-muted">
          <button
            type="button"
            onClick={() => go('dashboard')}
            className="inline-flex items-center gap-1.5 text-text-primary font-semibold hover:text-primary transition-colors cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-primary" />
            <span>CodePrep</span>
          </button>
          <span className="text-border-default">•</span>
          <span className="text-text-secondary">
            C++17, SQL &amp; OOP Practice Workbench
          </span>
          <span className="hidden sm:inline text-border-default">•</span>
          <span className="text-text-muted">Harshal Patel</span>
        </div>

        {/* Center/Right: Compact Link Groups & Shortcuts */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <nav
            aria-label="Practice links"
            className="flex flex-wrap items-center gap-4 text-text-muted"
          >
            <button
              type="button"
              onClick={() => go('dsa')}
              className="hover:text-text-primary transition-colors font-medium"
            >
              Problems
            </button>
            <button
              type="button"
              onClick={() => go('sql')}
              className="hover:text-text-primary transition-colors font-medium"
            >
              SQL Lab
            </button>
            <button
              type="button"
              onClick={() => go('oops')}
              className="hover:text-text-primary transition-colors font-medium"
            >
              OOPs
            </button>
            <button
              type="button"
              onClick={() => go('mock-interview')}
              className="hover:text-text-primary transition-colors font-medium"
            >
              Mock Interview
            </button>
            <button
              type="button"
              onClick={() => go('aptitude')}
              className="hover:text-text-primary transition-colors font-medium"
            >
              Aptitude
            </button>
            <button
              type="button"
              onClick={() => go('about')}
              className="hover:text-text-primary transition-colors font-medium"
            >
              About
            </button>
          </nav>

          <div className="flex items-center gap-3 pl-0 sm:pl-4 sm:border-l border-border-subtle text-[11px] font-mono text-text-muted">
            <span className="hidden md:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated border border-border-subtle text-[10px] text-text-secondary">
                Ctrl+K
              </kbd>
              <span>Palette</span>
            </span>
            <a
              href="/health"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-text-primary transition-colors"
              title="Check backend health endpoint"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
              <span>API Status</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
