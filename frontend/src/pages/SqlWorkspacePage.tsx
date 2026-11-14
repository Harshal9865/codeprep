import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../services/api';
import { requestStudyGuidance } from '../services/studyGuidance';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { SqlSchemaTables } from '../components/workspace/SqlSchemaTables';
import { HintsDrawer, MethodAnalysisData } from '../components/workspace/HintsDrawer';
import { HighlightedCode, HighlightedCodeEditor } from '../components/ui/CodeHighlight';
import { ResizableDivider } from '../components/workspace/ResizableDivider';
import { WorkspaceProblemDrawer } from '../components/workspace/WorkspaceProblemDrawer';
import { useWorkspaceLayout } from '../hooks/useWorkspaceLayout';
import { formatCode } from '../utils/codeFormatter';
import { ExecutionBenchmarks, SubmissionHistoryItem } from '../types/problem';
import {
  Database,
  Table as TableIcon,
  FileText,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  Bookmark,
  BookOpen,
  Unlock,
  Copy,
  Check,
  Sparkles,
  AlignLeft,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  PanelLeftOpen,
  History,
  Eye,
  Code2,
} from 'lucide-react';

interface SqlProblemData {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  statement: string;
  constraints: string;
  schemaDdl?: string;
  expectedResult?: Array<Record<string, unknown>>;
  defaultCodeStub?: string;
  userDraftCode?: string;
  isSolved?: boolean;
  isBookmark?: boolean;
  unlockedAiSolution?: boolean;
  recentSubmissions?: SubmissionHistoryItem[];
}

interface SqlQueryResult {
  verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Query Error' | 'Query Plan';
  runtimeMs: number;
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
  expectedColumns?: string[];
  expectedRows?: Array<Record<string, unknown>>;
  error?: string;
}

interface SqlWorkspacePageProps {
  problemId: number;
  onBackToList: () => void;
  onNavigateProblem?: (newId: number) => void;
}

export const SqlWorkspacePage: React.FC<SqlWorkspacePageProps> = ({
  problemId,
  onBackToList,
  onNavigateProblem,
}) => {
  const [problem, setProblem] = useState<SqlProblemData | null>(null);
  const [query, setQuery] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [sqlBenchmarks, setSqlBenchmarks] = useState<ExecutionBenchmarks | null>(null);

  // Left pane tabs ('description' | 'solution' | 'submissions')
  const [activeLeftTab, setActiveLeftTab] = useState<'description' | 'solution' | 'submissions'>('description');
  const [previewSqlSubId, setPreviewSqlSubId] = useState<string | null>(null);
  const [solutionSql, setSolutionSql] = useState<string | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [isUnlockingSolution, setIsUnlockingSolution] = useState(false);
  const [copiedSolution, setCopiedSolution] = useState(false);
  const [showSqlCheatSheet, setShowSqlCheatSheet] = useState(false);
  const [justFormattedSql, setJustFormattedSql] = useState(false);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1, selectedChars: 0 });
  const [fontSizePx, setFontSizePx] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('codeprep_editor_font_size'));
      return [12, 13, 14, 15, 16].includes(saved) ? saved : 13;
    } catch {
      return 13;
    }
  });
  const [isProblemDrawerOpen, setIsProblemDrawerOpen] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  const {
    layout,
    setLeftWidthPct,
    setBottomHeightPx,
    toggleBottomCollapsed,
    expandBottom,
    toggleMaximize,
    resetLayout,
    isCustomLayout,
  } = useWorkspaceLayout('codeprep_sql_workspace_layout', {
    leftWidthPct: 44,
    bottomHeightPx: 270,
  });

  const [autoFormatSql, setAutoFormatSql] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('codeprep_auto_format');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // SQL AI Coach drawer state
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachGuidance, setCoachGuidance] = useState('');
  const [coachAnalysis, setCoachAnalysis] = useState<MethodAnalysisData | null>(null);
  const [coachProvider, setCoachProvider] = useState<'gemini' | 'local' | undefined>(undefined);
  const [coachProviderNote, setCoachProviderNote] = useState<string | undefined>(undefined);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [hasUnreadCoach, setHasUnreadCoach] = useState(false);

  const savedQueryRef = useRef<string>('');
  const evaluatedQueryRef = useRef<string>('');
  const analyzedQueryRef = useRef<string>('');
  const activeQueryRef = useRef<string>('');
  const activeIdRef = useRef<number>(problemId);

  activeQueryRef.current = query;
  activeIdRef.current = problemId;

  const persistDraftNow = useCallback(async (targetId: number, draftSql: string) => {
    if (!draftSql || draftSql === savedQueryRef.current) return;
    setSaveStatus('saving');
    try {
      await apiRequest(`/problems/${targetId}/draft`, {
        method: 'POST',
        body: JSON.stringify({ code: draftSql }),
      });
      if (activeIdRef.current === targetId) {
        savedQueryRef.current = draftSql;
        setSaveStatus('saved');
      }
    } catch {
      // Keep quiet on offline retry
    }
  }, []);

  useEffect(() => {
    const fetchProblem = async () => {
      setIsLoading(true);
      setResult(null);
      setSqlBenchmarks(null);
      setPreviewSqlSubId(null);
      setActiveLeftTab('description');
      setSolutionSql(null);
      setSolutionError(null);
      setCoachGuidance('');
      setCoachAnalysis(null);
      setCoachProvider(undefined);
      setCoachProviderNote(undefined);
      evaluatedQueryRef.current = '';
      analyzedQueryRef.current = '';
      setHasUnreadCoach(false);
      try {
        const res = await apiRequest<{ problem: SqlProblemData }>(`/problems/${problemId}`);
        const initialSql =
          res.problem.userDraftCode ||
          res.problem.defaultCodeStub ||
          `-- Solve #${res.problem.id}: ${res.problem.title}\nSELECT *\nFROM Employee;\n`;
        setProblem(res.problem);
        setQuery(initialSql);
        savedQueryRef.current = initialSql;
        setSaveStatus('saved');
      } catch {
        setProblem({
          id: problemId,
          title: `SQL Query Problem #${problemId}`,
          difficulty: 'Medium',
          topic: 'Window Functions',
          statement: 'Write an optimal SQL query to retrieve the required relational result set.',
          constraints: 'Read-only SELECT/WITH execution\n2000ms statement timeout',
          schemaDdl: 'CREATE TABLE Employee (id INT, name VARCHAR(50), salary INT, departmentId INT);',
        });
        const fallbackSql = `SELECT * FROM Employee;\n`;
        setQuery(fallbackSql);
        savedQueryRef.current = fallbackSql;
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  useEffect(() => {
    if (!problem || query === savedQueryRef.current) return;
    setSaveStatus('dirty');
    const timer = setTimeout(() => {
      persistDraftNow(problem.id, query);
    }, 1500);
    return () => clearTimeout(timer);
  }, [query, problem, persistDraftNow]);

  useEffect(() => {
    return () => {
      if (activeQueryRef.current !== savedQueryRef.current) {
        persistDraftNow(activeIdRef.current, activeQueryRef.current);
      }
    };
  }, [persistDraftNow]);

  const requestSqlCoach = async (options?: {
    verdict?: string;
    queryResult?: SqlQueryResult;
    hintLevel?: number;
    requestMode?: 'analyze' | 'hint' | 'coach' | 'optimizer';
    userQuestion?: string;
    queryOverride?: string;
  }) => {
    if (!problem) return;
    const targetSql = options?.queryOverride ?? query;
    const matchesEvaluated = Boolean(result && evaluatedQueryRef.current === targetSql);
    const verdictToSend = options?.verdict ?? (matchesEvaluated ? result?.verdict : undefined);
    const resultToSend = options?.queryResult ?? (matchesEvaluated ? result ?? undefined : undefined);

    setIsCoachLoading(true);
    try {
      const feedback = await requestStudyGuidance({
        problemId: problem.id,
        userCode: targetSql,
        verdict: verdictToSend,
        executionResult: resultToSend,
        hintLevel: options?.hintLevel ?? 1,
        isSolved: verdictToSend === 'Accepted',
        requestMode: options?.requestMode,
        userQuestion: options?.userQuestion,
      });
      setCoachGuidance(feedback.message);
      setCoachAnalysis(feedback.analysis ?? null);
      setCoachProvider(feedback.provider);
      setCoachProviderNote(feedback.providerNote);
      analyzedQueryRef.current = targetSql;
      if (!isCoachOpen) {
        setHasUnreadCoach(true);
      }
    } catch {
      setCoachGuidance('Unable to reach AI Coach right now. Re-run or click "Analyze My Query & Find Mistakes".');
    } finally {
      setIsCoachLoading(false);
    }
  };

  const handleRunQuery = async (explainOnly = false) => {
    if (!problem) return;
    const submittedSql = query;
    void persistDraftNow(problem.id, submittedSql);
    setIsRunning(true);
    try {
      const res = await apiRequest<{ result: SqlQueryResult }>('/submissions/run', {
        method: 'POST',
        body: JSON.stringify({
          problemId,
          code: submittedSql,
          explainOnly,
        }),
      });
      evaluatedQueryRef.current = submittedSql;
      setSqlBenchmarks(null);
      setResult(res.result);
      if (!explainOnly) {
        void requestSqlCoach({
          requestMode: res.result.verdict === 'Accepted' ? 'optimizer' : 'analyze',
          verdict: res.result.verdict,
          queryResult: res.result,
          queryOverride: submittedSql,
        });
      }
    } catch (err: unknown) {
      const fallbackErr: SqlQueryResult = {
        verdict: 'Query Error',
        runtimeMs: 0,
        error: err instanceof Error ? err.message : 'Database query failed.',
      };
      evaluatedQueryRef.current = submittedSql;
      setResult(fallbackErr);
      void requestSqlCoach({
        requestMode: 'analyze',
        verdict: fallbackErr.verdict,
        queryResult: fallbackErr,
        queryOverride: submittedSql,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitQuery = async () => {
    if (!problem) return;
    const submittedSql = query;
    void persistDraftNow(problem.id, submittedSql);
    setIsRunning(true);
    try {
      const res = await apiRequest<{
        result: SqlQueryResult;
        submissionId: string;
        benchmarks?: ExecutionBenchmarks;
        potdStatus?: {
          isPotd: boolean;
          solvedToday: boolean;
          justCompletedToday?: boolean;
          currentStreak: number;
          longestStreak?: number;
          recentDays?: Array<{ date: string; solved: boolean; isToday: boolean }>;
        };
      }>('/submissions/submit', {
        method: 'POST',
        body: JSON.stringify({
          problemId,
          code: submittedSql,
        }),
      });
      evaluatedQueryRef.current = submittedSql;
      setSqlBenchmarks(res.result.verdict === 'Accepted' && res.benchmarks ? res.benchmarks : null);
      setResult(res.result);

      const newSub: SubmissionHistoryItem = {
        id: res.submissionId,
        verdict: res.result.verdict as SubmissionHistoryItem['verdict'],
        runtimeMs: res.result.runtimeMs,
        memoryKb: 2048,
        submittedAt: new Date().toISOString(),
        code: submittedSql,
      };
      setProblem((prev) =>
        prev
          ? {
              ...prev,
              isSolved: prev.isSolved || res.result.verdict === 'Accepted',
              recentSubmissions: [newSub, ...(prev.recentSubmissions || [])].slice(0, 20),
            }
          : null
      );

      if (res.result.verdict === 'Accepted' && problem) {
        window.dispatchEvent(new CustomEvent('codeprep:progress-updated'));
        if (res.potdStatus?.isPotd && res.potdStatus.justCompletedToday) {
          window.dispatchEvent(
            new CustomEvent('codeprep:streak-completed', {
              detail: {
                problemId: problem.id,
                problemTitle: problem.title,
                currentStreak: res.potdStatus.currentStreak,
                longestStreak: res.potdStatus.longestStreak,
                recentDays: res.potdStatus.recentDays,
              },
            })
          );
        }
      }
      void requestSqlCoach({
        requestMode: res.result.verdict === 'Accepted' ? 'optimizer' : 'analyze',
        verdict: res.result.verdict,
        queryResult: res.result,
        queryOverride: submittedSql,
      });
    } catch (err: unknown) {
      const fallbackErr: SqlQueryResult = {
        verdict: 'Query Error',
        runtimeMs: 0,
        error: err instanceof Error ? err.message : 'Submission failed.',
      };
      evaluatedQueryRef.current = submittedSql;
      setResult(fallbackErr);
      void requestSqlCoach({
        requestMode: 'analyze',
        verdict: fallbackErr.verdict,
        queryResult: fallbackErr,
        queryOverride: submittedSql,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!problem) return;
    try {
      const res = await apiRequest<{ isBookmark: boolean }>(`/problems/${problem.id}/bookmark`, {
        method: 'POST',
      });
      setProblem((prev) => (prev ? { ...prev, isBookmark: res.isBookmark } : null));
    } catch {
      // Ignore transient error
    }
  };

  useEffect(() => {
    const handleWorkspaceCommand = (e: Event) => {
      const detail = (e as CustomEvent<{ action?: string }>).detail;
      if (!detail?.action) return;
      if (detail.action === 'run') {
        expandBottom();
        void handleRunQuery();
      } else if (detail.action === 'submit') {
        expandBottom();
        void handleSubmitQuery();
      } else if (detail.action === 'format') {
        const formatted = formatCode(activeQueryRef.current, 'sql');
        setQuery(formatted);
        setSaveStatus(formatted === savedQueryRef.current ? 'saved' : 'dirty');
      } else if (detail.action === 'reset-layout') {
        resetLayout();
      } else if (detail.action === 'quick-list') {
        setIsProblemDrawerOpen((p) => !p);
      } else if (detail.action === 'toggle-coach') {
        setIsCoachOpen((p) => !p);
      }
    };
    window.addEventListener('codeprep:workspace:action', handleWorkspaceCommand);
    return () => window.removeEventListener('codeprep:workspace:action', handleWorkspaceCommand);
  });

  const handleUnlockAndLoadSolution = async () => {
    if (!problem) return;
    setIsUnlockingSolution(true);
    setSolutionError(null);
    try {
      await apiRequest(`/study/timer/unlock/${problem.id}`, { method: 'POST' });
      const res = await apiRequest<{ lesson: { verifiedSolution: string } }>(`/study/lesson/${problem.id}`);
      setSolutionSql(res.lesson.verifiedSolution);
      setProblem((prev) => (prev ? { ...prev, unlockedAiSolution: true } : null));
    } catch (err: unknown) {
      setSolutionSql(null);
      setSolutionError(err instanceof Error ? err.message : 'Unable to load reference query right now.');
    } finally {
      setIsUnlockingSolution(false);
    }
  };

  const handleNavigate = async (action: () => void) => {
    if (problem && query !== savedQueryRef.current) {
      await persistDraftNow(problem.id, query);
    }
    action();
  };

  if (isLoading || !problem) {
    return (
      <CodePrepLoader
        variant="fullscreen"
        label={`Loading SQL Challenge #${problemId}`}
        sublabel="Building relational schema tables & sandbox database..."
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden animate-page-enter">
      {/* Header Bar */}
      <div className="relative z-40 h-12 border-b border-border-subtle bg-surface px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigate(onBackToList)}
            className="gap-1 text-xs shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SQL Set</span>
          </Button>
          {onNavigateProblem && (
            <button
              type="button"
              onClick={() => setIsProblemDrawerOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high text-text-primary text-xs font-medium transition-colors border border-border-subtle shrink-0"
              title="Quick switch SQL problems (Drawer)"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-primary" />
              <span className="hidden lg:inline">Quick List</span>
            </button>
          )}
          <span className="text-border-default">|</span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                handleNavigate(() =>
                  onNavigateProblem?.(problem.id === 731 ? 600 : problem.id - 1)
                )
              }
              disabled={problem.id <= 501}
              className="p-1 rounded hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:text-text-primary transition-colors"
              title="Previous SQL Problem"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-text-muted">#{problem.id}</span>
            <button
              type="button"
              onClick={() =>
                handleNavigate(() =>
                  onNavigateProblem?.(problem.id === 600 ? 731 : problem.id + 1)
                )
              }
              disabled={problem.id >= 1030}
              className="p-1 rounded hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:text-text-primary transition-colors"
              title="Next SQL Problem"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-sm font-semibold text-text-primary truncate">{problem.title}</h2>
          <span
            className={`text-xs font-mono px-2.5 py-0.5 rounded-full shrink-0 ${
              problem.difficulty === 'Easy'
                ? 'bg-success-subtle text-success'
                : problem.difficulty === 'Hard'
                ? 'bg-danger-subtle text-danger'
                : 'bg-warning-subtle text-warning'
            }`}
          >
            {problem.difficulty}
          </span>
          {problem.isSolved && (
            <span className="hidden md:flex items-center gap-1 text-xs text-success font-mono shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Solved</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCustomLayout && (
            <button
              type="button"
              onClick={resetLayout}
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high text-[11px] font-medium text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
              title="Reset workspace pane sizes to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Layout</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!isCoachOpen) {
                setIsCoachOpen(true);
                setHasUnreadCoach(false);
                if (analyzedQueryRef.current !== query || !coachAnalysis) {
                  const matchesEvaluated = Boolean(result && evaluatedQueryRef.current === query);
                  void requestSqlCoach({
                    requestMode: matchesEvaluated && result?.verdict === 'Accepted' ? 'optimizer' : 'analyze',
                    verdict: matchesEvaluated ? result?.verdict : undefined,
                    queryResult: matchesEvaluated ? result ?? undefined : undefined,
                  });
                }
              } else {
                setIsCoachOpen(false);
              }
            }}
            aria-expanded={isCoachOpen}
            className={`relative px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 transition-colors ${
              isCoachOpen
                ? 'bg-primary text-black border-primary'
                : 'bg-primary-subtle hover:bg-primary/20 text-primary border-primary/35'
            }`}
            title="Toggle AI SQL Coach & Mistake Analyzer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Coach</span>
            {hasUnreadCoach && !isCoachOpen && (
              <span className="h-2 w-2 rounded-full bg-success animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={handleBookmarkToggle}
            className={`p-1.5 rounded-lg border transition-colors ${
              problem.isBookmark
                ? 'text-primary bg-primary-subtle border-primary/40'
                : 'text-text-muted hover:text-text-primary bg-surface-elevated border-border-subtle'
            }`}
            title={problem.isBookmark ? 'Saved to Bookmarks' : 'Bookmark Problem'}
          >
            <Bookmark className="w-4 h-4" fill={problem.isBookmark ? 'currentColor' : 'none'} />
          </button>

          <ThemeToggle compact />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              expandBottom();
              void handleRunQuery(true);
            }}
            disabled={isRunning}
            className="gap-1.5 text-xs border border-border-subtle"
            title="Inspect SQLite EXPLAIN QUERY PLAN (index scans vs full scans)"
          >
            <TableIcon className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Explain Plan</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              expandBottom();
              void handleRunQuery(false);
            }}
            disabled={isRunning}
            className="gap-1.5 text-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Running...' : 'Run Query'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              expandBottom();
              void handleSubmitQuery();
            }}
            disabled={isRunning}
            className="gap-1.5 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Submit</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div
        ref={splitContainerRef}
        style={{ '--sql-left-w': `${layout.leftWidthPct}%` } as React.CSSProperties}
        className="flex-1 flex flex-col md:flex-row overflow-hidden relative"
      >
        {/* Left Pane: Spec, Schema & Solution Tabs */}
        {layout.maximizedPane !== 'editor' && layout.maximizedPane !== 'console' && (
        <div
          className={`${
            layout.maximizedPane === 'spec'
              ? 'w-full h-full flex-1'
              : 'w-full md:flex-none md:w-[var(--sql-left-w)] h-[44%] md:h-full'
          } flex flex-col border-b md:border-b-0 border-border-subtle bg-surface overflow-hidden min-w-0 ${
            isDraggingSplit ? '' : 'transition-[width] duration-75'
          }`}
        >
          <div className="h-11 border-b border-border-subtle bg-surface/90 px-3 flex items-center gap-1 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveLeftTab('description')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
                activeLeftTab === 'description'
                  ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Description</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveLeftTab('solution');
                if ((problem.isSolved || problem.unlockedAiSolution) && !solutionSql && !isUnlockingSolution) {
                  void handleUnlockAndLoadSolution();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
                activeLeftTab === 'solution'
                  ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-warning" />
              <span>Solution</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLeftTab('submissions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
                activeLeftTab === 'submissions'
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

            <button
              type="button"
              onClick={() => toggleMaximize('spec')}
              className={`ml-auto p-1.5 rounded-lg border transition-colors shrink-0 ${
                layout.maximizedPane === 'spec'
                  ? 'bg-primary-subtle text-primary border-primary/40'
                  : 'text-text-muted hover:text-text-primary bg-surface-elevated/60 hover:bg-surface-high border-border-subtle'
              }`}
              title={layout.maximizedPane === 'spec' ? 'Restore split view' : 'Maximize description pane'}
            >
              {layout.maximizedPane === 'spec' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeLeftTab === 'description' ? (
              <>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-primary uppercase tracking-wider">{problem.topic}</span>
                  </div>
                  <h3 className="text-xl font-bold text-text-primary">Problem Statement</h3>
                  <p className="text-[15px] text-text-secondary mt-2.5 leading-relaxed whitespace-pre-wrap">
                    {problem.statement}
                  </p>
                </div>

                <SqlSchemaTables
                  schemaDdl={problem.schemaDdl}
                  expectedResult={problem.expectedResult}
                />

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Query Rules</h4>
                  <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-mono text-text-muted space-y-1">
                    <div>• Isolated SQLite sandbox seeded cleanly per execution</div>
                    <div>• Read-only SELECT or WITH statements permitted</div>
                    <div>• Prohibited: DROP, ALTER, TRUNCATE, INSERT, UPDATE, DELETE</div>
                  </div>
                </div>
              </>
            ) : activeLeftTab === 'solution' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-text-primary">Reference SQL Solution</span>
                </div>
                {!solutionSql ? (
                  <div className="p-5 rounded-xl bg-surface-elevated border border-border-subtle space-y-3 text-center">
                    {solutionError ? (
                      <p className="text-xs font-mono text-danger">{solutionError}</p>
                    ) : (
                      <p className="text-xs text-text-secondary">
                        Reveal the reference query for #{problem.id} cleanly in one click.
                      </p>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleUnlockAndLoadSolution}
                      isLoading={isUnlockingSolution}
                      icon={<Unlock className="w-3.5 h-3.5" />}
                    >
                      {solutionError ? 'Retry Loading Solution' : 'Unlock Solution'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden border border-border-subtle code-window-card">
                      <div className="px-4 py-2 bg-surface-elevated/60 border-b border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                        <span className="text-text-secondary">solution.sql</span>
                        <span className="text-[10px] uppercase tracking-wider">SQLite Optimal</span>
                      </div>
                      <div className="p-4 bg-canvas/55 overflow-x-auto">
                        <HighlightedCode
                          code={solutionSql}
                          language="sql"
                          className="text-xs leading-relaxed"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(solutionSql);
                        setCopiedSolution(true);
                        setTimeout(() => setCopiedSolution(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-primary inline-flex items-center gap-1.5 transition-colors"
                    >
                      {copiedSolution ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSolution ? 'Copied' : 'Copy Query'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-text-primary">SQL Submission History</h3>
                  <span className="text-xs font-mono text-text-muted">Stored in database</span>
                </div>

                {!problem.recentSubmissions || problem.recentSubmissions.length === 0 ? (
                  <div className="p-6 rounded-xl bg-surface-subtle border border-border-subtle text-sm text-text-muted text-center">
                    No SQL submissions recorded yet for #{problem.id}. Submit your query to track verdict history.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {problem.recentSubmissions.map((sub) => {
                      const isAccepted = sub.verdict === 'Accepted';
                      const isPreview = previewSqlSubId === sub.id;
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
                                {typeof sub.runtimeMs === 'number' && (
                                  <span className="text-xs font-mono text-text-muted">
                                    {sub.runtimeMs} ms
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
                                  onClick={() => setPreviewSqlSubId(isPreview ? null : sub.id)}
                                  className={`px-2 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-colors ${
                                    isPreview
                                      ? 'bg-primary-subtle text-primary border-primary/40'
                                      : 'bg-surface-elevated hover:bg-surface-high border-border-subtle text-text-muted hover:text-text-primary'
                                  }`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{isPreview ? 'Hide' : 'View'}</span>
                                </button>
                              )}
                              {sub.code && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuery(sub.code);
                                    setSaveStatus(sub.code === savedQueryRef.current ? 'saved' : 'dirty');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-primary flex items-center gap-1.5"
                                >
                                  <Code2 className="w-3.5 h-3.5 text-primary" />
                                  <span>Load</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {isPreview && sub.code && (
                            <div className="border-t border-border-subtle bg-canvas p-3 max-h-52 overflow-auto">
                              <HighlightedCode code={sub.code} language="sql" className="text-xs leading-5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {layout.maximizedPane === 'none' && (
          <ResizableDivider
            orientation="vertical"
            onDragStateChange={setIsDraggingSplit}
            onDragDelta={(deltaPx) => {
              const containerWidth = splitContainerRef.current?.clientWidth || window.innerWidth;
              if (containerWidth <= 0) return;
              const deltaPct = (deltaPx / containerWidth) * 100;
              setLeftWidthPct(layout.leftWidthPct + deltaPct);
            }}
            onDoubleClick={() => setLeftWidthPct(44)}
            title="Drag to resize description & SQL editor width (double-click to reset)"
          />
        )}

        {/* Right Pane: SQL Editor + Output Table */}
        {layout.maximizedPane !== 'spec' && (
        <div
          ref={rightColumnRef}
          className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden"
        >
          {layout.maximizedPane !== 'console' && (
          <div className="flex-1 min-h-[120px] flex flex-col bg-canvas overflow-hidden">
            <div className="px-4 py-2 border-b border-border-subtle bg-surface flex items-center justify-between gap-2 text-xs font-mono text-text-secondary shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  <span>SQL Query Editor</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSqlCheatSheet((prev) => !prev)}
                  className="px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[10px] text-text-muted hover:text-text-primary transition-colors"
                >
                  {showSqlCheatSheet ? 'Hide SQL Tips' : 'SQL Tips'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const formatted = formatCode(query, 'sql');
                    if (formatted !== query) setQuery(formatted);
                    setJustFormattedSql(true);
                    window.setTimeout(() => setJustFormattedSql(false), 1500);
                  }}
                  className="px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[10px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
                  title="Format SQL query spacing & keywords (Shift+Alt+F)"
                >
                  {justFormattedSql ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <AlignLeft className="w-3 h-3 text-primary" />
                  )}
                  <span>{justFormattedSql ? 'Formatted' : 'Format'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoFormatSql((prev) => {
                      const next = !prev;
                      try {
                        localStorage.setItem('codeprep_auto_format', String(next));
                      } catch {
                        // Ignore storage errors
                      }
                      return next;
                    });
                  }}
                  className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-colors ${
                    autoFormatSql
                      ? 'bg-success-subtle text-success border-success/35'
                      : 'bg-surface-elevated text-text-muted border-border-subtle'
                  }`}
                  title="Auto-format pasted SQL queries"
                >
                  <span>Auto {autoFormatSql ? 'ON' : 'OFF'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex items-center rounded border border-border-subtle bg-surface-elevated overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setFontSizePx((prev) => {
                        const next = Math.max(12, prev - 1);
                        try {
                          localStorage.setItem('codeprep_editor_font_size', String(next));
                        } catch {}
                        return next;
                      })
                    }
                    disabled={fontSizePx <= 12}
                    className="px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text-primary disabled:opacity-40"
                    title="Decrease SQL font size"
                  >
                    A-
                  </button>
                  <span className="px-1 text-[10px] text-text-muted border-x border-border-subtle">
                    {fontSizePx}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFontSizePx((prev) => {
                        const next = Math.min(16, prev + 1);
                        try {
                          localStorage.setItem('codeprep_editor_font_size', String(next));
                        } catch {}
                        return next;
                      })
                    }
                    disabled={fontSizePx >= 16}
                    className="px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text-primary disabled:opacity-40"
                    title="Increase SQL font size"
                  >
                    A+
                  </button>
                </div>
                <span className="hidden xl:inline text-[10px] text-text-muted">
                  Ln {cursorInfo.line}, Col {cursorInfo.col}
                </span>
                <span className={saveStatus === 'saved' ? 'text-success' : 'text-warning'}>
                  {saveStatus === 'saving'
                    ? 'Saving...'
                    : saveStatus === 'dirty'
                    ? 'Unsaved edits'
                    : 'Draft saved'}
                </span>
                <button
                  type="button"
                  onClick={() => toggleMaximize('editor')}
                  className={`p-1 rounded border transition-colors ${
                    layout.maximizedPane === 'editor'
                      ? 'bg-primary-subtle text-primary border-primary/40'
                      : 'text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-high border-border-subtle'
                  }`}
                  title={layout.maximizedPane === 'editor' ? 'Restore editor height' : 'Maximize SQL editor'}
                >
                  {layout.maximizedPane === 'editor' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {showSqlCheatSheet && (
              <div className="px-4 py-2 bg-surface-subtle border-b border-border-subtle text-[11px] font-mono text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
                <span><strong className="text-primary">Window:</strong> RANK() OVER (PARTITION BY col ORDER BY col DESC)</span>
                <span><strong className="text-primary">Month:</strong> strftime(&apos;%Y-%m&apos;, dt)</span>
                <span><strong className="text-primary">Date Diff:</strong> julianday(d1) - julianday(d2)</span>
                <span><strong className="text-primary">Null Safe:</strong> COALESCE(val, 0)</span>
              </div>
            )}

            <HighlightedCodeEditor
              value={query}
              onChange={setQuery}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  expandBottom();
                  if (e.shiftKey) {
                    handleSubmitQuery();
                  } else {
                    handleRunQuery(false);
                  }
                }
              }}
              language="sql"
              schemaDdl={problem.schemaDdl}
              showLineNumbers
              paddingClass="p-4"
              autoFormat={autoFormatSql}
              fontSizePx={fontSizePx}
              onCursorChange={setCursorInfo}
              onSaveShortcut={() => void persistDraftNow(problem.id, query)}
              onFormatted={() => {
                setJustFormattedSql(true);
                window.setTimeout(() => setJustFormattedSql(false), 1500);
              }}
            />
          </div>
          )}

          {layout.maximizedPane === 'none' && !layout.isBottomCollapsed && (
            <ResizableDivider
              orientation="horizontal"
              onDragStateChange={setIsDraggingSplit}
              onDragDelta={(deltaPx) => {
                const maxH = Math.max(220, (rightColumnRef.current?.clientHeight || 600) - 140);
                setBottomHeightPx(Math.min(maxH, layout.bottomHeightPx - deltaPx));
              }}
              onDoubleClick={() => setBottomHeightPx(270)}
              title="Drag to resize SQL editor & result output height (double-click to reset)"
            />
          )}

          {layout.maximizedPane !== 'editor' && (
          <div
            style={
              layout.maximizedPane === 'console'
                ? undefined
                : layout.isBottomCollapsed
                  ? undefined
                  : { height: `${layout.bottomHeightPx}px` }
            }
            className={`${
              layout.maximizedPane === 'console' ? 'flex-1 h-full' : layout.isBottomCollapsed ? 'h-10' : ''
            } flex flex-col bg-surface overflow-hidden shrink-0 border-t border-border-subtle`}
          >
            <div className="h-10 px-4 border-b border-border-subtle bg-surface-elevated flex items-center justify-between text-xs shrink-0">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5 text-primary" />
                <span>Query Result Output</span>
              </span>
              <div className="flex items-center gap-2">
                {result && (
                  <div className="flex items-center gap-2 font-mono text-xs mr-1">
                    <span
                      className={
                        result.verdict === 'Accepted'
                          ? 'text-success font-bold'
                          : result.verdict === 'Query Plan'
                          ? 'text-primary font-bold'
                          : 'text-danger font-bold'
                      }
                    >
                      {result.verdict}
                    </span>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-secondary">{result.runtimeMs} ms</span>
                    {result.verdict === 'Accepted' && sqlBenchmarks && (
                      <>
                        <span className="text-text-muted">•</span>
                        <span className="text-success font-semibold">
                          Beats {sqlBenchmarks.runtimePercentile.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                )}

                {layout.maximizedPane !== 'console' && (
                  <button
                    type="button"
                    onClick={toggleBottomCollapsed}
                    className="p-1 rounded bg-surface hover:bg-surface-high text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
                    title={layout.isBottomCollapsed ? 'Expand output panel' : 'Collapse output panel'}
                  >
                    {layout.isBottomCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => toggleMaximize('console')}
                  className={`p-1 rounded border transition-colors ${
                    layout.maximizedPane === 'console'
                      ? 'bg-primary-subtle text-primary border-primary/40'
                      : 'bg-surface hover:bg-surface-high text-text-muted hover:text-text-primary border-border-subtle'
                  }`}
                  title={layout.maximizedPane === 'console' ? 'Restore output height' : 'Maximize query result output'}
                >
                  {layout.maximizedPane === 'console' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!layout.isBottomCollapsed && (
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {!result && (
                <div className="h-full flex flex-col items-center justify-center text-sm text-text-muted gap-2">
                  <Play className="w-6 h-6 opacity-40" />
                  <span>Run your SQL query above to inspect real table output.</span>
                </div>
              )}

              {result?.error && (
                <div className="p-3.5 bg-danger-subtle border border-danger/30 rounded-xl text-xs text-danger font-mono">
                  {result.error}
                </div>
              )}

              {result?.rows && result.rows.length > 0 && result.columns && (
                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-text-muted">Your Output ({result.rows.length} rows)</div>
                  <div className="border border-border-subtle rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-elevated border-b border-border-subtle font-mono text-text-secondary">
                        <tr>
                          {result.columns.map((col) => (
                            <th key={col} className="py-2 px-3 font-semibold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle font-mono text-xs">
                        {result.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-surface-elevated/40">
                            {result.columns!.map((col) => (
                              <td key={col} className="py-2 px-3 text-text-primary">
                                {String(row[col] ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result?.verdict === 'Wrong Answer' && result.expectedRows && result.expectedRows.length > 0 && result.expectedColumns && (
                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-success">Expected Output ({result.expectedRows.length} rows)</div>
                  <div className="border border-success/30 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-success-subtle border-b border-success/20 font-mono text-success">
                        <tr>
                          {result.expectedColumns.map((col) => (
                            <th key={col} className="py-2 px-3 font-semibold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle font-mono text-xs">
                        {result.expectedRows.slice(0, 10).map((row, rIdx) => (
                          <tr key={rIdx}>
                            {result.expectedColumns!.map((col) => (
                              <td key={col} className="py-2 px-3 text-text-primary">
                                {String(row[col] ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result?.rows && result.rows.length === 0 && !result.error && (
                <div className="text-xs text-text-muted font-mono">
                  Query executed successfully. (0 rows returned)
                </div>
              )}
            </div>
            )}
          </div>
          )}
        </div>
        )}
      </div>

      {onNavigateProblem && (
        <WorkspaceProblemDrawer
          isOpen={isProblemDrawerOpen}
          onClose={() => setIsProblemDrawerOpen(false)}
          currentProblemId={problem.id}
          mode="sql"
          onSelectProblem={(nextId) => handleNavigate(() => onNavigateProblem(nextId))}
        />
      )}

      <HintsDrawer
        isOpen={isCoachOpen}
        onClose={() => setIsCoachOpen(false)}
        guidanceMessage={coachGuidance}
        analysis={coachAnalysis}
        provider={coachProvider}
        providerNote={coachProviderNote}
        currentVerdict={evaluatedQueryRef.current === query ? result?.verdict : undefined}
        isSolved={Boolean(problem.isSolved)}
        category="SQL"
        onAnalyzeMethod={(question) =>
          requestSqlCoach({
            requestMode: 'analyze',
            userQuestion: question,
          })
        }
        onRequestHint={(lvl) =>
          requestSqlCoach({
            hintLevel: lvl,
            requestMode: 'hint',
          })
        }
        isLoading={isCoachLoading}
      />
    </div>
  );
};
