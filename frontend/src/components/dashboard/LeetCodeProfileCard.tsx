import React from 'react';
import { Code2, Database, Flame, Settings, GraduationCap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar, resolvePixelAvatarPreset } from '../ui/PixelAvatars';

interface LeetCodeProfileCardProps {
  totalSolved: number;
  totalProblems: number;
  dsaSolved: number;
  dsaTotal: number;
  sqlSolved: number;
  sqlTotal: number;
  currentStreak: number;
  onNavigate?: (tab: string) => void;
}

export const LeetCodeProfileCard: React.FC<LeetCodeProfileCardProps> = ({
  totalSolved,
  totalProblems,
  dsaSolved,
  dsaTotal,
  sqlSolved,
  sqlTotal,
  currentStreak,
  onNavigate,
}) => {
  const { user } = useAuth();
  const displayName = user?.displayName || 'Harshal Patel';
  const preset = resolvePixelAvatarPreset(user?.avatarUrl);
  const overallPct = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;

  return (
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-4 shadow-sm border border-border-subtle transition-colors">
      {/* Avatar & Identity Header */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => onNavigate?.('profile')}
          title="Change pixel character or upload avatar"
          className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-elevated border border-border-subtle hover:border-primary/60 shrink-0 transition-all shadow-sm group relative"
        >
          <UserAvatar
            avatarUrl={user?.avatarUrl}
            displayName={displayName}
            size={64}
            className="w-full h-full"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-text-primary tracking-tight truncate">
              {displayName}
            </h2>
          </div>
          <p className="text-[11px] font-mono text-primary mt-0.5 flex items-center gap-1 truncate">
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>B.Tech ICT • DAU</span>
          </p>
          <p className="text-[11px] text-text-muted mt-0.5 truncate font-mono">
            {user?.avatarUrl && !user.avatarUrl.startsWith('pixel:') ? 'Custom Avatar' : preset.name} • {overallPct}% Complete
          </p>
        </div>
      </div>

      {/* Progress Pills */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <button
          type="button"
          onClick={() => onNavigate?.('dsa')}
          className="rounded-xl bg-surface-elevated border border-border-subtle hover:border-primary/40 p-2.5 transition-colors text-left"
        >
          <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
            <Code2 className="w-3 h-3 text-primary" />
            <span>DSA</span>
          </div>
          <div className="text-sm font-bold text-text-primary mt-1 font-mono">
            {dsaSolved}
            <span className="text-[11px] font-normal text-text-muted">/{dsaTotal}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('sql')}
          className="rounded-xl bg-surface-elevated border border-border-subtle hover:border-sky-400/40 p-2.5 transition-colors text-left"
        >
          <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
            <Database className="w-3 h-3 text-sky-400" />
            <span>SQL</span>
          </div>
          <div className="text-sm font-bold text-text-primary mt-1 font-mono">
            {sqlSolved}
            <span className="text-[11px] font-normal text-text-muted">/{sqlTotal}</span>
          </div>
        </button>

        <div className="rounded-xl bg-surface-elevated border border-border-subtle p-2.5 text-left">
          <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
            <Flame className="w-3 h-3 text-primary" />
            <span>Streak</span>
          </div>
          <div className="text-sm font-bold text-text-primary mt-1 font-mono">
            {currentStreak}
            <span className="text-[11px] font-normal text-text-muted">d</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => onNavigate?.('profile')}
          className="flex-1 py-2 px-3 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-default text-text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <Settings className="w-3.5 h-3.5 text-text-muted" />
          <span>Edit Avatar &amp; Profile</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('about')}
          className="py-2 px-3 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
        >
          About
        </button>
      </div>
    </div>
  );
};
