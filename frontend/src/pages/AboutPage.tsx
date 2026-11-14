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
  Users,
  Wrench,
  GitBranch,
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
      'Compiles candidate DSA and OOP C++17 solutions locally with g++ and runs multi-case input/output drivers with memory guards, execution timeouts, and line-level compiler diagnostics.',
  },
  {
    icon: Database,
    title: 'SQLite Query Sandbox',
    subtitle: '400 Schema-Isolated Relational Tasks',
    description:
      'Seeds clean relational schemas per execution inside an isolated SQLite context, normalizes common SQL idioms, and verifies result sets deterministically.',
  },
  {
    icon: Layers,
    title: 'Persistent Study State',
    subtitle: 'Prisma ORM + SQLite WAL Storage',
    description:
      'Stores all 3,000 curriculum questions (2,500 DSA + 400 SQL + 100 OOPs C++ Design), autosaved editor drafts, active study timers, earned badges, timezone-accurate streak heatmaps, and full JSON exports.',
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

type BuildSectionTab = 'journey' | 'team' | 'schema' | 'ownership';

const HOW_I_BUILT_STEPS = [
  {
    phase: '01 · Planning & Requirements',
    title: 'Scoped a Unified Interview Workbench',
    summary:
      'Mapped out candidate pain points across DSA, OOPs, SQL, and Aptitude so practice notes, active focus timers, and submissions live in one place rather than four scattered tabs.',
    artifact: 'docs/REQUIREMENTS.md',
  },
  {
    phase: '02 · Schema & 3,000-Problem Scaling',
    title: '9 Prisma Tables + Metadata Caching',
    summary:
      'Separated per-user progress into UserProblemState so bookmarks, notes, drafts, and timers stay isolated across accounts while catalogMetaCache + 50-row chunked seeding handle 3,000 problems smoothly.',
    artifact: 'docs/DATABASE_SCHEMA.md',
  },
  {
    phase: '03 · C++17 & SQLite Sandboxes',
    title: 'Precompiled Headers + Anti-Spoof Markers',
    summary:
      'Pre-built C++17 .gch headers inside Docker to cut compile times, remapped g++ stderr lines back to user code, injected randomized hex stdout delimiters, and locked SQL runs to read-only queries.',
    artifact: 'backend/src/judge/',
  },
  {
    phase: '04 · Honest AI & Study Engine',
    title: 'Static Analysis Before LLM Prompting',
    summary:
      'After spotting broken code receiving generic AI praise, engineered CodeAnalyzerService to evaluate syntax smells, nested loops, stub returns, and failed test assertions before calling Gemini.',
    artifact: 'codeAnalyzer.service.ts',
  },
  {
    phase: '05 · Render Container Persistence',
    title: 'Non-Blocking Boot & /data Colocation',
    summary:
      'Moved compiler warmup and problem seeding asynchronous after app.listen() so /health passes fast, colocated codeprep.db and /uploads onto /data, and enabled 1-click Guest Demo for interviewers.',
    artifact: 'render.yaml + Dockerfile',
  },
];

const TEAM_HAT_PERSPECTIVES = [
  {
    role: 'Product & Requirements',
    focus: 'Balanced 3,000-problem curriculum (2,500 DSA, 400 SQL, 100 OOPs), OOPs & Aptitude hubs, and friction-free Guest Demo access for reviewers.',
    ref: 'docs/REQUIREMENTS.md',
  },
  {
    role: 'Database & Backend Architect',
    focus: '9-model relational Prisma schema, WAL concurrency, startup auto-DDL verification, MAX_USERS = 100 isolation, and JSON export/import snapshots.',
    ref: 'docs/DATABASE_SCHEMA.md',
  },
  {
    role: 'Systems & Judge Engineer',
    focus: 'g++ -O2 -std=c++17 runner, .gch PCH warmup, 1500ms execution queue deduplication, 2000ms timeout guard, and read-only SQLite DDL blocking.',
    ref: 'sandboxRunner.ts + sqlRunner.ts',
  },
  {
    role: 'AI & Learning Experience',
    focus: 'Deterministic AST/heuristic checks paired with live failed-case telemetry in StudyGuideService, 5s server focus heartbeats, and Big-O curve fitting.',
    ref: 'aiTeacher.service.ts',
  },
  {
    role: 'Frontend & UI Systems',
    focus: '6 CSS-variable themes with flash-free <head> initialization, paginated + shuffled 3,000-problem tables, pixel SVG avatars, and streak animations.',
    ref: 'frontend/src/',
  },
  {
    role: 'QA, Security & DevOps',
    focus: 'Magic-byte JPEG/PNG/WEBP image checks (blocking SVG XSS), HttpOnly rotating SHA-256 refresh cookies, rate limiters, and Render /data volume persistence.',
    ref: 'docs/TEAM_PERSPECTIVES_REPORT.md',
  },
];

const DATABASE_MODELS_SUMMARY = [
  { name: 'User', role: 'Credentials (bcrypt 12r), theme preference, timezone, and avatar path.' },
  { name: 'RefreshToken', role: '30-day rolling SHA-256 hashed tokens revocable per session.' },
  { name: 'Problem', role: '3,000 DSA, OOPs (#631–#730), and SQL problems with examples & stubs.' },
  { name: 'UserProblemState', role: 'Composite (problemId, userId) bookmarks, notes, and AI unlock flags.' },
  { name: 'ProblemDraft', role: 'Auto-saved in-progress editor code keyed per user and problem.' },
  { name: 'ProblemActiveTimer', role: 'Server-synced active solve duration updated by 5s tab heartbeats.' },
  { name: 'Submission', role: 'Full run/submit verdict history, runtime, stderr, and failed test case.' },
  { name: 'AiLesson', role: '1:1 structured technique walkthroughs, trace states, and brute-to-optimal guides.' },
  { name: 'UserBadge', role: 'Unlocked streak, milestone, and topic mastery achievements per user.' },
];

const HowIBuiltSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BuildSectionTab>('journey');

  const tabs: Array<{ id: BuildSectionTab; label: string; icon: React.ReactNode }> = [
    { id: 'journey', label: 'How I Built It', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'team', label: 'Team-Hat Reports', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'schema', label: 'Database Design', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'ownership', label: 'Testing & Verification', icon: <GitBranch className="w-3.5 h-3.5" /> },
  ];

  return (
    <section className="rounded-xl bg-surface border border-border-subtle p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-blue-500 font-semibold">
            Engineering Case Study · For Reviewers &amp; Interviewers
          </span>
          <h2 className="text-lg font-semibold text-text-primary mt-1">
            How I Planned, Designed &amp; Engineered CodePrep
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl">
            From database schema design and judge security to scaling 3,000 problems and shipping on Render — inspect the architectural decisions behind this workspace.
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

      {activeTab === 'journey' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {HOW_I_BUILT_STEPS.map((step) => (
            <div
              key={step.phase}
              className="rounded-lg bg-surface-subtle border border-border-subtle p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-emerald-500 font-medium">
                  {step.phase}
                </span>
                <h3 className="text-sm font-semibold text-text-primary">{step.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{step.summary}</p>
              </div>
              <div className="pt-2 border-t border-border-subtle/70 flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>Artifact</span>
                <span className="text-text-secondary">{step.artifact}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {TEAM_HAT_PERSPECTIVES.map((item) => (
            <div
              key={item.role}
              className="rounded-lg bg-surface-subtle border border-border-subtle p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{item.role}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated border border-border-subtle text-text-muted">
                  {item.ref}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{item.focus}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'schema' && (
        <div className="space-y-3">
          <div className="rounded-lg bg-surface-subtle border border-border-subtle p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-text-secondary">
              Embedded <strong className="text-text-primary">SQLite WAL</strong> (<code className="font-mono text-text-primary">file:/data/codeprep.db</code> in production) with runtime auto-DDL verification and Postgres compatibility schema.
            </span>
            <span className="font-mono text-[11px] text-blue-500">9 Prisma Models · 100-User Isolation</span>
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

      {activeTab === 'ownership' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg bg-surface-subtle border border-border-subtle p-4 space-y-2.5">
            <h3 className="text-sm font-semibold text-text-primary">
              What I Planned, Architected &amp; Debugged Myself
            </h3>
            <ul className="space-y-2 text-xs text-text-secondary leading-relaxed list-disc pl-4">
              <li>
                Defined product requirements, navigation structure, 3,000-problem curriculum split (DSA / OOPs / SQL), and Guest Demo mode for interviewers.
              </li>
              <li>
                Designed the 9-table Prisma schema (<code className="font-mono text-text-primary">UserProblemState</code> user isolation, server heartbeats, rolling refresh tokens) and <code className="font-mono text-text-primary">/data</code> persistent disk strategy for Render.
              </li>
              <li>
                Caught real production bugs through testing: Render startup <code className="font-mono text-text-primary">/health</code> timeouts, false <code className="font-mono text-text-primary">O(1)</code> AI praise on broken code (fixed via <code className="font-mono text-text-primary">CodeAnalyzerService</code>), and stale static catalog counters.
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-surface-subtle border border-border-subtle p-4 space-y-2.5">
            <h3 className="text-sm font-semibold text-text-primary">
              End-to-End Verification &amp; Pre-Deploy Testing
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Before deployment, the platform was verified across automated Node.js test suites covering C++ judge boundary markers, line-number remapping, SQL read-only guardrails, and 365-day activity calculations.
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Architectural tradeoffs, security checks (magic-byte file validation, UUID judge delimiters, SQL DDL blocking), and schema details are documented in <span className="font-mono text-text-primary">docs/REQUIREMENTS.md</span>, <span className="font-mono text-text-primary">docs/DATABASE_SCHEMA.md</span>, <span className="font-mono text-text-primary">docs/TEAM_PERSPECTIVES_REPORT.md</span>, and <span className="font-mono text-text-primary">DECISIONS.md</span>.
            </p>
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

      {/* How I Planned & Built CodePrep (Interactive Engineering Case Study) */}
      <HowIBuiltSection />
      </div>
    </AppLayout>
  );
};
