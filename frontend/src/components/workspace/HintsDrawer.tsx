import React, { useEffect, useState } from 'react';
import {
  X,
  Lightbulb,
  HelpCircle,
  Compass,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ScanSearch,
  Send,
  Gauge,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface AnalysisMistake {
  line?: number;
  title: string;
  detail: string;
  fixHint: string;
}

export interface MethodAnalysisData {
  detectedMethod: string;
  estimatedComplexity: string;
  targetComplexity: string;
  mistakes: AnalysisMistake[];
  guidanceSteps: string[];
  summary: string;
}

export interface HintsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guidanceMessage: string;
  isLoading: boolean;
  onRequestHint: (hintLevel: number) => void;
  onAnalyzeMethod?: (question?: string) => void;
  analysis?: MethodAnalysisData | null;
  provider?: 'gemini' | 'local';
  isSolved: boolean;
  category?: 'DSA' | 'SQL';
}

export const HintsDrawer: React.FC<HintsDrawerProps> = ({
  isOpen,
  onClose,
  guidanceMessage,
  isLoading,
  onRequestHint,
  onAnalyzeMethod,
  analysis,
  provider,
  isSolved,
  category = 'DSA',
}) => {
  const [question, setQuestion] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAnalyzeMethod || isLoading) return;
    const trimmed = question.trim();
    onAnalyzeMethod(trimmed || undefined);
    setQuestion('');
  };

  const quickPrompts =
    category === 'SQL'
      ? ['Find query bugs', 'Why wrong rows?', 'Optimize joins']
      : ['Find my bugs', 'Check complexity', 'Optimize approach'];

  return (
    <aside
      aria-label="AI Code Coach and Diagnostics"
      className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 bg-surface border-l border-border-subtle shadow-2xl flex flex-col animate-slide-in-right"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border-subtle bg-surface-elevated flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-subtle border border-primary/25 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-text-primary tracking-wide uppercase font-mono truncate">
                AI Code Coach
              </h3>
              {provider && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    provider === 'gemini'
                      ? 'bg-primary-subtle text-primary border-primary/30'
                      : 'bg-surface-high text-text-muted border-border-subtle'
                  }`}
                >
                  {provider === 'gemini' ? 'Gemini AI' : 'Local Analyzer'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted truncate">
              Method analyzer, mistake finder &amp; step guidance
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI Coach drawer"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Method Analysis Trigger */}
      {onAnalyzeMethod && (
        <div className="p-3.5 border-b border-border-subtle bg-surface-subtle/70 space-y-2.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAnalyzeMethod()}
            isLoading={isLoading}
            className="w-full justify-center text-xs font-semibold"
            icon={<ScanSearch className="w-3.5 h-3.5" />}
          >
            {category === 'SQL' ? 'Analyze My Query & Find Mistakes' : 'Analyze My Method & Find Mistakes'}
          </Button>

          <form onSubmit={handleAskSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                category === 'SQL'
                  ? 'Ask about joins, grouping, or wrong output...'
                  : 'Ask: "Why TLE?" or "Is my DP state right?"'
              }
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-canvas border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Ask AI Coach"
              className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-primary disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isLoading}
                onClick={() => onAnalyzeMethod(chip)}
                className="px-2 py-0.5 rounded-md bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic / Analysis Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isSolved && (
          <div className="p-3 rounded-xl bg-success-subtle border border-success/30 flex items-start gap-2.5 text-xs text-success">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Accepted Solution Recorded</p>
              <p className="text-text-secondary mt-0.5">
                Analyze complexity trade-offs above or compare with the Reference Solution.
              </p>
            </div>
          </div>
        )}

        {/* Structured Method Analysis Card */}
        {!isLoading && analysis && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                <Gauge className="w-3.5 h-3.5" />
                <span>Detected Method &amp; Complexity</span>
              </div>
              <p className="text-xs font-semibold text-text-primary">{analysis.detectedMethod}</p>
              <div className="grid grid-cols-1 gap-1 pt-1 text-[11px] font-mono">
                <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-canvas/70 border border-border-subtle">
                  <span className="text-text-muted">Yours:</span>
                  <span className="text-text-primary truncate">{analysis.estimatedComplexity}</span>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-canvas/70 border border-border-subtle">
                  <span className="text-text-muted">Target:</span>
                  <span className="text-success truncate">{analysis.targetComplexity}</span>
                </div>
              </div>
            </div>

            {analysis.mistakes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-warning font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Detected Mistakes ({analysis.mistakes.length})</span>
                </div>
                {analysis.mistakes.map((mistake, idx) => (
                  <div
                    key={`${mistake.title}-${idx}`}
                    className="p-3 rounded-xl bg-warning-subtle/40 border border-warning/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-text-primary">{mistake.title}</span>
                      {typeof mistake.line === 'number' && (
                        <span className="px-1.5 py-0.5 rounded bg-canvas border border-warning/40 text-[10px] font-mono text-warning shrink-0">
                          Line {mistake.line}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{mistake.detail}</p>
                    <p className="text-[11px] text-primary font-medium leading-relaxed">
                      Fix: {mistake.fixHint}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coach Guidance Message */}
        <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted uppercase tracking-wider">
            <span>Coach Feedback</span>
            {isLoading && <span className="text-primary animate-pulse">Analyzing your code...</span>}
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
              Click{' '}
              <span className="font-semibold text-text-primary">
                {category === 'SQL' ? 'Analyze My Query & Find Mistakes' : 'Analyze My Method & Find Mistakes'}
              </span>{' '}
              to inspect your current code line by line, spot logic or complexity issues, and get targeted next-step guidance.
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
