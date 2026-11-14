import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../services/api';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { SqlSchemaTables } from '../components/workspace/SqlSchemaTables';
import { HighlightedCode, HighlightedCodeEditor } from '../components/ui/CodeHighlight';
import {
  Database,
  Table as TableIcon,
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
  X,
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
}

interface SqlQueryResult {
  verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Query Error';
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

  // Reference solution modal state
  const [showSolution, setShowSolution] = useState(false);
  const [solutionSql, setSolutionSql] = useState<string | null>(null);
  const [isUnlockingSolution, setIsUnlockingSolution] = useState(false);
  const [copiedSolution, setCopiedSolution] = useState(false);
  const [showSqlCheatSheet, setShowSqlCheatSheet] = useState(false);

  const savedQueryRef = useRef<string>('');
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
      setShowSolution(false);
      setSolutionSql(null);
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

  const handleRunQuery = async () => {
    if (!problem) return;
    void persistDraftNow(problem.id, query);
    setIsRunning(true);
    try {
      const res = await apiRequest<{ result: SqlQueryResult }>('/submissions/run', {
        method: 'POST',
        body: JSON.stringify({
          problemId,
          code: query,
        }),
      });
      setResult(res.result);
    } catch (err: unknown) {
      setResult({
        verdict: 'Query Error',
        runtimeMs: 0,
        error: err instanceof Error ? err.message : 'Database query failed.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitQuery = async () => {
    if (!problem) return;
    void persistDraftNow(problem.id, query);
    setIsRunning(true);
    try {
      const res = await apiRequest<{ result: SqlQueryResult; submissionId: string }>('/submissions/submit', {
        method: 'POST',
        body: JSON.stringify({
          problemId,
          code: query,
        }),
      });
      setResult(res.result);
      if (res.result.verdict === 'Accepted' && problem) {
        setProblem({ ...problem, isSolved: true });
        window.dispatchEvent(new CustomEvent('codeprep:progress-updated'));
      }
    } catch (err: unknown) {
      setResult({
        verdict: 'Query Error',
        runtimeMs: 0,
        error: err instanceof Error ? err.message : 'Submission failed.',
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

  const handleUnlockAndLoadSolution = async () => {
    if (!problem) return;
    setIsUnlockingSolution(true);
    try {
      await apiRequest(`/study/timer/unlock/${problem.id}`, { method: 'POST' });
      const res = await apiRequest<{ lesson: { verifiedSolution: string } }>(`/study/lesson/${problem.id}`);
      setSolutionSql(res.lesson.verifiedSolution);
      setProblem((prev) => (prev ? { ...prev, unlockedAiSolution: true } : null));
    } catch {
      setSolutionSql('-- Unable to load reference query right now.');
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
      <div className="h-12 border-b border-border-subtle bg-surface px-4 flex items-center justify-between gap-2">
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
          <span className="text-border-default">|</span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate(() => onNavigateProblem?.(problem.id - 1))}
              disabled={problem.id <= 501}
              className="p-1 rounded hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:text-text-primary transition-colors"
              title="Previous SQL Problem"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-text-muted">#{problem.id}</span>
            <button
              type="button"
              onClick={() => handleNavigate(() => onNavigateProblem?.(problem.id + 1))}
              disabled={problem.id >= 600}
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
          <button
            type="button"
            onClick={() => {
              setShowSolution((prev) => !prev);
              if (!showSolution && (problem.isSolved || problem.unlockedAiSolution) && !solutionSql) {
                handleUnlockAndLoadSolution();
              }
            }}
            className="hidden sm:flex px-2.5 py-1.5 rounded-lg text-xs font-mono bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary border border-border-subtle items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-warning" />
            <span>Solution</span>
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
            variant="secondary"
            size="sm"
            onClick={handleRunQuery}
            disabled={isRunning}
            className="gap-1.5 text-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Running...' : 'Run Query'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitQuery}
            disabled={isRunning}
            className="gap-1.5 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Submit</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Pane: Spec & Schema */}
        <div className="w-full md:w-[44%] h-full border-r border-border-subtle overflow-y-auto p-6 space-y-6 bg-surface">
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

          {showSolution && (
            <div className="p-4 rounded-xl bg-surface-elevated border border-primary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Reference SQL Solution</span>
                <button
                  type="button"
                  onClick={() => setShowSolution(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {!solutionSql ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-text-secondary">
                    Reveal the reference query for #{problem.id} cleanly in one click.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleUnlockAndLoadSolution}
                    isLoading={isUnlockingSolution}
                    icon={<Unlock className="w-3.5 h-3.5" />}
                  >
                    Unlock Solution
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-surface border border-border-subtle overflow-x-auto">
                    <HighlightedCode
                      code={solutionSql}
                      language="sql"
                      className="text-xs leading-relaxed"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(solutionSql);
                      setCopiedSolution(true);
                      setTimeout(() => setCopiedSolution(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-md bg-surface border border-border-subtle text-xs font-mono text-text-primary inline-flex items-center gap-1.5"
                  >
                    {copiedSolution ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSolution ? 'Copied' : 'Copy Query'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: SQL Editor + Output Table */}
        <div className="w-full md:w-[56%] h-full flex flex-col">
          <div className="h-[50%] flex flex-col border-b border-border-subtle bg-canvas">
            <div className="px-4 py-2 border-b border-border-subtle bg-surface flex items-center justify-between gap-2 text-xs font-mono text-text-secondary">
              <div className="flex items-center gap-3">
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
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden lg:inline text-[10px] text-text-muted">Ctrl+Enter to Run</span>
                <span className={saveStatus === 'saved' ? 'text-success' : 'text-warning'}>
                  {saveStatus === 'saving'
                    ? 'Saving...'
                    : saveStatus === 'dirty'
                    ? 'Unsaved edits'
                    : 'Draft saved'}
                </span>
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
                  if (e.shiftKey) {
                    handleSubmitQuery();
                  } else {
                    handleRunQuery();
                  }
                }
              }}
              language="sql"
              showLineNumbers
              paddingClass="p-4"
            />
          </div>

          <div className="h-[50%] flex flex-col bg-surface overflow-hidden">
            <div className="px-4 py-2 border-b border-border-subtle bg-surface-elevated flex items-center justify-between text-xs">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5 text-primary" />
                <span>Query Result Output</span>
              </span>
              {result && (
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className={result.verdict === 'Accepted' ? 'text-success font-bold' : 'text-danger font-bold'}>
                    {result.verdict}
                  </span>
                  <span className="text-text-muted">•</span>
                  <span className="text-text-secondary">{result.runtimeMs} ms</span>
                </div>
              )}
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
};
