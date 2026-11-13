import React from 'react';
import { Briefcase, ArrowRight } from 'lucide-react';
import { Problem } from '../../types/problem';
import { INTERVIEW_PREP_SETS } from '../../data/interviewTracks';

interface ProblemBannersRowProps {
  problems?: Problem[];
  selectedPrepSetId?: string | null;
  onSelectPrepSet?: (setId: string | null) => void;
}

export const ProblemBannersRow: React.FC<ProblemBannersRowProps> = ({
  problems = [],
  selectedPrepSetId = null,
  onSelectPrepSet,
}) => {
  const featuredSets = INTERVIEW_PREP_SETS.slice(0, 4);

  return (
    <div className="space-y-2.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
          <Briefcase className="w-3.5 h-3.5 text-primary" />
          <span>Interview Prep Cards</span>
        </div>
        {selectedPrepSetId && onSelectPrepSet && (
          <button
            type="button"
            onClick={() => onSelectPrepSet(null)}
            className="text-xs font-mono text-primary hover:underline"
          >
            Show All Questions
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {featuredSets.map((prepSet) => {
          const matched = problems.filter((p) => prepSet.matchProblem(p));
          const solved = matched.filter((p) => p.isSolved).length;
          const total = matched.length;
          const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
          const isSelected = selectedPrepSetId === prepSet.id;

          return (
            <button
              key={prepSet.id}
              type="button"
              onClick={() => onSelectPrepSet?.(isSelected ? null : prepSet.id)}
              className={`text-left rounded-2xl p-4 bg-surface border transition-all flex flex-col justify-between min-h-[126px] group ${
                isSelected
                  ? 'border-primary ring-1 ring-primary bg-primary-subtle/20'
                  : 'border-border-subtle hover:border-primary/45 hover:bg-surface-elevated'
              }`}
            >
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${prepSet.accentColor}`}>
                    {prepSet.badge}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-secondary">
                    {solved}/{total}
                  </span>
                </div>

                <h4 className="text-sm font-bold tracking-tight text-text-primary group-hover:text-primary transition-colors">
                  {prepSet.title}
                </h4>

                <div className="flex flex-wrap gap-1 pt-0.5">
                  {prepSet.companies.slice(0, 3).map((company) => (
                    <span
                      key={company}
                      className="px-1.5 py-0.5 rounded bg-surface-elevated text-[11px] text-text-muted border border-border-subtle"
                    >
                      {company}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full pt-3 space-y-1.5">
                <div className="w-full h-1.5 rounded-full bg-surface-high overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                  <span>{isSelected ? 'Filtered Active' : `${pct}% Complete`}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary opacity-75 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
