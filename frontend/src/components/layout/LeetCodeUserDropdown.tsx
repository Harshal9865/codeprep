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
  Palette,
  ChevronRight,
  Sparkles,
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
  const totalSolved = stats?.totalSolved ?? 0;
  const totalProblems = stats?.totalProblems || 3000;
  const solvePct = totalProblems > 0 ? Math.min(100, Math.round((totalSolved / totalProblems) * 100)) : 0;
  const activeThemeMeta = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  const handleGo = (tab: string) => {
    setIsOpen(false);
    onNavigate?.(tab);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className={`flex items-center gap-2 rounded-full p-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          isOpen
            ? 'ring-2 ring-primary shadow-sm'
            : 'ring-1 ring-border-default hover:ring-primary/60'
        }`}
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
        <div
          role="menu"
          className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-surface text-text-primary shadow-2xl z-50 overflow-hidden border border-border-default"
        >
          {/* Identity + Live Progress Card */}
          <div className="p-4 bg-surface-elevated/90 border-b border-border-subtle space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface shrink-0 border border-border-default shadow-sm">
                <UserAvatar
                  avatarUrl={user?.avatarUrl}
                  displayName={username}
                  size={44}
                  className="w-full h-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-text-primary truncate">{username}</span>
                  {stats && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-subtle border border-primary/25 text-[10px] font-mono font-semibold text-primary shrink-0">
                      <Flame className="w-3 h-3" />
                      {stats.currentStreak}d
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted truncate font-mono">{email}</p>
              </div>
            </div>

            {stats && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-secondary inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    <span>Overall Progress</span>
                  </span>
                  <span className="text-text-primary font-semibold">
                    {totalSolved} / {totalProblems} ({solvePct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-canvas overflow-hidden border border-border-subtle/50">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(solvePct, totalSolved > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            )}

            {stats?.potd?.id && (
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
                className={`w-full px-3 py-2 rounded-xl border text-[11px] font-mono flex items-center justify-between gap-2 transition-colors ${
                  stats.potd.solvedToday
                    ? 'bg-success-subtle/40 border-success/30 text-success'
                    : 'bg-surface border-border-default hover:border-primary/45 text-text-primary'
                }`}
              >
                <span className="truncate flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">
                    {stats.potd.solvedToday
                      ? `Daily #${stats.potd.id} Completed`
                      : `Daily Challenge #${stats.potd.id}`}
                  </span>
                </span>
                <ArrowRight className="w-3 h-3 text-primary shrink-0" />
              </button>
            )}
          </div>

          {/* Interactive Theme Selector */}
          <div className="px-4 py-3 border-b border-border-subtle space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-text-muted uppercase tracking-wider inline-flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-primary" />
                <span>Theme</span>
              </span>
              <span className="font-medium text-text-primary">{activeThemeMeta.label}</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {THEME_OPTIONS.map((opt) => {
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    title={opt.label}
                    aria-label={`Switch theme to ${opt.label}`}
                    className={`h-7 rounded-lg border flex items-center justify-center transition-all ${
                      active
                        ? 'ring-2 ring-primary border-primary scale-105 shadow-sm'
                        : 'border-border-default hover:border-primary/50'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${opt.swatches[0]} 55%, ${opt.swatches[2]} 55%)`,
                    }}
                  >
                    {active && (
                      <span className="w-4 h-4 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Menu Links */}
          <div className="p-1.5 space-y-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleGo('profile')}
              className="w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 hover:bg-surface-elevated transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">Profile &amp; Backup</div>
                  <div className="text-[10px] text-text-muted truncate">
                    Avatars, theme settings &amp; JSON export
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleGo('bookmarks')}
              className="w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 hover:bg-surface-elevated transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-surface-elevated text-text-secondary group-hover:text-primary flex items-center justify-center shrink-0 border border-border-subtle">
                  <Bookmark className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">Saved Bookmarks</div>
                  <div className="text-[10px] text-text-muted truncate">
                    Starred problems for quick revision
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleGo('mock-interview')}
              className="w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 hover:bg-surface-elevated transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-surface-elevated text-text-secondary group-hover:text-primary flex items-center justify-center shrink-0 border border-border-subtle">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">Mock Assessment</div>
                  <div className="text-[10px] text-text-muted truncate">
                    Timed interview simulation rounds
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleGo('about')}
              className="w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 hover:bg-surface-elevated transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-surface-elevated text-text-secondary group-hover:text-primary flex items-center justify-center shrink-0 border border-border-subtle">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">About CodePrep</div>
                  <div className="text-[10px] text-text-muted truncate">
                    Judge runtime specs &amp; curriculum
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
            </button>
          </div>

          {/* Footer Sign Out */}
          <div className="p-1.5 border-t border-border-subtle bg-surface-subtle/50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-danger hover:bg-danger-subtle transition-colors"
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
