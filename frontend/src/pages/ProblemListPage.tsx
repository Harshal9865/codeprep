import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Problem } from '../types/problem';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import { ProblemLeftSidebar } from '../components/problems/ProblemLeftSidebar';
import { ProblemRightSidebar } from '../components/problems/ProblemRightSidebar';
import { ProblemBannersRow } from '../components/problems/ProblemBannersRow';
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

type CategoryTab = 'all' | 'algorithms' | 'logic-easy' | 'database' | 'blind75' | 'neetcode150' | 'gfg';

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let s = seed >>> 0 || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(initialDifficultyFilter || 'All');
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopicFilter || 'All');
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('all');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Solved' | 'Unsolved' | 'Bookmarked'>(initialStatusFilter);
  const [selectedPrepSetId, setSelectedPrepSetId] = useState<string | null>(initialPrepSetId);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [potd, setPotd] = useState<PotdSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isShuffled, setIsShuffled] = useState(true);
  const [shuffleSeed, setShuffleSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000) + 1);
  const PAGE_SIZE = 30;

  useEffect(() => {
    setSelectedPrepSetId(initialPrepSetId || null);
  }, [initialPrepSetId]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter || 'All');
  }, [initialStatusFilter]);

  useEffect(() => {
    if (initialFilterVersion > 0) {
      setSelectedDifficulty(initialDifficultyFilter || 'All');
      setSelectedTopic(initialTopicFilter || 'All');
    }
  }, [initialDifficultyFilter, initialTopicFilter, initialFilterVersion]);

  useEffect(() => {
    if (initialSearchVersion > 0) {
      setSearchQuery(initialSearchQuery ?? '');
    }
  }, [initialSearchQuery, initialSearchVersion]);

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

  // Fetch lightweight problem catalog ONCE on mount so typing/filtering is instant (0ms latency)
  const fetchProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ problems: Problem[] }>('/problems?pageSize=2000');
      setProblems(res.problems || []);
    } catch {
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

    useEffect(() => {
    fetchProblems();
    const handleProgressUpdated = () => {
      void fetchProblems();
    };
    window.addEventListener('codeprep:progress-updated', handleProgressUpdated);
    return () => {
      window.removeEventListener('codeprep:progress-updated', handleProgressUpdated);
    };
  }, [fetchProblems]);

  const { topicCounts, uniqueTopics } = useMemo(() => {
    const counts: Record<string, number> = {};
    const topicsSet = new Set<string>();

    for (const p of problems) {
      if (p.topic) {
        counts[p.topic] = (counts[p.topic] || 0) + 1;
        topicsSet.add(p.topic);
      }
    }

    const sortedTopics = Array.from(topicsSet).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
    return { topicCounts: counts, uniqueTopics: sortedTopics };
  }, [problems]);

  const activePrepSet = useMemo(
    () => INTERVIEW_PREP_SETS.find((s) => s.id === selectedPrepSetId) || null,
    [selectedPrepSetId]
  );

  // Instant client-side filtering across search, difficulty, status, bookmarks, prep cards & topics
  const filteredProblems = useMemo(() => {
    let result = problems;

    if (activePrepSet) {
      result = result.filter((p) => activePrepSet.matchProblem(p));
    }

    if (selectedCategory === 'database') {
      result = result.filter((p) => p.category === 'SQL');
    } else if (selectedCategory === 'algorithms') {
      result = result.filter((p) => p.category === 'DSA');
    } else if (selectedCategory === 'logic-easy') {
      result = result.filter((p) => p.topic === 'Logic Building' || p.id >= 601);
    } else if (selectedCategory === 'blind75') {
      result = result.filter((p) => p.id <= 75);
    } else if (selectedCategory === 'neetcode150') {
      result = result.filter((p) => p.id <= 150);
    } else if (selectedCategory === 'gfg') {
      result = result.filter((p) => p.id >= 100 && p.id <= 250);
    }

    if (selectedDifficulty !== 'All') {
      result = result.filter((p) => p.difficulty === selectedDifficulty);
    }

    if (statusFilter === 'Solved') {
      result = result.filter((p) => p.isSolved);
    } else if (statusFilter === 'Unsolved') {
      result = result.filter((p) => !p.isSolved);
    } else if (statusFilter === 'Bookmarked') {
      result = result.filter((p) => p.isBookmark);
    }

    if (selectedTopic !== 'All') {
      result = result.filter(
        (p) =>
          p.topic.toLowerCase().includes(selectedTopic.toLowerCase()) ||
          p.pattern.toLowerCase().includes(selectedTopic.toLowerCase())
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.topic.toLowerCase().includes(q) ||
          p.pattern.toLowerCase().includes(q) ||
          String(p.id).includes(q)
      );
    }

    if (isShuffled) {
      result = shuffleWithSeed(result, shuffleSeed);
    }

    return result;
  }, [
    problems,
    activePrepSet,
    selectedCategory,
    selectedDifficulty,
    statusFilter,
    selectedTopic,
    searchQuery,
    isShuffled,
    shuffleSeed,
  ]);

  const filteredSolvedCount = filteredProblems.filter((p) => p.isSolved).length;
  const totalSolvedAll = problems.filter((p) => p.isSolved).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedPrepSetId,
    selectedCategory,
    selectedDifficulty,
    statusFilter,
    selectedTopic,
    searchQuery,
    isShuffled,
    shuffleSeed,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProblems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProblems.slice(start, start + PAGE_SIZE);
  }, [filteredProblems, safePage]);

  const handleShuffleList = () => {
    setIsShuffled(true);
    setShuffleSeed(Math.floor(Math.random() * 1_000_000_000) + 1);
  };

  const handlePickRandom = () => {
    if (filteredProblems.length === 0) return;
    const randomProblem = filteredProblems[Math.floor(Math.random() * filteredProblems.length)];
    onSelectProblem(randomProblem.id);
  };

  const dsaTotal = problems.filter((p) => p.category === 'DSA').length || 530;
  const sqlTotal = problems.filter((p) => p.category === 'SQL').length || 100;

  return (
    <AppLayout currentTab="dsa" onTabChange={onTabChange} currentStreak={currentStreak}>
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-5">
        <div className="flex gap-6 items-start">
          {/* Left Sidebar */}
          <ProblemLeftSidebar
            activeTab={statusFilter === 'Bookmarked' ? 'favorites' : selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedPrepSetId(null);
              if (cat === 'favorites') {
                setSelectedCategory('all');
                setSelectedTopic('All');
                setStatusFilter('Bookmarked');
              } else {
                setStatusFilter('All');
                if (cat === 'all' || cat === 'blind75' || cat === 'neetcode150' || cat === 'gfg' || cat === 'database') {
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
              selectedPrepSetId={selectedPrepSetId}
              onSelectPrepSet={(id) => {
                setSelectedPrepSetId(id);
                if (id) {
                  setSelectedCategory('all');
                  setSelectedTopic('All');
                  setStatusFilter('All');
                }
              }}
            />

            {/* Active Prep Card Callout */}
            {activePrepSet && (
              <div className="p-4 rounded-2xl bg-surface border border-primary/40 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-primary uppercase">
                      {activePrepSet.badge}
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      • {filteredSolvedCount}/{filteredProblems.length} Solved
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-text-primary">{activePrepSet.title}</h2>
                  <p className="text-xs text-text-secondary">{activePrepSet.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPrepSetId(null)}
                  className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-text-primary flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Filter</span>
                </button>
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
                  onClick={() => setSelectedTopic('All')}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors shrink-0 border ${
                    selectedTopic === 'All'
                      ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                      : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                  }`}
                >
                  All Topics ({problems.length})
                </button>

                {uniqueTopics.map((topicName) => {
                  const isActive = selectedTopic === topicName;
                  const count = topicCounts[topicName] || 0;
                  return (
                    <button
                      key={topicName}
                      type="button"
                      onClick={() => setSelectedTopic(isActive ? 'All' : topicName)}
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
                  setSelectedCategory('all');
                  setStatusFilter('All');
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'all' && statusFilter === 'All'
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <span>All {problems.length || 630}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('logic-easy');
                  setStatusFilter('All');
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'logic-easy'
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
                  setSelectedCategory('algorithms');
                  setStatusFilter('All');
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'algorithms'
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
                  setSelectedCategory('database');
                  setStatusFilter('All');
                }}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'database'
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>SQL {sqlTotal}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === 'Bookmarked' ? 'All' : 'Bookmarked'))}
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
                onClick={() => setSelectedCategory('neetcode150')}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'neetcode150'
                    ? 'bg-primary/15 text-primary border-primary/45 font-semibold'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-high hover:text-text-primary border-border-subtle'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>NeetCode 150</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('gfg')}
                className={`px-4 py-2 rounded-full text-xs transition-colors shrink-0 flex items-center gap-2 border ${
                  selectedCategory === 'gfg'
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
                <span className={`text-xs font-mono font-semibold shrink-0 flex items-center gap-1 ${
                  potd.solvedToday ? 'text-success' : 'text-primary'
                }`}>
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
                    let activeClass = 'bg-surface-high text-text-primary font-semibold border border-border-subtle';
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
                        onClick={() => setSelectedDifficulty(diff)}
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
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span>
                    <strong className="text-text-primary font-medium">{filteredSolvedCount}</strong>/
                    {filteredProblems.length} Solved
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleShuffleList}
                  className="px-3 py-1.5 rounded-full bg-primary-subtle hover:bg-primary/20 text-primary transition-colors border border-primary/35 flex items-center gap-1.5 text-xs font-mono font-semibold"
                  title="Shuffle problem list order"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShuffled((prev) => !prev)}
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
                          sublabel="Indexing 630 DSA, Logic Building & SQL challenges..."
                        />
                      </td>
                    </tr>
                  ) : filteredProblems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-text-muted font-mono text-xs">
                        No questions found matching your current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedProblems.map((prob, idx) => (
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
                          {prob.difficulty === 'Medium' && <span className="text-warning">Medium</span>}
                          {prob.difficulty === 'Hard' && <span className="text-danger">Hard</span>}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-xs text-text-muted group-hover:text-text-primary transition-colors font-mono">
                            Solve <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <PaginationBar
                currentPage={safePage}
                totalItems={filteredProblems.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="problems"
              />
            </div>
          </main>

          {/* Right Sidebar */}
          <ProblemRightSidebar
            totalSolved={totalSolvedAll}
            totalProblems={problems.length || 630}
            dsaTotal={dsaTotal}
            sqlTotal={sqlTotal}
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
