import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Problem } from '../types/problem';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import { ProblemLeftSidebar } from '../components/problems/ProblemLeftSidebar';
import { ProblemRightSidebar } from '../components/problems/ProblemRightSidebar';
import { ProblemBannersRow, Core600Meta } from '../components/problems/ProblemBannersRow';
import { HeatmapDay } from '../components/dashboard/ActivityHeatmap';
import { PaginationBar } from '../components/ui/PaginationBar';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { INTERVIEW_PREP_SETS } from '../data/interviewTracks';
import { PotdSummary } from '../types/potd';
import {
  Search,
  Check,
  Shuffle,
  Dices,
  ArrowUpDown,
  Database,
  Code2,
  Bookmark,
  Layers,
  GraduationCap,
  ChevronDown,
  ArrowRight,
  X,
  Flame,
  Sparkles,
  Boxes,
  Play,
} from 'lucide-react';

interface ProblemListPageProps {
  onSelectProblem: (id: number) => void;
  onTabChange: (tab: string) => void;
  initialPrepSetId?: string | null;
  initialStatusFilter?: 'All' | 'Solved' | 'Unsolved' | 'Bookmarked';
  initialDifficultyFilter?: string;
  initialTopicFilter?: string;
  initialFilterVersion?: number;
  initialSearchQuery?: string;
  initialSearchVersion?: number;
}

type CategoryTab =
  | 'all'
  | 'core-600'
  | 'core-dsa-500'
  | 'core-sql-100'
  | 'extended'
  | 'algorithms'
  | 'logic-easy'
  | 'database'
  | 'oop'
  | 'blind75'
  | 'neetcode150'
  | 'gfg';

interface CatalogMeta {
  totalProblems: number;
  dsaTotal: number;
  sqlTotal: number;
  oopTotal: number;
  totalSolved: number;
  filteredSolvedCount: number;
  topicCounts: Record<string, number>;
  prepCounts: Record<string, { total: number; solved: number }>;
  core600?: Core600Meta;
  randomMatchId: number | null;
}

export const ProblemListPage: React.FC<ProblemListPageProps> = ({
  onSelectProblem,
  onTabChange,
  initialPrepSetId = null,
  initialStatusFilter = 'All',
  initialDifficultyFilter = 'All',
  initialTopicFilter = 'All',
  initialFilterVersion = 0,
  initialSearchQuery = '',
  initialSearchVersion = 0,
}) => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredTotal, setFilteredTotal] = useState(3000);
  const [meta, setMeta] = useState<CatalogMeta>({
    totalProblems: 3000,
    dsaTotal: 2500,
    sqlTotal: 400,
    oopTotal: 100,
    totalSolved: 0,
    filteredSolvedCount: 0,
    topicCounts: {},
    prepCounts: {},
    randomMatchId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearchQuery);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(initialDifficultyFilter || 'All');
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopicFilter || 'All');
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('all');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Solved' | 'Unsolved' | 'Bookmarked'>(
    initialStatusFilter
  );
  const [selectedPrepSetId, setSelectedPrepSetId] = useState<string | null>(initialPrepSetId);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [potd, setPotd] = useState<PotdSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isShuffled, setIsShuffled] = useState(
    () =>
      initialPrepSetId !== 'core-600' &&
      initialPrepSetId !== 'core-dsa-500' &&
      initialPrepSetId !== 'core-sql-100'
  );
  const [shuffleSeed, setShuffleSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000) + 1);
  const PAGE_SIZE = 30;

  useEffect(() => {
    setSelectedPrepSetId(initialPrepSetId || null);
    if (
      initialPrepSetId === 'core-600' ||
      initialPrepSetId === 'core-dsa-500' ||
      initialPrepSetId === 'core-sql-100'
    ) {
      setIsShuffled(false);
    }
    setCurrentPage(1);
  }, [initialPrepSetId]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter || 'All');
    setCurrentPage(1);
  }, [initialStatusFilter]);

  useEffect(() => {
    if (initialFilterVersion > 0) {
      setSelectedCategory('all');
      setSelectedPrepSetId(initialPrepSetId || null);
      setSelectedDifficulty(initialDifficultyFilter || 'All');
      setSelectedTopic(initialTopicFilter || 'All');
      if (
        initialPrepSetId === 'core-600' ||
        initialPrepSetId === 'core-dsa-500' ||
        initialPrepSetId === 'core-sql-100'
      ) {
        setIsShuffled(false);
      }
      setCurrentPage(1);
    }
  }, [initialPrepSetId, initialDifficultyFilter, initialTopicFilter, initialFilterVersion]);

  useEffect(() => {
    if (initialSearchVersion > 0) {
      const nextQ = initialSearchQuery ?? '';
      if (nextQ.trim().length > 0) {
        setSelectedCategory('all');
        setSelectedPrepSetId(null);
        setSelectedTopic('All');
        setSelectedDifficulty('All');
      }
      setSearchQuery(nextQ);
      setDebouncedSearch(nextQ);
      setCurrentPage(1);
    }
  }, [initialSearchQuery, initialSearchVersion]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== searchQuery) {
          setCurrentPage(1);
        }
        return searchQuery;
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{
      analytics?: {
        currentStreak?: number;
        longestStreak?: number;
        heatmap?: HeatmapDay[];
        potd?: PotdSummary;
      };
      currentStreak?: number;
      longestStreak?: number;
      heatmap?: HeatmapDay[];
      potd?: PotdSummary;
    }>('/analytics/dashboard')
      .then((res) => {
        if (!cancelled && res) {
          const payload = res.analytics || res;
          setCurrentStreak(payload.currentStreak ?? 0);
          setLongestStreak(payload.longestStreak ?? 0);
          setHeatmap(payload.heatmap ?? []);
          setPotd(payload.potd ?? null);
        }
      })
      .catch(() => {
        // Keep safe defaults
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Server-side pagination + filtering + seeded shuffle (30 rows per query for O(1) UI speed)
  const fetchProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('includeMeta', '1');

      const track = selectedPrepSetId || (selectedCategory !== 'all' ? selectedCategory : '');
      if (track) params.set('track', track);
      if (selectedDifficulty !== 'All') params.set('difficulty', selectedDifficulty);
      if (selectedTopic !== 'All') params.set('topic', selectedTopic);
      if (statusFilter !== 'All') params.set('status', statusFilter.toLowerCase());
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (isShuffled) params.set('shuffleSeed', String(shuffleSeed));

      const res = await apiRequest<{
        problems: Problem[];
        pagination?: { total: number; totalPages: number };
        meta?: CatalogMeta;
      }>(`/problems?${params.toString()}`);

      setProblems(res.problems || []);
      setFilteredTotal(res.pagination?.total ?? (res.problems?.length || 0));
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch {
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    selectedPrepSetId,
    selectedCategory,
    selectedDifficulty,
    selectedTopic,
    statusFilter,
    debouncedSearch,
    isShuffled,
    shuffleSeed,
  ]);

  useEffect(() => {
    void fetchProblems();
    const handleProgressUpdated = () => {
      void fetchProblems();
    };
    window.addEventListener('codeprep:progress-updated', handleProgressUpdated);
    return () => {
      window.removeEventListener('codeprep:progress-updated', handleProgressUpdated);
    };
  }, [fetchProblems]);

  const uniqueTopics = useMemo(() => {
    return Object.keys(meta.topicCounts).sort(
      (a, b) => (meta.topicCounts[b] || 0) - (meta.topicCounts[a] || 0)
    );
  }, [meta.topicCounts]);

  const activePrepSet = useMemo(
    () => INTERVIEW_PREP_SETS.find((s) => s.id === selectedPrepSetId) || null,
    [selectedPrepSetId]
  );

  const handleShuffleList = () => {
    if (isShuffled) {
      setIsShuffled(false);
      setCurrentPage(1);
      return;
    }
    setIsShuffled(true);
    setShuffleSeed(Math.floor(Math.random() * 1_000_000_000) + 1);
    setCurrentPage(1);
  };

  const handlePickRandom = () => {
    if (meta.randomMatchId) {
      onSelectProblem(meta.randomMatchId);
      return;
    }
    if (problems.length > 0) {
      const randomProblem = problems[Math.floor(Math.random() * problems.length)];
      onSelectProblem(randomProblem.id);
    }
  };

  const totalProblems = meta.totalProblems || 3000;
  const dsaTotal = meta.dsaTotal || 2500;
  const sqlTotal = meta.sqlTotal || 400;
  const oopTotal = meta.oopTotal || 100;

  const isCoreTrackActive =
    selectedPrepSetId === 'core-600' ||
    selectedPrepSetId === 'core-dsa-500' ||
    selectedPrepSetId === 'core-sql-100' ||
    selectedCategory === 'core-600' ||
    selectedCategory === 'core-dsa-500' ||
    selectedCategory === 'core-sql-100';

  const activeCoreSubTrack =
    selectedPrepSetId === 'core-dsa-500' || selectedCategory === 'core-dsa-500'
      ? 'core-dsa-500'
      : selectedPrepSetId === 'core-sql-100' || selectedCategory === 'core-sql-100'
      ? 'core-sql-100'
      : 'core-600';

  const coreNextSolveId =
    activeCoreSubTrack === 'core-sql-100'
      ? meta.core600?.nextSqlId ?? 501
      : activeCoreSubTrack === 'core-dsa-500'
      ? meta.core600?.nextDsaId ?? 1
      : meta.core600?.nextUnsolvedId ?? 1;

  return (
    <AppLayout currentTab="dsa" onTabChange={onTabChange} currentStreak={currentStreak}>
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-5">
        <div className="flex gap-6 items-start">
          {/* Left Sidebar */}
          <ProblemLeftSidebar
            activeTab={
              statusFilter === 'Bookmarked'
                ? 'favorites'
                : isCoreTrackActive
                ? 'core-600'
                : selectedTopic === 'Graph'
                ? 'graphs'
                : selectedTopic === 'Dynamic'
                ? 'dp'
                : selectedTopic === 'Math'
                ? 'math'
                : selectedCategory
            }
            totalProblems={totalProblems}
            sqlTotal={sqlTotal}
            oopTotal={oopTotal}
            onSelectCategory={(cat) => {
              setSelectedPrepSetId(null);
              setCurrentPage(1);
              if (cat === 'favorites') {
                setSelectedCategory('all');
                setSelectedTopic('All');
                setStatusFilter('Bookmarked');
              } else if (cat === 'core-600') {
                setStatusFilter('All');
                setSelectedCategory('all');
                setSelectedTopic('All');
                setSelectedPrepSetId('core-600');
                setIsShuffled(false);
              } else {
                setStatusFilter('All');
                if (
                  cat === 'all' ||
                  cat === 'extended' ||
                  cat === 'blind75' ||
                  cat === 'neetcode150' ||
                  cat === 'gfg' ||
                  cat === 'database' ||
                  cat === 'oop'
                ) {
                  setSelectedCategory(cat as CategoryTab);
                  setSelectedTopic('All');
                } else if (cat === 'graphs') {
                  setSelectedCategory('all');
                  setSelectedTopic('Graph');
                } else if (cat === 'dp') {
                  setSelectedCategory('all');
                  setSelectedTopic('Dynamic');
                } else if (cat === 'math') {
                  setSelectedCategory('all');
                  setSelectedTopic('Math');
                } else {
                  setSelectedCategory('all');
                  setSelectedTopic('All');
                }
              }
            }}
          />

          {/* Center Main Problems Feed */}
          <main className="flex-1 min-w-0 space-y-5">
            {/* Interview Prep Cards Strip */}
            <ProblemBannersRow
              problems={problems}
              prepCounts={meta.prepCounts}
              core600={meta.core600}
              selectedPrepSetId={selectedPrepSetId}
              onSolveProblem={onSelectProblem}
              onSelectPrepSet={(id) => {
                setSelectedPrepSetId(id);
                setCurrentPage(1);
                if (id) {
                  setSelectedCategory('all');
                  setSelectedTopic('All');
                  setStatusFilter('All');
                  if (id === 'core-600' || id === 'core-dsa-500' || id === 'core-sql-100') {
                    setIsShuffled(false);
                  }
                }
              }}
            />

            {/* Active Prep Card Callout */}
            {(activePrepSet || isCoreTrackActive) && (
              <div className="p-4 rounded-2xl bg-surface border border-primary/40 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-primary uppercase">
                      {isCoreTrackActive ? 'Original 600 • Separate Track' : activePrepSet?.badge}
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      • {meta.filteredSolvedCount}/{filteredTotal} Solved
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-text-primary">
                    {isCoreTrackActive
                      ? activeCoreSubTrack === 'core-dsa-500'
                        ? 'Core 500 DSA Problems (#1–#500)'
                        : activeCoreSubTrack === 'core-sql-100'
                        ? 'Core 100 SQL Problems (#501–#600)'
                        : 'Core 600 Curriculum (#1–#600)'
                      : activePrepSet?.title}
                  </h2>
                  <p className="text-xs text-text-secondary">
                    {isCoreTrackActive
                      ? 'Showing only your original 600 problems (500 DSA + 100 SQL), isolated from the 2,400 extended problems.'
                      : activePrepSet?.description}
                  </p>

                  {isCoreTrackActive && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {[
                        { id: 'core-600', label: `All 600 (${meta.core600?.solved ?? 0}/${meta.core600?.total ?? 600})` },
                        { id: 'core-dsa-500', label: `500 DSA (${meta.core600?.dsaSolved ?? 0}/${meta.core600?.dsaTotal ?? 500})` },
                        { id: 'core-sql-100', label: `100 SQL (${meta.core600?.sqlSolved ?? 0}/${meta.core600?.sqlTotal ?? 100})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory('all');
                            setSelectedPrepSetId(tab.id);
                            setIsShuffled(false);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-mono border transition-colors ${
                            activeCoreSubTrack === tab.id
                              ? 'bg-primary text-black border-primary font-semibold'
                              : 'bg-surface-elevated hover:bg-surface-high text-text-secondary border-border-subtle'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isCoreTrackActive && (
                    <button
                      type="button"
                      onClick={() => onSelectProblem(coreNextSolveId)}
                      className="px-3.5 py-2 rounded-lg bg-primary text-black text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Solve Next (#{coreNextSolveId})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPrepSetId(null);
                      setSelectedCategory('all');
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-text-primary flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Filter</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Topic Tags Row */}
            <div className="relative">
              <div
                className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none transition-all ${
                  isTagsExpanded ? 'flex-wrap' : 'overflow-hidden flex-nowrap'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTopic('All');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors shrink-0 border ${
                    selectedTopic === 'All'
                      ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                      : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                  }`}
                >
                  All Topics ({totalProblems})
                </button>

                {uniqueTopics.map((topicName) => {
                  const isActive = selectedTopic === topicName;
                  const count = meta.topicCounts[topicName] || 0;
                  return (
                    <button
                      key={topicName}
                      type="button"
                      onClick={() => {
                        setSelectedTopic(isActive ? 'All' : topicName);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs transition-colors flex items-center gap-1.5 shrink-0 border ${
                        isActive
                          ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                          : 'bg-surface-elevated hover:bg-surface-high text-text-secondary hover:text-text-primary border-border-subtle'
                      }`}
                    >
                      <span>{topicName}</span>
                      <span
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'bg-surface-high text-text-muted'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                  className="px-2.5 py-1.5 rounded-full text-xs text-text-muted hover:text-text-primary hover:bg-surface-elevated flex items-center gap-1 shrink-0 ml-auto transition-colors border border-border-subtle"
                >
                  <span>{isTagsExpanded ? 'Collapse' : 'Expand'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isTagsExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Category & Bookmark Pills Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedPrepSetId(null);
                  setSelectedCategory('all');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'all' && !selectedPrepSetId && statusFilter === 'All'
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <span>All {totalProblems}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedPrepSetId('core-600');
                  setStatusFilter('All');
                  setIsShuffled(false);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  isCoreTrackActive
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Core 600 (#1–#600)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPrepSetId(null);
                  setSelectedCategory('extended');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'extended'
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <span>Extended ({Math.max(0, totalProblems - 600)})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPrepSetId(null);
                  setSelectedCategory('logic-easy');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'logic-easy' && !selectedPrepSetId
                    ? 'bg-success-subtle text-success border-success/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-success" />
                <span>Logic Building (Very Easy)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPrepSetId(null);
                  setSelectedCategory('algorithms');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'algorithms' && !selectedPrepSetId
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-primary" />
                <span>DSA {dsaTotal}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPrepSetId(null);
                  setSelectedCategory('database');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'database' && !selectedPrepSetId
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>SQL {sqlTotal}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPrepSetId(null);
                  setSelectedCategory('oop');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'oop' && !selectedPrepSetId
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-purple-400" />
                <span>OOPs {oopTotal}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter((prev) => (prev === 'Bookmarked' ? 'All' : 'Bookmarked'));
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  statusFilter === 'Bookmarked'
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-primary" />
                <span>Saved</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPrepSetId(null);
                  setSelectedCategory('neetcode150');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'neetcode150' && !selectedPrepSetId
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>NeetCode 150</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPrepSetId(null);
                  setSelectedCategory('gfg');
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'gfg' && !selectedPrepSetId
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-success" />
                <span>GFG SDE Sheet</span>
              </button>
            </div>

            {/* Compact POTD Strip (shown on viewports < 2xl where right sidebar hides) */}
            {potd && (
              <button
                type="button"
                onClick={() => onSelectProblem(potd.id)}
                className={`2xl:hidden w-full text-left px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  potd.solvedToday
                    ? 'bg-surface border-success/35 hover:border-success/60'
                    : 'bg-surface border-primary/40 hover:border-primary/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-semibold shrink-0">
                    <Flame className="w-3 h-3 fill-primary/30" />
                    <span>POTD</span>
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                    #{potd.id}. {potd.title}
                  </span>
                  <span
                    className={`hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      potd.difficulty === 'Easy'
                        ? 'bg-success-subtle text-success'
                        : potd.difficulty === 'Medium'
                        ? 'bg-warning-subtle text-warning'
                        : 'bg-danger-subtle text-danger'
                    }`}
                  >
                    {potd.difficulty}
                  </span>
                </div>
                <span
                  className={`text-xs font-mono font-semibold shrink-0 flex items-center gap-1 ${
                    potd.solvedToday ? 'text-success' : 'text-primary'
                  }`}
                >
                  <span>{potd.solvedToday ? 'Solved ✓' : 'Solve'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            )}

            {/* Search, Difficulty & Status Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by #, title, topic, or pattern..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-surface-elevated text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-high transition-colors border border-border-subtle"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-1 bg-surface-elevated p-1 rounded-full text-xs border border-border-subtle">
                  {['All', 'Easy', 'Medium', 'Hard'].map((diff) => {
                    const isActive = selectedDifficulty === diff;
                    let activeClass =
                      'bg-surface-high text-text-primary font-semibold border border-border-subtle';
                    if (diff === 'Easy' && isActive)
                      activeClass = 'bg-success-subtle text-success font-semibold';
                    if (diff === 'Medium' && isActive)
                      activeClass = 'bg-warning-subtle text-warning font-semibold';
                    if (diff === 'Hard' && isActive)
                      activeClass = 'bg-danger-subtle text-danger font-semibold';

                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => {
                          setSelectedDifficulty(diff);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1 rounded-full text-xs transition-colors ${
                          isActive ? activeClass : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {diff}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-elevated text-xs font-mono text-text-muted border border-border-subtle">
                  <span>
                    <strong className="text-text-primary font-medium">
                      {meta.filteredSolvedCount}
                    </strong>
                    /{filteredTotal} Solved
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleShuffleList}
                  aria-pressed={isShuffled}
                  className={`px-3 py-1.5 rounded-full transition-colors border flex items-center gap-1.5 text-xs font-mono font-semibold ${
                    isShuffled
                      ? 'bg-primary-subtle hover:bg-primary/20 text-primary border-primary/45'
                      : 'bg-surface-elevated hover:bg-surface-muted text-text-secondary hover:text-text-primary border-border-default'
                  }`}
                  title={
                    isShuffled
                      ? 'Shuffle is ON — click again to turn off and restore #ID order'
                      : 'Shuffle problem list order'
                  }
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{isShuffled ? 'Shuffle ON' : 'Shuffle'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsShuffled((prev) => !prev);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-mono border transition-colors flex items-center gap-1 ${
                    !isShuffled
                      ? 'bg-surface-high text-text-primary border-border-default font-semibold'
                      : 'bg-surface-elevated text-text-muted hover:text-text-primary border-border-subtle'
                  }`}
                  title={isShuffled ? 'Switch to ordered #1..N list' : 'Switch to shuffled list'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isShuffled ? '# Order' : 'Ordered'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePickRandom}
                  className="p-2 rounded-full bg-surface-elevated hover:bg-surface-high text-text-muted hover:text-primary transition-colors border border-border-subtle"
                  title="Open 1 random matching problem"
                >
                  <Dices className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Problem Table */}
            <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border-subtle">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-text-muted text-xs font-mono border-b border-border-subtle">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Done</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4 w-44 hidden md:table-cell">Topic</th>
                    <th className="py-3 px-4 w-24">Level</th>
                    <th className="py-3 px-4 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8">
                        <CodePrepLoader
                          variant="section"
                          className="min-h-[180px]"
                          label="Loading Problem Catalog"
                          sublabel={`Fetching page ${currentPage} of ${totalProblems} DSA, Logic Building, OOPs & SQL challenges...`}
                        />
                      </td>
                    </tr>
                  ) : problems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-text-muted font-mono text-xs">
                        No questions found matching your current filters.
                      </td>
                    </tr>
                  ) : (
                    problems.map((prob, idx) => (
                      <tr
                        key={prob.id}
                        onClick={() => onSelectProblem(prob.id)}
                        className={`hover:bg-surface-high transition-colors cursor-pointer group ${
                          idx % 2 === 0 ? 'bg-surface' : 'bg-surface-subtle'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          {prob.isSolved ? (
                            <Check className="w-4 h-4 text-success mx-auto stroke-[2.5]" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-border-default inline-block" />
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary group-hover:text-primary transition-colors">
                              #{prob.id}. {prob.title}
                            </span>
                            {prob.category === 'OOP' && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
                                OOP
                              </span>
                            )}
                            {prob.category === 'SQL' && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
                                SQL
                              </span>
                            )}
                            {potd?.id === prob.id && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary/30 shrink-0">
                                <Flame className="w-3 h-3 fill-primary/30" />
                                <span>POTD</span>
                              </span>
                            )}
                            {prob.isBookmark && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary-subtle text-primary">
                                Saved
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 hidden md:table-cell text-text-muted font-mono text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-text-secondary">
                            {prob.topic}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-xs">
                          {prob.difficulty === 'Easy' && <span className="text-success">Easy</span>}
                          {prob.difficulty === 'Medium' && (
                            <span className="text-warning">Medium</span>
                          )}
                          {prob.difficulty === 'Hard' && <span className="text-danger">Hard</span>}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-xs text-text-muted group-hover:text-text-primary transition-colors font-mono">
                            Solve{' '}
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <PaginationBar
                currentPage={currentPage}
                totalItems={filteredTotal}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="problems"
              />
            </div>
          </main>

          {/* Right Sidebar */}
          <ProblemRightSidebar
            totalSolved={meta.totalSolved}
            totalProblems={totalProblems}
            dsaTotal={dsaTotal}
            sqlTotal={sqlTotal}
            oopTotal={oopTotal}
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            heatmap={heatmap}
            potd={potd}
            onSelectProblem={onSelectProblem}
          />
        </div>
      </div>
    </AppLayout>
  );
};
