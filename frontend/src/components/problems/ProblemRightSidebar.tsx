import React, { useMemo } from 'react';
import { Flame, Terminal, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { HeatmapDay } from '../dashboard/ActivityHeatmap';
import { PotdSummary, usePotdCountdown } from '../../types/potd';

interface ProblemRightSidebarProps {
  totalSolved?: number;
  totalProblems?: number;
  dsaTotal?: number;
  sqlTotal?: number;
  oopTotal?: number;
  currentStreak?: number;
  longestStreak?: number;
  heatmap?: HeatmapDay[];
  potd?: PotdSummary | null;
  onSelectProblem?: (problemId: number) => void;
}

export const ProblemRightSidebar: React.FC<ProblemRightSidebarProps> = ({
  totalSolved = 0,
  totalProblems = 3000,
  dsaTotal = 2500,
  sqlTotal = 400,
  oopTotal = 100,
  currentStreak = 0,
  longestStreak = 0,
  heatmap = [],
  potd = null,
  onSelectProblem,
}) => {
  const countdown = usePotdCountdown(potd?.nextResetIso);
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const currentDay = now.getDate();
  const currentMonth = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekdayOffset = new Date(year, monthIndex, 1).getDay();

  const activityByDate = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    for (const entry of heatmap) {
      map.set(entry.date, entry);
    }
    return map;
  }, [heatmap]);

  const monthCells = useMemo(() => {
    const cells: Array<{ day: number | null; dateStr: string; activity?: HeatmapDay }> = [];
    for (let pad = 0; pad < firstWeekdayOffset; pad++) {
      cells.push({ day: null, dateStr: `pad-${pad}` });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(monthIndex + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      cells.push({
        day,
        dateStr,
        activity: activityByDate.get(dateStr),
      });
    }
    return cells;
  }, [year, monthIndex, daysInMonth, firstWeekdayOffset, activityByDate]);

  const activeThisMonth = useMemo(
    () => monthCells.filter((c) => c.day !== null && (c.activity?.count || 0) > 0).length,
    [monthCells]
  );

  return (
    <aside className="w-72 shrink-0 hidden 2xl:flex flex-col gap-4 text-xs select-none">
      {/* Today's Problem of the Day */}
      {potd && onSelectProblem && (
        <div
          className={`bg-surface rounded-2xl p-4 shadow-sm border transition-colors ${
            potd.solvedToday ? 'border-success/35' : 'border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-primary">
              <Flame className="w-3.5 h-3.5 fill-primary/30" />
              <span>Today&apos;s POTD</span>
            </span>
            <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" />
              <span>{countdown}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectProblem(potd.id)}
            className="w-full text-left group space-y-2"
          >
            <div className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
              #{potd.id}. {potd.title}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  potd.difficulty === 'Easy'
                    ? 'bg-success-subtle text-success'
                    : potd.difficulty === 'Medium'
                    ? 'bg-warning-subtle text-warning'
                    : 'bg-danger-subtle text-danger'
                }`}
              >
                {potd.difficulty}
              </span>
              {potd.solvedToday ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-success font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Solved</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>Solve</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Real Streak & Monthly Active Days Calendar */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm text-text-primary border border-border-subtle">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-1.5">
              <Flame
                className={`w-4 h-4 ${
                  currentStreak > 0 ? 'text-primary fill-primary/30' : 'text-text-muted'
                }`}
              />
              <span className="font-bold text-sm">
                {currentStreak} Day{currentStreak === 1 ? '' : 's'} Streak
              </span>
            </div>
            <p className="text-xs font-mono text-text-muted mt-0.5">
              {activeThisMonth} active day{activeThisMonth === 1 ? '' : 's'} this month • Best {longestStreak}d
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-surface-elevated border border-border-subtle flex flex-col items-center justify-center text-xs font-bold text-primary leading-tight">
            <span>{currentDay}</span>
            <span className="text-[10px] text-text-muted uppercase">{currentMonth}</span>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-text-muted pt-3 pb-1">
          <span>S</span>
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
        </div>

        {/* Aligned Month Day Cells with Real Activity Highlight */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {monthCells.map((cell) => {
            if (cell.day === null) {
              return <div key={cell.dateStr} className="h-7" />;
            }

            const isToday = cell.day === currentDay;
            const count = cell.activity?.count || 0;
            const accepted = cell.activity?.acceptedCount || 0;
            const potdSolved = Boolean(cell.activity?.potdSolved);
            const hasActivity = potdSolved || count > 0;

            let cellStyle = 'text-text-muted hover:bg-surface-elevated hover:text-text-primary';
            if (potdSolved && isToday) {
              cellStyle =
                'bg-emerald-500/25 text-emerald-400 font-bold ring-1 ring-primary border border-emerald-500/40';
            } else if (potdSolved) {
              cellStyle =
                'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/35';
            } else if (hasActivity) {
              cellStyle =
                'bg-primary/15 text-primary font-medium border border-primary/25';
            } else if (isToday) {
              cellStyle =
                'bg-primary-subtle text-primary font-bold ring-1 ring-primary';
            }

            return (
              <div
                key={cell.dateStr}
                title={
                  potdSolved
                    ? `${cell.dateStr}: POTD Solved ✓ (${count} submissions)`
                    : hasActivity
                    ? `${cell.dateStr}: ${count} submission${count === 1 ? '' : 's'} (${accepted} accepted)`
                    : `${cell.dateStr}: POTD not solved`
                }
                className={`h-7 flex items-center justify-center rounded-lg transition-colors cursor-default ${cellStyle}`}
              >
                <span>{cell.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Curriculum Summary Card */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm text-text-primary space-y-3 border border-border-subtle">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-border-subtle">
          <span className="font-semibold text-text-primary">Curriculum Progress</span>
          <span className="text-[11px] font-mono text-success">
            {totalSolved} / {totalProblems} Solved
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-sm text-text-secondary">C++17 DSA</span>
            </div>
            <span className="font-mono text-xs text-text-muted">{dsaTotal} Questions</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span className="text-sm text-text-secondary">SQL Queries</span>
            </div>
            <span className="font-mono text-xs text-text-muted">{sqlTotal} Queries</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span className="text-sm text-text-secondary">OOPs C++ Design</span>
            </div>
            <span className="font-mono text-xs text-text-muted">{oopTotal} Questions</span>
          </div>
        </div>
      </div>

      {/* Compiler Specifications */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm text-text-primary space-y-2.5 border border-border-subtle">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Terminal className="w-4 h-4 text-success" />
          <span>Compiler Runtime</span>
        </div>

        <div className="space-y-2 text-xs font-mono text-text-muted">
          <div className="flex items-center justify-between">
            <span>C++ Standard</span>
            <span className="text-text-primary">g++ (C++17)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Time Limit</span>
            <span className="text-text-primary">2000 ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Memory Limit</span>
            <span className="text-text-primary">256 MB</span>
          </div>
          <div className="flex items-center justify-between">
            <span>SQL Engine</span>
            <span className="text-success">Isolated Sandbox</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
