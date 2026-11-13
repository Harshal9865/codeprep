import React from 'react';
import { ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface RecentSubmissionItem {
  id: number;
  title: string;
  difficulty?: string;
  verdict: string;
  submittedAt: string;
  runtimeMs?: number | null;
}

interface LeetCodeRecentSubmissionsProps {
  submissions?: RecentSubmissionItem[];
  onSelectProblem?: (id: number) => void;
  onViewAll?: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diffSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

export const LeetCodeRecentSubmissions: React.FC<LeetCodeRecentSubmissionsProps> = ({
  submissions = [],
  onSelectProblem,
  onViewAll,
}) => {
  return (
    <div className="bg-surface rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between border border-border-subtle transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Execution Submissions</h3>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 font-mono"
        >
          <span>View Problem Catalog</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Submissions List */}
      <div className="mt-2 divide-y divide-border-subtle">
        {submissions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-xs text-text-muted font-mono">
              No code runs or submissions recorded yet.
            </p>
            <p className="text-[11px] text-text-muted">
              Pick any problem from the DSA or SQL catalog to compile and run your first solution.
            </p>
          </div>
        ) : (
          submissions.map((sub, idx) => (
            <div
              key={`${sub.id}-${idx}`}
              onClick={() => onSelectProblem?.(sub.id)}
              className="py-3 px-2 rounded-xl hover:bg-surface-elevated transition-colors cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {sub.verdict === 'Accepted' ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-danger shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors truncate block">
                    #{sub.id}. {sub.title}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-text-muted font-mono mt-0.5">
                    <span className={sub.verdict === 'Accepted' ? 'text-success' : 'text-danger'}>
                      {sub.verdict}
                    </span>
                    {sub.runtimeMs != null && (
                      <>
                        <span>•</span>
                        <span>{sub.runtimeMs}ms</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-xs font-mono text-text-muted shrink-0">
                {formatRelativeTime(sub.submittedAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
