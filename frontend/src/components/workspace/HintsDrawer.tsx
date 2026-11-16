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
  Terminal,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ArrowUpRight,
  ListChecks,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { HighlightedCode } from '../ui/CodeHighlight';

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

function renderInlineFormatting(text: string): React.ReactNode {
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_)/g;
  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-canvas/85 border border-border-subtle font-mono text-[11.5px] text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return (
        <em key={idx} className="italic text-text-secondary">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const SnippetCard: React.FC<{ code: string; lang: string; defaultLang: 'cpp' | 'sql' }> = ({
  code,
  lang,
  defaultLang,
}) => {
  const [copied, setCopied] = useState(false);
  const resolvedLang: 'cpp' | 'sql' =
    lang.toLowerCase().includes('sql') || (!lang && defaultLang === 'sql') ? 'sql' : 'cpp';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="my-2 rounded-xl border border-border-subtle overflow-hidden bg-canvas">
      <div className="px-3 py-1.5 bg-surface-high/60 border-b border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-muted">
        <span className="uppercase tracking-wider">
          {lang || (resolvedLang === 'sql' ? 'SQLite' : 'C++17')}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-3 overflow-x-auto text-xs leading-5">
        <HighlightedCode code={code} language={resolvedLang} className="text-xs leading-5" />
      </div>
    </div>
  );
};

const CoachRichContent: React.FC<{ content: string; defaultLang: 'cpp' | 'sql' }> = ({
  content,
  defaultLang,
}) => {
  const fenceRegex = /```([a-zA-Z0-9_+-]*)\r?\n([\s\S]*?)```/g;
  const segments: Array<{ kind: 'text' | 'code'; lang?: string; body: string }> = [];
  let cursor = 0;
  let match: RegExpExecArray | null = fenceRegex.exec(content);

  while (match !== null) {
    if (match.index > cursor) {
      const textChunk = content.slice(cursor, match.index).trim();
      if (textChunk) segments.push({ kind: 'text', body: textChunk });
    }
    segments.push({
      kind: 'code',
      lang: match[1] || '',
      body: match[2].trim(),
    });
    cursor = match.index + match[0].length;
    match = fenceRegex.exec(content);
  }

  if (cursor < content.length) {
    const trailing = content.slice(cursor).trim();
    if (trailing) segments.push({ kind: 'text', body: trailing });
  }

  const renderMarkdownBlock = (text: string, blockIdx: number) => {
    const lines = text.split(/\r?\n/);
    const nodes: React.ReactNode[] = [];
    let listItems: { ordered: boolean; items: string[] } | null = null;

    const flushList = (keySuffix: string) => {
      if (!listItems) return;
      const captured = listItems;
      listItems = null;
      if (captured.ordered) {
        nodes.push(
          <ol
            key={`ol-${blockIdx}-${keySuffix}`}
            className="space-y-1.5 pl-1 text-xs sm:text-[13px] text-text-secondary"
          >
            {captured.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="w-5 h-5 rounded-md bg-primary/15 text-primary font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1 min-w-0">{renderInlineFormatting(item)}</span>
              </li>
            ))}
          </ol>
        );
      } else {
        nodes.push(
          <ul
            key={`ul-${blockIdx}-${keySuffix}`}
            className="space-y-1.5 pl-0.5 text-xs sm:text-[13px] text-text-secondary"
          >
            {captured.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                <span className="flex-1 min-w-0">{renderInlineFormatting(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
    };

    lines.forEach((rawLine, lineIdx) => {
      const line = rawLine.trim();
      if (!line) {
        flushList(`blank-${lineIdx}`);
        return;
      }

      const headingMatch = /^#{1,4}\s+(.+)$/.exec(line);
      if (headingMatch) {
        flushList(`hd-${lineIdx}`);
        nodes.push(
          <div
            key={`hd-${blockIdx}-${lineIdx}`}
            className="pt-1 text-xs font-mono font-bold uppercase tracking-wider text-primary"
          >
            {renderInlineFormatting(headingMatch[1])}
          </div>
        );
        return;
      }

      const bulletMatch = /^[-*•]\s+(.+)$/.exec(line);
      if (bulletMatch) {
        if (listItems && listItems.ordered) flushList(`sw-${lineIdx}`);
        if (!listItems) listItems = { ordered: false, items: [] };
        listItems.items.push(bulletMatch[1]);
        return;
      }

      const numMatch = /^\d+[.)]\s+(.+)$/.exec(line);
      if (numMatch) {
        if (listItems && !listItems.ordered) flushList(`sw-${lineIdx}`);
        if (!listItems) listItems = { ordered: true, items: [] };
        listItems.items.push(numMatch[1]);
        return;
      }

      flushList(`p-${lineIdx}`);
      nodes.push(
        <p key={`p-${blockIdx}-${lineIdx}`} className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    });

    flushList('end');
    return (
      <div key={blockIdx} className="space-y-2">
        {nodes}
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {segments.map((seg, idx) =>
        seg.kind === 'code' ? (
          <SnippetCard
            key={idx}
            code={seg.body}
            lang={seg.lang || ''}
            defaultLang={defaultLang}
          />
        ) : (
          renderMarkdownBlock(seg.body, idx)
        )
      )}
    </div>
  );
};

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
  const [activeView, setActiveView] = useState<'chat' | 'audit'>('chat');
  const [isWide, setIsWide] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
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
    if (isOpen && activeView === 'chat') {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, activeView, chatMessages?.length, guidanceMessage, isLoading]);

  if (!isOpen) return null;

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAnalyzeMethod || isLoading) return;
    const trimmed = question.trim();
    if (!trimmed) return;
    setActiveView('chat');
    onAnalyzeMethod(trimmed);
    setQuestion('');
  };

  const quickPrompts =
    category === 'SQL'
      ? [
          'Trace my query step by step',
          'Check LEFT JOIN & NULLs',
          'Why do output rows differ?',
          'Optimize SQL plan',
        ]
      : category === 'OOP'
        ? [
            'Check class invariants',
            'Audit Rule of 5 & leaks',
            'Verify virtual dispatch',
            'Optimize design',
          ]
        : [
            'Trace my code on failing input',
            'Find edge cases & bugs',
            'Check Time & Space Big-O',
            'How can I optimize?',
          ];

  const displayedMessages: CoachMessageItem[] =
    chatMessages && chatMessages.length > 0
      ? chatMessages
      : guidanceMessage
        ? [{ role: 'assistant', content: guidanceMessage }]
        : [];

  const mistakeCount = analysis?.mistakes?.length ?? 0;
  const defaultCodeLang: 'cpp' | 'sql' = category === 'SQL' ? 'sql' : 'cpp';

  const handleCopyMessage = async (idx: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgIdx(idx);
      window.setTimeout(() => setCopiedMsgIdx(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <aside
      aria-label="AI Code Coach"
      className={`fixed inset-y-0 right-0 z-50 w-full ${
        isWide ? 'sm:w-[620px]' : 'sm:w-[465px]'
      } bg-surface border-l border-border-default shadow-2xl flex flex-col animate-slide-in-right transition-[width] duration-200`}
    >
      {/* Top Bar */}
      <div className="px-4 py-3 border-b border-border-subtle bg-surface-elevated flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-subtle border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-text-primary tracking-wide uppercase font-mono">
                Engineering Coach
              </h3>
              {provider && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    provider === 'gemini'
                      ? 'bg-primary-subtle text-primary border-primary/30'
                      : 'bg-surface-high text-text-muted border-border-subtle'
                  }`}
                >
                  {provider === 'gemini' ? 'Gemini AI' : 'Static Check'}
                </span>
              )}
              {currentVerdict && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    currentVerdict === 'Accepted'
                      ? 'bg-success-subtle text-success border-success/30'
                      : 'bg-danger-subtle text-danger border-danger/30'
                  }`}
                >
                  {currentVerdict}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted truncate">
              {category === 'SQL'
                ? 'SQLite query trace, NULL safety & execution audit'
                : category === 'OOP'
                  ? 'C++17 invariants, VTables, RAII & Big-O review'
                  : 'Line-by-line bug trace, Big-O audit & hints'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsWide((w) => !w)}
            title={isWide ? 'Compact drawer width' : 'Expand drawer width'}
            className="hidden sm:inline-flex p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors"
          >
            {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
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

      {/* View Switcher & Primary Audit Controls */}
      <div className="px-3.5 py-2.5 border-b border-border-subtle bg-surface-subtle/70 space-y-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-elevated border border-border-subtle rounded-xl p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setActiveView('chat')}
              className={`px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors ${
                activeView === 'chat'
                  ? 'bg-surface text-text-primary font-semibold shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <MessageSquare className="w-3 h-3 text-primary" />
              <span>Coach</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('audit')}
              className={`px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors ${
                activeView === 'audit'
                  ? 'bg-surface text-text-primary font-semibold shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <ListChecks className="w-3 h-3 text-sky-400" />
              <span>Audit</span>
              {mistakeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-warning-subtle text-warning text-[10px] font-bold">
                  {mistakeCount}
                </span>
              )}
            </button>
          </div>

          {onAnalyzeMethod && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAnalyzeMethod()}
              isLoading={isLoading}
              className="flex-1 justify-center text-xs font-semibold"
              icon={<ScanSearch className="w-3.5 h-3.5" />}
            >
              {category === 'SQL' ? 'Audit SQL Query' : 'Run Fresh Audit'}
            </Button>
          )}
        </div>

        {/* Progressive Hint Ladder + Quick Focus Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {currentVerdict !== 'Accepted' && (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setActiveView('chat');
                  onRequestHint(1);
                }}
                className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-medium text-text-secondary hover:text-text-primary inline-flex items-center gap-1 transition-colors disabled:opacity-40 shrink-0"
              >
                <Lightbulb className="w-3 h-3 text-primary" />
                <span>Hint 1</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setActiveView('chat');
                  onRequestHint(2);
                }}
                className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-medium text-text-secondary hover:text-text-primary inline-flex items-center gap-1 transition-colors disabled:opacity-40 shrink-0"
              >
                <HelpCircle className="w-3 h-3 text-sky-400" />
                <span>Hint 2</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setActiveView('chat');
                  onRequestHint(3);
                }}
                className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-medium text-text-secondary hover:text-text-primary inline-flex items-center gap-1 transition-colors disabled:opacity-40 shrink-0"
              >
                <Compass className="w-3 h-3 text-success" />
                <span>Plan</span>
              </button>
              <span className="text-border-default shrink-0">|</span>
            </>
          )}
          {quickPrompts.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setActiveView('chat');
                onAnalyzeMethod?.(chip);
              }}
              className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-high border border-border-subtle text-[11px] text-text-muted hover:text-text-primary transition-colors disabled:opacity-40 shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {provider === 'local' && providerNote && (
          <div className="px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-muted flex items-center justify-between gap-2">
            <span>{providerNote}</span>
          </div>
        )}

        {activeView === 'audit' ? (
          /* AUDIT & CHECKLIST VIEW */
          <div className="space-y-4">
            {analysis ? (
              <>
                {/* Approach & Complexity Matrix */}
                <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Method &amp; Complexity</span>
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      {category}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-text-primary">
                    {analysis.detectedMethod}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-canvas border border-border-subtle">
                      <span className="text-text-muted">Current Code</span>
                      <span className="text-text-primary text-right">
                        {analysis.estimatedComplexity}
                      </span>
                    </div>
                    {analysis.spaceComplexity && !analysis.estimatedComplexity.includes(analysis.spaceComplexity) && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-canvas border border-border-subtle">
                        <span className="text-text-muted">Auxiliary Space</span>
                        <span className="text-text-primary text-right">
                          {analysis.spaceComplexity}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-canvas border border-border-subtle">
                      <span className="text-text-muted">Optimal Target</span>
                      <span className="text-success text-right">{analysis.targetComplexity}</span>
                    </div>
                  </div>
                </div>

                {/* Line-Level Diagnostics */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold flex items-center justify-between">
                    <span>Code Findings ({mistakeCount})</span>
                    {mistakeCount === 0 && (
                      <span className="text-success inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        No structural issues flagged
                      </span>
                    )}
                  </div>

                  {mistakeCount > 0 &&
                    analysis.mistakes.map((mistake, idx) => (
                      <div
                        key={`${mistake.title}-${idx}`}
                        className="p-3.5 rounded-xl bg-surface-elevated border border-warning/35 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                            <span className="text-xs font-semibold text-text-primary">
                              {mistake.title}
                            </span>
                          </div>
                          {typeof mistake.line === 'number' && onJumpToLine && (
                            <button
                              type="button"
                              onClick={() => onJumpToLine(mistake.line!)}
                              className="px-2 py-0.5 rounded-md bg-canvas hover:bg-surface-high border border-warning/40 text-[10px] font-mono text-warning inline-flex items-center gap-1 shrink-0 transition-colors"
                              title="Jump editor cursor to this line"
                            >
                              <span>Line {mistake.line}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {renderInlineFormatting(mistake.detail)}
                        </p>
                        <div className="p-2.5 rounded-lg bg-canvas border border-border-subtle text-[11px] text-primary leading-relaxed">
                          <span className="font-mono font-semibold uppercase tracking-wider mr-1.5">
                            Fix:
                          </span>
                          {renderInlineFormatting(mistake.fixHint)}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Actionable Next Steps Checklist */}
                {analysis.guidanceSteps && analysis.guidanceSteps.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                      Recommended Action Checklist
                    </div>
                    <div className="space-y-2">
                      {analysis.guidanceSteps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3 rounded-xl bg-surface-elevated border border-border-subtle flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed"
                        >
                          <span className="w-5 h-5 rounded-md bg-primary/15 text-primary font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className="flex-1 min-w-0">{renderInlineFormatting(step)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-5 rounded-xl bg-surface-elevated border border-border-subtle text-center space-y-2">
                <p className="text-xs text-text-secondary">
                  Run a fresh audit to inspect your current Big-O complexity, line-level bugs, and step-by-step action checklist.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* COACH CHAT VIEW */
          <div className="space-y-3">
            {/* Compact Status + Complexity Ribbon */}
            {analysis && (
              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="text-[11px] font-semibold text-text-primary truncate">
                    {analysis.detectedMethod}
                  </div>
                  <div className="text-[10px] font-mono text-text-muted flex flex-wrap items-center gap-x-2">
                    <span>Now: {analysis.estimatedComplexity}</span>
                    <span>•</span>
                    <span className="text-success">Target: {analysis.targetComplexity}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('audit')}
                  className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-high border border-border-subtle text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors shrink-0"
                >
                  {mistakeCount > 0 ? `${mistakeCount} Issues →` : 'View Audit →'}
                </button>
              </div>
            )}

            {isSolved && !currentVerdict && (
              <div className="px-3 py-2 rounded-xl bg-success-subtle border border-success/30 flex items-center gap-2 text-xs text-success font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Previously solved — audit to review complexity or alternative approaches.</span>
              </div>
            )}

            {displayedMessages.length === 0 && !isLoading ? (
              <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border-subtle space-y-2.5 text-xs text-text-secondary leading-relaxed">
                <div className="font-semibold text-text-primary">
                  Ready to inspect your {category === 'SQL' ? 'SQL query' : 'C++17 implementation'}.
                </div>
                <p>
                  Click <strong className="text-text-primary">Run Fresh Audit</strong> for a concrete line-by-line bug trace and Big-O check, use <strong className="text-text-primary">Hint 1 / 2 / Plan</strong> for gradual nudges, or ask any specific question below.
                </p>
              </div>
            ) : (
              displayedMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border ${
                    msg.role === 'user'
                      ? 'bg-primary-subtle/30 border-primary/35 text-text-primary ml-8'
                      : 'bg-surface-elevated border-border-subtle text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                      {msg.role === 'user' ? 'You' : provider === 'gemini' ? 'Gemini Coach' : 'Coach'}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => void handleCopyMessage(idx, msg.content)}
                        title="Copy coach response"
                        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors"
                      >
                        {copiedMsgIdx === idx ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {msg.role === 'user' ? (
                    <p className="text-xs sm:text-[13px] text-text-primary leading-relaxed">
                      {msg.content}
                    </p>
                  ) : (
                    <CoachRichContent content={msg.content} defaultLang={defaultCodeLang} />
                  )}
                </div>
              ))
            )}

            {/* Quick clickable Line Jump pills after latest assistant message when mistakes exist */}
            {mistakeCount > 0 && onJumpToLine && !isLoading && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  Flagged Lines:
                </span>
                {analysis!.mistakes
                  .filter((m) => typeof m.line === 'number')
                  .slice(0, 4)
                  .map((m, idx) => (
                    <button
                      key={`${m.line}-${idx}`}
                      type="button"
                      onClick={() => onJumpToLine(m.line!)}
                      className="px-2 py-0.5 rounded-md bg-warning-subtle/60 hover:bg-warning-subtle border border-warning/35 text-[10px] font-mono text-warning inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Line {m.line}: {m.title}</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
              </div>
            )}

            {isLoading && (
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-2">
                <div className="text-[11px] font-mono text-primary animate-pulse">
                  Inspecting {category === 'SQL' ? 'relational plan & NULL behavior' : 'logic, boundaries & complexity'}...
                </div>
                <div className="h-2.5 rounded bg-surface-high animate-pulse w-5/6" />
                <div className="h-2.5 rounded bg-surface-high animate-pulse w-4/6" />
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>
        )}
      </div>

      {/* Pinned Composer */}
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
                ? 'Ask about joins, NULLs, GROUP BY, or window frames...'
                : category === 'OOP'
                  ? 'Ask about ownership, virtual dispatch, or invariants...'
                  : 'Ask about a failing input, edge case, or complexity...'
            }
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-canvas border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            aria-label="Send message to AI Coach"
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-black disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </aside>
  );
};
