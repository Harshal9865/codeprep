import React from 'react';
import { Flame, CalendarCheck2, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PotdSummary, usePotdCountdown } from '../../types/potd';

interface PotdBannerCardProps {
  potd: PotdSummary;
  currentStreak: number;
  onSelectProblem: (problemId: number) => void;
}

export const PotdBannerCard: React.FC<PotdBannerCardProps> = ({
  potd,
  currentStreak,
  onSelectProblem,
}) => {
  const countdown = usePotdCountdown(potd.nextResetIso);

  const diffBadge =
    potd.difficulty === 'Easy'
      ? 'bg-success-subtle text-success border border-success/25'
      : potd.difficulty === 'Medium'
      ? 'bg-warning-subtle text-warning border border-warning/25'
      : 'bg-danger-subtle text-danger border border-danger/25';

  const targetNextStreak = potd.solvedToday ? currentStreak : currentStreak + 1;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl p-5 border shadow-sm transition-all ${
        potd.solvedToday
          ? 'bg-surface border-success/35'
          : 'bg-surface border-primary/35'
      }`}
    >
      <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        {/* Left: POTD Identity & Metadata */}
        <div className="space-y-2.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-semibold border border-primary/30">
              <Flame className="w-3.5 h-3.5 fill-primary/30" />
              <span>Problem of the Day</span>
            </span>

            <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" />
              <span>Next POTD in {countdown}</span>
            </span>

            {potd.solvedToday ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success-subtle text-success text-[11px] font-mono font-semibold border border-success/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Daily Streak Maintained</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-warning-subtle text-warning text-[11px] font-mono font-semibold">
                <span>Solve for {targetNextStreak}d streak</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs text-text-muted">#{potd.id}</span>
            <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight truncate">
              {potd.title}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${diffBadge}`}>
              {potd.difficulty}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-text-secondary">
              {potd.topic}
            </span>
          </div>

          <p className="text-xs text-text-secondary">
            {potd.solvedToday
              ? `Great consistency! You solved today's challenge and locked in your ${currentStreak}-day streak.`
              : `Solving today's POTD maintains your daily streak. Daily mix: ${potd.distributionLabel}.`}
          </p>
        </div>

        {/* Right: 7-Day POTD Check-In Strip + CTA */}
        <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-end justify-between gap-3 shrink-0">
          {potd.recentDays && potd.recentDays.length > 0 && (
            <div className="flex items-center gap-1.5" title="Last 7 days POTD streak">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted mr-1 hidden sm:inline">
                7d POTD
              </span>
              {potd.recentDays.map((day) => {
                const dayNum = day.date.slice(-2);
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => onSelectProblem(day.problemId)}
                    title={`${day.date} — #${day.problemId} ${day.title} (${day.difficulty})${
                      day.solved ? ' • Solved ✓' : ''
                    }`}
                    className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center transition-all border ${
                      day.solved
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : day.isToday
                        ? 'bg-primary-subtle text-primary border-primary/50 ring-1 ring-primary/30 animate-pulse'
                        : 'bg-surface-elevated text-text-muted border-border-subtle hover:border-border-default'
                    }`}
                  >
                    {day.solved ? '✓' : dayNum}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => onSelectProblem(potd.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm ${
              potd.solvedToday
                ? 'bg-surface-elevated hover:bg-surface-high text-text-primary border border-success/40'
                : 'bg-primary hover:opacity-90 text-black'
            }`}
          >
            <CalendarCheck2 className={`w-4 h-4 ${potd.solvedToday ? 'text-success' : 'text-black'}`} />
            <span>{potd.solvedToday ? `Revisit POTD #${potd.id}` : `Solve POTD #${potd.id}`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

