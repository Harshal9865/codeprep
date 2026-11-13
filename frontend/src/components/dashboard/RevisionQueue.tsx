import React from 'react';
import { Bookmark, Sparkles, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface RevisionItem {
  id: number;
  title: string;
  difficulty: string;
  topic: string;
  reason: 'solved_with_ai' | 'bookmarked';
  lastAttemptedAt: string | null;
}

interface RevisionQueueProps {
  items: RevisionItem[];
  onSelectProblem: (id: number) => void;
}

export const RevisionQueue: React.FC<RevisionQueueProps> = ({ items, onSelectProblem }) => {
  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Hard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-surface-elevated text-text-secondary border-border-default';
    }
  };

  return (
    <div className="bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            <h2 className="font-headline font-bold text-base text-text-primary">
              Spaced Repetition & Revision Queue
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Targeted reviews for problems solved with AI assistance or saved for repetition
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted">
          No revision items currently pending. Problems solved using AI hints or bookmarked will appear here automatically.
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border-subtle">
          {items.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between hover:bg-surface-elevated/50 px-2 rounded-lg transition-colors group cursor-pointer"
              onClick={() => onSelectProblem(item.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${getDifficultyBadge(
                    item.difficulty
                  )}`}
                >
                  {item.difficulty}
                </span>

                <div className="min-w-0">
                  <h4 className="text-xs font-medium text-text-primary group-hover:text-primary transition-colors truncate">
                    #{item.id} {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                    <span>{item.topic}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {item.reason === 'solved_with_ai' ? (
                        <>
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-400">AI Assisted</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3 h-3 text-primary" />
                          <span className="text-primary">Bookmarked</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs gap-1 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProblem(item.id);
                }}
              >
                <span>Practice</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
