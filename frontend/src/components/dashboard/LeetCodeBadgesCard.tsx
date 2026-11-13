import React, { useState } from 'react';
import { Award, Flame, Code2, Target, Database, Zap, Lock } from 'lucide-react';

export interface BadgeProgressItem {
  badgeKey: string;
  title: string;
  description: string;
  category: 'solved' | 'streak' | 'specialty';
  unlocked: boolean;
  unlockedAt: string | null;
  current: number;
  target: number;
}

interface MilestonesCardProps {
  totalSolved?: number;
  currentStreak?: number;
  longestStreak?: number;
  badges?: BadgeProgressItem[];
}

export const LeetCodeBadgesCard: React.FC<MilestonesCardProps> = ({
  totalSolved = 0,
  currentStreak = 0,
  longestStreak = 0,
  badges,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked'>('all');

  const effectiveBestStreak = Math.max(longestStreak, currentStreak);

  const items: BadgeProgressItem[] =
    badges && badges.length > 0
      ? badges
      : [
          {
            badgeKey: 'first-solve',
            title: 'First Accepted',
            description: 'Solve your very first problem',
            category: 'solved',
            unlocked: totalSolved >= 1,
            unlockedAt: null,
            current: Math.min(totalSolved, 1),
            target: 1,
          },
          {
            badgeKey: 'solved-10',
            title: 'Getting Started (10)',
            description: 'Solve 10 problems',
            category: 'solved',
            unlocked: totalSolved >= 10,
            unlockedAt: null,
            current: Math.min(totalSolved, 10),
            target: 10,
          },
          {
            badgeKey: 'solved-25',
            title: 'Pattern Builder (25)',
            description: 'Solve 25 problems',
            category: 'solved',
            unlocked: totalSolved >= 25,
            unlockedAt: null,
            current: Math.min(totalSolved, 25),
            target: 25,
          },
          {
            badgeKey: 'solved-50',
            title: 'Half-Century (50)',
            description: 'Solve 50 problems',
            category: 'solved',
            unlocked: totalSolved >= 50,
            unlockedAt: null,
            current: Math.min(totalSolved, 50),
            target: 50,
          },
          {
            badgeKey: 'streak-3',
            title: '3-Day Momentum',
            description: 'Reach a 3-day coding streak',
            category: 'streak',
            unlocked: effectiveBestStreak >= 3,
            unlockedAt: null,
            current: Math.min(effectiveBestStreak, 3),
            target: 3,
          },
          {
            badgeKey: 'streak-7',
            title: '7-Day Week Warrior',
            description: 'Reach a 7-day coding streak',
            category: 'streak',
            unlocked: effectiveBestStreak >= 7,
            unlockedAt: null,
            current: Math.min(effectiveBestStreak, 7),
            target: 7,
          },
        ];

  const unlockedCount = items.filter((b) => b.unlocked).length;
  const visibleItems = (filter === 'unlocked' ? items.filter((b) => b.unlocked) : items).slice(0, 6);

  const getBadgeVisual = (badge: BadgeProgressItem) => {
    if (badge.category === 'streak') {
      return { Icon: Flame, color: 'text-primary', bg: 'bg-primary-subtle border-primary/30' };
    }
    if (badge.badgeKey.startsWith('sql')) {
      return { Icon: Database, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/25' };
    }
    if (badge.badgeKey.startsWith('hard')) {
      return { Icon: Zap, color: 'text-danger', bg: 'bg-danger-subtle border-danger/25' };
    }
    if (badge.target >= 50) {
      return { Icon: Award, color: 'text-warning', bg: 'bg-warning-subtle border-warning/25' };
    }
    return { Icon: Code2, color: 'text-success', bg: 'bg-success-subtle border-success/25' };
  };

  return (
    <div className="bg-surface rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm border border-border-subtle transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
            Achievement Badges
          </span>
          <div className="text-2xl font-bold text-text-primary mt-0.5">
            {unlockedCount}{' '}
            <span className="text-xs text-text-muted font-normal">/ {items.length} Earned</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-border-subtle text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              filter === 'all' ? 'bg-surface-high text-text-primary font-semibold' : 'text-text-muted'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('unlocked')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              filter === 'unlocked' ? 'bg-surface-high text-text-primary font-semibold' : 'text-text-muted'
            }`}
          >
            Earned
          </button>
        </div>
      </div>

      {/* Badges Grid */}
      {visibleItems.length === 0 ? (
        <div className="my-6 py-4 rounded-xl bg-surface-elevated border border-border-subtle text-center text-xs text-text-muted">
          Solve your first problem or build a 3-day streak to earn badges.
        </div>
      ) : (
        <div className="my-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {visibleItems.map((badge) => {
            const { Icon, color, bg } = getBadgeVisual(badge);
            const pct = badge.target > 0 ? Math.min(100, Math.round((badge.current / badge.target) * 100)) : 0;

            return (
              <div
                key={badge.badgeKey}
                title={
                  badge.unlockedAt
                    ? `${badge.description} • Unlocked ${new Date(badge.unlockedAt).toLocaleDateString()}`
                    : `${badge.description} (${badge.current}/${badge.target})`
                }
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                  badge.unlocked
                    ? `${bg} shadow-sm`
                    : 'bg-surface-elevated border-border-subtle opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${badge.unlocked ? color : 'text-text-muted'}`}>
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  {badge.unlocked ? (
                    <span className="text-[11px] font-mono text-success font-semibold">Earned</span>
                  ) : (
                    <Lock className="w-3 h-3 text-text-muted" />
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-text-primary truncate">{badge.title}</div>
                  <div className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                    {badge.unlocked && badge.unlockedAt
                      ? new Date(badge.unlockedAt).toLocaleDateString()
                      : `${badge.current} / ${badge.target}`}
                  </div>
                </div>

                {!badge.unlocked && (
                  <div className="w-full h-1 rounded-full bg-surface-high overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="pt-2.5 border-t border-border-subtle text-xs flex items-center justify-between text-text-muted font-mono">
        <span className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-primary" />
          <span>Badges stay saved in database</span>
        </span>
        <span className="text-text-primary font-semibold">{totalSolved} Solved</span>
      </div>
    </div>
  );
};
