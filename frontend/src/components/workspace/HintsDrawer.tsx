import React, { useEffect } from 'react';
import {
  X,
  Lightbulb,
  HelpCircle,
  Compass,
  CheckCircle2,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface HintsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guidanceMessage: string;
  isLoading: boolean;
  onRequestHint: (hintLevel: number) => void;
  isSolved: boolean;
}

export const HintsDrawer: React.FC<HintsDrawerProps> = ({
  isOpen,
  onClose,
  guidanceMessage,
  isLoading,
  onRequestHint,
  isSolved,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Hints and Diagnostics"
      className="fixed inset-y-0 right-0 w-full sm:w-[380px] z-50 bg-surface border-l border-border-subtle shadow-2xl flex flex-col animate-slide-in-right"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border-subtle bg-surface-elevated flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary-subtle border border-primary/25 flex items-center justify-center text-primary shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-text-primary tracking-wide uppercase font-mono truncate">
              Hints &amp; Diagnostics
            </h3>
            <p className="text-[11px] text-text-muted truncate">
              Step-by-step pattern notes &amp; test checks
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close hints drawer"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Diagnostic / Hint Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isSolved && (
          <div className="p-3 rounded-xl bg-success-subtle border border-success/30 flex items-start gap-2.5 text-xs text-success">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Accepted Solution Recorded</p>
              <p className="text-text-secondary mt-0.5">
                Inspect complexity trade-offs below or compare with the Reference Solution.
              </p>
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted uppercase tracking-wider">
            <span>Workspace Note</span>
            {isLoading && <span className="text-primary animate-pulse">Analyzing...</span>}
          </div>

          {isLoading ? (
            <div className="space-y-2 py-2">
              <div className="h-3 rounded bg-surface-high animate-pulse w-5/6" />
              <div className="h-3 rounded bg-surface-high animate-pulse w-4/6" />
              <div className="h-3 rounded bg-surface-high animate-pulse w-3/4" />
            </div>
          ) : guidanceMessage ? (
            <div className="text-xs sm:text-[13px] text-text-primary leading-relaxed whitespace-pre-line font-body">
              {guidanceMessage}
            </div>
          ) : (
            <div className="text-xs text-text-secondary leading-relaxed">
              Run your code to see compiler diagnostics and failing edge-case notes automatically,
              or choose a progressive hint level below without revealing solution code.
            </div>
          )}
        </div>

        {isSolved && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRequestHint(3)}
            isLoading={isLoading}
            className="w-full justify-start text-xs"
            icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
          >
            Review Optimization Checklist
          </Button>
        )}
      </div>

      {/* Footer: Progressive Hint Triggers */}
      {!isSolved && (
        <div className="p-4 border-t border-border-subtle bg-surface-subtle space-y-2.5 shrink-0">
          <p className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Progressive Hints (No Spoilers)
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRequestHint(1)}
              isLoading={isLoading}
              className="justify-start text-xs"
              icon={<Lightbulb className="w-3.5 h-3.5 text-primary" />}
            >
              1. Pattern Nudge
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRequestHint(2)}
              isLoading={isLoading}
              className="justify-start text-xs"
              icon={<HelpCircle className="w-3.5 h-3.5 text-sky-400" />}
            >
              2. Key Observation
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRequestHint(3)}
              isLoading={isLoading}
              className="justify-start text-xs"
              icon={<Compass className="w-3.5 h-3.5 text-success" />}
            >
              3. Strategy Overview
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
};

