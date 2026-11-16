import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Problem } from '../types/problem';
import { apiRequest } from '../services/api';
import { PaginationBar } from '../components/ui/PaginationBar';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { HighlightedCode } from '../components/ui/CodeHighlight';
import {
  OOPS_STUDY_MODULES,
  OopMcqItem,
  generateOopMcqBatch,
} from '../data/oopsCurriculum';
import {
  BookOpen,
  Code2,
  CheckCircle2,
  XCircle,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  RefreshCw,
  Shuffle,
  Lightbulb,
  ArrowRight,
  Copy,
  Shield,
  Cpu,
  GitBranch,
  Layers,
  Sliders,
  Trophy,
  Flame,
  LayoutGrid,
  Target,
  X,
  Dices,
} from 'lucide-react';

interface OopsPageProps {
  onSelectProblem: (id: number) => void;
  onTabChange: (tab: string) => void;
}

type OopsSectionTab = 'practice' | 'study' | 'mcq';
type McqLayoutMode = 'focus' | 'grid';

const MODULES_DONE_KEY = 'codeprep_oops_modules_done_v1';
const MCQ_STATS_KEY = 'codeprep_oops_mcq_stats_v1';

interface OopPillarMeta {
  topic: string;
  shortTitle: string;
  idRange: string;
  count: number;
  desc: string;
  accentText: string;
  moduleId: string;
  sampleProblems: Array<{ id: number; title: string; difficulty: 'Easy' | 'Medium' | 'Hard' }>;
}

const OOP_PILLAR_ITEMS: OopPillarMeta[] = [
  {
    topic: 'Encapsulation & Class Invariants',
    shortTitle: 'Encapsulation & Invariants',
    idRange: '#631–#650',
    count: 20,
    desc: 'Private state guards & const observers',
    accentText: 'text-emerald-400',
    moduleId: 'encapsulation',
    sampleProblems: [
      { id: 631, title: 'BankAccount Guarded State', difficulty: 'Easy' },
      { id: 635, title: 'PrepaidWallet Atomic Fee Guard', difficulty: 'Medium' },
      { id: 647, title: 'TokenBucketCell Quota Limiter', difficulty: 'Hard' },
    ],
  },
  {
    topic: 'Constructors, RAII & Lifecycles',
    shortTitle: 'RAII, Rule of 5 & Lifecycles',
    idRange: '#651–#670',
    count: 20,
    desc: 'Stack unwinding & move semantics',
    accentText: 'text-sky-400',
    moduleId: 'raii',
    sampleProblems: [
      { id: 651, title: 'ScopedLock Lifecycle Tracker', difficulty: 'Easy' },
      { id: 656, title: 'HeapBuffer Deep Copy vs Move', difficulty: 'Medium' },
      { id: 665, title: 'RefCountedHandle Lease Pool', difficulty: 'Hard' },
    ],
  },
  {
    topic: 'Inheritance & Virtual Polymorphism',
    shortTitle: 'Inheritance & VTables',
    idRange: '#671–#690',
    count: 20,
    desc: 'VPtr dispatch, slicing & virtual bases',
    accentText: 'text-purple-400',
    moduleId: 'polymorphism',
    sampleProblems: [
      { id: 671, title: 'Polymorphic TaxCalculator', difficulty: 'Easy' },
      { id: 676, title: 'PaymentGateway Virtual Router', difficulty: 'Medium' },
      { id: 685, title: 'Multi-Tier SLA Dispatch Pipeline', difficulty: 'Hard' },
    ],
  },
  {
    topic: 'Operator Overloading & Value Types',
    shortTitle: 'Operators & Value Types',
    idRange: '#691–#710',
    count: 20,
    desc: 'Strict weak ordering & algebraic types',
    accentText: 'text-amber-400',
    moduleId: 'operators',
    sampleProblems: [
      { id: 691, title: 'RationalNumber Value Algebra', difficulty: 'Easy' },
      { id: 698, title: 'VersionTag Strict Weak Ordering', difficulty: 'Medium' },
      { id: 706, title: 'Matrix2x2 Operator Ring', difficulty: 'Hard' },
    ],
  },
  {
    topic: 'Design Patterns & SOLID Systems',
    shortTitle: 'GoF Patterns & SOLID LLD',
    idRange: '#711–#730',
    count: 20,
    desc: 'Strategy, Command, State & LRU LLD',
    accentText: 'text-rose-400',
    moduleId: 'patterns',
    sampleProblems: [
      { id: 711, title: 'PricingStrategy Runtime Switch', difficulty: 'Easy' },
      { id: 719, title: 'CommandStack Undo/Redo Engine', difficulty: 'Medium' },
      { id: 727, title: 'LRU Cache O(1) Splice Design', difficulty: 'Hard' },
    ],
  },
];

const MODULE_TO_PILLAR_TOPIC: Record<string, string> = {
  encapsulation: 'Encapsulation & Class Invariants',
  abstraction: 'Inheritance & Virtual Polymorphism',
  inheritance: 'Inheritance & Virtual Polymorphism',
  polymorphism: 'Inheritance & Virtual Polymorphism',
  raii: 'Constructors, RAII & Lifecycles',
  operators: 'Operator Overloading & Value Types',
  solid: 'Design Patterns & SOLID Systems',
  patterns: 'Design Patterns & SOLID Systems',
};

const MODULE_FILENAMES: Record<string, string> = {
  encapsulation: 'bank_account_guard.cpp',
  abstraction: 'payment_rail_interface.cpp',
  inheritance: 'virtual_diamond_device.cpp',
  polymorphism: 'vtable_vs_slicing.cpp',
  raii: 'rule_of_five_buffer.cpp',
  operators: 'strict_weak_ordering.cpp',
  solid: 'dependency_inversion.cpp',
  patterns: 'meyers_singleton_registry.cpp',
};

function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-surface-high/90 border border-border-subtle font-mono text-[11.5px] text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderQuestionContent(question: string): React.ReactNode {
  const fenceRegex = /```(?:cpp|c\+\+)?\n([\s\S]*?)```/g;
  const segments: Array<{ type: 'text' | 'code'; content: string }> = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null = fenceRegex.exec(question);

  while (match !== null) {
    if (match.index > lastIdx) {
      segments.push({
        type: 'text',
        content: question.slice(lastIdx, match.index).trim(),
      });
    }
    segments.push({
      type: 'code',
      content: match[1].trim(),
    });
    lastIdx = match.index + match[0].length;
    match = fenceRegex.exec(question);
  }

  if (lastIdx < question.length) {
    const trailing = question.slice(lastIdx).trim();
    if (trailing) {
      segments.push({ type: 'text', content: trailing });
    }
  }

  return (
    <div className="space-y-3">
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <div
            key={i}
            className="rounded-xl border border-border-subtle overflow-hidden bg-canvas shadow-inner"
          >
            <div className="px-3.5 py-1.5 bg-surface-elevated/80 border-b border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-muted">
              <span className="text-text-secondary">trace_snippet.cpp</span>
              <span className="uppercase tracking-wider text-text-muted">C++17</span>
            </div>
            <div className="p-3.5 text-xs leading-relaxed overflow-x-auto">
              <HighlightedCode code={seg.content} language="cpp" className="text-xs leading-5" />
            </div>
          </div>
        ) : (
          <p key={i} className="text-sm text-text-primary leading-relaxed font-medium">
            {renderInlineCode(seg.content)}
          </p>
        )
      )}
    </div>
  );
}

const ModuleInteractiveSimulator: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  const [simToggle, setSimToggle] = useState<'primary' | 'secondary' | 'tertiary'>('primary');

  useEffect(() => {
    setSimToggle('primary');
  }, [moduleId]);

  if (moduleId === 'polymorphism' || moduleId === 'abstraction') {
    const isDynamic = simToggle === 'primary';
    return (
      <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
              Interactive 64-Bit VTable &amp; Object Slicing Simulator
            </div>
            <div className="text-xs text-text-muted">
              Switch binding semantics to inspect vptr layout and dispatch target
            </div>
          </div>
          <div className="flex items-center gap-1 bg-canvas border border-border-subtle rounded-lg p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setSimToggle('primary')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                isDynamic ? 'bg-success-subtle text-success font-semibold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              const Shape&amp; ref = Triangle()
            </button>
            <button
              type="button"
              onClick={() => setSimToggle('secondary')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                !isDynamic ? 'bg-danger-subtle text-danger font-semibold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Shape s = Triangle()
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1">
            <div className="text-[10px] text-text-muted uppercase">Object Bytes</div>
            {isDynamic ? (
              <div className="space-y-1">
                <div className="px-2 py-1 rounded bg-primary/15 border border-primary/30 text-primary">
                  [0..7] vptr → Triangle::vtable
                </div>
                <div className="px-2 py-1 rounded bg-surface-elevated text-text-secondary">
                  [8..15] Base + Derived fields
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="px-2 py-1 rounded bg-danger-subtle border border-danger/30 text-danger">
                  [0..7] vptr → Shape::vtable
                </div>
                <div className="px-2 py-1 rounded bg-surface-elevated text-text-muted line-through">
                  Triangle::extra_ (SLICED)
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1">
            <div className="text-[10px] text-text-muted uppercase">VTable Lookup</div>
            <div className={isDynamic ? 'text-success font-semibold' : 'text-danger font-semibold'}>
              {isDynamic ? 'Triangle::sides()' : 'Shape::sides()'}
            </div>
            <p className="text-[11px] font-sans text-text-secondary leading-relaxed">
              {isDynamic
                ? 'Reference avoids copying; runtime vptr calls Triangle::sides().'
                : 'Copy constructor builds a Base-only value and resets vptr.'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1">
            <div className="text-[10px] text-text-muted uppercase">Output</div>
            <div className={`text-base font-bold ${isDynamic ? 'text-success' : 'text-danger'}`}>
              sides() == {isDynamic ? '3' : '0 (Bug!)'}
            </div>
            <p className="text-[11px] font-sans text-text-muted">
              {isDynamic ? 'Dynamic dispatch preserved.' : 'Derived override lost.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (moduleId === 'inheritance') {
    const isVirtual = simToggle === 'primary';
    return (
      <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
              Diamond Subobject Memory Layout
            </div>
            <div className="text-xs text-text-muted">
              Compare `virtual public Device` vs standard multiple inheritance
            </div>
          </div>
          <div className="flex items-center gap-1 bg-canvas border border-border-subtle rounded-lg p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setSimToggle('primary')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                isVirtual ? 'bg-success-subtle text-success font-semibold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              virtual public Device
            </button>
            <button
              type="button"
              onClick={() => setSimToggle('secondary')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                !isVirtual ? 'bg-danger-subtle text-danger font-semibold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              non-virtual Device
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5">
            <div className="text-[10px] text-text-muted uppercase">Subobjects Inside AllInOne</div>
            {isVirtual ? (
              <div className="space-y-1 text-[11px]">
                <div className="px-2 py-1 rounded bg-surface-elevated text-text-secondary">
                  Printer (vbptr → Device) + Scanner (vbptr → Device)
                </div>
                <div className="px-2 py-1 rounded bg-success-subtle border border-success/30 text-success">
                  1x Shared Device subobject (constructed by AllInOne)
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-[11px]">
                <div className="px-2 py-1 rounded bg-danger-subtle border border-danger/30 text-danger">
                  Printer::Device (#1) + Scanner::Device (#2)
                </div>
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5">
            <div className="text-[10px] text-text-muted uppercase">Compile Result on `aio.id`</div>
            <div className={isVirtual ? 'text-success font-semibold' : 'text-danger font-semibold'}>
              {isVirtual ? 'Compiles cleanly → accesses single Device::id' : 'error: member "id" is ambiguous'}
            </div>
            <p className="text-[11px] font-sans text-text-secondary leading-relaxed">
              {isVirtual
                ? 'Most-derived class constructs Device once; intermediate calls are skipped.'
                : 'Must disambiguate `aio.Printer::id`; wastes space with duplicate base state.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (moduleId === 'raii') {
    const mode = simToggle;
    const ruleData =
      mode === 'primary'
        ? {
            badge: 'Rule of Zero',
            color: 'text-success',
            summary: 'Compose std::vector, std::string, or unique_ptr; write 0 custom special members.',
            vectorBehavior: 'O(1) automatic noexcept moves when standard containers reallocate.',
          }
        : mode === 'secondary'
          ? {
              badge: 'Rule of Five (noexcept move)',
              color: 'text-sky-400',
              summary: 'Defines ~T(), Copy Ctor/Assign, plus noexcept Move Ctor/Assign stealing ownership in O(1).',
              vectorBehavior: 'std::vector moves elements on growth — zero heap cloning.',
            }
          : {
              badge: 'Missing noexcept Trap',
              color: 'text-danger',
              summary: 'Move constructor lacks `noexcept`: std::vector avoids moving to preserve strong exception safety.',
              vectorBehavior: 'Silently degrades to O(N) deep copies on every vector resize.',
            };
    return (
      <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
            Rule of 0 / 3 / 5 Ownership Lab
          </div>
          <div className="flex items-center gap-1 bg-canvas border border-border-subtle rounded-lg p-0.5 text-[11px] font-mono">
            {[
              { id: 'primary' as const, label: 'Rule of Zero' },
              { id: 'secondary' as const, label: 'Rule of 5 (noexcept)' },
              { id: 'tertiary' as const, label: 'Missing noexcept' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSimToggle(item.id)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  simToggle === item.id
                    ? 'bg-primary text-black font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5">
          <div className={`text-xs font-mono font-bold ${ruleData.color}`}>{ruleData.badge}</div>
          <p className="text-xs text-text-secondary leading-relaxed">{ruleData.summary}</p>
          <div className="text-[11px] font-mono text-text-muted pt-1">
            Reallocation Behavior: <span className={ruleData.color}>{ruleData.vectorBehavior}</span>
          </div>
        </div>
      </div>
    );
  }

  if (moduleId === 'encapsulation') {
    const valid = simToggle === 'primary';
    return (
      <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            Invariant Guard Trace (`balance = 1000`)
          </div>
          <div className="flex items-center gap-1 bg-canvas border border-border-subtle rounded-lg p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setSimToggle('primary')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                valid ? 'bg-success-subtle text-success font-semibold' : 'text-text-muted'
              }`}
            >
              withdraw(400)
            </button>
            <button
              type="button"
              onClick={() => setSimToggle('secondary')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                !valid ? 'bg-danger-subtle text-danger font-semibold' : 'text-text-muted'
              }`}
            >
              withdraw(1500)
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-canvas border border-border-subtle">
            <div className="text-[10px] text-text-muted">1. Precondition</div>
            <div className={valid ? 'text-success font-semibold' : 'text-danger font-semibold'}>
              {valid ? '400 <= 1000 ✓' : '1500 > 1000 ✗'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-canvas border border-border-subtle">
            <div className="text-[10px] text-text-muted">2. State Write</div>
            <div className="text-text-primary">
              {valid ? 'balanceCents_ -= 400' : 'Aborted atomically'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-canvas border border-border-subtle">
            <div className="text-[10px] text-text-muted">3. Return</div>
            <div className="text-text-primary font-semibold">
              {valid ? 'true · bal = 600' : 'false · bal = 1000'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-2.5">
      <div className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider">
        {moduleId === 'operators'
          ? 'Strict Weak Ordering Axioms (std::sort / std::set)'
          : moduleId === 'solid'
            ? 'Dependency Inversion & Liskov Flow'
            : 'Low-Level Design Pattern Quick Matrix'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        {moduleId === 'operators' ? (
          <>
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <div className="font-mono font-bold text-success mb-1">1. Irreflexive</div>
              <div className="text-text-secondary text-[11px]">
                <code className="font-mono">comp(a, a) == false</code>; <code className="font-mono">&lt;=</code> triggers UB.
              </div>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <div className="font-mono font-bold text-warning mb-1">2. Asymmetric</div>
              <div className="text-text-secondary text-[11px]">
                If <code className="font-mono">a &lt; b</code> holds, <code className="font-mono">b &lt; a</code> is false.
              </div>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <div className="font-mono font-bold text-sky-400 mb-1">3. std::tie Idiom</div>
              <div className="text-text-secondary text-[11px]">
                <code className="font-mono">std::tie(a.p, a.id) &lt; std::tie(b.p, b.id)</code>
              </div>
            </div>
          </>
        ) : moduleId === 'solid' ? (
          <>
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <div className="font-mono font-bold text-text-primary mb-1">High-Level Service</div>
              <div className="text-text-secondary text-[11px]">
                Depends on <code className="font-mono text-primary">INotifier&amp;</code> abstraction.
              </div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="font-mono font-bold text-primary mb-1">Pure Interface</div>
              <div className="text-text-secondary text-[11px]">
                Narrow role contract (<code className="font-mono">= 0</code>).
              </div>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <div className="font-mono font-bold text-success mb-1">Adapters</div>
              <div className="text-text-secondary text-[11px]">
                Swappable Email / SMS / Mock classes.
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <div className="font-mono font-bold text-success mb-1">Strategy / State</div>
              <div className="text-text-secondary text-[11px]">Swap behavior dynamically via composition.</div>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <div className="font-mono font-bold text-sky-400 mb-1">Observer / Command</div>
              <div className="text-text-secondary text-[11px]">Pub-sub listeners &amp; undo stacks.</div>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-border-subtle">
              <div className="font-mono font-bold text-purple-400 mb-1">Meyers Singleton</div>
              <div className="text-text-secondary text-[11px]">Thread-safe local <code className="font-mono">static</code> init.</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const OopsPage: React.FC<OopsPageProps> = ({ onSelectProblem, onTabChange }) => {
  const [activeTab, setActiveTab] = useState<OopsSectionTab>('practice');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(OOPS_STUDY_MODULES[0].id);
  const [copiedModuleId, setCopiedModuleId] = useState<string | null>(null);

  const [completedModules, setCompletedModules] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(MODULES_DONE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [oopTotal, setOopTotal] = useState(100);
  const [oopSolved, setOopSolved] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(100);
  const [difficultyTotals, setDifficultyTotals] = useState({ Easy: 35, Medium: 45, Hard: 20 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Pillars');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(1);
  const PAGE_SIZE = 25;

  const [mcqBatch, setMcqBatch] = useState<OopMcqItem[]>(() => generateOopMcqBatch(20));
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [mcqLayout, setMcqLayout] = useState<McqLayoutMode>('focus');
  const [activeMcqIdx, setActiveMcqIdx] = useState(0);
  const [mcqDifficultyFilter, setMcqDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [mcqScore, setMcqScore] = useState<{ attempted: number; correct: number; streak: number }>(() => {
    try {
      const saved = localStorage.getItem(MCQ_STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { attempted: 0, correct: 0, streak: 0 };
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== searchQuery) {
          setCurrentPage(1);
        }
        return searchQuery;
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchOopProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('category', 'OOP');
      params.set('page', String(currentPage));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('includeMeta', '1');
      if (selectedTopic !== 'All Pillars') params.set('topic', selectedTopic);
      if (selectedDifficulty !== 'All') params.set('difficulty', selectedDifficulty);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (isShuffled) params.set('shuffleSeed', String(shuffleSeed));

      const res = await apiRequest<{
        problems: Problem[];
        pagination?: { total: number };
        meta?: {
          oopTotal?: number;
          oopSolved?: number;
          difficultyTotals?: { Easy: number; Medium: number; Hard: number };
        };
      }>(`/problems?${params.toString()}`);

      setProblems(res.problems || []);
      setFilteredTotal(res.pagination?.total ?? (res.problems?.length || 0));
      if (res.meta) {
        if (typeof res.meta.oopTotal === 'number') setOopTotal(res.meta.oopTotal);
        if (typeof res.meta.oopSolved === 'number') setOopSolved(res.meta.oopSolved);
        if (res.meta.difficultyTotals) setDifficultyTotals(res.meta.difficultyTotals);
      }
    } catch {
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    selectedTopic,
    selectedDifficulty,
    statusFilter,
    debouncedSearch,
    isShuffled,
    shuffleSeed,
  ]);

  useEffect(() => {
    void fetchOopProblems();
    const onProgress = () => void fetchOopProblems();
    window.addEventListener('codeprep:progress-updated', onProgress);
    return () => window.removeEventListener('codeprep:progress-updated', onProgress);
  }, [fetchOopProblems]);

  const activeModuleIdx = useMemo(
    () => Math.max(0, OOPS_STUDY_MODULES.findIndex((m) => m.id === selectedModuleId)),
    [selectedModuleId]
  );
  const activeModule = OOPS_STUDY_MODULES[activeModuleIdx] || OOPS_STUDY_MODULES[0];
  const oopPct = oopTotal > 0 ? Math.round((oopSolved / oopTotal) * 100) : 0;
  const mcqAccuracy =
    mcqScore.attempted > 0 ? Math.round((mcqScore.correct / mcqScore.attempted) * 100) : 0;

  const filteredMcqs = useMemo(() => {
    if (mcqDifficultyFilter === 'All') return mcqBatch;
    return mcqBatch.filter((q) => q.difficulty === mcqDifficultyFilter);
  }, [mcqBatch, mcqDifficultyFilter]);

  const currentMcqItem = filteredMcqs[activeMcqIdx] || filteredMcqs[0];

  const toggleModuleCompleted = (id: string) => {
    setCompletedModules((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(MODULES_DONE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleCopyCode = async (moduleId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedModuleId(moduleId);
      window.setTimeout(() => setCopiedModuleId(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleAnswerMcq = useCallback(
    (item: OopMcqItem, optIdx: number) => {
      if (selectedAnswers[item.id] !== undefined) return;
      const isRight = optIdx === item.correctIndex;
      setSelectedAnswers((prev) => ({ ...prev, [item.id]: optIdx }));
      setMcqScore((prev) => {
        const next = {
          attempted: prev.attempted + 1,
          correct: prev.correct + (isRight ? 1 : 0),
          streak: isRight ? prev.streak + 1 : 0,
        };
        try {
          localStorage.setItem(MCQ_STATS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [selectedAnswers]
  );

  useEffect(() => {
    if (activeTab !== 'mcq' || mcqLayout !== 'focus' || !currentMcqItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') {
        handleAnswerMcq(currentMcqItem, 0);
      } else if (key === '2' || key === 'b') {
        handleAnswerMcq(currentMcqItem, 1);
      } else if (key === '3' || key === 'c') {
        handleAnswerMcq(currentMcqItem, 2);
      } else if (key === '4' || key === 'd') {
        handleAnswerMcq(currentMcqItem, 3);
      } else if (e.key === 'ArrowRight' || key === 'n') {
        setActiveMcqIdx((i) => Math.min(filteredMcqs.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || key === 'p') {
        setActiveMcqIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, mcqLayout, currentMcqItem, filteredMcqs.length, handleAnswerMcq]);

  const handleRefreshMcqs = () => {
    setMcqBatch(generateOopMcqBatch(20));
    setSelectedAnswers({});
    setActiveMcqIdx(0);
  };

  const handlePickRandomOopProblem = () => {
    const unsolved = problems.find((p) => !p.isSolved);
    if (unsolved) {
      onSelectProblem(unsolved.id);
      return;
    }
    const randomId = 631 + Math.floor(Math.random() * 100);
    onSelectProblem(randomId);
  };

  const hasActiveCodingFilters =
    selectedTopic !== 'All Pillars' ||
    selectedDifficulty !== 'All' ||
    statusFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    isShuffled;

  const resetCodingFilters = () => {
    setSelectedTopic('All Pillars');
    setSelectedDifficulty('All');
    setStatusFilter('all');
    setSearchQuery('');
    setDebouncedSearch('');
    setIsShuffled(false);
    setCurrentPage(1);
  };

  const getPillarIcon = (topic: string) => {
    if (topic.includes('Encapsulation')) return <Shield className="w-4 h-4 text-emerald-400" />;
    if (topic.includes('RAII')) return <Cpu className="w-4 h-4 text-sky-400" />;
    if (topic.includes('Inheritance')) return <GitBranch className="w-4 h-4 text-purple-400" />;
    if (topic.includes('Operator')) return <Sliders className="w-4 h-4 text-amber-400" />;
    return <Layers className="w-4 h-4 text-rose-400" />;
  };

  return (
    <AppLayout currentTab="oops" onTabChange={onTabChange}>
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Clean Header + Section Switcher */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-bold text-2xl text-text-primary tracking-tight">
                C++17 OOPs &amp; Design Lab
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-xs font-mono text-text-secondary">
                {oopSolved}/{oopTotal} Solved
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl">
              Master 100 executable C++17 class challenges (#631–#730), interactive VTable &amp; RAII memory simulators, and placement output quizzes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface border border-border-subtle">
              <button
                type="button"
                onClick={() => setActiveTab('practice')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  activeTab === 'practice'
                    ? 'bg-primary text-black'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Coding Lab</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('study')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  activeTab === 'study'
                    ? 'bg-primary text-black'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Memory Blueprints</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mcq')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  activeTab === 'mcq'
                    ? 'bg-primary text-black'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Quiz Arena</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePickRandomOopProblem}
              className="px-3.5 py-2 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Practice Next</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: 2-COLUMN OOPs CODING STUDIO (#631-#730)                        */}
        {/* ===================================================================== */}
        {activeTab === 'practice' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT CURRICULUM RAIL */}
            <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-16">
              {/* Lab Mastery Telemetry */}
              <div className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted uppercase tracking-wider font-semibold">
                    Lab Progress
                  </span>
                  <span className="text-text-primary font-bold">
                    {oopSolved}/{oopTotal} ({oopPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(oopPct, oopSolved > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[11px] font-mono">
                  <div className="py-1.5 rounded-lg bg-surface-subtle border border-border-subtle">
                    <div className="text-success font-semibold">{difficultyTotals.Easy}</div>
                    <div className="text-[10px] text-text-muted">Easy</div>
                  </div>
                  <div className="py-1.5 rounded-lg bg-surface-subtle border border-border-subtle">
                    <div className="text-warning font-semibold">{difficultyTotals.Medium}</div>
                    <div className="text-[10px] text-text-muted">Med</div>
                  </div>
                  <div className="py-1.5 rounded-lg bg-surface-subtle border border-border-subtle">
                    <div className="text-danger font-semibold">{difficultyTotals.Hard}</div>
                    <div className="text-[10px] text-text-muted">Hard</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>
                    Guides <strong className="text-text-primary">{completedModules.length}/{OOPS_STUDY_MODULES.length}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    Quiz <strong className="text-text-primary">{mcqAccuracy}%</strong>
                  </span>
                </div>
              </div>

              {/* 5 OOP Pillars Filter Rail */}
              <div className="bg-surface border border-border-subtle rounded-2xl p-3 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold flex items-center justify-between">
                  <span>OOP Pillars</span>
                  {selectedTopic !== 'All Pillars' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopic('All Pillars');
                        setCurrentPage(1);
                      }}
                      className="text-primary hover:underline"
                    >
                      All
                    </button>
                  )}
                </div>

                {OOP_PILLAR_ITEMS.map((pillar) => {
                  const isSelected = selectedTopic === pillar.topic;
                  return (
                    <div
                      key={pillar.topic}
                      onClick={() => {
                        setSelectedTopic((prev) =>
                          prev === pillar.topic ? 'All Pillars' : pillar.topic
                        );
                        setCurrentPage(1);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTopic((prev) =>
                            prev === pillar.topic ? 'All Pillars' : pillar.topic
                          );
                          setCurrentPage(1);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer space-y-1 ${
                        isSelected
                          ? 'bg-surface-elevated border-primary/45'
                          : 'border-transparent hover:bg-surface-elevated/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          {getPillarIcon(pillar.topic)}
                          <span className={pillar.accentText}>{pillar.idRange}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModuleId(pillar.moduleId);
                            setActiveTab('study');
                          }}
                          className="text-sky-400 hover:underline"
                        >
                          Guide →
                        </button>
                      </div>
                      <div className="text-xs font-semibold text-text-primary leading-snug">
                        {pillar.shortTitle}
                      </div>
                      <div className="text-[10px] text-text-muted truncate">{pillar.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Timed Mock Shortcut */}
              <button
                type="button"
                onClick={() => onTabChange('aptitude')}
                className="w-full p-3.5 rounded-2xl bg-surface-elevated hover:bg-surface-high border border-border-default text-left transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text-primary">Aptitude + OOPs Mock</div>
                  <div className="text-[11px] text-text-muted truncate">
                    Timed C++ output &amp; CS drills
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              </button>
            </aside>

            {/* RIGHT CLASS CHALLENGE CATALOG */}
            <main className="lg:col-span-9 space-y-4 min-w-0">
              <div className="bg-surface border border-border-subtle rounded-2xl p-3 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search OOP challenges by #id (631-730), class name, or pattern..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 bg-canvas border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDebouncedSearch('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-0.5 bg-canvas border border-border-subtle rounded-xl p-0.5 text-xs">
                    {(['all', 'solved', 'unsolved'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setStatusFilter(status);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                          statusFilter === status
                            ? 'bg-primary text-black font-semibold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-0.5 bg-canvas border border-border-subtle rounded-xl p-0.5 text-xs">
                    {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => {
                          setSelectedDifficulty(diff);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-colors ${
                          selectedDifficulty === diff
                            ? 'bg-primary text-black font-semibold'
                            : diff === 'Easy'
                              ? 'text-success hover:bg-surface-elevated'
                              : diff === 'Medium'
                                ? 'text-warning hover:bg-surface-elevated'
                                : diff === 'Hard'
                                  ? 'text-danger hover:bg-surface-elevated'
                                  : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {diff === 'Medium' ? 'Med' : diff}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isShuffled) {
                        setIsShuffled(false);
                        setCurrentPage(1);
                        return;
                      }
                      setIsShuffled(true);
                      setShuffleSeed(Math.floor(Math.random() * 1_000_000) + 1);
                      setCurrentPage(1);
                    }}
                    aria-pressed={isShuffled}
                    className={`px-3 py-1.5 border rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                      isShuffled
                        ? 'bg-primary-subtle border-primary/45 text-primary font-semibold'
                        : 'bg-canvas border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Shuffle className="w-3.5 h-3.5 text-primary" />
                    <span>{isShuffled ? 'Shuffled' : 'Shuffle'}</span>
                  </button>

                  {hasActiveCodingFilters && (
                    <button
                      type="button"
                      onClick={resetCodingFilters}
                      className="px-2.5 py-1.5 bg-danger-subtle border border-danger/30 rounded-xl text-xs text-danger font-mono flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset ({filteredTotal})</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-subtle text-text-muted font-mono text-[11px] uppercase tracking-wider border-b border-border-subtle">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">Done</th>
                        <th className="py-3 px-4 w-16">ID</th>
                        <th className="py-3 px-4">Class Challenge &amp; Pattern</th>
                        <th className="py-3 px-4 w-56 hidden md:table-cell">OOP Pillar</th>
                        <th className="py-3 px-4 w-24">Level</th>
                        <th className="py-3 px-4 w-20 text-right">Open</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="py-10">
                            <CodePrepLoader
                              variant="section"
                              className="min-h-[160px]"
                              label="Loading OOPs C++17 Challenges"
                              sublabel="Fetching paginated class-design problems..."
                            />
                          </td>
                        </tr>
                      ) : problems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-14 text-center space-y-3">
                            <div className="text-sm text-text-secondary font-medium">
                              No OOP coding challenges match your current filter.
                            </div>
                            <button
                              type="button"
                              onClick={resetCodingFilters}
                              className="px-3.5 py-1.5 rounded-lg bg-primary text-black text-xs font-semibold"
                            >
                              Reset Filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        problems.map((prob, idx) => (
                          <tr
                            key={prob.id}
                            onClick={() => onSelectProblem(prob.id)}
                            className={`hover:bg-surface-high/60 transition-colors cursor-pointer group ${
                              idx % 2 === 0 ? 'bg-surface' : 'bg-surface-subtle/40'
                            }`}
                          >
                            <td className="py-3 px-4 text-center">
                              {prob.isSolved ? (
                                <Check className="w-4 h-4 text-success mx-auto stroke-[2.5]" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30 mx-auto group-hover:bg-primary/60 transition-colors" />
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-text-muted font-semibold">
                              #{prob.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-xs sm:text-[13px] text-text-primary group-hover:text-primary transition-colors">
                                  {prob.title}
                                </span>
                                {prob.pattern && (
                                  <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle text-[10px] font-mono text-text-muted">
                                    {prob.pattern}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <span className="inline-flex items-center gap-1.5 text-text-secondary">
                                {getPillarIcon(prob.topic)}
                                <span className="truncate">{prob.topic}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] font-semibold">
                              {prob.difficulty === 'Easy' && <span className="text-success">Easy</span>}
                              {prob.difficulty === 'Medium' && <span className="text-warning">Med</span>}
                              {prob.difficulty === 'Hard' && <span className="text-danger">Hard</span>}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <ChevronRight className="w-4 h-4 text-primary opacity-55 group-hover:opacity-100 inline-block transition-opacity" />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  currentPage={currentPage}
                  totalItems={filteredTotal}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  itemLabel="OOP problems"
                />
              </div>
            </main>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: MEMORY & LLD BLUEPRINTS (8 MODULES + INTERACTIVE SIMULATORS)   */}
        {/* ===================================================================== */}
        {activeTab === 'study' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <aside className="lg:col-span-4 bg-surface border border-border-subtle rounded-2xl p-4 space-y-2.5 lg:sticky lg:top-16">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-border-subtle">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                    C++17 Syllabus
                  </div>
                  <div className="text-sm font-bold text-text-primary">
                    8 Engineering Blueprints
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400 font-mono text-xs font-semibold">
                  {completedModules.length}/{OOPS_STUDY_MODULES.length} Done
                </span>
              </div>

              <div className="space-y-1.5">
                {OOPS_STUDY_MODULES.map((mod, idx) => {
                  const isSelected = mod.id === activeModule.id;
                  const isDone = completedModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setSelectedModuleId(mod.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-surface-elevated border-primary/50 ring-1 ring-primary/25'
                          : 'bg-surface-subtle/40 border-border-subtle hover:border-border-hover hover:bg-surface-elevated/60'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isDone
                            ? 'bg-success-subtle text-success border border-success/30'
                            : isSelected
                              ? 'bg-primary text-black'
                              : 'bg-surface-high text-text-muted'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : `0${idx + 1}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-0.5">
                          <span className={isSelected ? 'text-primary font-semibold' : 'text-text-muted'}>
                            {mod.pillar}
                          </span>
                          <span className="text-text-muted shrink-0">{mod.readTime}</span>
                        </div>
                        <div className="text-xs font-semibold text-text-primary leading-snug">
                          {mod.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border-subtle pb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary text-xs font-mono font-semibold">
                      Module 0{activeModuleIdx + 1} • {activeModule.pillar}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-xs font-mono text-text-muted">
                      {activeModule.readTime}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-text-primary tracking-tight">
                    {activeModule.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {activeModule.summary}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleModuleCompleted(activeModule.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                      completedModules.includes(activeModule.id)
                        ? 'bg-success-subtle border-success/40 text-success'
                        : 'bg-surface-elevated hover:bg-surface-high border-border-default text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {completedModules.includes(activeModule.id) ? 'Completed' : 'Mark Read'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const targetTopic =
                        MODULE_TO_PILLAR_TOPIC[activeModule.id] || 'All Pillars';
                      setSelectedTopic(targetTopic);
                      setCurrentPage(1);
                      setActiveTab('practice');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Practice Pillar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <ModuleInteractiveSimulator moduleId={activeModule.id} />

              <div className="space-y-2.5">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Core Engineering Invariants
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {activeModule.keyRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-xs sm:text-sm text-text-secondary bg-surface-elevated/60 border border-border-subtle rounded-xl p-3"
                    >
                      <span className="w-5 h-5 rounded-md bg-success-subtle text-success font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed text-text-primary/90">
                        {renderInlineCode(rule)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  C++17 Reference Pattern
                </h3>
                <div className="rounded-xl border border-border-subtle overflow-hidden bg-canvas">
                  <div className="px-4 py-2 bg-surface-elevated border-b border-border-subtle flex items-center justify-between text-xs font-mono">
                    <span className="text-text-secondary font-medium">
                      {MODULE_FILENAMES[activeModule.id] || 'pattern.cpp'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyCode(activeModule.id, activeModule.codeExample)}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-high border border-border-subtle text-[11px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors"
                    >
                      {copiedModuleId === activeModule.id ? (
                        <>
                          <Check className="w-3 h-3 text-success" />
                          <span className="text-success">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 overflow-x-auto bg-canvas/80">
                    <HighlightedCode
                      code={activeModule.codeExample}
                      language="cpp"
                      className="text-xs sm:text-[13px] leading-6"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-warning-subtle/35 border border-warning/35 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs sm:text-sm">
                  <div className="font-mono text-[11px] font-bold text-warning uppercase tracking-wider">
                    Interview Red Flag
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    {renderInlineCode(activeModule.interviewTrap)}
                  </p>
                </div>
              </div>

              {(() => {
                const targetTopic =
                  MODULE_TO_PILLAR_TOPIC[activeModule.id] || 'Encapsulation & Class Invariants';
                const pillarMeta =
                  OOP_PILLAR_ITEMS.find((p) => p.topic === targetTopic) || OOP_PILLAR_ITEMS[0];
                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                        Recommended Challenges ({pillarMeta.idRange})
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTopic(pillarMeta.topic);
                          setCurrentPage(1);
                          setActiveTab('practice');
                        }}
                        className="text-xs font-mono text-primary hover:underline"
                      >
                        Browse all 20 →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {pillarMeta.sampleProblems.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => onSelectProblem(sp.id)}
                          className="p-3 rounded-xl bg-surface-elevated/70 hover:bg-surface-high border border-border-subtle hover:border-primary/40 text-left transition-all group space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-text-muted">#{sp.id}</span>
                            <span
                              className={
                                sp.difficulty === 'Easy'
                                  ? 'text-success'
                                  : sp.difficulty === 'Medium'
                                    ? 'text-warning'
                                    : 'text-danger'
                              }
                            >
                              {sp.difficulty}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors">
                            {sp.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={activeModuleIdx === 0}
                  onClick={() =>
                    setSelectedModuleId(OOPS_STUDY_MODULES[Math.max(0, activeModuleIdx - 1)].id)
                  }
                  className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high disabled:opacity-40 border border-border-subtle text-xs font-mono text-text-primary inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-mono text-text-muted">
                  Module {activeModuleIdx + 1} / {OOPS_STUDY_MODULES.length}
                </span>

                <button
                  type="button"
                  disabled={activeModuleIdx === OOPS_STUDY_MODULES.length - 1}
                  onClick={() => {
                    if (!completedModules.includes(activeModule.id)) {
                      toggleModuleCompleted(activeModule.id);
                    }
                    setSelectedModuleId(
                      OOPS_STUDY_MODULES[
                        Math.min(OOPS_STUDY_MODULES.length - 1, activeModuleIdx + 1)
                      ].id
                    );
                  }}
                  className="px-3.5 py-2 rounded-xl bg-primary text-black disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>Complete &amp; Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: VTABLE & C++17 OUTPUT MCQ ARENA                                */}
        {/* ===================================================================== */}
        {activeTab === 'mcq' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    C++17 &amp; OOPs Output Trace Arena
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary font-mono text-xs font-semibold">
                    {Object.keys(selectedAnswers).length} / {filteredMcqs.length} Answered
                  </span>
                </div>
                <p className="text-xs text-text-muted font-mono">
                  Accuracy {mcqAccuracy}% ({mcqScore.correct}/{mcqScore.attempted}) • Streak {mcqScore.streak} • Shortcuts: 1–4 or A–D, Arrows
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-canvas border border-border-subtle rounded-xl p-1 text-xs">
                  {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => {
                        setMcqDifficultyFilter(diff);
                        setActiveMcqIdx(0);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        mcqDifficultyFilter === diff
                          ? 'bg-primary text-black font-semibold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-canvas border border-border-subtle rounded-xl p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setMcqLayout('focus')}
                    className={`px-3 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors ${
                      mcqLayout === 'focus'
                        ? 'bg-primary text-black font-semibold'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Focus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcqLayout('grid')}
                    className={`px-3 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors ${
                      mcqLayout === 'grid'
                        ? 'bg-primary text-black font-semibold'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>All 20</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshMcqs}
                  className="px-3.5 py-2 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-95 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>New 20 Batch</span>
                </button>
              </div>
            </div>

            {mcqLayout === 'focus' && currentMcqItem && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary-subtle text-primary font-mono text-xs font-bold">
                        Q{activeMcqIdx + 1} of {filteredMcqs.length}
                      </span>
                      <span className="text-xs font-mono font-semibold text-text-primary">
                        {currentMcqItem.subtopic}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-muted">
                        {currentMcqItem.askedIn}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                          currentMcqItem.difficulty === 'Easy'
                            ? 'bg-success-subtle text-success'
                            : currentMcqItem.difficulty === 'Hard'
                              ? 'bg-danger-subtle text-danger'
                              : 'bg-warning-subtle text-warning'
                        }`}
                      >
                        {currentMcqItem.difficulty}
                      </span>
                    </div>
                  </div>

                  {renderQuestionContent(currentMcqItem.question)}

                  <div className="space-y-2.5 pt-1">
                    {currentMcqItem.options.map((opt, idx) => {
                      const chosen = selectedAnswers[currentMcqItem.id];
                      const isAnswered = chosen !== undefined;
                      const isSelected = chosen === idx;
                      const isCorrectOpt = idx === currentMcqItem.correctIndex;
                      const letter = String.fromCharCode(65 + idx);

                      let style =
                        'bg-surface-elevated/80 border-border-subtle hover:border-primary/50 text-text-primary';
                      let badgeStyle = 'bg-surface-high text-text-secondary';

                      if (isAnswered) {
                        if (isCorrectOpt) {
                          style =
                            'bg-success-subtle border-success/50 text-text-primary font-medium';
                          badgeStyle = 'bg-success text-black font-bold';
                        } else if (isSelected) {
                          style = 'bg-danger-subtle border-danger/50 text-text-primary';
                          badgeStyle = 'bg-danger text-white font-bold';
                        } else {
                          style =
                            'bg-surface-elevated/40 border-border-subtle text-text-muted opacity-65';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => handleAnswerMcq(currentMcqItem, idx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${style}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg font-mono text-xs flex items-center justify-center shrink-0 ${badgeStyle}`}
                            >
                              {letter}
                            </span>
                            <span className="leading-relaxed">{renderInlineCode(opt)}</span>
                          </div>
                          {isAnswered && isCorrectOpt && (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          )}
                          {isAnswered && isSelected && !isCorrectOpt && (
                            <XCircle className="w-4 h-4 text-danger shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedAnswers[currentMcqItem.id] !== undefined && (
                    <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-2 text-xs sm:text-sm">
                      <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-primary">
                        Memory &amp; Language Rule
                      </div>
                      <p className="text-text-secondary leading-relaxed">
                        {renderInlineCode(currentMcqItem.explanation)}
                      </p>
                      <div className="pt-1 flex items-start gap-2 text-primary font-mono text-xs">
                        <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Shortcut: {renderInlineCode(currentMcqItem.shortcutTip)}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                    <button
                      type="button"
                      disabled={activeMcqIdx === 0}
                      onClick={() => setActiveMcqIdx((i) => Math.max(0, i - 1))}
                      className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high disabled:opacity-40 border border-border-subtle text-xs font-mono text-text-primary inline-flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      disabled={activeMcqIdx >= filteredMcqs.length - 1}
                      onClick={() =>
                        setActiveMcqIdx((i) => Math.min(filteredMcqs.length - 1, i + 1))
                      }
                      className="px-4 py-2 rounded-xl bg-primary text-black disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <aside className="lg:col-span-4 bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                      Question Navigator
                    </span>
                    <span className="text-xs font-mono text-text-secondary">
                      {Object.keys(selectedAnswers).length}/{filteredMcqs.length} Answered
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {filteredMcqs.map((q, idx) => {
                      const ans = selectedAnswers[q.id];
                      const isCurrent = idx === activeMcqIdx;
                      const isAnswered = ans !== undefined;
                      const isRight = isAnswered && ans === q.correctIndex;

                      let btnClass =
                        'bg-surface-elevated border-border-subtle text-text-secondary hover:text-text-primary';
                      if (isAnswered) {
                        btnClass = isRight
                          ? 'bg-success-subtle border-success/50 text-success font-bold'
                          : 'bg-danger-subtle border-danger/50 text-danger font-bold';
                      }
                      if (isCurrent) {
                        btnClass += ' ring-2 ring-primary border-primary';
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setActiveMcqIdx(idx)}
                          className={`h-10 rounded-xl border font-mono text-xs transition-all flex items-center justify-center ${btnClass}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-border-subtle space-y-2 text-xs text-text-muted">
                    <div className="flex items-center justify-between">
                      <span>Correct Answers</span>
                      <span className="font-mono text-success font-semibold">
                        {mcqScore.correct}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Attempted</span>
                      <span className="font-mono text-text-primary font-semibold">
                        {mcqScore.attempted}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Streak</span>
                      <span className="font-mono text-amber-400 font-semibold inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        {mcqScore.streak}
                      </span>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {mcqLayout === 'grid' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {filteredMcqs.map((item, qIdx) => {
                  const chosen = selectedAnswers[item.id];
                  const isAnswered = chosen !== undefined;
                  return (
                    <div
                      key={item.id}
                      className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-primary font-semibold">
                          Q{qIdx + 1} • {item.subtopic}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            item.difficulty === 'Easy'
                              ? 'bg-success-subtle text-success'
                              : item.difficulty === 'Hard'
                                ? 'bg-danger-subtle text-danger'
                                : 'bg-warning-subtle text-warning'
                          }`}
                        >
                          {item.difficulty}
                        </span>
                      </div>

                      {renderQuestionContent(item.question)}

                      <div className="space-y-2 pt-1">
                        {item.options.map((opt, idx) => {
                          const isSelected = chosen === idx;
                          const isCorrectOpt = idx === item.correctIndex;
                          const letter = String.fromCharCode(65 + idx);
                          let style =
                            'bg-surface-elevated border-border-subtle hover:border-primary/40 text-text-secondary';
                          if (isAnswered) {
                            if (isCorrectOpt) {
                              style =
                                'bg-success-subtle border-success/50 text-text-primary font-medium';
                            } else if (isSelected) {
                              style = 'bg-danger-subtle border-danger/50 text-text-primary';
                            } else {
                              style =
                                'bg-surface-elevated/40 border-border-subtle text-text-muted opacity-70';
                            }
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={isAnswered}
                              onClick={() => handleAnswerMcq(item, idx)}
                              className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${style}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-bold text-text-muted">
                                  {letter}.
                                </span>
                                <span>{renderInlineCode(opt)}</span>
                              </div>
                              {isAnswered && isCorrectOpt && (
                                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                              )}
                              {isAnswered && isSelected && !isCorrectOpt && (
                                <XCircle className="w-4 h-4 text-danger shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {isAnswered && (
                        <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-1.5 text-xs mt-2">
                          <p className="text-text-secondary leading-relaxed">
                            {renderInlineCode(item.explanation)}
                          </p>
                          <div className="flex items-start gap-1.5 text-primary font-mono text-[11px]">
                            <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Tip: {renderInlineCode(item.shortcutTip)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
