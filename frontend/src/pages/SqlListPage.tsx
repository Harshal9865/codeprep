import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import { PaginationBar } from '../components/ui/PaginationBar';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import {
  Search,
  Check,
  ChevronRight,
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

export const SqlListPage: React.FC<SqlListPageProps> = ({
  onSelectProblem,
  onTabChange,
}) => {
  const [problems, setProblems] = useState<SqlProblemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;

  useEffect(() => {
    fetchProblems();
  }, [selectedDifficulty, selectedTopic]);

  const fetchProblems = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        category: 'SQL',
        pageSize: '100',
      });
      if (selectedDifficulty !== 'all') queryParams.append('difficulty', selectedDifficulty);
      if (selectedTopic !== 'all') queryParams.append('topic', selectedTopic);

      const res = await apiRequest<{ problems: SqlProblemItem[] }>(`/problems?${queryParams.toString()}`);
      setProblems(res.problems);
    } catch {
      setProblems(
        Array.from({ length: 100 }, (_, i) => ({
          id: 501 + i,
          slug: `sql-problem-${501 + i}`,
          title: `SQL Query Problem #${501 + i}`,
          difficulty: i < 25 ? 'Easy' : i >= 85 ? 'Hard' : 'Medium',
          topic:
            i < 25
              ? 'Aggregations & Joins'
              : i < 55
              ? 'Window Functions'
              : 'Common Table Expressions',
          pattern: 'Relational Query Logic',
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProblems = problems.filter((p) => {
    if (statusFilter === 'solved' && !p.isSolved) return false;
    if (statusFilter === 'unsolved' && p.isSolved) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.topic.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });

  const totalSolvedAll = problems.filter((p) => p.isSolved).length;
  const solvedCount = filteredProblems.filter((p) => p.isSolved).length;
  const sqlPct = problems.length > 0 ? Math.round((totalSolvedAll / problems.length) * 100) : 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDifficulty, selectedTopic, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProblems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProblems.slice(start, start + PAGE_SIZE);
  }, [filteredProblems, safePage]);

  return (
    <AppLayout currentTab="sql" onTabChange={onTabChange}>
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* LeetCode Database Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-sky-500/15 text-sky-400 text-xs font-mono font-medium">
                SQLite Sandbox Active
              </span>
              <span className="text-xs text-text-muted">•</span>
              <span className="text-xs text-success font-medium">
                {solvedCount} / {filteredProblems.length} Solved
              </span>
            </div>
            <h1 className="font-bold text-2xl text-text-primary tracking-tight">
              SQL Query Lab (100) • Relational Curriculum
            </h1>
            <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
              Isolated relational database drills covering recursive CTEs, window functions (ROW_NUMBER, DENSE_RANK, LEAD/LAG), joins, and schema sandboxing.
            </p>
          </div>

          <div className="min-w-[200px] bg-surface border border-border-subtle rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">Lab Progress</span>
              <span className="text-text-primary font-semibold">{totalSolvedAll}/{problems.length || 100} ({sqlPct}%)</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-high overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${sqlPct}%` }} />
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
              {(['all', 'solved', 'unsolved'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
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
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-3 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="all">All Topics</option>
              <option value="Aggregations & Joins">Aggregations & Joins</option>
              <option value="Window Functions">Window Functions</option>
              <option value="Common Table Expressions">Common Table Expressions (CTEs)</option>
              <option value="Gaps and Islands">Gaps & Islands</option>
              <option value="Advanced Analytics & Retention">Advanced Analytics & Retention</option>
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy (25)</option>
              <option value="Medium">Medium (60)</option>
              <option value="Hard">Hard (15)</option>
            </select>
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
                      sublabel="Preparing 100 relational schema problems..."
                    />
                  </td>
                </tr>
              ) : filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-text-muted font-mono">
                    No SQL problems match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedProblems.map((prob, idx) => (
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
                      {prob.difficulty === 'Easy' && (
                        <span className="text-success">Easy</span>
                      )}
                      {prob.difficulty === 'Medium' && (
                        <span className="text-warning">Med.</span>
                      )}
                      {prob.difficulty === 'Hard' && (
                        <span className="text-danger">Hard</span>
                      )}
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
            currentPage={safePage}
            totalItems={filteredProblems.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="SQL queries"
          />
        </div>
      </div>
    </AppLayout>
  );
};
