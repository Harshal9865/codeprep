import React, { useEffect, useState } from 'react';
import {
  Play,
  Shuffle,
  CheckCircle2,
  Bookmark,
  RotateCcw,
  Target,
  ArrowRight,
  Database,
  Brain,
  Code2,
  Layers,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { fetchDashboardAnalytics } from '../services/analyticsCache';
import { ActivityHeatmap } from '../components/dashboard/ActivityHeatmap';
import { LeetCodeProfileCard } from '../components/dashboard/LeetCodeProfileCard';
import { LeetCodeSkillsPanel } from '../components/dashboard/LeetCodeSkillsPanel';
import { LeetCodeSolvedGauge } from '../components/dashboard/LeetCodeSolvedGauge';
import { LeetCodeBadgesCard } from '../components/dashboard/LeetCodeBadgesCard';
import { LeetCodeRecentSubmissions } from '../components/dashboard/LeetCodeRecentSubmissions';
import { PotdBannerCard } from '../components/dashboard/PotdBannerCard';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { PotdSummary } from '../types/potd';

interface BadgeItem {
  badgeKey: string;
  title: string;
  description: string;
  category: 'solved' | 'streak' | 'specialty';
  unlocked: boolean;
  unlockedAt: string | null;
  current: number;
  target: number;
}

interface DashboardAnalytics {
  totalSolved: number;
  totalProblems: number;
  dsaSolved: number;
  dsaTotal: number;
  sqlSolved: number;
  sqlTotal: number;
  oopSolved?: number;
  oopTotal?: number;
  core600?: {
    total: number;
    solved: number;
    dsaTotal: number;
    dsaSolved: number;
    sqlTotal: number;
    sqlSolved: number;
    nextUnsolvedId: number;
    nextDsaId: number;
    nextSqlId: number;
  };
  dailyProblemId: number;
  potd?: PotdSummary;
  randomPoolIds: number[];
  easySolved: number;
  easyTotal: number;
  mediumSolved: number;
  mediumTotal: number;
  hardSolved: number;
  hardTotal: number;
  currentStreak: number;
  longestStreak: number;
  heatmap: Array<{
    date: string;
    count: number;
    acceptedCount: number;
    level: number;
  }>;
  topicStats: Array<{
    topic: string;
    total: number;
    solved: number;
    accuracy: number;
  }>;
  badges?: BadgeItem[];
  recentSubmissions: Array<{
    id: number;
    title: string;
    difficulty: string;
    verdict: string;
    submittedAt: string;
    runtimeMs: number | null;
  }>;
  recommendedProblem: {
    id: number;
    title: string;
    difficulty: string;
    topic: string;
    reason: string;
  } | null;
  revisionQueue: Array<{
    id: number;
    title: string;
    difficulty: string;
    topic: string;
    reason: 'solved_with_ai' | 'bookmarked';
    lastAttemptedAt: string | null;
  }>;
}

interface DashboardPageProps {
  onTabChange: (tab: string) => void;
  onSelectProblem: (problemId: number) => void;
  onOpenProblemsWithFilter?: (filter: { difficulty?: string; topic?: string; track?: string }) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onTabChange,
  onSelectProblem,
  onOpenProblemsWithFilter,
}) => {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async (force = false) => {
      try {
        setLoadError(null);
        const payload = await fetchDashboardAnalytics<DashboardAnalytics>(force);
        setData(payload || null);
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : 'Unable to load dashboard analytics');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAnalytics();
    const handleProgressUpdated = () => {
      void fetchAnalytics(true);
    };
    window.addEventListener('codeprep:progress-updated', handleProgressUpdated);
    return () => {
      window.removeEventListener('codeprep:progress-updated', handleProgressUpdated);
    };
  }, []);

  const handlePickRandom = () => {
    const pool = data?.randomPoolIds && data.randomPoolIds.length > 0 ? data.randomPoolIds : null;
    const picked = pool
      ? pool[Math.floor(Math.random() * pool.length)]
      : Math.floor(Math.random() * 3000) + 1;
    onSelectProblem(picked);
  };

  if (isLoading) {
    return (
      <AppLayout currentTab="dashboard" onTabChange={onTabChange}>
        <CodePrepLoader
          variant="section"
          className="flex-1 min-h-[420px]"
          label="Loading Dashboard"
          sublabel="Aggregating streaks, badges & activity heatmap..."
        />
      </AppLayout>
    );
  }

  if (loadError || !data) {
    return (
      <AppLayout currentTab="dashboard" onTabChange={onTabChange}>
        <div className="max-w-xl mx-auto p-12 text-center space-y-3">
          <p className="text-sm text-danger">{loadError || 'Unable to connect to workspace engine.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-semibold hover:opacity-90"
          >
            Retry Connection
          </button>
        </div>
      </AppLayout>
    );
  }

  const totalSolved = data.totalSolved ?? 0;
  const totalProblems = data.totalProblems ?? 3000;
  const dsaSolved = data.dsaSolved ?? 0;
  const dsaTotal = data.dsaTotal ?? 2500;
  const sqlSolved = data.sqlSolved ?? 0;
  const sqlTotal = data.sqlTotal ?? 400;
  const oopSolved = data.oopSolved ?? 0;
  const oopTotal = data.oopTotal ?? 100;
  const dailyProblemId = data.dailyProblemId ?? 1;
  const currentStreak = data.currentStreak ?? 0;
  const longestStreak = data.longestStreak ?? 0;
  const heatmap = data.heatmap ?? [];
  const topicStats = data.topicStats ?? [];
  const badges = data.badges ?? [];
  const recentSubmissions = data.recentSubmissions ?? [];
  const revisionQueue = data.revisionQueue ?? [];

  const diffBadge = (diff: string) =>
    diff === 'Easy'
      ? 'bg-success-subtle text-success'
      : diff === 'Medium'
      ? 'bg-warning-subtle text-warning'
      : 'bg-danger-subtle text-danger';

  return (
    <AppLayout currentTab="dashboard" onTabChange={onTabChange} currentStreak={currentStreak}>
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Developer Profile + Track Stats + Clickable Topics */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          <LeetCodeProfileCard
            totalSolved={totalSolved}
            totalProblems={totalProblems}
            dsaSolved={dsaSolved}
            dsaTotal={dsaTotal}
            sqlSolved={sqlSolved}
            sqlTotal={sqlTotal}
            currentStreak={currentStreak}
            onNavigate={onTabChange}
          />
          <LeetCodeSkillsPanel
            topics={topicStats}
            dsaSolved={dsaSolved}
            dsaTotal={dsaTotal}
            sqlSolved={sqlSolved}
            sqlTotal={sqlTotal}
            oopSolved={oopSolved}
            oopTotal={oopTotal}
            onNavigate={onTabChange}
            onSelectTopic={(topic) => {
              if (onOpenProblemsWithFilter) {
                onOpenProblemsWithFilter({ topic });
              } else {
                onTabChange('dsa');
              }
            }}
          />
        </div>

        {/* RIGHT COLUMN: POTD + Gauge + Badges + Heatmap + Focus & Revision + Activity */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {data.potd && (
            <PotdBannerCard
              potd={data.potd}
              currentStreak={currentStreak}
              onSelectProblem={onSelectProblem}
            />
          )}

          {/* Core 600 Separate Card — Solve Directly or Open Separate 600 List */}
          {(() => {
            const core = data.core600 ?? {
              total: 600,
              solved: 0,
              dsaTotal: 500,
              dsaSolved: 0,
              sqlTotal: 100,
              sqlSolved: 0,
              nextUnsolvedId: 1,
              nextDsaId: 1,
              nextSqlId: 501,
            };
            const corePct = core.total > 0 ? Math.round((core.solved / core.total) * 100) : 0;
            return (
              <div className="bg-surface rounded-2xl p-5 border border-primary/35 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-semibold uppercase tracking-wider">
                      <Layers className="w-3 h-3" />
                      <span>Core 600 Track (#1–#600)</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-primary font-semibold">
                      {core.solved}/{core.total} Solved ({corePct}%)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-secondary">
                      DSA {core.dsaSolved}/{core.dsaTotal}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-secondary">
                      SQL {core.sqlSolved}/{core.sqlTotal}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary">
                      Core 600 Problem Set
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      500 DSA (#1–#500) and 100 SQL (#501–#600) foundational problems.
                    </p>
                  </div>
                  <div className="w-full max-w-md h-1.5 rounded-full bg-surface-high overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${corePct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectProblem(core.nextUnsolvedId)}
                    className="px-4 py-2.5 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Solve Directly (#{core.nextUnsolvedId})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenProblemsWithFilter) {
                        onOpenProblemsWithFilter({ track: 'core-600' });
                      } else {
                        onTabChange('dsa');
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono font-semibold text-text-primary flex items-center gap-1.5 transition-colors"
                  >
                    <span>Browse 600</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Row 1: Solved Gauge + Achievement Badges */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <LeetCodeSolvedGauge
              easySolved={data.easySolved ?? 0}
              easyTotal={data.easyTotal ?? 0}
              mediumSolved={data.mediumSolved ?? 0}
              mediumTotal={data.mediumTotal ?? 0}
              hardSolved={data.hardSolved ?? 0}
              hardTotal={data.hardTotal ?? 0}
              onSelectDifficulty={(difficulty) => {
                if (onOpenProblemsWithFilter) {
                  onOpenProblemsWithFilter({ difficulty });
                } else {
                  onTabChange('dsa');
                }
              }}
            />
            <LeetCodeBadgesCard
              badges={badges}
              totalSolved={totalSolved}
            />
          </div>

          {/* Row 2: Activity Heatmap (3M/6M/1Y + interactive cell breakdown) */}
          <ActivityHeatmap
            data={heatmap}
            currentStreak={currentStreak}
            longestStreak={longestStreak}
          />

          {/* Row 3: Quick Practice Actions (concise single strip, zero card clutter) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => onSelectProblem(dailyProblemId)}
              className="bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-primary/40 rounded-xl p-3.5 text-left transition-colors group"
            >
              <div className="flex items-center justify-between text-xs font-mono text-primary">
                <span>Daily POTD</span>
                <Play className="w-3.5 h-3.5" />
              </div>
              <div className="text-sm font-semibold text-text-primary mt-1 group-hover:text-primary transition-colors flex items-center gap-1.5">
                <span>Problem #{dailyProblemId}</span>
                {data.potd?.solvedToday && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success-subtle text-success">
                    Done
                  </span>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={handlePickRandom}
              className="bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-success/40 rounded-xl p-3.5 text-left transition-colors group"
            >
              <div className="flex items-center justify-between text-xs font-mono text-success">
                <span>Random</span>
                <Shuffle className="w-3.5 h-3.5" />
              </div>
              <div className="text-sm font-semibold text-text-primary mt-1 group-hover:text-success transition-colors">
                Next Unsolved
              </div>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('sql')}
              className="bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-sky-400/40 rounded-xl p-3.5 text-left transition-colors group"
            >
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>SQL Lab</span>
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="text-sm font-semibold text-text-primary mt-1 group-hover:text-sky-400 transition-colors">
                {sqlSolved}/{sqlTotal} Queries
              </div>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('aptitude')}
              className="bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-purple-400/40 rounded-xl p-3.5 text-left transition-colors group"
            >
              <div className="flex items-center justify-between text-xs font-mono text-purple-400">
                <span>Aptitude</span>
                <Brain className="w-3.5 h-3.5" />
              </div>
              <div className="text-sm font-semibold text-text-primary mt-1 group-hover:text-purple-400 transition-colors">
                Timed MCQ Drill
              </div>
            </button>
          </div>

          {/* Row 4: Recommended Next Focus & Spaced Revision Queue */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Recommended Next Focus */}
            <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary font-semibold">
                    <Target className="w-4 h-4" />
                    <span>Recommended Focus</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTabChange('dsa')}
                    className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
                  >
                    <span>Interview Tracks</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {data.recommendedProblem ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-muted">#{data.recommendedProblem.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${diffBadge(data.recommendedProblem.difficulty)}`}>
                        {data.recommendedProblem.difficulty}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted truncate">
                        {data.recommendedProblem.topic}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-text-primary">
                      {data.recommendedProblem.title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {data.recommendedProblem.reason}
                    </p>
                  </div>
                ) : (
                  <div className="py-4 text-xs text-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All seeded problems solved! Pick any topic to review.</span>
                  </div>
                )}
              </div>

              {data.recommendedProblem && (
                <button
                  type="button"
                  onClick={() => onSelectProblem(data.recommendedProblem!.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Solve #{data.recommendedProblem.id} Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Spaced Revision Queue */}
            <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-primary font-semibold">
                  <RotateCcw className="w-4 h-4 text-warning" />
                  <span>Revision Queue</span>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange('bookmarks')}
                  className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>All Saved</span>
                </button>
              </div>

              {revisionQueue.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-4 rounded-xl bg-surface-elevated border border-border-subtle">
                  <p className="text-xs text-text-secondary">
                    Bookmark problems or review reference guides to queue them for independent re-solving.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {revisionQueue.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectProblem(item.id)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">
                          #{item.id}. {item.title}
                        </div>
                        <div className="text-[11px] font-mono text-text-muted truncate">
                          {item.topic} • {item.reason === 'solved_with_ai' ? 'Review Independently' : 'Bookmarked'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${diffBadge(item.difficulty)}`}>
                        {item.difficulty}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 5: Recent Submissions */}
          <LeetCodeRecentSubmissions
            submissions={recentSubmissions}
            onSelectProblem={onSelectProblem}
            onViewAll={() => onTabChange('dsa')}
          />
        </div>
      </div>
    </AppLayout>
  );
};
