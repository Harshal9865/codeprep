import React from 'react';

interface LeetCodeSolvedGaugeProps {
  easySolved: number;
  easyTotal: number;
  mediumSolved: number;
  mediumTotal: number;
  hardSolved: number;
  hardTotal: number;
  onSelectDifficulty?: (difficulty: 'Easy' | 'Medium' | 'Hard') => void;
}

export const LeetCodeSolvedGauge: React.FC<LeetCodeSolvedGaugeProps> = ({
  easySolved,
  easyTotal,
  mediumSolved,
  mediumTotal,
  hardSolved,
  hardTotal,
  onSelectDifficulty,
}) => {
  const totalSolved = easySolved + mediumSolved + hardSolved;
  const totalProblems = easyTotal + mediumTotal + hardTotal;
  const pct = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;

  const r = 46;
  const c = 2 * Math.PI * r;

  const easySpan = totalProblems > 0 ? (easySolved / totalProblems) * c : 0;
  const medSpan = totalProblems > 0 ? (mediumSolved / totalProblems) * c : 0;
  const hardSpan = totalProblems > 0 ? (hardSolved / totalProblems) * c : 0;

  const rows: Array<{
    key: 'Easy' | 'Medium' | 'Hard';
    label: string;
    solved: number;
    total: number;
    textClass: string;
    barClass: string;
  }> = [
    {
      key: 'Easy',
      label: 'Easy',
      solved: easySolved,
      total: easyTotal,
      textClass: 'text-success',
      barClass: 'bg-success',
    },
    {
      key: 'Medium',
      label: 'Med.',
      solved: mediumSolved,
      total: mediumTotal,
      textClass: 'text-warning',
      barClass: 'bg-warning',
    },
    {
      key: 'Hard',
      label: 'Hard',
      solved: hardSolved,
      total: hardTotal,
      textClass: 'text-danger',
      barClass: 'bg-danger',
    },
  ];

  return (
    <div className="bg-surface rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm border border-border-subtle transition-colors">
      <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
        {/* Donut Gauge */}
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
            <circle
              cx="55"
              cy="55"
              r={r}
              fill="none"
              className="stroke-surface-high"
              strokeWidth="7"
            />
            {easySpan > 0 && (
              <circle
                cx="55"
                cy="55"
                r={r}
                fill="none"
                stroke="#2cbb5d"
                strokeWidth="7"
                strokeDasharray={`${easySpan} ${c}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            )}
            {medSpan > 0 && (
              <circle
                cx="55"
                cy="55"
                r={r}
                fill="none"
                stroke="#ffc01e"
                strokeWidth="7"
                strokeDasharray={`${medSpan} ${c}`}
                strokeDashoffset={-easySpan}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            )}
            {hardSpan > 0 && (
              <circle
                cx="55"
                cy="55"
                r={r}
                fill="none"
                stroke="#ef4743"
                strokeWidth="7"
                strokeDasharray={`${hardSpan} ${c}`}
                strokeDashoffset={-(easySpan + medSpan)}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            )}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-2xl font-bold text-text-primary tracking-tight">
              {totalSolved}
              <span className="text-xs text-text-muted font-normal">/{totalProblems}</span>
            </div>
            <div className="text-[11px] font-medium text-success mt-0.5">
              Solved ({pct}%)
            </div>
          </div>
        </div>

        {/* Interactive Difficulty Bars */}
        <div className="flex-1 w-full space-y-2.5">
          {rows.map((row) => {
            const ratio = row.total > 0 ? Math.round((row.solved / row.total) * 100) : 0;
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => onSelectDifficulty?.(row.key)}
                title={`Browse ${row.key} problems`}
                className="w-full text-left bg-surface-elevated hover:bg-surface-high border border-border-subtle hover:border-border-default rounded-xl px-3.5 py-2.5 flex flex-col gap-1.5 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${row.textClass}`}>{row.label}</span>
                  <div className="text-xs font-mono text-text-primary font-semibold">
                    {row.solved}
                    <span className="text-text-muted font-normal">/{row.total}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-high overflow-hidden">
                  <div
                    className={`h-full ${row.barClass} rounded-full transition-all duration-500`}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-2.5 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted font-mono">
        <span>{totalProblems.toLocaleString()} Total • DSA, OOPs &amp; SQL</span>
        <span>Click difficulty to filter</span>
      </div>
    </div>
  );
};
