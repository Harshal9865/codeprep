import React, { useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { DeterministicVisualizer, VisualTraceData } from '../components/workspace/DeterministicVisualizer';
import { Button } from '../components/ui/Button';
import { apiRequest } from '../services/api';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import {
  ArrowLeft,
  BookOpen,
  Lock,
  Unlock,
  Clock,
  Layers,
  Code2,
  Share2,
  Copy,
  Check,
} from 'lucide-react';

interface AiLessonResponse {
  problemId: number;
  techniqueLesson: string;
  visualTrace: VisualTraceData;
  workedExamples: string;
  approachProgression: string;
  verifiedSolution: string;
  similarProblems: Array<{ id: number; title: string }>;
  isSolved: boolean;
  solvedWithAiHelp: boolean;
}

interface TimerStatus {
  problemId: number;
  activeSeconds: number;
  isUnlocked: boolean;
  thresholdSeconds: number;
  remainingSeconds: number;
  isSolved: boolean;
}

interface AiSolutionPageProps {
  problemId: number;
  onBackToProblem: () => void;
  onSelectSimilarProblem: (id: number) => void;
}

export const AiSolutionPage: React.FC<AiSolutionPageProps> = ({
  problemId,
  onBackToProblem,
  onSelectSimilarProblem,
}) => {
  const [lesson, setLesson] = useState<AiLessonResponse | null>(null);
  const [timerStatus, setTimerStatus] = useState<TimerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const timerRes = await apiRequest<{ timer: TimerStatus }>(`/study/timer/status/${problemId}`);
        setTimerStatus(timerRes.timer);

        if (timerRes.timer.isUnlocked) {
          const lessonRes = await apiRequest<{ lesson: AiLessonResponse }>(`/study/lesson/${problemId}`);
          setLesson(lessonRes.lesson);
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to check solution status.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [problemId]);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setErrorMsg(null);
    try {
      await apiRequest(`/study/timer/unlock/${problemId}`, { method: 'POST' });
      const lessonRes = await apiRequest<{ lesson: AiLessonResponse }>(`/study/lesson/${problemId}`);
      setLesson(lessonRes.lesson);
      setTimerStatus((prev) => (prev ? { ...prev, isUnlocked: true } : null));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCopySolution = () => {
    if (!lesson) return;
    navigator.clipboard.writeText(lesson.verifiedSolution);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLoading) {
    return (
      <AppLayout showFooter={false}>
        <CodePrepLoader
          variant="section"
          className="flex-1 min-h-[380px]"
          label="Loading Reference Walkthrough"
          sublabel="Preparing complexity breakdown & visual trace..."
        />
      </AppLayout>
    );
  }

  // Unlocked Immediately On Demand View
  if (!timerStatus?.isUnlocked && !lesson) {
    return (
      <AppLayout showFooter={true}>
        <div className="max-w-xl mx-auto px-4 py-20 flex flex-col items-center text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-primary-subtle border border-primary/30 flex items-center justify-center text-primary">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
              Reference Solution Ready to Unlock
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
              Solutions stay hidden by default so you can test your own intuition first. Unlock anytime to reveal the optimal implementation and complexity breakdown.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-default space-y-2 font-mono text-xs w-full max-w-sm text-left">
            <div className="flex items-center justify-between text-text-secondary">
              <span>Problem:</span>
              <strong className="text-text-primary">#{problemId}</strong>
            </div>
            <div className="flex items-center justify-between text-text-secondary">
              <span>Time Spent:</span>
              <strong className="text-primary">{formatSeconds(timerStatus?.activeSeconds || 0)}</strong>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-danger-subtle border border-danger/30 text-xs text-danger font-mono w-full max-w-sm">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={handleUnlock}
              isLoading={isUnlocking}
              icon={<Unlock className="w-4 h-4" />}
            >
              Unlock Solution Now
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={onBackToProblem}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Problem
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout currentTab="dsa" showFooter={true}>
      <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8 animate-page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToProblem}
              className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-default text-text-secondary hover:text-text-primary transition-colors"
              title="Return to Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text-muted">#{problemId}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-success-subtle text-success border border-success/30">
                  {lesson?.isSolved ? 'Solved • Compare Approach' : 'Unlocked Study Guide'}
                </span>
              </div>
              <h1 className="font-headline font-bold text-2xl text-text-primary mt-1 tracking-tight">
                Reference Solution &amp; Walkthrough
              </h1>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBackToProblem}
          >
            Back to Editor
          </Button>
        </div>

        {/* 1. Pattern Breakdown */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Technique &amp; Core Pattern</span>
          </div>
          <div className="p-6 rounded-xl bg-surface border border-border-subtle leading-relaxed text-[15px] text-text-primary whitespace-pre-line font-body shadow-sm">
            {lesson?.techniqueLesson}
          </div>
        </section>

        {/* 2. Step-by-Step Trace */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Step-by-Step Walkthrough</span>
          </div>
          {lesson?.visualTrace && <DeterministicVisualizer trace={lesson.visualTrace} />}
        </section>

        {/* 3. Worked Examples */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-warning" />
            <span>Worked Examples &amp; Edge Cases</span>
          </div>
          <div className="p-6 rounded-xl bg-surface border border-border-subtle leading-relaxed text-sm text-text-primary whitespace-pre-line font-mono shadow-sm">
            {lesson?.workedExamples}
          </div>
        </section>

        {/* 4. Complexity Progression */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4 text-success" />
            <span>Complexity Trade-offs</span>
          </div>
          <div className="p-6 rounded-xl bg-surface border border-border-subtle leading-relaxed text-[15px] text-text-primary whitespace-pre-line font-body shadow-sm">
            {lesson?.approachProgression}
          </div>
        </section>

        {/* 5. Verified Optimal Code */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
              <Code2 className="w-4 h-4" />
              <span>Reference Implementation</span>
            </div>
            <button
              type="button"
              onClick={handleCopySolution}
              className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Solution'}</span>
            </button>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-subtle p-5 font-mono text-[13px] overflow-x-auto shadow-sm">
            <pre className="text-text-primary leading-relaxed select-text">
              {lesson?.verifiedSolution}
            </pre>
          </div>
        </section>

        {/* 6. Similar Practice Problems */}
        <section className="space-y-3 pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-2 text-text-secondary font-mono text-xs font-bold uppercase tracking-wider">
            <Share2 className="w-4 h-4" />
            <span>Related Practice Problems</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {lesson?.similarProblems.map((sim) => (
              <div
                key={sim.id}
                onClick={() => onSelectSimilarProblem(sim.id)}
                className="p-4 rounded-xl bg-surface hover:bg-surface-elevated border border-border-default hover:border-primary/40 cursor-pointer transition-all duration-150 flex items-center justify-between group"
              >
                <div>
                  <span className="font-mono text-xs text-text-muted">#{sim.id}</span>
                  <h4 className="font-headline font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                    {sim.title}
                  </h4>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180 text-text-muted group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};
