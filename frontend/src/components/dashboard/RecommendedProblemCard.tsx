import React from 'react';
import { ArrowRight, Target } from 'lucide-react';
import { Button } from '../ui/Button';

interface RecommendedProblemProps {
  problem: {
    id: number;
    title: string;
    difficulty: string;
    topic: string;
    reason: string;
  } | null;
  onStartSolving: (id: number) => void;
}

export const RecommendedProblemCard: React.FC<RecommendedProblemProps> = ({
  problem,
  onStartSolving,
}) => {
  if (!problem) return null;

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
      case 'Medium':
        return 'bg-amber-950/60 text-amber-400 border-amber-800/60';
      case 'Hard':
        return 'bg-rose-950/60 text-rose-400 border-rose-800/60';
      default:
        return 'bg-dark-surface text-dark-textSecondary border-dark-border';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-accent-primary/40 bg-gradient-to-r from-dark-surface via-dark-surface/90 to-dark-surface p-6 shadow-glow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/30 text-[11px] font-medium text-accent-primary">
              <Target className="w-3.5 h-3.5" />
              Recommended Next Target
            </span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded border ${getDifficultyBadge(
                problem.difficulty
              )}`}
            >
              {problem.difficulty}
            </span>
          </div>

          <h3 className="text-xl font-bold text-dark-textPrimary">
            #{problem.id} {problem.title}
          </h3>

          <p className="text-xs text-dark-textSecondary max-w-xl">
            {problem.reason} • Focus area: <span className="text-dark-textPrimary font-medium">{problem.topic}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            className="gap-2 shadow-button"
            onClick={() => onStartSolving(problem.id)}
          >
            <span>Start Practice</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

