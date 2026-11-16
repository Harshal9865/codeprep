import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import { PaginationBar } from '../components/ui/PaginationBar';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { SqlScratchpadModal } from '../components/sql/SqlScratchpadModal';
import { HighlightedCode } from '../components/ui/CodeHighlight';
import {
  Search,
  Check,
  ChevronRight,
  Shuffle,
  Terminal,
  Database,
  Layers,
  GitBranch,
  BarChart3,
  Clock,
  BookOpen,
  Play,
  Dices,
  AlertTriangle,
  X,
  ListFilter,
} from 'lucide-react';

interface SqlProblemItem {
  id: number;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  pattern: string;
  isSolved?: boolean;
}

interface SqlListPageProps {
  onSelectProblem: (id: number) => void;
  onTabChange?: (tab: string) => void;
}

type SqlSectionTab = 'problems' | 'patterns';
type SqlSubsetFilter = 'all' | 'core-sql-100' | 'sql-interview-50' | 'sql-extended-300';

interface SqlTopicMeta {
  topic: string;
  shortTitle: string;
  patterns: string;
  accentText: string;
}

const SQL_TOPIC_ITEMS: SqlTopicMeta[] = [
  {
    topic: 'Aggregations & Joins',
    shortTitle: 'Joins & Grouping',
    patterns: 'LEFT JOIN · HAVING · COALESCE',
    accentText: 'text-emerald-400',
  },
  {
    topic: 'Window Functions',
    shortTitle: 'Window Functions',
    patterns: 'DENSE_RANK · LAG/LEAD · OVER',
    accentText: 'text-sky-400',
  },
  {
    topic: 'Common Table Expressions',
    shortTitle: 'CTEs & Recursion',
    patterns: 'WITH · WITH RECURSIVE',
    accentText: 'text-purple-400',
  },
  {
    topic: 'Gaps and Islands',
    shortTitle: 'Gaps & Islands',
    patterns: 'id - ROW_NUMBER() · Streaks',
    accentText: 'text-amber-400',
  },
  {
    topic: 'Advanced Analytics & Retention',
    shortTitle: 'Cohorts & Retention',
    patterns: 'Retention · Rolling Window',
    accentText: 'text-rose-400',
  },
];

interface ExecutionStage {
  step: string;
  clause: string;
  rule: string;
  trap: string;
  snippet: string;
}

const SQL_EXECUTION_PIPELINE: ExecutionStage[] = [
  {
    step: '01',
    clause: 'FROM & JOIN',
    rule: 'Builds the base relational grain and evaluates join ON predicates before WHERE.',
    trap: 'Filtering a nullable right-table column in WHERE silently turns a LEFT JOIN into an INNER JOIN.',
    snippet: "FROM Customers c\nLEFT JOIN Orders o ON c.id = o.customer_id AND o.status = 'paid'",
  },
  {
    step: '02',
    clause: 'WHERE',
    rule: 'Filters individual raw rows before grouping or aggregates execute.',
    trap: 'Aggregates (`COUNT`, `SUM`, `AVG`) and SELECT aliases cannot be used inside WHERE.',
    snippet: "WHERE created_at >= '2026-01-01' AND amount IS NOT NULL",
  },
  {
    step: '03',
    clause: 'GROUP BY',
    rule: 'Collapses matching group keys into one summary row per bucket.',
    trap: 'Every non-aggregated column in SELECT should appear in GROUP BY for deterministic results.',
    snippet: 'GROUP BY department_id, tier',
  },
  {
    step: '04',
    clause: 'HAVING',
    rule: 'Filters aggregated buckets after GROUP BY completes.',
    trap: 'Keep per-row filters in WHERE so fewer rows enter aggregation.',
    snippet: 'HAVING COUNT(DISTINCT user_id) >= 5 AND SUM(amount) > 1000',
  },
  {
    step: '05',
    clause: 'Window OVER()',
    rule: 'Computes ranking, LAG/LEAD, and rolling frames across partitions without collapsing rows.',
    trap: 'Explicitly check `ROWS BETWEEN` vs default `RANGE` when rows share equal ORDER BY values.',
    snippet: 'DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk',
  },
  {
    step: '06',
    clause: 'SELECT & DISTINCT',
    rule: 'Evaluates expressions, projections (`AS alias`), and deduplicates rows if DISTINCT is set.',
    trap: 'SQLite integer division (`a / b`) truncates decimals — multiply by `1.0` first.',
    snippet: 'SELECT dept, ROUND(100.0 * paid_cnt / COUNT(*), 2) AS paid_pct',
  },
  {
    step: '07',
    clause: 'ORDER BY & LIMIT',
    rule: 'Sorts final projected rows (aliases allowed) and caps output length.',
    trap: 'Include deterministic tie-breakers (e.g. `ORDER BY score DESC, id ASC`) whenever using LIMIT.',
    snippet: 'ORDER BY total_spent DESC, customer_id ASC\nLIMIT 5;',
  },
];

interface SqlCookbookPattern {
  id: string;
  title: string;
  topic: string;
  useCase: string;
  pitfall: string;
  schemaDdl: string;
  query: string;
}

const SQL_COOKBOOK_PATTERNS: SqlCookbookPattern[] = [
  {
    id: 'left-join-zero',
    title: 'Zero-Row Preservation with LEFT JOIN + COALESCE',
    topic: 'Aggregations & Joins',
    useCase: 'Keep entities that have 0 matching child records (inactive users or zero-sale SKUs).',
    pitfall: 'Count a non-null child column (`COUNT(p.id)`), NOT `COUNT(*)`, or unmatched rows return 1.',
    schemaDdl: `CREATE TABLE Users (id INT PRIMARY KEY, name TEXT);
CREATE TABLE Purchases (id INT PRIMARY KEY, user_id INT, amount INT, status TEXT);
INSERT INTO Users VALUES (1, 'Aarav'), (2, 'Diya'), (3, 'Kabir');
INSERT INTO Purchases VALUES (10, 1, 250, 'paid'), (11, 1, 150, 'paid'), (12, 2, 300, 'refunded');`,
    query: `SELECT
  u.id,
  u.name,
  COUNT(p.id) AS paid_orders,
  COALESCE(SUM(p.amount), 0) AS paid_total
FROM Users u
LEFT JOIN Purchases p
  ON u.id = p.user_id AND p.status = 'paid'
GROUP BY u.id, u.name
ORDER BY paid_total DESC, u.id ASC;`,
  },
  {
    id: 'top-k-window',
    title: 'Top-K Per Group Keeping Ties (DENSE_RANK)',
    topic: 'Window Functions',
    useCase: 'Return the top 2 highest-paid staff per department without dropping salary ties.',
    pitfall: '`ROW_NUMBER()` splits ties arbitrarily; `DENSE_RANK()` preserves distinct salary tiers.',
    schemaDdl: `CREATE TABLE Staff (id INT PRIMARY KEY, name TEXT, dept TEXT, salary INT);
INSERT INTO Staff VALUES
  (1, 'Maya', 'Eng', 140), (2, 'Rohan', 'Eng', 140), (3, 'Neha', 'Eng', 120), (4, 'Isha', 'Eng', 100),
  (5, 'Vikram', 'Sales', 110), (6, 'Tara', 'Sales', 95);`,
    query: `WITH Ranked AS (
  SELECT
    dept,
    name,
    salary,
    DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS dr
  FROM Staff
)
SELECT dept, name, salary, dr
FROM Ranked
WHERE dr <= 2
ORDER BY dept, dr, name;`,
  },
  {
    id: 'gaps-islands',
    title: 'Consecutive Activity Streaks (Gaps & Islands)',
    topic: 'Gaps and Islands',
    useCase: 'Group consecutive login days per user into contiguous streaks.',
    pitfall: 'Deduplicate multiple events on the same day before subtracting `ROW_NUMBER()`.',
    schemaDdl: `CREATE TABLE Logins (user_id INT, login_day INT);
INSERT INTO Logins VALUES
  (1, 10), (1, 11), (1, 12), (1, 15), (1, 16),
  (2, 10), (2, 11);`,
    query: `WITH DistinctDays AS (
  SELECT DISTINCT user_id, login_day FROM Logins
),
Grouped AS (
  SELECT
    user_id,
    login_day,
    login_day - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_day) AS island_key
  FROM DistinctDays
)
SELECT
  user_id,
  MIN(login_day) AS streak_start,
  MAX(login_day) AS streak_end,
  COUNT(*) AS streak_len
FROM Grouped
GROUP BY user_id, island_key
ORDER BY user_id, streak_start;`,
  },
  {
    id: 'lag-session-delta',
    title: 'Period-Over-Period Growth (LAG + NULLIF)',
    topic: 'Advanced Analytics & Retention',
    useCase: 'Compare current metrics against the prior period with safe float division.',
    pitfall: 'Wrap denominators with `NULLIF(prev_rev, 0)` and multiply by `100.0` before dividing.',
    schemaDdl: `CREATE TABLE DailyRev (day_idx INT PRIMARY KEY, revenue INT);
INSERT INTO DailyRev VALUES (1, 100), (2, 125), (3, 100), (4, 160);`,
    query: `WITH Prev AS (
  SELECT
    day_idx,
    revenue,
    LAG(revenue) OVER (ORDER BY day_idx) AS prev_rev
  FROM DailyRev
)
SELECT
  day_idx,
  revenue,
  prev_rev,
  ROUND(100.0 * (revenue - prev_rev) / NULLIF(prev_rev, 0), 1) AS pct_change
FROM Prev
ORDER BY day_idx;`,
  },
];

export const SqlListPage: React.FC<SqlListPageProps> = ({ onSelectProblem, onTabChange }) => {
  const [activeSection, setActiveSection] = useState<SqlSectionTab>('problems');
  const [problems, setProblems] = useState<SqlProblemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [sqlSubset, setSqlSubset] = useState<SqlSubsetFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(400);
  const [sqlTotal, setSqlTotal] = useState(400);
  const [sqlSolvedTotal, setSqlSolvedTotal] = useState(0);
  const [filteredSolvedCount, setFilteredSolvedCount] = useState(0);
  const [difficultyTotals, setDifficultyTotals] = useState({ Easy: 125, Medium: 170, Hard: 105 });
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [scratchPreset, setScratchPreset] = useState<{
    label?: string;
    schemaDdl: string;
    query: string;
  } | null>(null);
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);
  const PAGE_SIZE = 30;

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

  const fetchProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        category: 'SQL',
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
        includeMeta: '1',
      });
      if (selectedDifficulty !== 'all') queryParams.append('difficulty', selectedDifficulty);
      if (selectedTopic !== 'all') queryParams.append('topic', selectedTopic);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (sqlSubset !== 'all') queryParams.append('track', sqlSubset);
      if (debouncedSearch.trim()) queryParams.append('search', debouncedSearch.trim());
      if (isShuffled) queryParams.append('shuffleSeed', String(shuffleSeed));

      const res = await apiRequest<{
        problems: SqlProblemItem[];
        pagination?: { total: number };
        meta?: {
          sqlTotal?: number;
          sqlSolved?: number;
          filteredSolvedCount?: number;
          difficultyTotals?: { Easy: number; Medium: number; Hard: number };
        };
      }>(`/problems?${queryParams.toString()}`);

      setProblems(res.problems || []);
      setFilteredTotal(res.pagination?.total ?? (res.problems?.length || 0));
      if (res.meta) {
        if (typeof res.meta.sqlTotal === 'number') setSqlTotal(res.meta.sqlTotal);
        if (typeof res.meta.sqlSolved === 'number') setSqlSolvedTotal(res.meta.sqlSolved);
        if (typeof res.meta.filteredSolvedCount === 'number') {
          setFilteredSolvedCount(res.meta.filteredSolvedCount);
        }
        if (res.meta.difficultyTotals) setDifficultyTotals(res.meta.difficultyTotals);
      }
    } catch {
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    selectedDifficulty,
    selectedTopic,
    statusFilter,
    sqlSubset,
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

  const sqlPct = sqlTotal > 0 ? Math.round((sqlSolvedTotal / sqlTotal) * 100) : 0;

  const hasActiveFilters =
    selectedTopic !== 'all' ||
    selectedDifficulty !== 'all' ||
    statusFilter !== 'all' ||
    sqlSubset !== 'all' ||
    searchQuery.trim() !== '' ||
    isShuffled;

  const resetAllFilters = () => {
    setSelectedTopic('all');
    setSelectedDifficulty('all');
    setStatusFilter('all');
    setSqlSubset('all');
    setSearchQuery('');
    setDebouncedSearch('');
    setIsShuffled(false);
    setCurrentPage(1);
  };

  const handleLaunchRandomSql = () => {
    const unsolved = problems.find((p) => !p.isSolved);
    if (unsolved) {
      onSelectProblem(unsolved.id);
      return;
    }
    const randomCoreId = 501 + Math.floor(Math.random() * 100);
    onSelectProblem(randomCoreId);
  };

  const getTopicIcon = (topic: string) => {
    if (topic.includes('Window')) return <BarChart3 className="w-4 h-4 text-sky-400" />;
    if (topic.includes('Common Table')) return <GitBranch className="w-4 h-4 text-purple-400" />;
    if (topic.includes('Gaps')) return <Clock className="w-4 h-4 text-amber-400" />;
    if (topic.includes('Retention')) return <Layers className="w-4 h-4 text-rose-400" />;
    return <Database className="w-4 h-4 text-emerald-400" />;
  };

  const activeStage = SQL_EXECUTION_PIPELINE[selectedStageIdx] || SQL_EXECUTION_PIPELINE[0];

  return (
    <AppLayout currentTab="sql" onTabChange={onTabChange}>
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Clean Header + Section Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-bold text-2xl text-text-primary tracking-tight">
                SQL Query Lab
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-xs font-mono text-text-secondary">
                {sqlSolvedTotal}/{sqlTotal} Solved
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl">
              Isolated SQLite relational sandboxes across joins, window functions, CTEs, gaps &amp; islands, and retention analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface border border-border-subtle">
              <button
                type="button"
                onClick={() => setActiveSection('problems')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  activeSection === 'problems'
                    ? 'bg-primary text-black'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Query Bank</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('patterns')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  activeSection === 'patterns'
                    ? 'bg-primary text-black'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Patterns &amp; Pipeline</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLaunchRandomSql}
              className="px-3.5 py-2 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Practice Next</span>
            </button>
          </div>
        </div>

        {activeSection === 'problems' ? (
          /* 2-COLUMN STUDIO LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT CURRICULUM RAIL */}
            <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-16">
              {/* Progress & Breakdown */}
              <div className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted uppercase tracking-wider font-semibold">
                    Lab Progress
                  </span>
                  <span className="text-text-primary font-bold">
                    {sqlSolvedTotal}/{sqlTotal} ({sqlPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(sqlPct, sqlSolvedTotal > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[11px] font-mono">
                  <div className="py-1.5 rounded-lg bg-surface-subtle border border-border-subtle">
                    <div className="text-success font-semibold">{difficultyTotals.Easy}</div>
                    <div className="text-[10px] text-text-muted">Easy</div>
                  </div>
                  <div className="py-1.5 rounded-lg bg-surface-subtle border border-border-subtle">
                    <div className="text-warning font-semibold">{difficultyTotals.Medium}</div>
                    <div className="text-[10px] text-text-muted">Med</div>
                  </div>
                  <div className="py-1.5 rounded-lg bg-surface-subtle border border-border-subtle">
                    <div className="text-danger font-semibold">{difficultyTotals.Hard}</div>
                    <div className="text-[10px] text-text-muted">Hard</div>
                  </div>
                </div>
              </div>

              {/* Curated Tracks */}
              <div className="bg-surface border border-border-subtle rounded-2xl p-3 space-y-1.5">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold flex items-center gap-1.5">
                  <ListFilter className="w-3 h-3" />
                  <span>Curated Tracks</span>
                </div>
                {(
                  [
                    { id: 'all', label: 'All SQL Queries', badge: `${sqlTotal}` },
                    { id: 'core-sql-100', label: 'Core 100 Essential', badge: '#501–600' },
                    { id: 'sql-interview-50', label: 'Interview Top 50', badge: '#501–550' },
                    { id: 'sql-extended-300', label: 'Extended Analytics', badge: '#731+' },
                  ] as const
                ).map((track) => {
                  const active = sqlSubset === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => {
                        setSqlSubset(track.id);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        active
                          ? 'bg-primary-subtle text-primary font-semibold border border-primary/35'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
                      }`}
                    >
                      <span>{track.label}</span>
                      <span className="text-[10px] font-mono opacity-80">{track.badge}</span>
                    </button>
                  );
                })}
              </div>

              {/* Relational Domains */}
              <div className="bg-surface border border-border-subtle rounded-2xl p-3 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Relational Domains
                </div>
                {SQL_TOPIC_ITEMS.map((item) => {
                  const active = selectedTopic === item.topic;
                  return (
                    <button
                      key={item.topic}
                      type="button"
                      onClick={() => {
                        setSelectedTopic((prev) => (prev === item.topic ? 'all' : item.topic));
                        setCurrentPage(1);
                      }}
                      className={`w-full px-2.5 py-2 rounded-xl text-left transition-colors flex items-start gap-2.5 border ${
                        active
                          ? 'bg-surface-elevated border-primary/40'
                          : 'border-transparent hover:bg-surface-elevated/60'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">{getTopicIcon(item.topic)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-text-primary truncate">
                          {item.shortTitle}
                        </div>
                        <div className={`text-[10px] font-mono truncate ${item.accentText}`}>
                          {item.patterns}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Scratchpad Launcher */}
              <button
                type="button"
                onClick={() => {
                  setScratchPreset(null);
                  setIsScratchpadOpen(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-surface-elevated hover:bg-surface-high border border-border-default text-left transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text-primary">SQLite Scratchpad</div>
                    <div className="text-[11px] text-text-muted truncate">
                      Test custom tables &amp; plans
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />
              </button>
            </aside>

            {/* RIGHT PROBLEM TABLE WORKSPACE */}
            <main className="lg:col-span-9 space-y-4 min-w-0">
              {/* Compact Filter Bar */}
              <div className="bg-surface border border-border-subtle rounded-2xl p-3 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search SQL problems by #id, title, or clause pattern..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDebouncedSearch('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-0.5 bg-canvas border border-border-subtle rounded-xl p-0.5 text-xs">
                    {(['all', 'solved', 'unsolved'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setStatusFilter(status);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                          statusFilter === status
                            ? 'bg-primary text-black font-semibold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-0.5 bg-canvas border border-border-subtle rounded-xl p-0.5 text-xs">
                    {(['all', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => {
                          setSelectedDifficulty(diff);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          selectedDifficulty === diff
                            ? 'bg-primary text-black font-semibold'
                            : diff === 'Easy'
                              ? 'text-success hover:bg-surface-elevated'
                              : diff === 'Medium'
                                ? 'text-warning hover:bg-surface-elevated'
                                : diff === 'Hard'
                                  ? 'text-danger hover:bg-surface-elevated'
                                  : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {diff === 'all' ? 'All' : diff === 'Medium' ? 'Med' : diff}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isShuffled) {
                        setIsShuffled(false);
                        setCurrentPage(1);
                        return;
                      }
                      setIsShuffled(true);
                      setShuffleSeed(Math.floor(Math.random() * 1_000_000) + 1);
                      setCurrentPage(1);
                    }}
                    aria-pressed={isShuffled}
                    className={`px-3 py-1.5 border rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                      isShuffled
                        ? 'bg-primary-subtle border-primary/45 text-primary font-semibold'
                        : 'bg-canvas border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Shuffle className="w-3.5 h-3.5 text-primary" />
                    <span>{isShuffled ? 'Shuffled' : 'Shuffle'}</span>
                  </button>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="px-2.5 py-1.5 bg-danger-subtle border border-danger/30 rounded-xl text-xs text-danger font-mono flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset ({filteredTotal})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Summary */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between px-1 text-xs font-mono text-text-muted">
                  <span>
                    Showing <strong className="text-text-primary">{filteredTotal}</strong> matching queries ({filteredSolvedCount} solved)
                  </span>
                  {selectedTopic !== 'all' && (
                    <span className="text-primary">Domain: {selectedTopic}</span>
                  )}
                </div>
              )}

              {/* SQL Problem Table */}
              <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-subtle text-text-muted font-mono text-[11px] uppercase tracking-wider border-b border-border-subtle">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">Done</th>
                        <th className="py-3 px-4 w-16">ID</th>
                        <th className="py-3 px-4">Challenge &amp; Pattern</th>
                        <th className="py-3 px-4 w-52 hidden md:table-cell">Domain</th>
                        <th className="py-3 px-4 w-24">Level</th>
                        <th className="py-3 px-4 w-20 text-right">Open</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="py-10">
                            <CodePrepLoader
                              variant="section"
                              className="min-h-[160px]"
                              label="Loading SQL Query Bank"
                              sublabel={`Preparing page ${currentPage} of ${sqlTotal} relational schema challenges...`}
                            />
                          </td>
                        </tr>
                      ) : problems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center space-y-3">
                            <div className="text-sm text-text-secondary font-medium">
                              No SQL queries match your current filters.
                            </div>
                            <button
                              type="button"
                              onClick={resetAllFilters}
                              className="px-3.5 py-1.5 rounded-lg bg-primary text-black text-xs font-semibold"
                            >
                              Clear Filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        problems.map((prob, idx) => (
                          <tr
                            key={prob.id}
                            onClick={() => onSelectProblem(prob.id)}
                            className={`hover:bg-surface-high/60 transition-colors cursor-pointer group ${
                              idx % 2 === 0 ? 'bg-surface' : 'bg-surface-subtle/40'
                            }`}
                          >
                            <td className="py-3 px-4 text-center">
                              {prob.isSolved ? (
                                <Check className="w-4 h-4 text-success mx-auto stroke-[2.5]" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30 mx-auto group-hover:bg-primary/60 transition-colors" />
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-text-muted font-semibold">
                              #{prob.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-xs sm:text-[13px] text-text-primary group-hover:text-primary transition-colors">
                                  {prob.title}
                                </span>
                                {prob.pattern && (
                                  <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle text-[10px] font-mono text-text-muted">
                                    {prob.pattern}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <span className="inline-flex items-center gap-1.5 text-text-secondary">
                                {getTopicIcon(prob.topic)}
                                <span className="truncate">{prob.topic}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] font-semibold">
                              {prob.difficulty === 'Easy' && <span className="text-success">Easy</span>}
                              {prob.difficulty === 'Medium' && <span className="text-warning">Med</span>}
                              {prob.difficulty === 'Hard' && <span className="text-danger">Hard</span>}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <ChevronRight className="w-4 h-4 text-primary opacity-55 group-hover:opacity-100 inline-block transition-opacity" />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  currentPage={currentPage}
                  totalItems={filteredTotal}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  itemLabel="SQL queries"
                />
              </div>
            </main>
          </div>
        ) : (
          /* SECTION 2: EXECUTION PIPELINE & RUNNABLE PATTERNS COOKBOOK */
          <div className="space-y-6">
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-text-primary">
                    SQL Logical Execution Order
                  </h2>
                  <p className="text-xs text-text-muted">
                    Select any evaluation stage to inspect scope rules and common query traps.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-primary">
                  Stage {activeStage.step} / 07
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {SQL_EXECUTION_PIPELINE.map((stage, idx) => (
                  <React.Fragment key={stage.step}>
                    <button
                      type="button"
                      onClick={() => setSelectedStageIdx(idx)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors inline-flex items-center gap-1.5 ${
                        selectedStageIdx === idx
                          ? 'bg-primary text-black border-primary font-bold'
                          : 'bg-surface-elevated border-border-subtle text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className="opacity-70">{stage.step}</span>
                      <span>{stage.clause}</span>
                    </button>
                    {idx < SQL_EXECUTION_PIPELINE.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted hidden sm:inline" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
                <div className="lg:col-span-6 space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                      Evaluation Semantics
                    </div>
                    <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                      {activeStage.rule}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-warning-subtle/30 border border-warning/30 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <div className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-warning font-mono uppercase text-[10px] mr-1.5">
                        Watch out:
                      </strong>
                      {activeStage.trap}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 rounded-xl border border-border-subtle overflow-hidden bg-canvas">
                  <div className="px-3.5 py-2 bg-surface-elevated border-b border-border-subtle text-[10px] font-mono text-text-muted">
                    {activeStage.clause} Reference
                  </div>
                  <div className="p-3.5 overflow-x-auto">
                    <HighlightedCode
                      code={activeStage.snippet}
                      language="sql"
                      className="text-xs leading-6"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  Runnable SQL Pattern Cookbook
                </h2>
                <p className="text-xs text-text-muted">
                  Open any canonical SQL pattern directly inside the live SQLite Scratchpad to edit and run.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {SQL_COOKBOOK_PATTERNS.map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary">
                            {getTopicIcon(item.topic)}
                            <span>{item.topic}</span>
                          </span>
                          <h3 className="text-sm font-bold text-text-primary">{item.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setScratchPreset({
                              label: item.title,
                              schemaDdl: item.schemaDdl,
                              query: item.query,
                            });
                            setIsScratchpadOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-black text-[11px] font-semibold inline-flex items-center gap-1.5 shrink-0 hover:opacity-95"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Run Live</span>
                        </button>
                      </div>

                      <p className="text-xs text-text-secondary leading-relaxed">
                        <strong className="text-text-primary">Use when:</strong> {item.useCase}
                      </p>

                      <div className="rounded-xl border border-border-subtle overflow-hidden bg-canvas">
                        <div className="p-3.5 overflow-x-auto">
                          <HighlightedCode
                            code={item.query}
                            language="sql"
                            className="text-xs leading-5"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle flex items-start justify-between gap-3 text-[11px]">
                      <div className="text-text-secondary leading-relaxed">
                        <strong className="text-warning font-mono mr-1">Edge case:</strong>
                        {item.pitfall}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTopic(item.topic);
                          setCurrentPage(1);
                          setActiveSection('problems');
                        }}
                        className="text-primary font-mono shrink-0 hover:underline"
                      >
                        Problems →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <SqlScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        initialPreset={scratchPreset}
      />
    </AppLayout>
  );
};
