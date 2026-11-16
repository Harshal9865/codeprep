import React from 'react';
import {
  Library,
  Flame,
  Layers,
  GraduationCap,
  Bookmark,
  FolderGit2,
  Briefcase,
  Binary,
  Database,
  Boxes,
  Compass,
} from 'lucide-react';

interface ProblemLeftSidebarProps {
  activeTab: string;
  onSelectCategory: (category: string) => void;
  totalProblems?: number;
  sqlTotal?: number;
  oopTotal?: number;
}

export const ProblemLeftSidebar: React.FC<ProblemLeftSidebarProps> = ({
  activeTab,
  onSelectCategory,
  totalProblems = 3000,
  sqlTotal = 400,
  oopTotal = 100,
}) => {
  return (
    <aside className="w-60 shrink-0 hidden xl:flex flex-col gap-6 text-sm text-text-muted select-none">
      {/* Primary Curated Tracks */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors border ${
            activeTab === 'all'
              ? 'bg-surface-elevated text-text-primary font-semibold border-border-default'
              : 'border-transparent hover:bg-surface-elevated hover:text-text-primary'
          }`}
        >
          <Library className="w-4 h-4 text-text-primary" />
          <span>All {totalProblems} Questions</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('core-600')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors border ${
            activeTab === 'core-600' || activeTab === 'core-dsa-500' || activeTab === 'core-sql-100'
              ? 'bg-primary/15 text-primary font-semibold border-primary/45'
              : 'border-transparent hover:bg-surface-elevated hover:text-text-primary'
          }`}
        >
          <Layers className="w-4 h-4 text-primary" />
          <span>Core 600 (#1–#600)</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('extended')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors border ${
            activeTab === 'extended'
              ? 'bg-surface-elevated text-text-primary font-semibold border-border-default'
              : 'border-transparent hover:bg-surface-elevated hover:text-text-primary'
          }`}
        >
          <Compass className="w-4 h-4 text-amber-400" />
          <span>Extended (#601+)</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('blind75')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors border ${
            activeTab === 'blind75'
              ? 'bg-surface-elevated text-text-primary font-semibold border-border-default'
              : 'border-transparent hover:bg-surface-elevated hover:text-text-primary'
          }`}
        >
          <Flame className="w-4 h-4 text-primary" />
          <span>Blind 75 Essentials</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('neetcode150')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors border ${
            activeTab === 'neetcode150'
              ? 'bg-surface-elevated text-text-primary font-semibold border-border-default'
              : 'border-transparent hover:bg-surface-elevated hover:text-text-primary'
          }`}
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span>NeetCode 150</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('gfg')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors border ${
            activeTab === 'gfg'
              ? 'bg-surface-elevated text-text-primary font-semibold border-border-default'
              : 'border-transparent hover:bg-surface-elevated hover:text-text-primary'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-success" />
          <span>GFG SDE Sheet</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('database')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors border ${
            activeTab === 'database'
              ? 'bg-surface-elevated text-text-primary font-semibold border-border-default'
              : 'border-transparent hover:bg-surface-elevated hover:text-text-primary'
          }`}
        >
          <Database className="w-4 h-4 text-sky-400" />
          <span>SQL Queries ({sqlTotal})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('oop')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors border ${
            activeTab === 'oop'
              ? 'bg-surface-elevated text-text-primary font-semibold border-border-default'
              : 'border-transparent hover:bg-surface-elevated hover:text-text-primary'
          }`}
        >
          <Boxes className="w-4 h-4 text-purple-400" />
          <span>OOPs Design ({oopTotal})</span>
        </button>
      </div>

      {/* Bookmarks & Saved */}
      <div className="flex flex-col gap-2">
        <div className="px-3 text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
          <span>Personal Lists</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onSelectCategory('favorites')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'favorites' ? 'bg-surface-elevated text-text-primary font-medium' : 'hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            <Bookmark className="w-4 h-4 text-primary" />
            <span>Saved / Bookmarks</span>
          </button>
        </div>
      </div>

      {/* Topic Shortcuts */}
      <div className="flex flex-col gap-2">
        <div className="px-3 text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
          <span>Pattern Focus</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onSelectCategory('graphs')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'graphs'
                ? 'bg-surface-elevated border border-border-subtle text-text-primary font-semibold'
                : 'hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            <div className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
              <FolderGit2 className="w-2.5 h-2.5" />
            </div>
            <span>Graph Algorithms</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectCategory('dp')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'dp'
                ? 'bg-surface-elevated border border-border-subtle text-text-primary font-semibold'
                : 'hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            <div className="w-4 h-4 rounded bg-primary-subtle flex items-center justify-center text-primary">
              <Briefcase className="w-2.5 h-2.5" />
            </div>
            <span>Dynamic Programming</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectCategory('math')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'math'
                ? 'bg-surface-elevated border border-border-subtle text-text-primary font-semibold'
                : 'hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            <div className="w-4 h-4 rounded bg-sky-500/20 flex items-center justify-center text-sky-400">
              <Binary className="w-2.5 h-2.5" />
            </div>
            <span>Math & Bitwise</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
