import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Problem, ExecutionResult, TestCase } from '../types/problem';
import { ProblemHeader } from '../components/workspace/ProblemHeader';
import { ProblemSpecPane } from '../components/workspace/ProblemSpecPane';
import { EditorPane } from '../components/workspace/EditorPane';
import { TestRunnerPane } from '../components/workspace/TestRunnerPane';
import { HintsDrawer } from '../components/workspace/HintsDrawer';
import { PerformanceCurveModal } from '../components/workspace/PerformanceCurveModal';
import { Activity, BookOpen, Lightbulb, Flame, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';

interface ProblemWorkspacePageProps {
  problemId: number;
  onNavigateProblem: (newId: number) => void;
  onBackToList: () => void;
  onOpenAiSolution: () => void;
}

export const ProblemWorkspacePage: React.FC<ProblemWorkspacePageProps> = ({
  problemId,
  onNavigateProblem,
  onBackToList,
  onOpenAiSolution,
}) => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState<boolean>(false);

  // Separate Hints & Diagnostics pane state
  const [teacherGuidance, setTeacherGuidance] = useState<string>('');
  const [isTeacherLoading, setIsTeacherLoading] = useState<boolean>(false);
  const [isHintsOpen, setIsHintsOpen] = useState<boolean>(false);
  const [hasUnreadGuidance, setHasUnreadGuidance] = useState<boolean>(false);
  const [potdInfo, setPotdInfo] = useState<{ isPotd: boolean; solvedToday: boolean; currentStreak: number }>({
    isPotd: false,
    solvedToday: false,
    currentStreak: 0,
  });
  const [potdBannerMsg, setPotdBannerMsg] = useState<string | null>(null);

  const lastActiveTimestampRef = useRef<number>(Date.now());
  const savedCodeRef = useRef<string>('');
  const activeCodeRef = useRef<string>('');
  const activeProblemIdRef = useRef<number>(problemId);

  activeCodeRef.current = code;
  activeProblemIdRef.current = problemId;

  const persistDraftNow = useCallback(async (targetProblemId: number, draftCode: string) => {
    if (!draftCode || draftCode === savedCodeRef.current) return;
    setSaveStatus('saving');
    try {
      await apiRequest(`/problems/${targetProblemId}/draft`, {
        method: 'POST',
        body: JSON.stringify({ code: draftCode }),
      });
      if (activeProblemIdRef.current === targetProblemId) {
        savedCodeRef.current = draftCode;
        setSaveStatus('saved');
      }
    } catch {
      if (activeProblemIdRef.current === targetProblemId) {
        setSaveStatus('error');
      }
    }
  }, []);

  // Activity listeners for active focus tracking
  useEffect(() => {
    const recordActivity = () => {
      lastActiveTimestampRef.current = Date.now();
    };

    window.addEventListener('keydown', recordActivity);
    window.addEventListener('mousemove', recordActivity);
    window.addEventListener('click', recordActivity);

    return () => {
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('click', recordActivity);
    };
  }, []);

  // Periodic focus timer heartbeat (every 5 seconds)
  useEffect(() => {
    const heartbeatInterval = setInterval(async () => {
      if (document.hidden) return;
      const idleDuration = (Date.now() - lastActiveTimestampRef.current) / 1000;
      const isUserActive = idleDuration < 120;

      try {
        await apiRequest('/study/timer/heartbeat', {
          method: 'POST',
          body: JSON.stringify({
            problemId,
            isTabActive: isUserActive,
          }),
        });
      } catch {
        // Silent ignore on background heartbeat
      }
    }, 5000);

    return () => clearInterval(heartbeatInterval);
  }, [problemId]);

  // Load problem details, saved draft, notes & submissions
  const loadProblem = useCallback(async (id: number) => {
    setIsLoading(true);
    setPotdBannerMsg(null);
    try {
      const [res, dashRes] = await Promise.all([
        apiRequest<{ problem: Problem }>(`/problems/${id}`),
        apiRequest<{
          analytics?: { currentStreak?: number; potd?: { id: number; solvedToday: boolean } };
        }>('/analytics/dashboard').catch(() => null),
      ]);
      const initialCode = res.problem.userDraftCode || res.problem.defaultCodeStub || '';
      setProblem(res.problem);
      setCode(initialCode);
      savedCodeRef.current = initialCode;
      setSaveStatus('saved');
      setExecutionResult(null);
      setTeacherGuidance('');
      setHasUnreadGuidance(false);

      const potd = dashRes?.analytics?.potd;
      setPotdInfo({
        isPotd: potd?.id === id,
        solvedToday: Boolean(potd?.solvedToday),
        currentStreak: dashRes?.analytics?.currentStreak ?? 0,
      });
    } catch {
      alert(`Problem #${id} could not be loaded.`);
      onBackToList();
    } finally {
      setIsLoading(false);
    }
  }, [onBackToList]);

  useEffect(() => {
    loadProblem(problemId);
  }, [problemId, loadProblem]);

  // Fast 1.5s debounced autosave to SQLite whenever code changes
  useEffect(() => {
    if (!problem || code === savedCodeRef.current) return;
    setSaveStatus('dirty');

    const timer = setTimeout(() => {
      persistDraftNow(problem.id, code);
    }, 1500);

    return () => clearTimeout(timer);
  }, [code, problem, persistDraftNow]);

  // Flush unsaved draft cleanly when navigating away or closing tab
  useEffect(() => {
    const handleUnload = () => {
      if (activeCodeRef.current !== savedCodeRef.current) {
        persistDraftNow(activeProblemIdRef.current, activeCodeRef.current);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [persistDraftNow]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setSaveStatus(newCode === savedCodeRef.current ? 'saved' : 'dirty');
  };

  const requestTeacherFeedback = async (verdict?: string, result?: ExecutionResult, hintLevel = 1) => {
    if (!problem) return;
    setIsTeacherLoading(true);
    try {
      const res = await apiRequest<{ feedback: { message: string } }>('/study/guidance', {
        method: 'POST',
        body: JSON.stringify({
          problemId: problem.id,
          userCode: code,
          verdict,
          executionResult: result,
          hintLevel,
          isSolved: problem.isSolved || result?.verdict === 'Accepted',
        }),
      });
      setTeacherGuidance(res.feedback.message);
      if (!isHintsOpen) {
        setHasUnreadGuidance(true);
      }
    } catch {
      setTeacherGuidance('Use the progressive hint buttons below to inspect intuition and edge cases.');
    } finally {
      setIsTeacherLoading(false);
    }
  };

  const handleToggleHints = () => {
    setIsHintsOpen((prev) => {
      const next = !prev;
      if (next) {
        setHasUnreadGuidance(false);
      }
      return next;
    });
  };

  const handleRun = async (customTestCases?: TestCase[]) => {
    if (!problem) return;
    await persistDraftNow(problem.id, code);
    setIsRunning(true);
    try {
      const res = await apiRequest<{ result: ExecutionResult }>('/submissions/run', {
        method: 'POST',
        body: JSON.stringify({
          problemId: problem.id,
          code,
          customTestCases,
        }),
      });
      setExecutionResult(res.result);
      requestTeacherFeedback(res.result.verdict, res.result);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem) return;
    await persistDraftNow(problem.id, code);
    setIsSubmitting(true);
    try {
      const res = await apiRequest<{
        result: ExecutionResult;
        submissionId: string;
        potdStatus?: { isPotd: boolean; solvedToday: boolean; currentStreak: number };
      }>('/submissions/submit', {
        method: 'POST',
        body: JSON.stringify({
          problemId: problem.id,
          code,
        }),
      });
      setExecutionResult(res.result);

      const newHistoryItem = {
        id: res.submissionId,
        verdict: res.result.verdict,
        runtimeMs: res.result.runtimeMs,
        memoryKb: res.result.memoryKb,
        submittedAt: new Date().toISOString(),
        code,
      };

      setProblem((prev) =>
        prev
          ? {
              ...prev,
              isSolved: prev.isSolved || res.result.verdict === 'Accepted',
              recentSubmissions: [newHistoryItem, ...(prev.recentSubmissions || [])].slice(0, 20),
            }
          : null
      );

      if (res.result.verdict === 'Accepted') {
        window.dispatchEvent(new CustomEvent('codeprep:progress-updated'));
        if (res.potdStatus?.isPotd) {
          setPotdInfo(res.potdStatus);
          setPotdBannerMsg(
            `Daily POTD Solved! Streak maintained at ${res.potdStatus.currentStreak} day${
              res.potdStatus.currentStreak === 1 ? '' : 's'
            }.`
          );
          window.setTimeout(() => setPotdBannerMsg(null), 6000);
        }
      }

      requestTeacherFeedback(res.result.verdict, res.result);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
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
      alert('Failed to update bookmark');
    }
  };

  const handleSaveNotes = async (notes: string) => {
    if (!problem) return;
    const res = await apiRequest<{ notes: string }>(`/problems/${problem.id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    setProblem((prev) => (prev ? { ...prev, userNotes: res.notes } : null));
  };

  const handleNavigateSafely = async (targetAction: () => void) => {
    if (problem && code !== savedCodeRef.current) {
      await persistDraftNow(problem.id, code);
    }
    targetAction();
  };

  if (isLoading || !problem) {
    return (
      <CodePrepLoader
        variant="fullscreen"
        label={`Loading Problem #${problemId}`}
        sublabel="Preparing statement, sample test cases & saved draft..."
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden animate-page-enter">
      {/* Workspace Header */}
      <ProblemHeader
        problem={problem}
        onPrev={() => handleNavigateSafely(() => onNavigateProblem(problemId - 1))}
        onNext={() => handleNavigateSafely(() => onNavigateProblem(problemId + 1))}
        hasPrev={problemId > 1}
        hasNext={problemId < 500}
        onBookmarkToggle={handleBookmarkToggle}
        onBackToList={() => handleNavigateSafely(onBackToList)}
        isPotd={potdInfo.isPotd}
        potdSolvedToday={potdInfo.solvedToday}
        rightActions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPerformanceModalOpen(true)}
              className="hidden md:flex px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary border border-border-subtle items-center gap-1.5"
              title="Measure runtime growth across input sizes"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Complexity</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigateSafely(onOpenAiSolution)}
              className="hidden sm:flex px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary border border-border-subtle items-center gap-1.5"
              title="Open Reference Solution & Walkthrough"
            >
              <BookOpen className="w-3.5 h-3.5 text-warning" />
              <span>Solution</span>
            </button>

            <button
              type="button"
              onClick={handleToggleHints}
              aria-expanded={isHintsOpen}
              className={`relative px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border flex items-center gap-1.5 ${
                isHintsOpen
                  ? 'bg-primary text-black border-primary shadow-sm'
                  : 'bg-primary-subtle hover:bg-primary/20 text-primary border-primary/35'
              }`}
              title="Toggle Hints & Diagnostics Pane"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Hints</span>
              {hasUnreadGuidance && !isHintsOpen && (
                <span className="h-2 w-2 rounded-full bg-success animate-ping" />
              )}
            </button>
          </div>
        }
      />

      {/* Split IDE Workspace + Separate Hints Pane */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div
          className={`w-full h-full transition-all duration-300 ${
            isHintsOpen ? 'md:w-[37%]' : 'md:w-[45%]'
          }`}
        >
          <ProblemSpecPane
            problem={problem}
            onOpenHints={() => {
              setIsHintsOpen(true);
              setHasUnreadGuidance(false);
            }}
            onOpenFullSolution={() => handleNavigateSafely(onOpenAiSolution)}
            onLoadCode={(pastCode) => handleCodeChange(pastCode)}
            onSaveNotes={handleSaveNotes}
            onSolutionUnlocked={() =>
              setProblem((prev) => (prev ? { ...prev, unlockedAiSolution: true } : null))
            }
          />
        </div>

        <div className="flex-1 min-w-0 h-full flex flex-col border-t md:border-t-0 md:border-l border-border-subtle">
          <div className="flex-1 overflow-hidden">
            <EditorPane
              code={code}
              onChange={handleCodeChange}
              onReset={() => handleCodeChange(problem.defaultCodeStub || '')}
              problemId={problem.id}
              saveStatus={saveStatus}
            />
          </div>

          <TestRunnerPane
            sampleTestCases={problem.sampleTestCases}
            functionSignature={problem.functionSignature}
            executionResult={executionResult}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            onRun={handleRun}
            onSubmit={handleSubmit}
          />
        </div>

        <HintsDrawer
          isOpen={isHintsOpen}
          onClose={() => setIsHintsOpen(false)}
          guidanceMessage={teacherGuidance}
          isSolved={Boolean(problem.isSolved)}
          onRequestHint={(lvl) => requestTeacherFeedback(undefined, undefined, lvl)}
          isLoading={isTeacherLoading}
        />
      </div>

      <PerformanceCurveModal
        problemId={problem.id}
        currentCode={code}
        isOpen={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
      />

      {potdBannerMsg && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-elevated border border-success/50 text-xs font-mono text-text-primary shadow-2xl animate-fade-up"
        >
          <span className="h-7 w-7 rounded-lg bg-success-subtle text-success flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 fill-current" />
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>POTD Complete</span>
            </div>
            <div className="text-[11px] text-text-secondary">{potdBannerMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
};
