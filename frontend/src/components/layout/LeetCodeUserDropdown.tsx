import React, { useState, useRef, useEffect } from 'react';
import {
  Code2,
  Database,
  Brain,
  Settings,
  LogOut,
  User,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../ui/PixelAvatars';

interface LeetCodeUserDropdownProps {
  onNavigate?: (tab: string) => void;
}

export const LeetCodeUserDropdown: React.FC<LeetCodeUserDropdownProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const username = user?.displayName || 'Developer';
  const email = user?.email || 'user@codeprep.dev';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-full ring-1 ring-border-default hover:ring-primary/60 transition-all p-0.5"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-elevated flex items-center justify-center">
          <UserAvatar avatarUrl={user?.avatarUrl} displayName={username} size={28} className="w-full h-full" />
        </div>
      </button>

      {/* Floating Personal Profile Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-surface text-text-primary shadow-2xl z-50 overflow-hidden border border-border-default">
          {/* Header Section: Personal User Information */}
          <div className="p-4 flex items-center gap-3 border-b border-border-subtle bg-surface-elevated">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface shrink-0 flex items-center justify-center border border-border-default shadow-inner">
              <UserAvatar avatarUrl={user?.avatarUrl} displayName={username} size={44} className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-text-primary truncate">
                  {username}
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-success" />
              </div>
              <p className="text-xs text-text-muted truncate mt-0.5 font-mono">
                {email}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-success mt-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Signed In</span>
              </div>
            </div>
          </div>

          {/* 2x3 Grid of Navigation Cards */}
          <div className="p-3 grid grid-cols-3 gap-2 bg-surface-subtle border-b border-border-subtle">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('dsa');
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-high transition-colors group text-center border border-border-subtle"
            >
              <div className="h-7 w-7 rounded-lg bg-surface-high flex items-center justify-center text-primary mb-1 group-hover:scale-105 transition-transform">
                <Code2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-medium text-text-primary">DSA 2,500</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('sql');
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-high transition-colors group text-center border border-border-subtle"
            >
              <div className="h-7 w-7 rounded-lg bg-surface-high flex items-center justify-center text-sky-400 mb-1 group-hover:scale-105 transition-transform">
                <Database className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-medium text-text-primary">SQL 400</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('aptitude');
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-high transition-colors group text-center border border-border-subtle"
            >
              <div className="h-7 w-7 rounded-lg bg-surface-high flex items-center justify-center text-purple-400 mb-1 group-hover:scale-105 transition-transform">
                <Brain className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-medium text-text-primary">Aptitude</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('dashboard');
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-high transition-colors group text-center border border-border-subtle"
            >
              <div className="h-7 w-7 rounded-lg bg-surface-high flex items-center justify-center text-success mb-1 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-medium text-text-primary">Progress</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('bookmarks');
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-high transition-colors group text-center border border-border-subtle"
            >
              <div className="h-7 w-7 rounded-lg bg-surface-high flex items-center justify-center text-amber-400 mb-1 group-hover:scale-105 transition-transform">
                <Bookmark className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-medium text-text-primary">Saved</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('profile');
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-high transition-colors group text-center border border-border-subtle"
            >
              <div className="h-7 w-7 rounded-lg bg-surface-high flex items-center justify-center text-text-secondary mb-1 group-hover:scale-105 transition-transform">
                <Settings className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-medium text-text-primary">Settings</span>
            </button>
          </div>

          {/* List Menu Items */}
          <div className="py-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('profile');
              }}
              className="w-full px-4 py-2 flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-left"
            >
              <User className="w-4 h-4 text-text-muted" />
              <span>Profile, Avatar & Preferences</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('about');
              }}
              className="w-full px-4 py-2 flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-left"
            >
              <GraduationCap className="w-4 h-4 text-text-muted" />
              <span>About Harshal & Architecture</span>
            </button>

            <div className="my-1 border-t border-border-subtle" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-4 py-2 flex items-center gap-3 text-danger hover:bg-danger-subtle transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
