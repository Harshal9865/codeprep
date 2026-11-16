import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import { PaginationBar } from '../components/ui/PaginationBar';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { SqlScratchpadModal } from '../components/sql/SqlScratchpadModal';
import { Search, Check, ChevronRight, Shuffle, Terminal } from 'lucide-react';

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

export const SqlListPage: React.FC<SqlListPageProps> = ({ onSelectProblem, onTabChange }) => {
  const [problems, setProblems] = useState<SqlProblemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [sqlSubset, setSqlSubset] = useState<'all' | 'core-sql-100'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(400);
  const [sqlTotal, setSqlTotal] = useState(400);
  const [sqlSolvedTotal, setSqlSolvedTotal] = useState(0);
  const [filteredSolvedCount, setFilteredSolvedCount] = useState(0);
  const [difficultyTotals, setDifficultyTotals] = useState({ Easy: 125, Medium: 170, Hard: 105 });
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
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

  return (
    <AppLayout currentTab="sql" onTabChange={onTabChange}>
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Database Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-bold text-2xl text-text-primary tracking-tight">
                SQL Query Lab ({sqlTotal})
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-xs font-mono text-text-secondary">
                {filteredSolvedCount} / {filteredTotal} Solved
              </span>
            </div>
            <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
              Isolated relational database drills covering recursive CTEs, window functions (ROW_NUMBER, DENSE_RANK, LEAD/LAG), joins, cohort retention, and schema sandboxing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsScratchpadOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-default text-xs font-semibold text-text-primary flex items-center gap-2 transition-colors"
            >
              <Terminal className="w-4 h-4 text-primary" />
              <span>SQL Scratchpad</span>
            </button>

            <div className="min-w-[200px] bg-surface border border-border-subtle rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Lab Progress</span>
                <span className="text-text-primary font-semibold">
                  {sqlSolvedTotal}/{sqlTotal} ({sqlPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-high overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${sqlPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search SQL problems by #id, title, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-elevated border border-border-default rounded-full p-0.5 text-xs">
              {[
                { id: 'all', label: `All SQL (${sqlTotal})` },
                { id: 'core-sql-100', label: 'Core 100 (#501–#600)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSqlSubset(opt.id as 'all' | 'core-sql-100');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-full transition-colors ${
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
                  className={`px-3 py-1 rounded-full capitalize transition-colors ${
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
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="all">All Topics</option>
              <option value="Aggregations & Joins">Aggregations &amp; Joins</option>
              <option value="Window Functions">Window Functions</option>
              <option value="Common Table Expressions">Common Table Expressions (CTEs)</option>
              <option value="Gaps and Islands">Gaps &amp; Islands</option>
              <option value="Advanced Analytics & Retention">Advanced Analytics &amp; Retention</option>
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
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
              className={`px-3 py-2 border rounded-full text-xs flex items-center gap-1.5 transition-colors ${
                isShuffled
                  ? 'bg-primary-subtle border-primary/45 text-primary font-semibold'
                  : 'bg-surface-elevated border-border-default text-text-secondary hover:text-text-primary'
              }`}
              title={
                isShuffled
                  ? 'Shuffle is ON — click again to turn off and restore #ID order'
                  : 'Shuffle SQL problem order'
              }
            >
              <Shuffle className="w-3.5 h-3.5 text-primary" />
              <span>{isShuffled ? 'Shuffle ON' : 'Shuffle'}</span>
            </button>
          </div>
        </div>

        {/* SQL Problem Table */}
        <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-text-muted font-mono text-[11px] border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Status</th>
                <th className="py-3 px-4 w-16">ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4 w-52 hidden sm:table-cell">Topic</th>
                <th className="py-3 px-4 w-28">Difficulty</th>
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
                  <td colSpan={6} className="py-16 text-center text-text-muted font-mono">
                    No SQL problems match your criteria.
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
                    <td className="py-3 px-4 font-mono text-text-muted">#{prob.id}</td>
                    <td className="py-3 px-4 font-medium text-text-primary group-hover:text-primary transition-colors">
                      {prob.title}
                    </td>
                    <td className="py-3 px-4 text-text-muted hidden sm:table-cell">{prob.topic}</td>
                    <td className="py-3 px-4 font-medium">
                      {prob.difficulty === 'Easy' && <span className="text-success">Easy</span>}
                      {prob.difficulty === 'Medium' && <span className="text-warning">Med.</span>}
                      {prob.difficulty === 'Hard' && <span className="text-danger">Hard</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4" />
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
            itemLabel="SQL queries"
          />
        </div>
      </div>

      <SqlScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
      />
    </AppLayout>
  );
};
