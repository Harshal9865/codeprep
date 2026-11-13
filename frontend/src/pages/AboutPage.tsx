import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Database,
  Cpu,
  Code2,
  Brain,
  GraduationCap,
  Layers,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sliders,
  Server,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar, resolvePixelAvatarPreset } from '../components/ui/PixelAvatars';

interface AboutPageProps {
  onNavigate: (tab: string) => void;
}

const ARCHITECTURE_PILLARS = [
  {
    icon: Cpu,
    title: 'Isolated C++17 Judge',
    subtitle: 'Local Compilation & Harness Execution',
    description:
      'Compiles candidate solutions locally with g++ and runs multi-case input/output drivers with memory guards, execution timeouts, and line-level compiler diagnostics.',
  },
  {
    icon: Database,
    title: 'SQLite Query Sandbox',
    subtitle: '100 Schema-Isolated Relational Tasks',
    description:
      'Seeds clean relational schemas per execution inside an isolated SQLite context, normalizes common SQL idioms, and verifies result sets deterministically.',
  },
  {
    icon: Layers,
    title: 'Persistent Study State',
    subtitle: 'Prisma ORM + SQLite WAL Storage',
    description:
      'Stores all 600 curriculum questions, autosaved editor drafts, active study timers, earned badges, timezone-accurate streak heatmaps, and full JSON exports locally.',
  },
  {
    icon: Sliders,
    title: 'Crafted Multi-Theme UI',
    subtitle: '6 Tokenized Developer Colorways',
    description:
      'Engineered with CSS custom-property theme tokens across Pitch Dark, Day, LeetCode, VS Code, Tokyo Night, and Monokai palettes with keyboard-first shortcuts.',
  },
];

const WORKSPACE_MAP = [
  {
    id: 'dashboard',
    icon: Clock,
    label: 'Explore',
    route: '#dashboard',
    purpose: 'Daily recommended problem, revision queue, 365-day timezone heatmap, topic mastery, and badges.',
  },
  {
    id: 'dsa',
    icon: Code2,
    label: 'Problems (DSA 500)',
    route: '#dsa',
    purpose: 'Curated interview sets (Blind 75, NeetCode 150, Top 100), topic filters, and split-pane C++17 IDE.',
  },
  {
    id: 'sql',
    icon: Database,
    label: 'SQL Lab (100)',
    route: '#sql',
    purpose: 'Relational schema explorer, query runner, join/window-function drills, and result diff verification.',
  },
  {
    id: 'aptitude',
    icon: Brain,
    label: 'Aptitude',
    route: '#aptitude',
    purpose: 'Category-filtered placement MCQs across Quantitative, Logical Reasoning, and Verbal with timed drills.',
  },
  {
    id: 'profile',
    icon: Bookmark,
    label: 'Profile & Settings',
    route: '#profile',
    purpose: 'Pixel character selection, custom avatar upload, theme switching, password controls, and JSON backup.',
  },
];

const TECH_STACK = [
  { group: 'Frontend', items: ['React 18', 'TypeScript', 'Tailwind CSS', 'Vite', 'Lucide Icons'] },
  { group: 'Backend', items: ['Node.js', 'Express', 'TypeScript', 'Zod Validation', 'JWT Cookie Auth'] },
  { group: 'Storage', items: ['Prisma ORM', 'SQLite (WAL)', 'Indexed Queries', 'Local JSON Export'] },
  { group: 'Execution', items: ['g++ C++17 Runner', 'SQLite Query Engine', 'Timed Subprocess Guard'] },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [serverHealthy, setServerHealthy] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let active = true;
    fetch('/health')
      .then((res) => {
        if (active) setServerHealthy(res.ok ? 'online' : 'offline');
      })
      .catch(() => {
        if (active) setServerHealthy('offline');
      });
    return () => {
      active = false;
    };
  }, []);

  const avatarPreset = resolvePixelAvatarPreset(user?.avatarUrl);

  return (
    <AppLayout currentTab="about" onTabChange={onNavigate}>
      <div className="max-w-[1180px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6 pb-10 animate-fade-in">
      {/* Developer Hero Card */}
      <section className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/50 bg-surface-elevated shrink-0 shadow-md">
              <UserAvatar
                avatarUrl={user?.avatarUrl}
                displayName={user?.displayName || 'Harshal Patel'}
                size={80}
                className="w-full h-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-primary-subtle text-primary border border-primary/25">
                  <GraduationCap className="w-3.5 h-3.5" />
                  B.Tech ICT • Dhirubhai Ambani University
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-surface-elevated text-text-secondary border border-border-default">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      serverHealthy === 'online'
                        ? 'bg-success'
                        : serverHealthy === 'offline'
                        ? 'bg-danger'
                        : 'bg-warning'
                    }`}
                  />
                  API {serverHealthy === 'online' ? 'Connected' : serverHealthy === 'offline' ? 'Unreachable' : 'Checking...'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Harshal Patel
              </h1>
              <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
                Fresher B.Tech Information &amp; Communication Technology student at{' '}
                <span className="text-text-primary font-medium">Dhirubhai Ambani University</span>,
                building reliable software while exploring backend architecture, database internals,
                compilers, and full-stack product engineering.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-muted font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border-subtle">
                  Avatar: {user?.avatarUrl && !user.avatarUrl.startsWith('pixel:') ? 'Custom Image' : avatarPreset.name}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border-subtle">
                  Focus: DSA • SQL • Systems • TypeScript
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('dsa')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-black text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Code2 className="w-4 h-4" />
              Open DSA 500
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary text-xs font-medium hover:bg-surface-high transition-colors"
              >
                Customize Pixel Character
              </button>
            </div>
          </div>
        </section>

        {/* Why CodePrep Was Built */}
        <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Project Motivation &amp; Engineering Notes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm text-text-secondary leading-relaxed">
            <p>
              CodePrep was engineered as a self-hosted technical interview workbench to practice C++ data
              structures, relational SQL queries, and aptitude fundamentals in one fast local environment
              without third-party rate limits, scattered notes, or lost progress.
            </p>
            <p>
              Every core workflow runs end-to-end against local infrastructure: Prisma models persist
              submissions and streak heatmaps to SQLite in WAL mode, a dedicated runner compiles C++17
              solutions against structured test suites, and timed study locks encourage independent
              problem solving before inspecting reference solutions.
            </p>
          </div>
        </section>

        {/* Core Architecture Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARCHITECTURE_PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl border border-border-subtle bg-surface p-5 flex items-start gap-4 hover:border-border-hover transition-colors"
              >
              <div className="w-10 h-10 rounded-lg bg-primary-subtle border border-primary/25 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                <p className="text-[11px] font-mono text-primary/90">{item.subtitle}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Workspace Value & Non-Redundant Design Map */}
      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold text-text-primary">
              Focused Workspace Structure
            </h2>
          </div>
          <span className="text-xs text-text-muted font-mono">Each route owns one distinct job</span>
        </div>

        <div className="divide-y divide-border-subtle">
          {WORKSPACE_MAP.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-secondary shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{item.label}</span>
                      <span className="text-[11px] font-mono text-text-muted">{item.route}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{item.purpose}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="self-start sm:self-center inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-xs font-medium text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors shrink-0"
                >
                  Open
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tech Stack Matrix */}
      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">Implementation Stack</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TECH_STACK.map((col) => (
            <div
              key={col.group}
              className="rounded-lg bg-surface-elevated border border-border-subtle p-4 space-y-2.5"
            >
              <div className="text-xs font-semibold font-mono text-primary uppercase tracking-wider">
                {col.group}
              </div>
              <ul className="space-y-1.5">
                {col.items.map((tech) => (
                  <li key={tech} className="flex items-center gap-2 text-xs text-text-secondary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    <span>{tech}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      </div>
    </AppLayout>
  );
};
