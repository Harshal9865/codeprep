import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Lightbulb,
  HelpCircle,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ScanSearch,
  Send,
  Gauge,
  RotateCcw,
  Cpu,
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
  spaceComplexity?: string;
  mistakes: AnalysisMistake[];
  guidanceSteps: string[];
  summary: string;
}

export interface CoachMessageItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface HintsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guidanceMessage: string;
  chatMessages?: CoachMessageItem[];
  onClearChat?: () => void;
  isLoading: boolean;
  onRequestHint: (hintLevel: number) => void;
  onAnalyzeMethod?: (question?: string) => void;
  onJumpToLine?: (line: number) => void;
  analysis?: MethodAnalysisData | null;
  provider?: 'gemini' | 'local';
  providerNote?: string;
  currentVerdict?: string;
  isSolved: boolean;
  category?: 'DSA' | 'SQL' | 'OOP';
}

export const HintsDrawer: React.FC<HintsDrawerProps> = ({
  isOpen,
  onClose,
  guidanceMessage,
  chatMessages,
  onClearChat,
  isLoading,
  onRequestHint,
  onAnalyzeMethod,
  onJumpToLine,
  analysis,
  provider,
  providerNote,
  currentVerdict,
  isSolved,
  category = 'DSA',
}) => {
  const [question, setQuestion] = useState('');
  const [showAllMistakes, setShowAllMistakes] = useState(true);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, chatMessages?.length, guidanceMessage, isLoading]);

  if (!isOpen) return null;

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAnalyzeMethod || isLoading) return;
    const trimmed = question.trim();
    if (!trimmed) return;
    onAnalyzeMethod(trimmed);
    setQuestion('');
  };

  const quickPrompts =
    category === 'SQL'
      ? ['Find query bugs', 'Why wrong rows?', 'Optimize query']
      : category === 'OOP'
      ? ['Check class invariants', 'Memory & virtuals', 'Optimize design']
      : ['Find my bugs', 'Trace failing test', 'Optimize complexity'];

  const displayedMessages: CoachMessageItem[] =
    chatMessages && chatMessages.length > 0
      ? chatMessages
      : guidanceMessage
        ? [{ role: 'assistant', content: guidanceMessage }]
        : [];

  return (
    <aside
      aria-label="AI Code Coach"
      className="fixed inset-y-0 right-0 w-full sm:w-[440px] z-50 bg-surface border-l border-border-subtle shadow-2xl flex flex-col animate-slide-in-right"
    >
      {/* Top Bar */}
      <div className="px-4 py-3 border-b border-border-subtle bg-surface-elevated flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-subtle border border-primary/25 flex items-center justify-center text-primary shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-text-primary tracking-wide uppercase font-mono truncate">
                AI Coach
              </h3>
              {provider && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    provider === 'gemini'
                      ? 'bg-primary-subtle text-primary border-primary/30'
                      : 'bg-surface-high text-text-muted border-border-subtle'
                  }`}
                >
                  {provider === 'gemini' ? 'Gemini' : 'Offline'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted truncate">
              Code audit, Big-O check &amp; interactive hints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onClearChat && displayedMessages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              title="Reset coach conversation"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Coach drawer"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Bar: Full Code Audit + Hint Pills */}
      <div className="p-3 border-b border-border-subtle bg-surface-subtle/60 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          {onAnalyzeMethod && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAnalyzeMethod()}
              isLoading={isLoading}
              className="flex-1 justify-center text-xs font-semibold"
              icon={<ScanSearch className="w-3.5 h-3.5" />}
            >
              {category === 'SQL' ? 'Audit SQL Query' : 'Audit Code & Complexity'}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {currentVerdict !== 'Accepted' && (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onRequestHint(1)}
                className="px-2 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                <Lightbulb className="w-3 h-3 text-primary" />
                <span>Hint 1</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onRequestHint(2)}
                className="px-2 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                <HelpCircle className="w-3 h-3 text-sky-400" />
                <span>Hint 2</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onRequestHint(3)}
                className="px-2 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                <Compass className="w-3 h-3 text-success" />
                <span>Plan</span>
              </button>
            </>
          )}
          {quickPrompts.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isLoading}
              onClick={() => onAnalyzeMethod?.(chip)}
              className="px-2 py-1 rounded-lg bg-surface hover:bg-surface-high border border-border-subtle text-[10px] font-mono text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Body: Verdict, Complexity Card, Line Mistakes & Chat Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {provider === 'local' && providerNote && (
          <div className="px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-muted">
            {providerNote}
          </div>
        )}

        {currentVerdict && currentVerdict !== 'Accepted' ? (
          <div className="p-2.5 rounded-xl bg-danger-subtle border border-danger/30 flex items-center gap-2 text-xs text-danger font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Latest Run: {currentVerdict}</span>
          </div>
        ) : currentVerdict === 'Accepted' || (isSolved && !currentVerdict) ? (
          <div className="p-2.5 rounded-xl bg-success-subtle border border-success/30 flex items-center gap-2 text-xs text-success font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {currentVerdict === 'Accepted'
                ? 'Current Code Accepted'
                : 'Previously Solved — Ready for Optimization Check'}
            </span>
          </div>
        ) : null}

        {/* Complexity & Method Card */}
        {analysis && (
          <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                <Gauge className="w-3.5 h-3.5" />
                <span>Approach &amp; Complexity</span>
              </span>
            </div>
            <p className="text-xs font-semibold text-text-primary">{analysis.detectedMethod}</p>
            <div className="grid grid-cols-1 gap-1 pt-0.5 text-[11px] font-mono">
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-canvas/70 border border-border-subtle">
                <span className="text-text-muted">Yours:</span>
                <span className="text-text-primary text-right">{analysis.estimatedComplexity}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-canvas/70 border border-border-subtle">
                <span className="text-text-muted">Optimal:</span>
                <span className="text-success text-right">{analysis.targetComplexity}</span>
              </div>
            </div>
          </div>
        )}

        {/* Detected Line-Level Mistakes */}
        {analysis && analysis.mistakes.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAllMistakes((p) => !p)}
              className="w-full flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-warning font-semibold"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Issues Found ({analysis.mistakes.length})</span>
              </span>
              <span className="text-[10px] text-text-muted">
                {showAllMistakes ? 'Hide' : 'Show'}
              </span>
            </button>

            {showAllMistakes &&
              analysis.mistakes.map((mistake, idx) => (
                <div
                  key={`${mistake.title}-${idx}`}
                  className="p-3 rounded-xl bg-warning-subtle/35 border border-warning/30 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text-primary">
                      {mistake.title}
                    </span>
                    {typeof mistake.line === 'number' && (
                      <button
                        type="button"
                        onClick={() => onJumpToLine?.(mistake.line!)}
                        className="px-1.5 py-0.5 rounded bg-canvas hover:bg-surface-high border border-warning/40 text-[10px] font-mono text-warning shrink-0 transition-colors"
                        title="Jump to line in editor"
                      >
                        Line {mistake.line}
                      </button>
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

        {/* Chat Conversation Thread */}
        <div className="space-y-2.5">
          {displayedMessages.length === 0 && !isLoading ? (
            <div className="p-4 rounded-xl bg-surface-elevated/60 border border-border-subtle text-xs text-text-secondary leading-relaxed">
              Click <strong className="text-text-primary">Audit Code &amp; Complexity</strong> or ask a question below to trace bugs, verify edge cases, and check Big-O efficiency.
            </div>
          ) : (
            displayedMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-xs sm:text-[13px] leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-primary-subtle/35 border-primary/30 text-text-primary ml-6'
                    : 'bg-surface-elevated border-border-subtle text-text-primary'
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">
                  {msg.role === 'user' ? 'You' : provider === 'gemini' ? 'Gemini Coach' : 'Coach'}
                </div>
                {msg.content}
              </div>
            ))
          )}

          {isLoading && (
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-2">
              <div className="text-[11px] font-mono text-primary animate-pulse">
                Analyzing code with {category === 'SQL' ? 'SQL' : 'C++'} coach...
              </div>
              <div className="h-2.5 rounded bg-surface-high animate-pulse w-5/6" />
              <div className="h-2.5 rounded bg-surface-high animate-pulse w-4/6" />
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* Pinned Follow-Up Question Bar */}
      {onAnalyzeMethod && (
        <form
          onSubmit={handleAskSubmit}
          className="p-3 border-t border-border-subtle bg-surface-elevated flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              category === 'SQL'
                ? 'Ask about joins, NULLs, or grouping...'
                : 'Ask a follow-up (e.g. "Why did case 2 fail?")...'
            }
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-canvas border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            aria-label="Send message to AI Coach"
            className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-black disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </aside>
  );
};
