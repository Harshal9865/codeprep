import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Play,
  Send,
  AlignLeft,
  RotateCcw,
  PanelLeftOpen,
  Lightbulb,
  LayoutDashboard,
  Code2,
  Database,
  Sparkles,
  Bookmark,
  Palette,
  CornerDownLeft,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { THEME_OPTIONS } from '../../types/theme';

interface CommandPaletteProps {
  isWorkspaceActive: boolean;
  onSelectProblem: (problemId: number) => void;
  onNavigateTab: (tab: string) => void;
  onOpenCore600: () => void;
}

interface QuickProblemResult {
  id: number;
  title: string;
  difficulty: string;
  topic?: string;
  isSolved?: boolean;
}

interface PaletteCommand {
  id: string;
  group: 'Workspace' | 'Navigate' | 'Themes' | 'Problems';
  title: string;
  subtitle?: string;
  shortcut?: string;
  badge?: string;
  icon: React.ReactNode;
  run: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isWorkspaceActive,
  onSelectProblem,
  onNavigateTab,
  onOpenCore600,
}) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [problems, setProblems] = useState<QuickProblemResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (next) {
            setQuery('');
            setActiveIdx(0);
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const trimmed = query.trim();

    if (!trimmed) {
      setProblems([]);
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          page: '1',
          pageSize: '8',
          search: trimmed,
        });
        const res = await apiRequest<{
          items?: QuickProblemResult[];
          problems?: QuickProblemResult[];
        }>(`/problems?${params.toString()}`);

        if (!cancelled) {
          const list = Array.isArray(res.items)
            ? res.items
            : Array.isArray(res.problems)
              ? res.problems
              : [];
          setProblems(list);
        }
      } catch {
        if (!cancelled) setProblems([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, query]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const list: PaletteCommand[] = [];
    const dispatchWs = (action: string) => {
      window.dispatchEvent(new CustomEvent('codeprep:workspace:action', { detail: { action } }));
    };

    if (isWorkspaceActive) {
      list.push(
        {
          id: 'ws-run',
          group: 'Workspace',
          title: 'Run Code / Query',
          subtitle: 'Execute against sample or custom test cases',
          shortcut: 'Ctrl+Enter',
          icon: <Play className="w-4 h-4 text-primary" />,
          run: () => dispatchWs('run'),
        },
        {
          id: 'ws-submit',
          group: 'Workspace',
          title: 'Submit Solution',
          subtitle: 'Grade against full hidden test suite',
          shortcut: 'Ctrl+Shift+Enter',
          icon: <Send className="w-4 h-4 text-emerald-400" />,
          run: () => dispatchWs('submit'),
        },
        {
          id: 'ws-format',
          group: 'Workspace',
          title: 'Format Code',
          subtitle: 'Auto-fix spacing, braces, and indentation',
          shortcut: 'Shift+Alt+F',
          icon: <AlignLeft className="w-4 h-4 text-primary" />,
          run: () => dispatchWs('format'),
        },
        {
          id: 'ws-drawer',
          group: 'Workspace',
          title: 'Toggle Quick Problem List',
          subtitle: 'Browse and switch problems in slide-over drawer',
          icon: <PanelLeftOpen className="w-4 h-4 text-primary" />,
          run: () => dispatchWs('quick-list'),
        },
        {
          id: 'ws-coach',
          group: 'Workspace',
          title: 'Toggle AI Coach',
          subtitle: 'Analyze approach, edge cases, and complexity',
          icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
          run: () => dispatchWs('toggle-coach'),
        },
        {
          id: 'ws-reset-layout',
          group: 'Workspace',
          title: 'Reset Pane Layout',
          subtitle: 'Restore default horizontal & vertical split sizes',
          icon: <RotateCcw className="w-4 h-4 text-text-muted" />,
          run: () => dispatchWs('reset-layout'),
        }
      );
    }

    list.push(
      {
        id: 'nav-core600',
        group: 'Navigate',
        title: 'Core 600 Curriculum (#1-#600)',
        subtitle: '500 DSA + 100 SQL core problem set',
        icon: <Sparkles className="w-4 h-4 text-primary" />,
        run: onOpenCore600,
      },
      {
        id: 'nav-dashboard',
        group: 'Navigate',
        title: 'Dashboard',
        subtitle: 'Overview, streak, and Core 600 direct solve',
        icon: <LayoutDashboard className="w-4 h-4 text-text-muted" />,
        run: () => onNavigateTab('dashboard'),
      },
      {
        id: 'nav-dsa',
        group: 'Navigate',
        title: 'All DSA Problems',
        subtitle: 'Browse full C++ / OOP problem catalog',
        icon: <Code2 className="w-4 h-4 text-text-muted" />,
        run: () => onNavigateTab('dsa'),
      },
      {
        id: 'nav-sql',
        group: 'Navigate',
        title: 'SQL Problems',
        subtitle: 'Core 100 SQL & extended query challenges',
        icon: <Database className="w-4 h-4 text-text-muted" />,
        run: () => onNavigateTab('sql'),
      },
      {
        id: 'nav-bookmarks',
        group: 'Navigate',
        title: 'Bookmarked Problems',
        subtitle: 'Your starred revision questions',
        icon: <Bookmark className="w-4 h-4 text-primary" />,
        run: () => onNavigateTab('bookmarks'),
      }
    );

    for (const t of THEME_OPTIONS) {
      list.push({
        id: `theme-${t.id}`,
        group: 'Themes',
        title: `Theme: ${t.label}`,
        subtitle: t.subtitle,
        badge: theme === t.id ? 'Active' : undefined,
        icon: <Palette className="w-4 h-4 text-primary" />,
        run: () => setTheme(t.id),
      });
    }

    const q = query.trim().toLowerCase();
    const filteredStatic = q
      ? list.filter(
          (cmd) =>
            cmd.title.toLowerCase().includes(q) ||
            (cmd.subtitle?.toLowerCase().includes(q) ?? false) ||
            cmd.group.toLowerCase().includes(q)
        )
      : list;

    const problemCmds: PaletteCommand[] = problems.map((p) => ({
      id: `prob-${p.id}`,
      group: 'Problems',
      title: `#${p.id} ${p.title}`,
      subtitle: p.topic || undefined,
      badge: p.difficulty,
      icon: p.isSolved ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <Code2 className="w-4 h-4 text-text-muted" />
      ),
      run: () => onSelectProblem(p.id),
    }));

    return [...problemCmds, ...filteredStatic];
  }, [isWorkspaceActive, onNavigateTab, onOpenCore600, onSelectProblem, problems, query, setTheme, theme]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, problems.length]);

  if (!isOpen) return null;

  const executeCommand = (cmd: PaletteCommand | undefined) => {
    if (!cmd) return;
    setIsOpen(false);
    cmd.run();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => setIsOpen(false)}
      />

      <div
        role="dialog"
        aria-label="Command Palette"
        className="relative z-10 w-full max-w-xl rounded-2xl bg-surface border border-border-default shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3 bg-surface-elevated">
          <Search className="w-4 h-4 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((prev) => (commands.length ? (prev + 1) % commands.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((prev) =>
                  commands.length ? (prev - 1 + commands.length) % commands.length : 0
                );
              } else if (e.key === 'Enter') {
                e.preventDefault();
                executeCommand(commands[activeIdx]);
              }
            }}
            placeholder="Search #ID, problem title, theme, or workspace command..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-border-subtle text-[10px] font-mono text-text-muted">
            Esc
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-1.5 divide-y divide-border-subtle/40">
          {searching && query.trim() && (
            <div className="px-4 py-2 text-xs text-text-muted">Searching problems...</div>
          )}

          {commands.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-text-muted">
              No matching problems or commands.
            </div>
          ) : (
            commands.map((cmd, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => executeCommand(cmd)}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                    isActive ? 'bg-primary/15' : 'hover:bg-surface-subtle/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0">{cmd.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate">
                        {cmd.title}
                      </div>
                      {cmd.subtitle && (
                        <div className="text-[11px] text-text-muted truncate">{cmd.subtitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.badge && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-elevated border border-border-subtle text-[10px] font-mono text-text-secondary">
                        {cmd.badge}
                      </span>
                    )}
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-border-subtle text-[10px] font-mono text-text-muted">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-text-muted/70">
                      {cmd.group}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-border-subtle bg-surface-subtle/60 flex items-center justify-between text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="w-3 h-3" />
            <span>Enter to select • ↑↓ Navigate</span>
          </span>
          <span className="font-mono">Ctrl+K anytime</span>
        </div>
      </div>
    </div>
  );
};
