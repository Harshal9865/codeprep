import React, { useState } from 'react';
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
  Boxes,
  Wrench,
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
    title: 'C++17 Sandbox Judge',
    subtitle: 'g++ compilation with timed execution',
    description:
      'Compiles DSA and OOP C++17 solutions with g++ and runs test cases in isolated subprocesses with timeout guards and clean line-number error reporting.',
  },
  {
    icon: Database,
    title: 'SQLite Query Lab',
    subtitle: '400 SQL query problems',
    description:
      'Sets up isolated table schemas per problem in SQLite, runs read-only queries, and compares result rows against expected output.',
  },
  {
    icon: Layers,
    title: 'Persistent Progress',
    subtitle: 'SQLite + Prisma storage',
    description:
      'Saves your submissions, code drafts, study notes, bookmarks, badges, and daily streaks locally with one-click JSON export/import backups.',
  },
  {
    icon: Sliders,
    title: 'Customizable Editor',
    subtitle: '6 themes & keyboard shortcuts',
    description:
      'Switch between Pitch Dark, Light, LeetCode, VS Code, Tokyo Night, and Monokai themes with persistent editor layouts and shortcuts.',
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
    label: 'Problems (3,000 Total Curriculum)',
    route: '#dsa',
    purpose: 'Curated interview sets (Blind 75, NeetCode 150, Top 100), server-paginated topic filters, and split-pane C++17 IDE.',
  },
  {
    id: 'sql',
    icon: Database,
    label: 'SQL Lab (400)',
    route: '#sql',
    purpose: 'Relational schema explorer, query runner, join/window-function drills, and result diff verification.',
  },
  {
    id: 'oops',
    icon: Boxes,
    label: 'OOPs Hub (100 Coding + Study + MCQs)',
    route: '#oops',
    purpose: 'Pillar-by-pillar OOP & SOLID study modules, 100 executable C++17 OOP design challenges, and placement MCQs.',
  },
  {
    id: 'mock-interview',
    icon: ShieldCheck,
    label: 'Mock Interview (Aptitude + Coding)',
    route: '#mock-interview',
    purpose: 'Timed company-calibrated rounds pairing fresh dynamic Aptitude MCQs with randomized unseen DSA, SQL & OOP problems.',
  },
  {
    id: 'aptitude',
    icon: Brain,
    label: 'Aptitude',
    route: '#aptitude',
    purpose: 'Category-filtered placement MCQs across Quantitative, Logical Reasoning, Verbal, and OOPs & C++ Design.',
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

type BuildSectionTab = 'architecture' | 'schema';

const DATABASE_MODELS_SUMMARY = [
  { name: 'User', role: 'Account credentials, theme preference, timezone, and avatar.' },
  { name: 'RefreshToken', role: '30-day rolling hashed refresh tokens revocable per session.' },
  { name: 'Problem', role: '3,000 DSA, OOPs, and SQL problems with examples & starter code.' },
  { name: 'UserProblemState', role: 'Per-user bookmarks, notes, and solution unlock state.' },
  { name: 'ProblemDraft', role: 'Auto-saved editor drafts keyed per user and problem.' },
  { name: 'ProblemActiveTimer', role: 'Synced solve duration updated while practicing.' },
  { name: 'Submission', role: 'Run/submit verdict history, runtime, stderr, and failed test case.' },
  { name: 'AiLesson', role: 'Structured solution explanations, traces, and reference implementations.' },
  { name: 'UserBadge', role: 'Unlocked streak, milestone, and topic mastery achievements.' },
];

const ArchitectureNotesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BuildSectionTab>('architecture');

  const tabs: Array<{ id: BuildSectionTab; label: string; icon: React.ReactNode }> = [
    { id: 'architecture', label: 'How It Works', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'schema', label: 'Database Models', icon: <Database className="w-3.5 h-3.5" /> },
  ];

  return (
    <section className="rounded-xl bg-surface border border-border-subtle p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            System Architecture &amp; Storage
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl">
            How C++ compilation, SQL query execution, and local progress persistence are structured under the hood.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-surface-subtle p-1 rounded-lg border border-border-subtle">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-elevated text-text-primary border border-border-default shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'architecture' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="rounded-lg bg-surface-subtle border border-border-subtle p-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">C++17 Compilation &amp; Sandbox</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pre-compiled headers speed up g++ builds. Compiler errors are mapped back to your editor lines, and test drivers verify output cleanly inside timed subprocesses.
            </p>
          </div>
          <div className="rounded-lg bg-surface-subtle border border-border-subtle p-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">Read-Only SQL Runner</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Each SQL problem loads fresh tables inside an isolated SQLite session, runs your query, and diffs rows and column ordering against expected output.
            </p>
          </div>
          <div className="rounded-lg bg-surface-subtle border border-border-subtle p-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">Offline-Friendly Persistence</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              SQLite in WAL mode stores problems, drafts, timers, and submissions on disk, alongside portable JSON export/import and automatic browser snapshots.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'schema' && (
        <div className="space-y-3">
          <div className="rounded-lg bg-surface-subtle border border-border-subtle p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-text-secondary">
              Embedded <strong className="text-text-primary">SQLite WAL</strong> with Prisma ORM and PostgreSQL schema support.
            </span>
            <span className="font-mono text-[11px] text-primary">9 Prisma Models</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DATABASE_MODELS_SUMMARY.map((model) => (
              <div
                key={model.name}
                className="rounded-lg bg-surface-subtle border border-border-subtle p-3.5 space-y-1"
              >
                <div className="font-mono text-xs font-semibold text-text-primary">
                  {model.name}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{model.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

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
              Open 3,000 Problems
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary text-xs font-medium hover:bg-surface-high transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Overview
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm text-text-secondary leading-relaxed">
            <p>
              CodePrep is a self-hosted coding interview practice platform for C++ data structures,
              OOP design, SQL queries, and aptitude drills without external rate limits or scattered tools.
            </p>
            <p>
              Everything runs against your local backend: SQLite stores submissions and streak history,
              g++ compiles and runs C++17 solutions against test suites, and timed study controls keep
              practice focused.
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

      {/* Workspace Sections */}
      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold text-text-primary">
              Workspace Sections
            </h2>
          </div>
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

      {/* Tech Stack */}
      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">Tech Stack</h2>
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

      <ArchitectureNotesSection />
      </div>
    </AppLayout>
  );
};
