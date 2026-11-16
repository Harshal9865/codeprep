import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Code2, Search, Flame, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchDashboardAnalytics } from '../../services/analyticsCache';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LeetCodeUserDropdown } from './LeetCodeUserDropdown';

interface NavbarProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  currentStreak?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab = 'dashboard',
  onTabChange,
  currentStreak: propStreak,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedStreak, setFetchedStreak] = useState<number>(0);
  const [potdStatus, setPotdStatus] = useState<{ id: number; solvedToday: boolean } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const fetchStreak = useCallback(async (force = false) => {
    if (!user) return;
    try {
      const payload = await fetchDashboardAnalytics<{
        currentStreak?: number;
        potd?: { id: number; solvedToday: boolean };
      }>(force);
      if (propStreak === undefined) {
        setFetchedStreak(payload?.currentStreak ?? 0);
      }
      if (payload?.potd?.id) {
        setPotdStatus({
          id: payload.potd.id,
          solvedToday: Boolean(payload.potd.solvedToday),
        });
      }
    } catch {
      // Keep existing streak silently if analytics endpoint isn't ready
    }
  }, [user, propStreak]);

  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);

  useEffect(() => {
    const handleProgressUpdated = () => {
      void fetchStreak(true);
    };
    window.addEventListener('codeprep:progress-updated', handleProgressUpdated);
    return () => window.removeEventListener('codeprep:progress-updated', handleProgressUpdated);
  }, [fetchStreak]);

  // Global '/' keyboard shortcut to jump to inline problem search (Ctrl/Cmd+K belongs to CommandPalette)
  useEffect(() => {
    if (!user) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !target ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        Boolean(target.closest('.monaco-editor'));

      const isSlash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable;

      if (isSlash) {
        e.preventDefault();
        if (searchInputRef.current && searchInputRef.current.offsetParent !== null) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        } else {
          setMobileMenuOpen(true);
          window.setTimeout(() => {
            mobileSearchInputRef.current?.focus();
            mobileSearchInputRef.current?.select();
          }, 40);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [user]);

  const activeStreak = propStreak !== undefined ? propStreak : fetchedStreak;

  const navLinks = [
    { id: 'dashboard', label: 'Explore' },
    { id: 'dsa', label: 'Problems' },
    { id: 'sql', label: 'SQL Lab' },
    { id: 'oops', label: 'OOPs' },
    { id: 'mock-interview', label: 'Mock Interview' },
    { id: 'aptitude', label: 'Aptitude' },
    { id: 'prep', label: 'Interview Kit' },
    { id: 'about', label: 'About' },
  ];

  const handleGlobalSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    window.dispatchEvent(new CustomEvent('codeprep:navigate-search', { detail: trimmed }));
    setMobileMenuOpen(false);
    searchInputRef.current?.blur();
    mobileSearchInputRef.current?.blur();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-surface border-b border-border-subtle text-text-primary select-none transition-colors">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
        {/* Left: Mobile Drawer Toggle, Brand & Desktop Navigation */}
        <div className="flex items-center gap-3 md:gap-6 min-w-0">
          {user && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden h-8 w-8 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onTabChange?.('dashboard');
            }}
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg px-1 py-0.5 shrink-0"
          >
            <div className="h-7 w-7 rounded-lg bg-primary-subtle flex items-center justify-center text-primary">
              <Code2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-base tracking-tight text-text-primary group-hover:text-primary transition-colors">
              CodePrep
            </span>
          </button>

          {user && (
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = currentTab === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onTabChange?.(link.id)}
                    className={`relative px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      isActive
                        ? 'bg-surface-high text-text-primary font-semibold border border-border-subtle'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right: Global Search, Daily Streak, Theme Switcher, Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {user && (
            <form
              onSubmit={handleGlobalSearchSubmit}
              className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border-subtle focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 text-xs text-text-muted transition-all"
            >
              <button
                type="submit"
                aria-label="Search problems"
                className="text-text-muted hover:text-primary transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search problems globally"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    searchInputRef.current?.blur();
                  }
                }}
                className="bg-transparent border-0 outline-none text-xs text-text-primary placeholder:text-text-muted w-28 focus:w-44 transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search query"
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <kbd
                  title="Press / to search problems"
                  className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded bg-surface border border-border-subtle text-[10px] font-mono text-text-muted"
                >
                  /
                </kbd>
              )}
            </form>
          )}

          {/* Real Daily POTD Streak Indicator */}
          {user && (
            <button
              type="button"
              onClick={() => {
                if (potdStatus && !potdStatus.solvedToday) {
                  window.location.hash = `#problem/${potdStatus.id}`;
                } else {
                  onTabChange?.('dashboard');
                }
              }}
              title={
                potdStatus
                  ? potdStatus.solvedToday
                    ? `POTD Streak: ${activeStreak}d (Today's POTD #${potdStatus.id} Solved ✓)`
                    : `POTD Streak: ${activeStreak}d — Click to solve today's POTD (#${potdStatus.id})`
                  : `Current Daily Streak: ${activeStreak} day${activeStreak === 1 ? '' : 's'}`
              }
              aria-label={`Current daily streak: ${activeStreak} days`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated border border-border-subtle text-xs font-mono hover:border-primary/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  potdStatus?.solvedToday || activeStreak > 0
                    ? 'text-primary fill-primary/30'
                    : 'text-text-muted'
                }`}
              />
              <span className={activeStreak > 0 ? 'text-text-primary font-bold' : 'text-text-muted'}>
                {activeStreak}d
              </span>
              {potdStatus && (
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full ${
                    potdStatus.solvedToday ? 'bg-success' : 'bg-primary animate-pulse'
                  }`}
                />
              )}
            </button>
          )}

          {/* Theme Switcher Button */}
          <ThemeToggle compact />

          {/* User Profile Dropdown */}
          {user && <LeetCodeUserDropdown onNavigate={onTabChange} />}
        </div>
      </div>

      {/* Responsive Narrow/Mobile Navigation Tray */}
      {user && mobileMenuOpen && (
        <div className="md:hidden border-t border-border-subtle bg-surface-elevated px-4 py-3 space-y-3">
          <form
            onSubmit={handleGlobalSearchSubmit}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-subtle focus-within:border-primary/60 text-xs"
          >
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              aria-label="Search problems on mobile"
              placeholder="Search 3,000 problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear mobile search"
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          <nav aria-label="Mobile navigation" className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const isActive = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onTabChange?.(link.id);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors border ${
                    isActive
                      ? 'bg-primary-subtle border-primary/40 text-primary font-semibold'
                      : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
