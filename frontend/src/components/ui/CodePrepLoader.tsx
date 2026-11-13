import React from 'react';
import { Code2 } from 'lucide-react';

interface CodePrepLoaderProps {
  variant?: 'fullscreen' | 'section' | 'inline';
  label?: string;
  sublabel?: string;
  className?: string;
  tone?: 'default' | 'contrast';
}

export const CodePrepLoader: React.FC<CodePrepLoaderProps> = ({
  variant = 'section',
  label = 'Loading Workspace',
  sublabel = 'Syncing modules & local database...',
  className = '',
  tone = 'default',
}) => {
  if (variant === 'inline') {
    const isContrast = tone === 'contrast';
    return (
      <div
        className={`inline-flex items-center gap-2 text-xs ${
          isContrast ? 'text-black' : 'text-text-secondary'
        } ${className}`}
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span
            className={`animate-loader-spin absolute inset-0 rounded-full border-2 ${
              isContrast ? 'border-black/25 border-t-black' : 'border-primary/25 border-t-primary'
            }`}
          />
          <span className={`h-1.5 w-1.5 rounded-full ${isContrast ? 'bg-black' : 'bg-primary'}`} />
        </span>
        <span className="font-semibold tracking-tight">{label}</span>
      </div>
    );
  }

  const containerClass =
    variant === 'fullscreen'
      ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas px-4 animate-page-enter'
      : 'flex min-h-[280px] w-full flex-col items-center justify-center rounded-xl bg-surface/60 px-6 py-12 animate-page-enter';

  return (
    <div className={`${containerClass} ${className}`} role="status" aria-live="polite">
      <div className="relative flex flex-col items-center">
        {/* Soft ambient radial halo matching theme accent (no white edge) */}
        <div
          className="pointer-events-none absolute -top-6 h-32 w-32 rounded-full blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, var(--border-active) 0%, transparent 70%)' }}
        />

        {/* Rotating Orbit Ring + Center Pixel-Bracket Emblem */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="animate-loader-spin absolute inset-0 rounded-2xl border-2 border-border-subtle border-t-primary border-r-emerald-500/70" />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface-elevated shadow-sm">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Equalizer Syntax Bars */}
        <div className="mt-5 flex items-end gap-1.5 h-4" aria-hidden="true">
          <span
            className="animate-loader-bar w-1 h-full rounded-full bg-primary"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="animate-loader-bar w-1 h-full rounded-full bg-emerald-400"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="animate-loader-bar w-1 h-full rounded-full bg-primary/80"
            style={{ animationDelay: '300ms' }}
          />
          <span
            className="animate-loader-bar w-1 h-full rounded-full bg-amber-400"
            style={{ animationDelay: '450ms' }}
          />
          <span
            className="animate-loader-bar w-1 h-full rounded-full bg-emerald-500/80"
            style={{ animationDelay: '600ms' }}
          />
        </div>

        {/* Status Copy */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-sm font-semibold tracking-tight text-text-primary">{label}</p>
          {sublabel && (
            <p className="text-[11px] font-mono text-text-muted tracking-wide">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
};
