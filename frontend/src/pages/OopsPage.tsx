import React, { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Problem } from '../types/problem';
import { apiRequest } from '../services/api';
import { PaginationBar } from '../components/ui/PaginationBar';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { HighlightedCode } from '../components/ui/CodeHighlight';
import {
  OOPS_STUDY_MODULES,
  OopMcqItem,
  generateOopMcqBatch,
} from '../data/oopsCurriculum';
import {
  Boxes,
  BookOpen,
  Code2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  ChevronRight,
  Check,
  AlertTriangle,
  RefreshCw,
  Shuffle,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

interface OopsPageProps {
  onSelectProblem: (id: number) => void;
  onTabChange: (tab: string) => void;
}

type OopsSectionTab = 'study' | 'practice' | 'mcq';

const OOP_TOPICS = [
  'All Pillars',
  'Encapsulation & Class Invariants',
  'Constructors, RAII & Lifecycles',
  'Inheritance & Virtual Polymorphism',
  'Operator Overloading & Value Types',
  'Design Patterns & SOLID Systems',
];

export const OopsPage: React.FC<OopsPageProps> = ({ onSelectProblem, onTabChange }) => {
  const [activeTab, setActiveTab] = useState<OopsSectionTab>('study');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(OOPS_STUDY_MODULES[0].id);

  // Server-paginated OOP Coding Practice state (#631-#730)
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [oopTotal, setOopTotal] = useState(100);
  const [oopSolved, setOopSolved] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Pillars');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(1);
  const PAGE_SIZE = 25;

  // Interactive OOP MCQs Drill state
  const [mcqBatch, setMcqBatch] = useState<OopMcqItem[]>(() => generateOopMcqBatch(20));
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [mcqScore, setMcqScore] = useState({ attempted: 0, correct: 0 });

  const fetchOopProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('category', 'OOP');
      params.set('page', String(currentPage));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('includeMeta', '1');
      if (selectedTopic !== 'All Pillars') params.set('topic', selectedTopic);
      if (selectedDifficulty !== 'All') params.set('difficulty', selectedDifficulty);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (isShuffled) params.set('shuffleSeed', String(shuffleSeed));

      const res = await apiRequest<{
        problems: Problem[];
        pagination?: { total: number };
        meta?: { oopTotal?: number; oopSolved?: number };
      }>(`/problems?${params.toString()}`);

      setProblems(res.problems || []);
      setFilteredTotal(res.pagination?.total ?? (res.problems?.length || 0));
      if (res.meta) {
        if (typeof res.meta.oopTotal === 'number') setOopTotal(res.meta.oopTotal);
        if (typeof res.meta.oopSolved === 'number') setOopSolved(res.meta.oopSolved);
      }
    } catch {
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    selectedTopic,
    selectedDifficulty,
    statusFilter,
    searchQuery,
    isShuffled,
    shuffleSeed,
  ]);

  useEffect(() => {
    void fetchOopProblems();
    const onProgress = () => void fetchOopProblems();
    window.addEventListener('codeprep:progress-updated', onProgress);
    return () => window.removeEventListener('codeprep:progress-updated', onProgress);
  }, [fetchOopProblems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTopic, selectedDifficulty, statusFilter, searchQuery, isShuffled, shuffleSeed]);

  const activeModule =
    OOPS_STUDY_MODULES.find((m) => m.id === selectedModuleId) || OOPS_STUDY_MODULES[0];
  const oopPct = oopTotal > 0 ? Math.round((oopSolved / oopTotal) * 100) : 0;

  const handleAnswerMcq = (item: OopMcqItem, optIdx: number) => {
    if (selectedAnswers[item.id] !== undefined) return;
    setSelectedAnswers((prev) => ({ ...prev, [item.id]: optIdx }));
    setMcqScore((prev) => ({
      attempted: prev.attempted + 1,
      correct: prev.correct + (optIdx === item.correctIndex ? 1 : 0),
    }));
  };

  const handleRefreshMcqs = () => {
    setMcqBatch(generateOopMcqBatch(20));
    setSelectedAnswers({});
  };

  return (
    <AppLayout currentTab="oops" onTabChange={onTabChange}>
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 text-xs font-mono font-medium inline-flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" />
                OOPs &amp; Low-Level C++17 Design
              </span>
              <span className="text-xs text-text-muted">•</span>
              <span className="text-xs text-success font-medium">
                {oopSolved} / {oopTotal} Coding Solved
              </span>
            </div>
            <h1 className="font-bold text-2xl text-text-primary tracking-tight">
              Object-Oriented Programming Hub ({oopTotal} Coding + Study + MCQs)
            </h1>
            <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
              Master Encapsulation, RAII, Virtual Polymorphism, Operator Overloading, SOLID Principles &amp; Design Patterns with executable C++17 classes and placement MCQ drills.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] bg-surface border border-border-subtle rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">OOPs Coding</span>
                <span className="text-text-primary font-semibold">
                  {oopSolved}/{oopTotal} ({oopPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-high overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${oopPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('study')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors border ${
                activeTab === 'study'
                  ? 'bg-primary text-black border-primary'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary border-border-subtle'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Study Content ({OOPS_STUDY_MODULES.length} Modules)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('practice')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors border ${
                activeTab === 'practice'
                  ? 'bg-primary text-black border-primary'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary border-border-subtle'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>OOPs Coding Practice ({oopTotal})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mcq')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors border ${
                activeTab === 'mcq'
                  ? 'bg-primary text-black border-primary'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary border-border-subtle'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>OOPs MCQs Drill (100+)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onTabChange('aptitude')}
            className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Open Timed Aptitude + OOPs Mock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* TAB 1: STUDY CONTENT */}
        {activeTab === 'study' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <aside className="lg:col-span-4 space-y-2">
              {OOPS_STUDY_MODULES.map((mod) => {
                const isSelected = mod.id === activeModule.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setSelectedModuleId(mod.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-surface-elevated border-primary/50 ring-1 ring-primary/30'
                        : 'bg-surface border-border-subtle hover:border-border-hover hover:bg-surface-elevated/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-primary mb-1">
                      <span>{mod.pillar}</span>
                      <span className="text-text-muted">{mod.readTime}</span>
                    </div>
                    <div className="text-sm font-semibold text-text-primary">{mod.title}</div>
                  </button>
                );
              })}
            </aside>

            <section className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-6 space-y-5">
              <div className="space-y-2 border-b border-border-subtle pb-4">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-semibold">
                  {activeModule.pillar}
                </span>
                <h2 className="text-xl font-bold text-text-primary">{activeModule.title}</h2>
                <p className="text-sm text-text-secondary leading-relaxed">{activeModule.summary}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Core Engineering Rules
                </h3>
                <ul className="space-y-2">
                  {activeModule.keyRules.map((rule, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm text-text-secondary bg-surface-elevated/60 border border-border-subtle rounded-xl p-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                    Canonical C++17 Pattern
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('practice')}
                    className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>Practice Coding Problems</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="rounded-xl border border-border-subtle overflow-hidden bg-canvas">
                  <HighlightedCode code={activeModule.codeExample} language="cpp" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-mono font-semibold text-amber-400 uppercase">
                    Interview Red Flag / Common Pitfall
                  </div>
                  <p className="text-text-secondary leading-relaxed">{activeModule.interviewTrap}</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: 100 OOPs CODING PROBLEMS */}
        {activeTab === 'practice' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search OOP coding challenges (#631-#730)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50"
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
                  className="px-3 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-secondary focus:outline-none cursor-pointer"
                >
                  {OOP_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-secondary focus:outline-none cursor-pointer"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setIsShuffled(true);
                    setShuffleSeed(Math.floor(Math.random() * 1_000_000) + 1);
                  }}
                  className="px-3 py-2 bg-surface-elevated border border-border-default rounded-full text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5 text-primary" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>

            <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle text-text-muted font-mono text-[11px] border-b border-border-subtle">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Done</th>
                    <th className="py-3 px-4 w-16">ID</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4 w-56 hidden sm:table-cell">OOP Pillar</th>
                    <th className="py-3 px-4 w-28">Difficulty</th>
                    <th className="py-3 px-4 w-20 text-right">Solve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8">
                        <CodePrepLoader
                          variant="section"
                          className="min-h-[160px]"
                          label="Loading OOPs C++17 Challenges"
                          sublabel="Fetching paginated OOP problems..."
                        />
                      </td>
                    </tr>
                  ) : problems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-muted font-mono">
                        No OOP coding challenges match your filter.
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
                            <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-text-muted">#{prob.id}</td>
                        <td className="py-3 px-4 font-medium text-text-primary group-hover:text-primary transition-colors">
                          {prob.title}
                        </td>
                        <td className="py-3 px-4 text-text-muted hidden sm:table-cell">
                          {prob.topic}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {prob.difficulty === 'Easy' && <span className="text-success">Easy</span>}
                          {prob.difficulty === 'Medium' && <span className="text-warning">Med.</span>}
                          {prob.difficulty === 'Hard' && <span className="text-danger">Hard</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center text-primary opacity-75 group-hover:opacity-100">
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
                itemLabel="OOP problems"
              />
            </div>
          </div>
        )}

        {/* TAB 3: OOPs MCQs DRILL */}
        {activeTab === 'mcq' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border-subtle rounded-xl p-4">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-text-primary">
                  Interactive OOPs Placement Quiz ({mcqBatch.length} Questions Loaded)
                </div>
                <div className="text-xs text-text-muted font-mono">
                  Score: {mcqScore.correct} / {mcqScore.attempted} correct
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshMcqs}
                className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-semibold hover:opacity-90 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Load Fresh 20 OOP MCQs</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mcqBatch.map((item, qIdx) => {
                const chosen = selectedAnswers[item.id];
                const isAnswered = chosen !== undefined;
                return (
                  <div
                    key={item.id}
                    className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-primary font-semibold">
                          Q{qIdx + 1} • {item.subtopic}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            item.difficulty === 'Easy'
                              ? 'bg-success-subtle text-success'
                              : item.difficulty === 'Hard'
                              ? 'bg-danger-subtle text-danger'
                              : 'bg-warning-subtle text-warning'
                          }`}
                        >
                          {item.difficulty}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-text-muted">{item.askedIn}</div>
                      <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                        {item.question}
                      </p>

                      <div className="space-y-2 pt-1">
                        {item.options.map((opt, idx) => {
                          const isSelected = chosen === idx;
                          const isCorrectOpt = idx === item.correctIndex;
                          let style =
                            'bg-surface-elevated border-border-subtle hover:border-primary/40 text-text-secondary';
                          if (isAnswered) {
                            if (isCorrectOpt) {
                              style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-medium';
                            } else if (isSelected) {
                              style = 'bg-red-500/15 border-red-500/50 text-red-300';
                            } else {
                              style = 'bg-surface-elevated/40 border-border-subtle text-text-muted opacity-70';
                            }
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={isAnswered}
                              onClick={() => handleAnswerMcq(item, idx)}
                              className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${style}`}
                            >
                              <span>{opt}</span>
                              {isAnswered && isCorrectOpt && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                              {isAnswered && isSelected && !isCorrectOpt && (
                                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isAnswered && (
                      <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1.5 text-xs mt-2">
                        <p className="text-text-secondary leading-relaxed">{item.explanation}</p>
                        <div className="flex items-start gap-1.5 text-primary font-mono text-[11px]">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Tip: {item.shortcutTip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
