import React from 'react';
import { Code2, GraduationCap } from 'lucide-react';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Explore' },
    { id: 'dsa', label: 'DSA 500' },
    { id: 'sql', label: 'SQL Lab' },
    { id: 'aptitude', label: 'Aptitude' },
    { id: 'prep', label: 'Interview Kit' },
    { id: 'about', label: 'About' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <footer className="border-t border-border-subtle bg-surface/90 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-text-muted">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-text-primary font-semibold">
            <Code2 className="w-4 h-4 text-primary" />
            CodePrep
          </span>
          <span className="text-border-default">•</span>
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <GraduationCap className="w-3.5 h-3.5 text-primary/90" />
            Built by <span className="text-text-primary font-medium">Harshal Patel</span>
          </span>
          <span className="hidden sm:inline text-border-default">|</span>
          <span className="text-text-muted">B.Tech ICT • Dhirubhai Ambani University</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-4" aria-label="Footer navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate?.(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-text-muted hover:text-text-primary transition-colors font-medium"
            >
              {item.label}
            </button>
          ))}
          <a
            href="/health"
            target="_blank"
            rel="noreferrer"
            className="text-text-muted hover:text-text-primary transition-colors font-mono text-[11px]"
          >
            /health
          </a>
        </nav>
      </div>
    </footer>
  );
};
