import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  User,
  Bookmark,
  Flame,
  CheckCircle2,
  ArrowRight,
  Info,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { THEME_OPTIONS } from '../../types/theme';
import { fetchDashboardAnalytics } from '../../services/analyticsCache';
import { UserAvatar } from '../ui/PixelAvatars';

interface LeetCodeUserDropdownProps {
  onNavigate?: (tab: string) => void;
}

interface DropdownStats {
  totalSolved: number;
  totalProblems: number;
  currentStreak: number;
  potd?: {
    id: number;
    title?: string;
    solvedToday: boolean;
  };
}

export const LeetCodeUserDropdown: React.FC<LeetCodeUserDropdownProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<DropdownStats | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      void fetchDashboardAnalytics<DropdownStats>()
        .then((data) => {
          if (data) setStats(data);
        })
        .catch(() => {});
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const username = user?.displayName || 'Developer';
  const email = user?.email || 'user@codeprep.dev';
  const solvePct =
    stats && stats.totalProblems > 0
      ? Math.round((stats.totalSolved / stats.totalProblems) * 100)
      : 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-full ring-1 ring-border-default hover:ring-primary/60 transition-all p-0.5"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-elevated flex items-center justify-center">
          <UserAvatar
            avatarUrl={user?.avatarUrl}
            displayName={username}
            size={28}
            className="w-full h-full"
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface text-text-primary shadow-2xl z-50 overflow-hidden border border-border-default">
          {/* Identity Header */}
          <div className="p-3.5 flex items-center gap-3 border-b border-border-subtle bg-surface-elevated">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface shrink-0 border border-border-default">
              <UserAvatar
                avatarUrl={user?.avatarUrl}
                displayName={username}
                size={40}
                className="w-full h-full"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-text-primary truncate">{username}</div>
              <p className="text-[11px] text-text-muted truncate font-mono">{email}</p>
            </div>
          </div>

          {/* Live Solve & Streak Snapshot */}
          {stats && (
            <div className="px-3.5 py-2.5 border-b border-border-subtle bg-surface-subtle space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    <span>Solved</span>
                  </span>
                  <span className="font-semibold text-text-primary">
                    {stats.totalSolved}
                    <span className="text-[10px] text-text-muted"> ({solvePct}%)</span>
                  </span>
                </div>

                <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1">
                    <Flame className="w-3 h-3 text-primary" />
                    <span>Streak</span>
                  </span>
                  <span className="font-semibold text-text-primary">{stats.currentStreak}d</span>
                </div>
              </div>

              {stats.potd?.id && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (!stats.potd!.solvedToday) {
                      window.location.hash = `#problem/${stats.potd!.id}`;
                    } else {
                      onNavigate?.('dashboard');
                    }
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between transition-colors ${
                    stats.potd.solvedToday
                      ? 'bg-success-subtle/50 border-success/30 text-success'
                      : 'bg-primary-subtle/50 border-primary/30 text-primary hover:bg-primary-subtle'
                  }`}
                >
                  <span className="truncate">
                    {stats.potd.solvedToday
                      ? `POTD #${stats.potd.id} Done ✓`
                      : `Solve POTD #${stats.potd.id}`}
                  </span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* Quick Theme Switcher */}
          <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-text-muted">Theme</span>
            <div className="flex items-center gap-1.5">
              {THEME_OPTIONS.map((opt) => {
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    title={opt.label}
                    aria-label={`Switch theme to ${opt.label}`}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-transform ${
                      active
                        ? 'scale-110 ring-2 ring-primary border-primary'
                        : 'border-border-default hover:scale-105'
                    }`}
                    style={{ backgroundColor: opt.swatches[0] }}
                  >
                    {active ? (
                      <Check
                        className="w-3 h-3"
                        style={{ color: opt.swatches[2] }}
                      />
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: opt.swatches[2] }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Actions */}
          <div className="py-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('profile');
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-left"
            >
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Profile &amp; Backup</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('bookmarks');
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-left"
            >
              <Bookmark className="w-3.5 h-3.5 text-text-muted" />
              <span>Saved Bookmarks</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('mock-interview');
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-left"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
              <span>Mock Interview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('about');
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-left"
            >
              <Info className="w-3.5 h-3.5 text-text-muted" />
              <span>About CodePrep</span>
            </button>

            <div className="my-1 border-t border-border-subtle" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 text-danger hover:bg-danger-subtle transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
