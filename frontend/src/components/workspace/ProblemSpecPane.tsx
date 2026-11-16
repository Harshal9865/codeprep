import React, { useState, useEffect, useCallback } from 'react';
import { Problem } from '../../types/problem';
import { DataStructureDiagram } from './DataStructureDiagram';
import { INTERVIEW_PREP_SETS } from '../../data/interviewTracks';
import { apiRequest } from '../../services/api';
import {
  FileText,
  Lightbulb,
  History,
  Copy,
  Check,
  Tag,
  Building2,
  Unlock,
  Lock,
  StickyNote,
  BookOpen,
  ExternalLink,
  Code2,
  Maximize2,
  Minimize2,
  Play,
  Eye,
  GitCompare,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { CodePrepLoader } from '../ui/CodePrepLoader';
import { HighlightedCode } from '../ui/CodeHighlight';
import { SubmissionDiffViewer } from './SubmissionDiffViewer';

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

function renderFormattedInline(text: string): React.ReactNode {
  const withSuperscripts = text.replace(/\^(\-?\d+)/g, (_m, exp: string) =>
    exp.split('').map((ch) => SUPERSCRIPT_DIGITS[ch] || ch).join('')
  );
  const parts = withSuperscripts.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-surface-elevated border border-border-subtle font-mono text-[12.5px] text-primary"
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
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-text-secondary">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface LessonData {
  problemId: number;
  techniqueLesson: string;
  workedExamples: string;
  approachProgression: string;
  verifiedSolution: string;
  isSolved: boolean;
  solvedWithAiHelp: boolean;
}

interface ProblemSpecPaneProps {
  problem: Problem;
  currentCode?: string;
  onOpenHints?: () => void;
  onOpenFullSolution?: () => void;
  onLoadCode?: (code: string) => void;
  onSaveNotes?: (notes: string) => Promise<void>;
  onSolutionUnlocked?: () => void;
  onTestExample?: (example: { input: string; output: string }) => void;
  onSelectProblem?: (problemId: number) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const ProblemSpecPane: React.FC<ProblemSpecPaneProps> = ({
  problem,
  currentCode = '',
  onOpenHints,
  onOpenFullSolution,
  onLoadCode,
  onSaveNotes,
  onSolutionUnlocked,
  onTestExample,
  onSelectProblem,
  isMaximized = false,
  onToggleMaximize,
}) => {
  const [activeTab, setActiveTab] = useState<'description' | 'solution' | 'notes' | 'submissions'>('description');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [previewSubmissionId, setPreviewSubmissionId] = useState<string | null>(null);
  const [diffSubmissionId, setDiffSubmissionId] = useState<string | null>(null);
  const [copiedSubmissionId, setCopiedSubmissionId] = useState<string | null>(null);
  const [showTopicDrawer, setShowTopicDrawer] = useState(false);
  const [showCompaniesDrawer, setShowCompaniesDrawer] = useState(false);
  const [expandedHints, setExpandedHints] = useState<Record<number, boolean>>({});
  const [showContractCard, setShowContractCard] = useState(false);

  // Solution tab state
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isLoadingSolution, setIsLoadingSolution] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [copiedSolution, setCopiedSolution] = useState(false);

  // Notes tab state
  const [notesText, setNotesText] = useState(problem.userNotes || '');
  const [notesStatus, setNotesStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  useEffect(() => {
    setNotesText(problem.userNotes || '');
    setNotesStatus('saved');
  }, [problem.id, problem.userNotes]);

  useEffect(() => {
    setLesson(null);
    setSolutionError(null);
    setIsLoadingSolution(false);
    setExpandedHints({});
  }, [problem.id]);

  const matchingPrepSets = INTERVIEW_PREP_SETS.filter((s) => s.matchProblem(problem));
  const companyTags = Array.from(new Set(matchingPrepSets.flatMap((s) => s.companies)));

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const fetchSolution = useCallback(async (forceUnlock = false) => {
    setIsLoadingSolution(true);
    setSolutionError(null);
    try {
      if (forceUnlock) {
        await apiRequest(`/study/timer/unlock/${problem.id}`, { method: 'POST' });
        onSolutionUnlocked?.();
      }
      const res = await apiRequest<{ lesson: LessonData }>(`/study/lesson/${problem.id}`);
      setLesson(res.lesson);
    } catch (err: unknown) {
      setSolutionError(err instanceof Error ? err.message : 'Unable to load reference solution.');
    } finally {
      setIsLoadingSolution(false);
    }
  }, [problem.id, onSolutionUnlocked]);

  useEffect(() => {
    if (
      activeTab === 'solution' &&
      (problem.isSolved || problem.unlockedAiSolution) &&
      !lesson &&
      !isLoadingSolution &&
      !solutionError
    ) {
      void fetchSolution(false);
    }
  }, [activeTab, problem.isSolved, problem.unlockedAiSolution, lesson, isLoadingSolution, solutionError, fetchSolution]);

  const handleSwitchTab = (tab: 'description' | 'solution' | 'notes' | 'submissions') => {
    setActiveTab(tab);
    if (tab === 'solution' && !lesson && (problem.isSolved || problem.unlockedAiSolution)) {
      void fetchSolution(false);
    }
  };

  const handlePersistNotes = async (text: string) => {
    if (!onSaveNotes) return;
    setNotesStatus('saving');
    try {
      await onSaveNotes(text);
      setNotesStatus('saved');
    } catch {
      setNotesStatus('dirty');
    }
  };

  const isLruCache =
    problem.slug === 'lru-cache' ||
    problem.slug.endsWith('-lru-cache') ||
    problem.title.toLowerCase().includes('lru cache');
  const isLinkedList = problem.topic.toLowerCase().includes('linked list');
  const isUnlockedOrSolved = Boolean(problem.isSolved || problem.unlockedAiSolution || lesson);

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden text-text-primary transition-colors">
      {/* Pane Tabs Header */}
      <div className="h-10 bg-surface-subtle px-2.5 flex items-center gap-1 select-none shrink-0 border-b border-border-subtle overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => handleSwitchTab('description')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
            activeTab === 'description'
              ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span>Description</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('solution')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
            activeTab === 'solution'
              ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-warning" />
          <span>Solution</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('notes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
            activeTab === 'notes'
              ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/60'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5 text-sky-400" />
          <span>Notes</span>
          {notesText.trim().length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('submissions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
            activeTab === 'submissions'
              ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/60'
          }`}
        >
          <History className="w-3.5 h-3.5 text-success" />
          <span>Submissions</span>
          {problem.recentSubmissions && problem.recentSubmissions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-surface-high text-[10px] font-mono text-text-secondary">
              {problem.recentSubmissions.length}
            </span>
          )}
        </button>

        {onToggleMaximize && (
          <button
            type="button"
            onClick={onToggleMaximize}
            className={`ml-auto p-1.5 rounded-lg border transition-colors shrink-0 ${
              isMaximized
                ? 'bg-primary-subtle text-primary border-primary/40'
                : 'text-text-muted hover:text-text-primary bg-surface-elevated/60 hover:bg-surface-high border-border-subtle'
            }`}
            title={isMaximized ? 'Restore split view' : 'Maximize description pane'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Pane Content Body (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-[15px]">
        {activeTab === 'description' && (
          <div className="space-y-6">
            {/* Title & Solved Tag */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {problem.id}. {problem.title}
              </h1>

              {problem.isSolved && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-subtle text-xs font-medium text-success shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Solved</span>
                </div>
              )}
            </div>

            {/* Sub-bar: Difficulty, Topics, Companies, Hints */}
            <div className="flex flex-wrap items-center gap-2 select-none">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  problem.difficulty === 'Easy'
                    ? 'text-success bg-success/15'
                    : problem.difficulty === 'Medium'
                    ? 'text-warning bg-warning/15'
                    : 'text-danger bg-danger/15'
                }`}
              >
                {problem.difficulty}
              </span>

              <button
                type="button"
                onClick={() => setShowTopicDrawer((prev) => !prev)}
                className="px-3 py-1 rounded-full text-xs bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 border border-border-subtle"
              >
                <Tag className="w-3.5 h-3.5 text-text-muted" />
                <span>{problem.topic}</span>
              </button>

              {companyTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCompaniesDrawer((prev) => !prev)}
                  className="px-3 py-1 rounded-full text-xs bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 border border-border-subtle"
                >
                  <Building2 className="w-3.5 h-3.5 text-text-muted" />
                  <span>Companies ({companyTags.length})</span>
                </button>
              )}

              {onOpenHints && (
                <button
                  type="button"
                  onClick={onOpenHints}
                  className="px-3 py-1 rounded-full text-xs bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 border border-border-subtle"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-primary" />
                  <span>AI Hints</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowContractCard((prev) => !prev)}
                className="px-3 py-1 rounded-full text-xs bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 border border-border-subtle"
              >
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                <span>I/O Contract</span>
              </button>

              {problem.expectedComplexity && (
                <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-surface-subtle text-text-secondary border border-border-subtle flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  <span>{problem.expectedComplexity.time} • {problem.expectedComplexity.space}</span>
                </span>
              )}
            </div>

            {showTopicDrawer && (
              <div className="p-3.5 rounded-xl bg-surface-subtle text-sm space-y-2 border border-border-subtle">
                <div>
                  <span className="text-text-muted">Pattern Focus: </span>
                  <span className="text-text-primary font-semibold">
                    {problem.topic} • {problem.pattern}
                  </span>
                </div>
                {problem.tags && problem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {problem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showContractCard && (
              <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5 text-xs">
                <div className="font-mono uppercase tracking-wider text-text-muted text-[11px]">
                  Method Signature &amp; Parameter Contract
                </div>
                <div className="px-3 py-2 rounded-lg bg-canvas border border-border-subtle font-mono text-primary overflow-x-auto">
                  {problem.functionSignature}
                </div>
                {problem.parameters && problem.parameters.length > 0 && (
                  <div className="space-y-1">
                    {problem.parameters.map((param, idx) => (
                      <div key={idx} className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-text-muted">Param {idx + 1}:</span>
                        <span className="text-text-primary font-semibold">{param.name}</span>
                        <span className="text-text-muted">({param.type})</span>
                      </div>
                    ))}
                  </div>
                )}
                {problem.returnType && (
                  <div className="font-mono text-[11px] text-text-secondary">
                    <span className="text-text-muted">Returns: </span>
                    <span className="text-emerald-400">{problem.returnType}</span>
                    {problem.returnType === 'void' && ' (in-place modification graded via first parameter)'}
                  </div>
                )}
                {problem.inputFormatNote && (
                  <p className="text-xs text-text-muted leading-relaxed pt-1 border-t border-border-subtle/70">
                    {renderFormattedInline(problem.inputFormatNote)}
                  </p>
                )}
              </div>
            )}

            {showCompaniesDrawer && companyTags.length > 0 && (
              <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
                  Frequently Tested By
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {companyTags.map((comp) => (
                    <span
                      key={comp}
                      className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-subtle text-xs font-medium text-text-primary"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Problem Statement Prose */}
            <div className="text-text-primary/90 leading-7 whitespace-pre-line text-[15px] space-y-4">
              {renderFormattedInline(problem.statement)}
            </div>

            {isLruCache ? (
              <DataStructureDiagram type="lru-cache" />
            ) : isLinkedList ? (
              <DataStructureDiagram type="linked-list" />
            ) : null}

            {/* Formatted Examples */}
            <div className="space-y-4 pt-2">
              {problem.examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-surface-subtle border border-border-subtle p-4 space-y-2 text-[13px] font-mono"
                >
                  <div className="flex items-center justify-between text-text-secondary font-sans font-semibold text-xs">
                    <span>Example {idx + 1}</span>
                    <div className="flex items-center gap-1.5">
                      {onTestExample && (
                        <button
                          type="button"
                          onClick={() => onTestExample({ input: ex.input, output: ex.output })}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-high text-primary border border-border-subtle text-[11px] font-medium transition-colors"
                          title="Run your code directly on this example"
                        >
                          <Play className="w-3 h-3" />
                          <span>Run</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(`Input: ${ex.input}\nOutput: ${ex.output}`, idx)}
                        className="p-1 hover:text-text-primary transition-colors"
                        title="Copy example"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-text-primary">
                    <div>
                      <strong className="text-text-muted font-normal">Input: </strong>
                      <span>{ex.input}</span>
                    </div>
                    <div>
                      <strong className="text-text-muted font-normal">Output: </strong>
                      <span>{ex.output}</span>
                    </div>
                    {ex.explanation && (
                      <div className="pt-1 text-text-secondary font-sans text-sm leading-relaxed">
                        <strong className="text-text-muted font-normal font-mono text-xs">Explanation: </strong>
                        {renderFormattedInline(ex.explanation)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Constraints */}
            {problem.constraints && (
              <div className="space-y-2 pt-2">
                <h3 className="font-semibold text-xs tracking-wider uppercase text-text-muted">
                  Constraints
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-[13px] font-mono text-text-secondary pl-2">
                  {problem.constraints.split('\n').map((c, i) => (
                    <li key={i} className="text-text-secondary">
                      <span className="text-text-primary">{renderFormattedInline(c)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Follow-up Section (LeetCode style) */}
            {problem.followUp && (
              <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Follow-up</span>
                </div>
                <p className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">
                  {renderFormattedInline(problem.followUp)}
                </p>
              </div>
            )}

            {/* Expandable Progressive Hints (LeetCode style) */}
            {problem.hints && problem.hints.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs tracking-wider uppercase text-text-muted flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-warning" />
                    <span>Hints ({problem.hints.length})</span>
                  </h3>
                  {onOpenHints && (
                    <button
                      type="button"
                      onClick={onOpenHints}
                      className="text-[11px] font-mono text-primary hover:underline"
                    >
                      Ask AI Coach →
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {problem.hints.map((hint, idx) => {
                    const isOpen = Boolean(expandedHints[idx]);
                    return (
                      <div
                        key={idx}
                        className="rounded-xl bg-surface-subtle border border-border-subtle overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHints((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-text-primary hover:bg-surface-elevated/60 transition-colors"
                        >
                          <span>Hint {idx + 1}</span>
                          {isOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-3.5 pb-3 pt-1 text-xs sm:text-[13px] text-text-secondary leading-relaxed border-t border-border-subtle/70">
                            {renderFormattedInline(hint)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Similar Questions inside Description */}
            {problem.similarProblems && problem.similarProblems.length > 0 && onSelectProblem && (
              <div className="space-y-2.5 pt-4 border-t border-border-subtle">
                <h3 className="font-semibold text-xs tracking-wider uppercase text-text-muted">
                  Similar Questions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {problem.similarProblems.map((sim) => (
                    <button
                      key={sim.id}
                      type="button"
                      onClick={() => onSelectProblem(sim.id)}
                      className="px-3 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-elevated border border-border-subtle hover:border-primary/40 text-left flex items-center justify-between gap-2 transition-colors group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary group-hover:text-primary truncate">
                          #{sim.id}. {sim.title}
                        </div>
                        <div
                          className={`text-[10px] font-mono mt-0.5 ${
                            sim.difficulty === 'Easy'
                              ? 'text-success'
                              : sim.difficulty === 'Medium'
                              ? 'text-warning'
                              : 'text-danger'
                          }`}
                        >
                          {sim.difficulty}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Problem Environment Specifications */}
            <div className="flex items-center justify-between pt-4 border-t border-border-subtle text-xs font-mono text-text-muted">
              <span>Time Limit: 2.0s</span>
              <span>•</span>
              <span>Memory Limit: 256MB</span>
              <span>•</span>
              <span className="text-success">C++17 (g++ -O2)</span>
            </div>
          </div>
        )}

        {activeTab === 'solution' && (
          <div className="space-y-5">
            {!isUnlockedOrSolved ? (
              <div className="p-6 rounded-2xl bg-surface-subtle border border-border-subtle text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary-subtle border border-primary/30 flex items-center justify-center text-primary mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-lg text-text-primary">Unlock Reference Solution</h3>
                  <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                    Reveal the optimal C++17 solution, complexity progression, and worked pattern notes for #{problem.id}.
                  </p>
                </div>
                {solutionError && (
                  <p className="text-xs font-mono text-danger">{solutionError}</p>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => fetchSolution(true)}
                  isLoading={isLoadingSolution}
                  icon={<Unlock className="w-4 h-4" />}
                >
                  Unlock Solution
                </Button>
              </div>
            ) : isLoadingSolution ? (
              <CodePrepLoader
                variant="section"
                className="min-h-[160px]"
                label="Loading Reference Solution"
                sublabel="Preparing C++17 code & complexity progression..."
              />
            ) : lesson ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-text-primary tracking-tight">Reference Implementation</h3>
                    <p className="text-xs text-text-muted">{problem.pattern}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onLoadCode && (
                      <button
                        type="button"
                        onClick={() => onLoadCode(lesson.verifiedSolution)}
                        className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
                        title="Load this reference solution into the editor"
                      >
                        <Code2 className="w-3.5 h-3.5 text-success" />
                        <span>Use Code</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(lesson.verifiedSolution);
                        setCopiedSolution(true);
                        setTimeout(() => setCopiedSolution(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono flex items-center gap-1.5 text-text-primary transition-colors"
                    >
                      {copiedSolution ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSolution ? 'Copied' : 'Copy'}</span>
                    </button>
                    {onOpenFullSolution && (
                      <button
                        type="button"
                        onClick={onOpenFullSolution}
                        className="px-3 py-1.5 rounded-lg bg-primary-subtle hover:bg-primary/20 border border-primary/25 text-xs font-mono flex items-center gap-1.5 text-primary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Full Guide</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-border-subtle code-window-card">
                  <div className="px-4 py-2 bg-surface-elevated/60 border-b border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-danger/60" />
                        <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                        <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
                      </span>
                      <span className="ml-1 text-text-secondary">
                        {problem.category === 'SQL' ? 'solution.sql' : 'solution.cpp'}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted/80">
                      {problem.category === 'SQL' ? 'SQLite Optimal' : 'C++17 Optimal'}
                    </span>
                  </div>
                  <div className="p-4 font-mono text-[13px] overflow-x-auto bg-canvas/55">
                    <HighlightedCode
                      code={lesson.verifiedSolution}
                      language={problem.category === 'SQL' ? 'sql' : 'cpp'}
                      className="leading-relaxed"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-subtle/80 border border-border-subtle space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-primary/90 font-semibold">
                    Complexity Progression
                  </h4>
                  <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                    {lesson.approachProgression}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-subtle/80 border border-border-subtle space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-sky-400/90 font-semibold">
                    Pattern Walkthrough
                  </h4>
                  <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                    {lesson.techniqueLesson}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-surface-subtle border border-border-subtle text-center space-y-3">
                {solutionError ? (
                  <p className="text-xs font-mono text-danger">{solutionError}</p>
                ) : (
                  <p className="text-xs text-text-secondary">
                    Ready to load the reference implementation and pattern walkthrough.
                  </p>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => fetchSolution(true)}
                  isLoading={isLoadingSolution}
                  icon={<Unlock className="w-4 h-4" />}
                >
                  {solutionError ? 'Retry Loading Solution' : 'Load Solution'}
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-text-primary">Personal Problem Notes</h3>
                <p className="text-xs text-text-muted">Saved in SQLite across sessions for #{problem.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-muted">
                  {notesStatus === 'saving'
                    ? 'Saving...'
                    : notesStatus === 'dirty'
                    ? 'Unsaved edits'
                    : 'Saved'}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePersistNotes(notesText)}
                >
                  Save Notes
                </Button>
              </div>
            </div>

            <textarea
              value={notesText}
              onChange={(e) => {
                const next = e.target.value;
                setNotesText(next);
                setNotesStatus('dirty');
              }}
              onBlur={() => {
                if (notesStatus === 'dirty') {
                  handlePersistNotes(notesText);
                }
              }}
              placeholder="Write down edge cases, time complexity notes, mistakes to avoid next time..."
              className="flex-1 min-h-[260px] w-full p-4 rounded-xl bg-surface-subtle border border-border-default text-sm text-text-primary placeholder:text-text-muted font-body leading-relaxed resize-none focus:outline-none focus:border-primary/60"
            />
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-text-primary">Submission History</h3>
              <span className="text-xs font-mono text-text-muted">Stored in database</span>
            </div>

            {!problem.recentSubmissions || problem.recentSubmissions.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-subtle border border-border-subtle text-sm text-text-muted text-center">
                No submissions recorded yet for problem #{problem.id}. Submit your solution to track verdict history.
              </div>
            ) : (
              <div className="space-y-2.5">
                {(() => {
                  const acceptedRuntimes = (problem.recentSubmissions || [])
                    .filter((s) => s.verdict === 'Accepted' && typeof s.runtimeMs === 'number')
                    .map((s) => s.runtimeMs as number);
                  const bestRuntimeMs =
                    acceptedRuntimes.length > 1 ? Math.min(...acceptedRuntimes) : null;
                  return problem.recentSubmissions.map((sub) => {
                  const isAccepted = sub.verdict === 'Accepted';
                  const isFastest =
                    bestRuntimeMs !== null && isAccepted && sub.runtimeMs === bestRuntimeMs;
                  const isPreviewing = previewSubmissionId === sub.id;
                  const isDiffing = diffSubmissionId === sub.id;
                  return (
                    <div
                      key={sub.id}
                      className="rounded-xl bg-surface-subtle border border-border-subtle overflow-hidden"
                    >
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold font-mono ${
                                isAccepted ? 'text-success' : 'text-danger'
                              }`}
                            >
                              {sub.verdict}
                            </span>
                            {isFastest && (
                              <span className="px-1.5 py-0.5 rounded bg-success-subtle text-success border border-success/30 text-[10px] font-mono font-semibold">
                                Fastest
                              </span>
                            )}
                            {typeof sub.runtimeMs === 'number' && (
                              <span className="text-xs font-mono text-text-muted">
                                {sub.runtimeMs} ms
                              </span>
                            )}
                            {typeof sub.memoryKb === 'number' && sub.memoryKb > 0 && (
                              <span className="text-xs font-mono text-text-muted">
                                • {(sub.memoryKb / 1024).toFixed(1)} MB
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-text-muted">
                            {new Date(sub.submittedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {sub.code && (
                            <button
                              type="button"
                              onClick={() => {
                                setDiffSubmissionId(null);
                                setPreviewSubmissionId(isPreviewing ? null : sub.id);
                              }}
                              className={`px-2 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-colors ${
                                isPreviewing
                                  ? 'bg-primary-subtle text-primary border-primary/40'
                                  : 'bg-surface-elevated hover:bg-surface-high border-border-subtle text-text-muted hover:text-text-primary'
                              }`}
                              title="Preview submitted code"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isPreviewing ? 'Hide' : 'View'}</span>
                            </button>
                          )}

                          {sub.code && (currentCode || (problem.recentSubmissions?.length ?? 0) > 1) && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewSubmissionId(null);
                                setDiffSubmissionId(isDiffing ? null : sub.id);
                              }}
                              className={`px-2 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-colors ${
                                isDiffing
                                  ? 'bg-primary-subtle text-primary border-primary/40'
                                  : 'bg-surface-elevated hover:bg-surface-high border-border-subtle text-text-muted hover:text-text-primary'
                              }`}
                              title="Compare this submission against your editor or another past submission"
                            >
                              <GitCompare className="w-3.5 h-3.5" />
                              <span>{isDiffing ? 'Close Diff' : 'Diff'}</span>
                            </button>
                          )}

                          {onLoadCode && sub.code && (
                            <button
                              type="button"
                              onClick={() => onLoadCode(sub.code)}
                              className="px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-primary flex items-center gap-1.5"
                            >
                              <Code2 className="w-3.5 h-3.5 text-primary" />
                              <span>Load</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {isDiffing && sub.code && (
                        <SubmissionDiffViewer
                          baseSubmission={sub}
                          allSubmissions={problem.recentSubmissions || []}
                          currentCode={currentCode}
                        />
                      )}

                      {isPreviewing && sub.code && (
                        <div className="border-t border-border-subtle bg-canvas">
                          <div className="px-3 py-1.5 bg-surface flex items-center justify-between border-b border-border-subtle text-[11px] font-mono text-text-muted">
                            <span>Submitted C++17 Code</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(sub.code);
                                setCopiedSubmissionId(sub.id);
                                window.setTimeout(() => setCopiedSubmissionId(null), 1500);
                              }}
                              className="inline-flex items-center gap-1 text-text-muted hover:text-text-primary"
                            >
                              {copiedSubmissionId === sub.id ? (
                                <Check className="w-3 h-3 text-success" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedSubmissionId === sub.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="max-h-60 overflow-auto">
                            <HighlightedCode code={sub.code} language="cpp" className="p-3 text-xs leading-5" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
