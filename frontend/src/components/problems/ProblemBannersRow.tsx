import React from 'react';
import { Briefcase, ArrowRight, Play, Layers, Code2, Database } from 'lucide-react';
import { Problem } from '../../types/problem';
import { INTERVIEW_PREP_SETS } from '../../data/interviewTracks';

export interface Core600Meta {
  total: number;
  solved: number;
  dsaTotal: number;
  dsaSolved: number;
  sqlTotal: number;
  sqlSolved: number;
  nextUnsolvedId: number;
  nextDsaId: number;
  nextSqlId: number;
}

interface ProblemBannersRowProps {
  problems?: Problem[];
  prepCounts?: Record<string, { total: number; solved: number }>;
  core600?: Core600Meta;
  selectedPrepSetId?: string | null;
  onSelectPrepSet?: (setId: string | null) => void;
  onSolveProblem?: (problemId: number) => void;
}

export const ProblemBannersRow: React.FC<ProblemBannersRowProps> = ({
  problems = [],
  prepCounts,
  core600,
  selectedPrepSetId = null,
  onSelectPrepSet,
  onSolveProblem,
}) => {
  const featuredSets = INTERVIEW_PREP_SETS.filter((s) => s.id !== 'core-600').slice(0, 4);
  const cTotal = core600?.total ?? 600;
  const cSolved = core600?.solved ?? 0;
  const cPct = cTotal > 0 ? Math.round((cSolved / cTotal) * 100) : 0;
  const isCoreSelected =
    selectedPrepSetId === 'core-600' ||
    selectedPrepSetId === 'core-dsa-500' ||
    selectedPrepSetId === 'core-sql-100';
  const nextId =
    selectedPrepSetId === 'core-sql-100'
      ? core600?.nextSqlId ?? 501
      : selectedPrepSetId === 'core-dsa-500'
      ? core600?.nextDsaId ?? 1
      : core600?.nextUnsolvedId ?? 1;

  return (
    <div className="space-y-3.5 select-none">
      {/* Dedicated Core 600 Card (Original 500 DSA + 100 SQL kept separate) */}
      <div
        onClick={() => onSelectPrepSet?.(isCoreSelected ? null : 'core-600')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectPrepSet?.(isCoreSelected ? null : 'core-600');
          }
        }}
        className={`rounded-2xl p-4 sm:p-5 bg-surface border transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group ${
          isCoreSelected
            ? 'border-primary ring-1 ring-primary bg-primary-subtle/15'
            : 'border-primary/35 hover:border-primary/70 hover:bg-surface-elevated'
        }`}
      >
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-semibold uppercase tracking-wider">
              <Layers className="w-3 h-3" />
              <span>Core 600 • Separate Set (#1–#600)</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-primary font-semibold">
              {cSolved}/{cTotal} Solved ({cPct}%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-secondary">
              <Code2 className="w-3 h-3 text-primary" />
              <span>DSA {core600?.dsaSolved ?? 0}/{core600?.dsaTotal ?? 500}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-secondary">
              <Database className="w-3 h-3 text-sky-400" />
              <span>SQL {core600?.sqlSolved ?? 0}/{core600?.sqlTotal ?? 100}</span>
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-text-primary group-hover:text-primary transition-colors">
              Core 600 — 500 DSA + 100 SQL
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Foundational #1–#600 track. Filter this set or jump straight into your next unsolved problem.
            </p>
          </div>

          <div className="w-full max-w-md h-1.5 rounded-full bg-surface-high overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${cPct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSolveProblem && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSolveProblem(nextId);
              }}
              className="px-4 py-2.5 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Solve Directly (#{nextId})</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPrepSet?.(isCoreSelected ? null : 'core-600');
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold border transition-colors flex items-center gap-1.5 ${
              isCoreSelected
                ? 'bg-surface-high text-text-primary border-border-default'
                : 'bg-surface-elevated hover:bg-surface-high text-text-primary border-border-subtle'
            }`}
          >
            <span>{isCoreSelected ? 'Showing 600 Only ✓' : 'Open Core 600 List'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
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
          const fromServer = prepCounts?.[prepSet.id];
          const matched = fromServer ? [] : problems.filter((p) => prepSet.matchProblem(p));
          const solved = fromServer ? fromServer.solved : matched.filter((p) => p.isSolved).length;
          const total = fromServer ? fromServer.total : matched.length;
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
