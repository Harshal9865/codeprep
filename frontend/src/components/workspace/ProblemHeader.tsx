import React, { useState, useEffect } from 'react';
import { Problem } from '../../types/problem';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Clock,
  Play,
  Pause,
  List,
  Flame,
} from 'lucide-react';

interface ProblemHeaderProps {
  problem: Problem;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onBookmarkToggle: () => void;
  onBackToList: () => void;
  rightActions?: React.ReactNode;
  isPotd?: boolean;
  potdSolvedToday?: boolean;
}

export const ProblemHeader: React.FC<ProblemHeaderProps> = ({
  problem,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onBookmarkToggle,
  onBackToList,
  rightActions,
  isPotd = false,
  potdSolvedToday = false,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    setSeconds(0);
    setIsTimerRunning(true);
  }, [problem.id]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formattedMins = String(mins).padStart(2, '0');
    const formattedSecs = String(secs).padStart(2, '0');
    return `${formattedMins}:${formattedSecs}`;
  };

  return (
    <div className="h-12 bg-surface px-3 sm:px-4 flex items-center justify-between gap-2 select-none shrink-0 border-b border-border-subtle transition-colors">
      {/* Left: Navigation and Problem Context */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onBackToList}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high text-text-primary text-xs font-medium transition-colors border border-border-subtle shrink-0"
          title="Return to Problem List"
        >
          <List className="w-3.5 h-3.5 text-text-muted" />
          <span className="hidden sm:inline">Problems</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high disabled:opacity-30 disabled:pointer-events-none text-text-primary transition-colors border border-border-subtle"
            title="Previous Problem"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high disabled:opacity-30 disabled:pointer-events-none text-text-primary transition-colors border border-border-subtle"
            title="Next Problem"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-1.5 pl-1 min-w-0">
          <span className="text-xs font-mono text-text-muted shrink-0">
            #{problem.id}
          </span>
          <span className="text-xs font-semibold text-text-primary truncate max-w-[200px] lg:max-w-xs">
            {problem.title}
          </span>
          {isPotd && (
            <span
              title={potdSolvedToday ? "Today's POTD solved — daily streak maintained!" : "Today's Problem of the Day"}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0 border ${
                potdSolvedToday
                  ? 'bg-success-subtle text-success border-success/35'
                  : 'bg-primary-subtle text-primary border-primary/35'
              }`}
            >
              <Flame className="w-3 h-3 fill-current" />
              <span>{potdSolvedToday ? 'POTD ✓' : 'POTD'}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions, Coach Button, Timer, Theme Toggle, Bookmark */}
      <div className="flex items-center gap-2 shrink-0">
        {rightActions}

        {/* Live Practice Timer */}
        <button
          type="button"
          onClick={() => setIsTimerRunning(!isTimerRunning)}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated hover:bg-surface-high text-xs font-mono text-text-primary transition-colors border border-border-subtle"
          title={isTimerRunning ? 'Pause Practice Timer' : 'Resume Practice Timer'}
        >
          <Clock className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-success' : 'text-text-muted'}`} />
          <span>{formatTime(seconds)}</span>
          {isTimerRunning ? (
            <Pause className="w-2.5 h-2.5 text-text-muted ml-0.5" />
          ) : (
            <Play className="w-2.5 h-2.5 text-success ml-0.5" />
          )}
        </button>

        <ThemeToggle compact />

        {/* Bookmark Star */}
        <button
          type="button"
          onClick={onBookmarkToggle}
          className={`p-1.5 rounded-lg transition-colors border ${
            problem.isBookmark
              ? 'text-primary bg-primary-subtle border-primary/40'
              : 'text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-high border-border-subtle'
          }`}
          title={problem.isBookmark ? 'Bookmarked' : 'Add to Bookmarks'}
        >
          <Bookmark className="w-4 h-4" fill={problem.isBookmark ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
};
