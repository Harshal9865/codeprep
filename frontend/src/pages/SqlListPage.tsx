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
  subtitle: string;
  patterns: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
}

const SQL_TOPIC_CARDS: SqlTopicMeta[] = [
  {
    topic: 'Aggregations & Joins',
    shortTitle: 'Joins & Grouping',
    subtitle: 'LEFT/Self joins, HAVING filters & NULL-safe sums',
    patterns: 'LEFT JOIN · COALESCE · COUNT',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/35',
  },
  {
    topic: 'Window Functions',
    shortTitle: 'Window Functions',
    subtitle: 'Top-K ranking, running totals & peer deltas',
    patterns: 'DENSE_RANK · LAG/LEAD · OVER',
    accentText: 'text-sky-400',
    accentBg: 'bg-sky-500/10',
    accentBorder: 'border-sky-500/35',
  },
  {
    topic: 'Common Table Expressions',
    shortTitle: 'CTEs & Recursion',
    subtitle: 'Multi-stage pipelines & hierarchical tree traversal',
    patterns: 'WITH · WITH RECURSIVE',
    accentText: 'text-purple-400',
    accentBg: 'bg-purple-500/10',
    accentBorder: 'border-purple-500/35',
  },
  {
    topic: 'Gaps and Islands',
    shortTitle: 'Gaps & Islands',
    subtitle: 'Contiguous streaks, missing IDs & active ranges',
    patterns: 'id - ROW_NUMBER() · LAG Gap',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/35',
  },
  {
    topic: 'Advanced Analytics & Retention',
    shortTitle: 'Cohorts & Retention',
    subtitle: 'Funnel conversion, rolling 7-day & churn analysis',
    patterns: 'Cohort Join · Rolling AVG',
    accentText: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/35',
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
    rule: 'Builds the Cartesian join grain and evaluates ON predicates before filtering.',
    trap: 'Putting a right-table filter like `b.status = "paid"` in WHERE silently converts a LEFT JOIN into an INNER JOIN.',
    snippet: 'FROM Customers c\nLEFT JOIN Orders o ON c.id = o.customer_id AND o.status = \'paid\'',
  },
  {
    step: '02',
    clause: 'WHERE',
    rule: 'Filters individual raw rows before grouping or aggregates execute.',
    trap: 'Aggregate functions (`COUNT`, `SUM`, `AVG`) and SELECT aliases cannot be referenced in WHERE.',
    snippet: 'WHERE created_at >= \'2026-01-01\' AND amount IS NOT NULL',
  },
  {
    step: '03',
    clause: 'GROUP BY',
    rule: 'Collapses matching key combinations into one summary row per group.',
    trap: 'Every non-aggregated column in SELECT should appear in GROUP BY so results remain deterministic.',
    snippet: 'GROUP BY department_id, tier',
  },
  {
    step: '04',
    clause: 'HAVING',
    rule: 'Filters aggregated groups after GROUP BY has run.',
    trap: 'Avoid putting simple row filters in HAVING — filter raw rows earlier in WHERE for smaller groups.',
    snippet: 'HAVING COUNT(DISTINCT user_id) >= 5 AND SUM(amount) > 1000',
  },
  {
    step: '05',
    clause: 'Window OVER()',
    rule: 'Computes ranking, LEAD/LAG, and rolling frames across partitions without collapsing rows.',
    trap: 'Default `RANGE BETWEEN` frame handles peer ties differently than `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`.',
    snippet: 'DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk',
  },
  {
    step: '06',
    clause: 'SELECT & DISTINCT',
    rule: 'Projects final expressions, aliases (`AS ...`), and deduplicates rows if DISTINCT is set.',
    trap: 'SQLite integer division (`COUNT(*) / total`) truncates decimals — multiply by `1.0` first.',
    snippet: 'SELECT dept, ROUND(100.0 * paid_cnt / COUNT(*), 2) AS paid_pct',
  },
  {
    step: '07',
    clause: 'ORDER BY & LIMIT',
    rule: 'Sorts the final projected output (SELECT aliases work here) and caps row count.',
    trap: 'Always include deterministic tie-breakers (e.g. `ORDER BY score DESC, id ASC`) when using LIMIT.',
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
    useCase: 'Include entities that have 0 matching child records (e.g. inactive users or zero-sale products).',
    pitfall: 'Count a non-null right-table primary key (`COUNT(o.id)`), NOT `COUNT(*)`, otherwise empty left rows count as 1!',
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
    title: 'Top-K Per Group with Ties (`DENSE_RANK`)',
    topic: 'Window Functions',
    useCase: 'Find the top 2 highest-earning employees per department without dropping salary ties.',
    pitfall: '`ROW_NUMBER()` breaks ties arbitrarily, `RANK()` skips ranks after ties; use `DENSE_RANK()` for top-N distinct values.',
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
    useCase: 'Group consecutive login days per user into contiguous islands to measure max streak length.',
    pitfall: 'Deduplicate multiple events on the same day (`SELECT DISTINCT user_id, day_num`) before subtracting `ROW_NUMBER()`.',
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
    title: 'Row-to-Row Comparison (`LAG` & Percentage Growth)',
    topic: 'Advanced Analytics & Retention',
    useCase: 'Compute day-over-day metric deltas or filter days exceeding previous revenue.',
    pitfall: 'Protect division with `NULLIF(prev_rev, 0)` and multiply by `100.0` before dividing so percentages keep decimals.',
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
        {/* Compact Workspace Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-bold text-2xl text-text-primary tracking-tight">
                SQL Query Lab
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-xs font-mono text-text-secondary">
                {sqlSolvedTotal}/{sqlTotal} Solved ({sqlPct}%)
              </span>
              {hasActiveFilters && (
                <span className="px-2.5 py-0.5 rounded-full bg-primary-subtle border border-primary/30 text-xs font-mono text-primary">
                  Showing {filteredSolvedCount}/{filteredTotal}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-text-secondary max-w-3xl leading-relaxed">
              Isolated SQLite relational sandboxes covering joins, window functions, recursive CTEs, gaps &amp; islands, and cohort retention.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleLaunchRandomSql}
              className="px-3.5 py-2 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Practice Unsolved SQL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScratchPreset(null);
                setIsScratchpadOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-default text-xs font-semibold text-text-primary flex items-center gap-2 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>SQL Scratchpad</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface border border-border-subtle">
            <button
              type="button"
              onClick={() => setActiveSection('problems')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeSection === 'problems'
                  ? 'bg-primary text-black shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Query Problems ({sqlTotal})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('patterns')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeSection === 'patterns'
                  ? 'bg-primary text-black shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>SQL Patterns &amp; Execution Guide</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-text-muted hidden md:flex items-center gap-3">
            <span className="text-success">Easy {difficultyTotals.Easy}</span>
            <span className="text-warning">Medium {difficultyTotals.Medium}</span>
            <span className="text-danger">Hard {difficultyTotals.Hard}</span>
          </div>
        </div>

        {activeSection === 'problems' ? (
          <div className="space-y-4">
            {/* 5 Interactive SQL Topic Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {SQL_TOPIC_CARDS.map((card) => {
                const isSelected = selectedTopic === card.topic;
                return (
                  <button
                    key={card.topic}
                    type="button"
                    onClick={() => {
                      setSelectedTopic((prev) => (prev === card.topic ? 'all' : card.topic));
                      setCurrentPage(1);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? `${card.accentBg} ${card.accentBorder} ring-1 ring-primary/35`
                        : 'bg-surface border-border-subtle hover:border-border-hover hover:bg-surface-elevated/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-text-primary">
                          {getTopicIcon(card.topic)}
                          <span>{card.shortTitle}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted leading-snug line-clamp-2">
                        {card.subtitle}
                      </p>
                    </div>
                    <div className="pt-1 border-t border-border-subtle/70 flex items-center justify-between text-[10px] font-mono">
                      <span className={card.accentText}>{card.patterns}</span>
                      {isSelected && <span className="text-primary font-semibold">Active</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search SQL problems by #id, title, pattern, or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
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
                <div className="flex items-center gap-1 bg-surface-elevated border border-border-default rounded-full p-0.5 text-xs">
                  {(
                    [
                      { id: 'all', label: `All (${sqlTotal})` },
                      { id: 'core-sql-100', label: 'Core 100' },
                      { id: 'sql-interview-50', label: 'Top 50' },
                      { id: 'sql-extended-300', label: 'Extended 300' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSqlSubset(opt.id);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full transition-colors ${
                        sqlSubset === opt.id
                          ? 'bg-sky-500 text-black font-semibold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-surface-elevated border border-border-default rounded-full p-0.5 text-xs">
                  {(['all', 'solved', 'unsolved'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full capitalize transition-colors ${
                        statusFilter === status
                          ? 'bg-primary text-black font-semibold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => {
                    setSelectedDifficulty(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-surface-elevated border border-border-default rounded-full text-xs text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">All Difficulties</option>
                  <option value="Easy">Easy ({difficultyTotals.Easy})</option>
                  <option value="Medium">Medium ({difficultyTotals.Medium})</option>
                  <option value="Hard">Hard ({difficultyTotals.Hard})</option>
                </select>

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
                  className={`px-3 py-1.5 border rounded-full text-xs flex items-center gap-1.5 transition-colors ${
                    isShuffled
                      ? 'bg-primary-subtle border-primary/45 text-primary font-semibold'
                      : 'bg-surface-elevated border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5 text-primary" />
                  <span>{isShuffled ? 'Shuffle ON' : 'Shuffle'}</span>
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-3 py-1.5 bg-danger-subtle border border-danger/30 rounded-full text-xs text-danger font-mono flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* SQL Problem Table */}
            <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle text-text-muted font-mono text-[11px] uppercase tracking-wider border-b border-border-subtle">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Status</th>
                      <th className="py-3 px-4 w-16">ID</th>
                      <th className="py-3 px-4">Query Problem &amp; Pattern</th>
                      <th className="py-3 px-4 w-56 hidden sm:table-cell">Section / Topic</th>
                      <th className="py-3 px-4 w-24">Difficulty</th>
                      <th className="py-3 px-4 w-20 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8">
                          <CodePrepLoader
                            variant="section"
                            className="min-h-[160px]"
                            label="Loading SQL Query Lab"
                            sublabel={`Preparing page ${currentPage} of ${sqlTotal} relational schema problems...`}
                          />
                        </td>
                      </tr>
                    ) : problems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center space-y-3">
                          <div className="text-sm text-text-secondary font-medium">
                            No SQL problems match your current filters.
                          </div>
                          <button
                            type="button"
                            onClick={resetAllFilters}
                            className="px-3.5 py-1.5 rounded-lg bg-primary text-black text-xs font-semibold"
                          >
                            Reset Filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      problems.map((prob, idx) => (
                        <tr
                          key={prob.id}
                          onClick={() => onSelectProblem(prob.id)}
                          className={`hover:bg-surface-high/60 transition-colors cursor-pointer group ${
                            idx % 2 === 0 ? 'bg-surface' : 'bg-surface-subtle/50'
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            {prob.isSolved ? (
                              <Check className="w-4 h-4 text-success mx-auto stroke-[2.5]" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30 mx-auto group-hover:bg-text-muted/60 transition-colors" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-text-muted font-semibold">
                            #{prob.id}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-text-primary group-hover:text-primary transition-colors">
                                {prob.title}
                              </span>
                              {prob.pattern && (
                                <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle text-[10px] font-mono text-text-muted">
                                  {prob.pattern}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1.5 text-text-secondary">
                              {getTopicIcon(prob.topic)}
                              <span>{prob.topic}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {prob.difficulty === 'Easy' && <span className="text-success">Easy</span>}
                            {prob.difficulty === 'Medium' && <span className="text-warning">Med.</span>}
                            {prob.difficulty === 'Hard' && <span className="text-danger">Hard</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-primary opacity-75 group-hover:opacity-100 font-mono text-[11px] transition-opacity">
                              <span>Solve</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
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
          </div>
        ) : (
          /* SECTION 2: SQL PATTERNS & INTERACTIVE EXECUTION ORDER GUIDE */
          <div className="space-y-6">
            {/* Interactive Logical Clause Execution Pipeline */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-text-primary">
                    Interactive SQL Logical Execution Order
                  </h2>
                  <p className="text-xs text-text-muted">
                    Click any clause to see when SQLite evaluates it and which bugs happen if clauses are mixed up.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-primary">
                  Stage {activeStage.step} / 07
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {SQL_EXECUTION_PIPELINE.map((stage, idx) => (
                  <button
                    key={stage.step}
                    type="button"
                    onClick={() => setSelectedStageIdx(idx)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      selectedStageIdx === idx
                        ? 'bg-primary text-black border-primary font-bold'
                        : 'bg-surface-elevated border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="opacity-70">{stage.step}.</span>
                    <span>{stage.clause}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
                <div className="lg:col-span-6 space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                      Execution Semantics
                    </div>
                    <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                      {activeStage.rule}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-warning-subtle/30 border border-warning/30 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <div className="text-xs text-text-secondary leading-relaxed">
                      <strong className="text-warning font-mono uppercase text-[10px] mr-1.5">
                        Common Bug:
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

            {/* Runnable SQL Patterns Cookbook */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    Interview SQL Pattern Cookbook
                  </h2>
                  <p className="text-xs text-text-muted">
                    Inspect canonical patterns and test or modify them live in the SQLite Scratchpad.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {SQL_COOKBOOK_PATTERNS.map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
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
                          <span>Try in Scratchpad</span>
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
                        <strong className="text-warning font-mono mr-1">Watch out:</strong>
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
