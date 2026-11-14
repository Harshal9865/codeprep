import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Search,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { apiRequest } from '../../services/api';

export interface DrawerProblemItem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  category?: string;
  topic?: string;
  isSolved?: boolean;
}

interface WorkspaceProblemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProblemId: number;
  mode: 'cpp' | 'sql';
  onSelectProblem: (problemId: number) => void;
}

type TrackFilter = 'all' | 'core-600' | 'core-dsa-500' | 'core-sql-100';
type StatusFilter = 'all' | 'solved' | 'unsolved';

export const WorkspaceProblemDrawer: React.FC<WorkspaceProblemDrawerProps> = ({
  isOpen,
  onClose,
  currentProblemId,
  mode,
  onSelectProblem,
}) => {
  const [search, setSearch] = useState('');
  const [track, setTrack] = useState<TrackFilter>(() =>
    mode === 'sql'
      ? currentProblemId >= 501 && currentProblemId <= 600
        ? 'core-sql-100'
        : 'all'
      : currentProblemId <= 600
        ? 'core-600'
        : 'all'
  );
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DrawerProblemItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const pageSize = 25;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (mode === 'sql') {
          params.set('category', 'SQL');
        }
        if (track !== 'all') {
          params.set('track', track);
        }
        if (status !== 'all') {
          params.set('status', status);
        }
        if (search.trim()) {
          params.set('search', search.trim());
        }

        const res = await apiRequest<{
          items?: DrawerProblemItem[];
          problems?: DrawerProblemItem[];
          total?: number;
        }>(`/problems?${params.toString()}`);

        if (!cancelled) {
          const list = Array.isArray(res.items)
            ? res.items
            : Array.isArray(res.problems)
              ? res.problems
              : [];
          setItems(list);
          setTotal(typeof res.total === 'number' ? res.total : list.length);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, page, mode, track, status, search]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const difficultyBadge = (diff: string) => {
    if (diff === 'Easy') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (diff === 'Medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Left Slide-Over Drawer */}
      <aside className="relative z-10 w-full max-w-[400px] h-full bg-surface border-r border-border-subtle shadow-2xl flex flex-col">
        <div className="h-14 px-4 border-b border-border-subtle flex items-center justify-between bg-surface-elevated shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-primary tracking-tight">
              {mode === 'sql' ? 'SQL Problem List' : 'Problem List'}
            </h2>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted border border-border-subtle">
              {total}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-subtle transition-colors"
            title="Close Problem List (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-3 border-b border-border-subtle space-y-2.5 bg-surface-subtle/40 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search #ID, title, or topic..."
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {mode === 'cpp' ? (
              <>
                {(
                  [
                    { id: 'core-600', label: 'Core 600' },
                    { id: 'core-dsa-500', label: 'DSA 500' },
                    { id: 'all', label: 'All Problems' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTrack(opt.id);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors border ${
                      track === opt.id
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-canvas text-text-muted border-border-subtle hover:text-text-primary'
                    }`}
                  >
                    {opt.id === 'core-600' && <Sparkles className="w-2.5 h-2.5" />}
                    {opt.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                {(
                  [
                    { id: 'core-sql-100', label: 'Core 100 (#501-600)' },
                    { id: 'all', label: 'All SQL' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTrack(opt.id);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors border ${
                      track === opt.id
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-canvas text-text-muted border-border-subtle hover:text-text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </>
            )}

            <div className="ml-auto flex items-center bg-canvas rounded border border-border-subtle p-0.5">
              {(['all', 'unsolved', 'solved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatus(st);
                    setPage(1);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize transition-colors ${
                    status === st
                      ? 'bg-surface-elevated text-text-primary'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/50">
          {loading ? (
            <div className="p-6 text-center text-xs text-text-muted">Loading problems...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">
              No matching problems found.
            </div>
          ) : (
            items.map((item) => {
              const isActive = item.id === currentProblemId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectProblem(item.id);
                    onClose();
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                    isActive
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'hover:bg-surface-subtle/70'
                  }`}
                >
                  <span className="shrink-0">
                    {item.isSolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-muted/35" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-text-muted">#{item.id}</span>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-primary' : 'text-text-primary'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>
                    {item.topic && (
                      <div className="text-[11px] text-text-muted truncate mt-0.5">
                        {item.topic}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${difficultyBadge(
                      item.difficulty
                    )}`}
                  >
                    {item.difficulty}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className="h-11 px-4 border-t border-border-subtle bg-surface-subtle/60 flex items-center justify-between text-xs text-text-muted shrink-0">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded border border-border-subtle bg-surface hover:text-text-primary disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-border-subtle bg-surface hover:text-text-primary disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
