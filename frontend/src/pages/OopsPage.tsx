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
  accentBg: string;
  accentBorder: string;
  moduleId: string;
  sampleProblems: Array<{ id: number; title: string; difficulty: 'Easy' | 'Medium' | 'Hard' }>;
}

const OOP_PILLAR_CARDS: OopPillarMeta[] = [
  {
    topic: 'Encapsulation & Class Invariants',
    shortTitle: 'Encapsulation & Invariants',
    idRange: '#631–#650',
    count: 20,
    desc: 'Private state guards, atomic mutators, fee/quota clamping & const observer contracts.',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/30',
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
    desc: 'Deterministic stack unwinding, deep vs move semantics, refcounted leases & scope guards.',
    accentText: 'text-sky-400',
    accentBg: 'bg-sky-500/10',
    accentBorder: 'border-sky-500/30',
    moduleId: 'raii',
    sampleProblems: [
      { id: 651, title: 'ScopedLock Lifecycle Tracker', difficulty: 'Easy' },
      { id: 656, title: 'HeapBuffer Deep Copy vs Move', difficulty: 'Medium' },
      { id: 665, title: 'RefCountedHandle Lease Pool', difficulty: 'Hard' },
    ],
  },
  {
    topic: 'Inheritance & Virtual Polymorphism',
    shortTitle: 'Inheritance & VTable Dispatch',
    idRange: '#671–#690',
    count: 20,
    desc: 'Dynamic vptr/vtable dispatch, pure virtual interfaces, object slicing & diamond resolution.',
    accentText: 'text-purple-400',
    accentBg: 'bg-purple-500/10',
    accentBorder: 'border-purple-500/30',
    moduleId: 'polymorphism',
    sampleProblems: [
      { id: 671, title: 'Polymorphic TaxCalculator', difficulty: 'Easy' },
      { id: 676, title: 'PaymentGateway Virtual Router', difficulty: 'Medium' },
      { id: 685, title: 'Multi-Tier SLA Dispatch Pipeline', difficulty: 'Hard' },
    ],
  },
  {
    topic: 'Operator Overloading & Value Types',
    shortTitle: 'Operators & Value Semantics',
    idRange: '#691–#710',
    count: 20,
    desc: 'Algebraic value types, strict weak ordering (operator<), custom functors & vector math.',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30',
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
    desc: 'Strategy, Observer, Command Undo/Redo, State Machine & O(1) LRU Cache low-level design.',
    accentText: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/30',
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

/**
 * Renders inline backtick spans (`code`) as styled monospace pills.
 */
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

/**
 * Splits a question string containing optional ```cpp ... ``` fenced blocks
 * into formatted prose + syntax-highlighted C++17 code cards.
 */
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

/**
 * Interactive Visual Memory / Architecture Blueprint per Study Module
 */
const ModuleArchitectureBlueprint: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  switch (moduleId) {
    case 'encapsulation':
      return (
        <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 font-semibold uppercase tracking-wider">
              Memory Boundary • Class Invariant Guard
            </span>
            <span className="text-text-muted">0 &lt;= balanceCents_ &lt;= CAP</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-surface border border-border-subtle space-y-1">
              <div className="text-text-muted text-[10px]">1. EXTERNAL CALLER</div>
              <div className="text-text-primary font-semibold">acct.withdraw(500)</div>
              <div className="text-[11px] text-text-secondary font-sans">
                Cannot touch <code className="text-danger">balanceCents_</code> directly (private).
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <div className="text-emerald-400 text-[10px]">2. ATOMIC PRECONDITION</div>
              <div className="text-text-primary font-semibold">if (cents &lt;= 0 || cents &gt; bal)</div>
              <div className="text-[11px] text-text-secondary font-sans">
                Rejects invalid deltas before any field is mutated.
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border-subtle space-y-1">
              <div className="text-sky-400 text-[10px]">3. CONST OBSERVER</div>
              <div className="text-text-primary font-semibold">balance() const</div>
              <div className="text-[11px] text-text-secondary font-sans">
                Returns safe value copy; preserves invariant across calls.
              </div>
            </div>
          </div>
        </div>
      );

    case 'polymorphism':
    case 'abstraction':
      return (
        <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-purple-400 font-semibold uppercase tracking-wider">
              64-Bit Memory Layout • vptr &amp; VTable Dynamic Dispatch vs Object Slicing
            </span>
            <span className="text-text-muted">sizeof(vptr) = 8 Bytes</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-semibold">✓ const Shape&amp; ref = Triangle()</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Dynamic Dispatch
                </span>
              </div>
              <div className="text-[11px] text-text-secondary font-sans leading-relaxed">
                Follows <code className="text-primary">ref.vptr → Triangle::vtable[0]</code> at runtime. Invokes <code className="text-emerald-400">Triangle::sides() → 3</code>.
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-danger font-semibold">✗ Shape s = Triangle()</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-danger/20 text-danger">
                  Object Sliced!
                </span>
              </div>
              <div className="text-[11px] text-text-secondary font-sans leading-relaxed">
                By-value copy strips derived fields and resets <code className="text-danger">s.vptr → Shape::vtable</code>. Prints <code className="text-danger">0</code>!
              </div>
            </div>
          </div>
        </div>
      );

    case 'inheritance':
      return (
        <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-sky-400 font-semibold uppercase tracking-wider">
              Diamond Inheritance Resolution • Virtual Base Subobject
            </span>
            <span className="text-text-muted">class Printer : virtual public Device</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-surface border border-border-subtle space-y-1">
              <div className="font-mono font-semibold text-amber-400">
                Without virtual inheritance
              </div>
              <p className="text-text-secondary leading-relaxed">
                <code className="font-mono text-text-primary">AllInOne</code> contains two separate <code className="font-mono text-text-primary">Device</code> subobjects (<code className="font-mono">Printer::id</code> and <code className="font-mono">Scanner::id</code>) — compile error on <code className="font-mono">aio.id</code>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 space-y-1">
              <div className="font-mono font-semibold text-sky-400">
                With virtual public Device
              </div>
              <p className="text-text-secondary leading-relaxed">
                Single shared <code className="font-mono text-text-primary">Device</code> subobject initialized directly by the most-derived constructor (<code className="font-mono text-text-primary">AllInOne</code>).
              </p>
            </div>
          </div>
        </div>
      );

    case 'raii':
      return (
        <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-sky-400 font-semibold uppercase tracking-wider">
              Rule of 0 / 3 / 5 Special Member Matrix
            </span>
            <span className="text-text-muted">Move Ctor MUST be noexcept</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-emerald-400 mb-1">Rule of Zero</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Use <code className="font-mono">std::vector</code>, <code className="font-mono">std::string</code>, <code className="font-mono">unique_ptr</code>. Write 0 custom copy/move/dtor methods.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-amber-400 mb-1">Rule of Three</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                If managing raw resources, define <code className="font-mono">~T()</code>, <code className="font-mono">T(const T&amp;)</code>, and <code className="font-mono">operator=(const T&amp;)</code>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-sky-400 mb-1">Rule of Five</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Add <code className="font-mono">T(T&amp;&amp;) noexcept</code> and <code className="font-mono">operator=(T&amp;&amp;) noexcept</code> for O(1) pointer stealing.
              </p>
            </div>
          </div>
        </div>
      );

    case 'operators':
      return (
        <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-amber-400 font-semibold uppercase tracking-wider">
              STL Comparator Contract • Strict Weak Ordering Axioms
            </span>
            <span className="text-text-muted">std::sort / std::set / std::map</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-emerald-400 mb-1">1. Irreflexivity</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                <code className="font-mono">comp(a, a)</code> MUST always be <code className="font-mono text-emerald-400">false</code>. Using <code className="font-mono text-danger">&lt;=</code> causes UB segfaults in <code className="font-mono">std::sort</code>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-amber-400 mb-1">2. Asymmetry</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                If <code className="font-mono">comp(a, b)</code> is true, then <code className="font-mono">comp(b, a)</code> MUST be false.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-sky-400 mb-1">3. Transitivity</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Use <code className="font-mono">std::tie(a.x, a.y) &lt; std::tie(b.x, b.y)</code> for bug-free lexicographical ordering.
              </p>
            </div>
          </div>
        </div>
      );

    case 'solid':
      return (
        <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-rose-400 font-semibold uppercase tracking-wider">
              Dependency Inversion (DIP) &amp; Liskov Substitution (LSP)
            </span>
            <span className="text-text-muted">Decoupled LLD Architecture</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-text-primary mb-1">OrderService (High-Level)</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Depends strictly on <code className="font-mono text-primary">INotifier&amp;</code> interface injected via constructor.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="font-mono font-bold text-primary mb-1">&lt;&lt;interface&gt;&gt; INotifier</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Pure virtual contract <code className="font-mono">virtual void send(const string&amp;) = 0;</code>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-emerald-400 mb-1">Email / SMS / Mock</div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Swappable concrete implementations without editing <code className="font-mono">OrderService</code> (Open/Closed).
              </p>
            </div>
          </div>
        </div>
      );

    case 'patterns':
    default:
      return (
        <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-rose-400 font-semibold uppercase tracking-wider">
              GoF Low-Level Design Pattern Selector
            </span>
            <span className="text-text-muted">Thread-Safe C++17 Idioms</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-emerald-400">Strategy</div>
              <div className="text-[11px] text-text-secondary mt-0.5">Swap algorithms at runtime</div>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-sky-400">Observer</div>
              <div className="text-[11px] text-text-secondary mt-0.5">1-to-N event subscribers</div>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-amber-400">Command</div>
              <div className="text-[11px] text-text-secondary mt-0.5">Execute / Undo history stack</div>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-border-subtle">
              <div className="font-mono font-bold text-purple-400">Meyers Singleton</div>
              <div className="text-[11px] text-text-secondary mt-0.5">Atomic C++11 static local</div>
            </div>
          </div>
        </div>
      );
  }
};

export const OopsPage: React.FC<OopsPageProps> = ({ onSelectProblem, onTabChange }) => {
  // Default to 'practice' or allow instant switching across Coding (100), Study (8), and MCQs (100+)
  const [activeTab, setActiveTab] = useState<OopsSectionTab>('practice');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(OOPS_STUDY_MODULES[0].id);
  const [copiedModuleId, setCopiedModuleId] = useState<string | null>(null);

  // Completed Study Modules persisted in localStorage
  const [completedModules, setCompletedModules] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(MODULES_DONE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Server-paginated OOP Coding Practice state (#631-#730)
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

  // Interactive OOP MCQs Arena state
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

  // Debounce search input by 180ms so typing doesn't flicker the table on every keystroke
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

  // Keyboard navigation in Focused MCQ Arena (1-4 / A-D to answer, ArrowLeft/Right for Prev/Next)
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
    // IDs #631 through #730 are the 100 OOPs problems
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
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* HERO BANNER */}
        <div className="rounded-2xl bg-surface border border-border-subtle p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
                  Object-Oriented Design &amp; C++17 LLD
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-xs font-mono text-text-secondary">
                  {oopSolved} / {oopTotal} Solved
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Practice 100 executable C++17 class-design problems (#631–#730), inspect 64-bit VTable &amp; RAII memory layouts across 8 study modules, and drill placement MCQs.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handlePickRandomOopProblem}
                  className="px-3.5 py-2 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Solve Random OOP Challenge</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('aptitude')}
                  className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-primary transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Timed Aptitude + OOPs Mock</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
            </div>

            {/* 3 Live Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:min-w-[540px]">
              {/* Card 1: Coding Progress */}
              <div className="bg-surface-elevated/70 border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-purple-400" />
                    Coding Lab
                  </span>
                  <span className="text-text-primary font-bold">
                    {oopSolved}/{oopTotal} ({oopPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-high overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(oopPct, oopSolved > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span className="text-success">E: {difficultyTotals.Easy}</span>
                  <span className="text-warning">M: {difficultyTotals.Medium}</span>
                  <span className="text-danger">H: {difficultyTotals.Hard}</span>
                </div>
              </div>

              {/* Card 2: Curriculum Study Progress */}
              <div className="bg-surface-elevated/70 border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    Study Modules
                  </span>
                  <span className="text-text-primary font-bold">
                    {completedModules.length}/{OOPS_STUDY_MODULES.length} Read
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-high overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        (completedModules.length / OOPS_STUDY_MODULES.length) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] font-mono text-text-muted flex items-center justify-between">
                  <span>8 LLD Blueprints</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('study')}
                    className="text-sky-400 hover:underline"
                  >
                    Open Reader →
                  </button>
                </div>
              </div>

              {/* Card 3: MCQ Arena Accuracy */}
              <div className="bg-surface-elevated/70 border border-border-subtle rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    MCQ Accuracy
                  </span>
                  <span className="text-text-primary font-bold">{mcqAccuracy}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-high overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${mcqAccuracy}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>
                    {mcqScore.correct}/{mcqScore.attempted} Correct
                  </span>
                  <span className="text-amber-400 inline-flex items-center gap-0.5">
                    <Flame className="w-3 h-3" /> Streak {mcqScore.streak}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-MODE SEGMENTED NAVIGATION BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              activeTab === 'practice'
                ? 'bg-surface-elevated border-primary ring-1 ring-primary/30 shadow-sm'
                : 'bg-surface border-border-subtle hover:border-border-hover hover:bg-surface-elevated/50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'practice'
                    ? 'bg-primary text-black'
                    : 'bg-purple-500/15 text-purple-400'
                }`}
              >
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>OOPs Coding Lab</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-high text-text-secondary">
                    {oopTotal} Problems
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Executable C++17 classes, RAII &amp; Design Patterns (#631–#730)
                </p>
              </div>
            </div>
            <ChevronRight
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'practice' ? 'text-primary' : 'text-text-muted'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              activeTab === 'study'
                ? 'bg-surface-elevated border-primary ring-1 ring-primary/30 shadow-sm'
                : 'bg-surface border-border-subtle hover:border-border-hover hover:bg-surface-elevated/50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'study' ? 'bg-primary text-black' : 'bg-sky-500/15 text-sky-400'
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Study &amp; LLD Blueprints</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-high text-text-secondary">
                    {OOPS_STUDY_MODULES.length} Modules
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  VTables, Object Slicing, Rule of 5, SOLID &amp; Interview Red Flags
                </p>
              </div>
            </div>
            <ChevronRight
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'study' ? 'text-primary' : 'text-text-muted'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mcq')}
            className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              activeTab === 'mcq'
                ? 'bg-surface-elevated border-primary ring-1 ring-primary/30 shadow-sm'
                : 'bg-surface border-border-subtle hover:border-border-hover hover:bg-surface-elevated/50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'mcq'
                    ? 'bg-primary text-black'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Placement MCQ Arena</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-high text-text-secondary">
                    100+ Drills
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Interactive C++17 output traces, vtable binding &amp; SOLID quizzes
                </p>
              </div>
            </div>
            <ChevronRight
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'mcq' ? 'text-primary' : 'text-text-muted'
              }`}
            />
          </button>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: 100 OOPs CODING PRACTICE LAB (#631-#730)                       */}
        {/* ===================================================================== */}
        {activeTab === 'practice' && (
          <div className="space-y-5">
            {/* 5 Interactive OOP Pillar Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {OOP_PILLAR_CARDS.map((pillar) => {
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
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? `${pillar.accentBg} ${pillar.accentBorder} ring-1 ring-primary/40 shadow-sm`
                        : 'bg-surface border-border-subtle hover:border-border-hover hover:bg-surface-elevated/60'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-text-primary">
                          {getPillarIcon(pillar.topic)}
                          <span className={pillar.accentText}>{pillar.idRange}</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-text-muted">
                          {pillar.count} Qs
                        </span>
                      </div>
                      <div className="text-xs font-bold text-text-primary leading-snug">
                        {pillar.shortTitle}
                      </div>
                      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                        {pillar.desc}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono">
                      <span className={isSelected ? 'text-primary font-semibold' : 'text-text-muted'}>
                        {isSelected ? '✓ Active Filter' : 'Click to filter'}
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
                        Study Guide →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter & Search Controls Bar */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search OOP problems by #id (631-730), class name, or pattern..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-surface-elevated border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearch('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-surface-elevated border border-border-default rounded-xl p-1 text-xs">
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

                {/* Difficulty Pills */}
                <div className="flex items-center gap-1 bg-surface-elevated border border-border-default rounded-xl p-1 text-xs">
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
                          ? 'text-success hover:bg-surface-high'
                          : diff === 'Medium'
                          ? 'text-warning hover:bg-surface-high'
                          : diff === 'Hard'
                          ? 'text-danger hover:bg-surface-high'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsShuffled(true);
                    setShuffleSeed(Math.floor(Math.random() * 1_000_000) + 1);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-surface-elevated hover:bg-surface-high border border-border-default rounded-xl text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
                  title="Shuffle OOP problem order"
                >
                  <Shuffle className="w-3.5 h-3.5 text-primary" />
                  <span>Shuffle</span>
                </button>

                {hasActiveCodingFilters && (
                  <button
                    type="button"
                    onClick={resetCodingFilters}
                    className="px-3 py-2 bg-danger-subtle hover:opacity-90 border border-danger/30 rounded-xl text-xs text-danger font-mono flex items-center gap-1 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset ({filteredTotal})</span>
                  </button>
                )}
              </div>
            </div>

            {/* OOP Problems Table */}
            <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle text-text-muted font-mono text-[11px] uppercase tracking-wider border-b border-border-subtle">
                    <tr>
                      <th className="py-3.5 px-4 w-14 text-center">Status</th>
                      <th className="py-3.5 px-4 w-20">ID</th>
                      <th className="py-3.5 px-4">Class Challenge &amp; Pattern</th>
                      <th className="py-3.5 px-4 w-64 hidden md:table-cell">OOP Pillar</th>
                      <th className="py-3.5 px-4 w-28">Difficulty</th>
                      <th className="py-3.5 px-4 w-32 text-right">Action</th>
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
                            Reset All Filters
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
                          <td className="py-3.5 px-4 text-center">
                            {prob.isSolved ? (
                              <span className="w-5 h-5 rounded-full bg-success-subtle text-success inline-flex items-center justify-center mx-auto">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-text-muted/30 inline-block mx-auto group-hover:bg-primary/60 transition-colors" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-text-muted font-semibold">
                            #{prob.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                                {prob.title}
                              </span>
                              {prob.pattern && (
                                <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle text-[10px] font-mono text-text-muted">
                                  {prob.pattern}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 hidden md:table-cell">
                            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                              {getPillarIcon(prob.topic)}
                              <span>{prob.topic}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                                prob.difficulty === 'Easy'
                                  ? 'bg-success-subtle text-success'
                                  : prob.difficulty === 'Medium'
                                  ? 'bg-warning-subtle text-warning'
                                  : 'bg-danger-subtle text-danger'
                              }`}
                            >
                              {prob.difficulty}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated group-hover:bg-primary group-hover:text-black text-text-secondary font-mono text-[11px] font-medium transition-colors">
                              <span>Solve</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
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
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: INTERACTIVE STUDY & MEMORY BLUEPRINTS (8 MODULES)              */}
        {/* ===================================================================== */}
        {activeTab === 'study' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Curriculum Rail */}
            <aside className="lg:col-span-4 bg-surface border border-border-subtle rounded-2xl p-4 space-y-3 lg:sticky lg:top-20">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-border-subtle">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                    C++17 OOP Curriculum
                  </div>
                  <div className="text-sm font-bold text-text-primary">
                    8 Engineering Blueprints
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400 font-mono text-xs font-semibold">
                  {completedModules.length}/{OOPS_STUDY_MODULES.length} Done
                </span>
              </div>

              <div className="space-y-2">
                {OOPS_STUDY_MODULES.map((mod, idx) => {
                  const isSelected = mod.id === activeModule.id;
                  const isDone = completedModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setSelectedModuleId(mod.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-surface-elevated border-primary ring-1 ring-primary/30 shadow-sm'
                          : 'bg-surface-subtle/50 border-border-subtle hover:border-border-hover hover:bg-surface-elevated/60'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
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
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-0.5">
                          <span className={isSelected ? 'text-primary font-semibold' : 'text-text-muted'}>
                            {mod.pillar}
                          </span>
                          <span className="text-text-muted shrink-0">{mod.readTime}</span>
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-text-primary leading-snug">
                          {mod.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right Deep-Dive Reader */}
            <section className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-5 sm:p-7 space-y-6 shadow-sm">
              {/* Reader Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border-subtle pb-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary text-xs font-mono font-semibold">
                      Module 0{activeModuleIdx + 1} • {activeModule.pillar}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-xs font-mono text-text-muted">
                      {activeModule.readTime} read
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                    {activeModule.title}
                  </h2>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {activeModule.summary}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleModuleCompleted(activeModule.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                      completedModules.includes(activeModule.id)
                        ? 'bg-success-subtle border-success/40 text-success'
                        : 'bg-surface-elevated hover:bg-surface-high border-border-default text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {completedModules.includes(activeModule.id) ? 'Completed' : 'Mark Complete'}
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
                    className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Practice Pillar Problems</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Interactive Visual Blueprint */}
              <ModuleArchitectureBlueprint moduleId={activeModule.id} />

              {/* Core Engineering Rules */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Core C++17 Engineering Rules &amp; Invariants
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {activeModule.keyRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-sm text-text-secondary bg-surface-elevated/60 border border-border-subtle rounded-xl p-3.5"
                    >
                      <span className="w-6 h-6 rounded-lg bg-success-subtle text-success font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        0{idx + 1}
                      </span>
                      <span className="leading-relaxed text-text-primary/90">
                        {renderInlineCode(rule)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Properly Padded IDE Window for Canonical C++17 Pattern */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                    C++17 Implementation Reference
                  </h3>
                </div>

                <div className="rounded-2xl border border-border-subtle overflow-hidden bg-canvas shadow-sm">
                  {/* Window Titlebar */}
                  <div className="px-4 py-2.5 bg-surface-elevated border-b border-border-subtle flex items-center justify-between text-xs font-mono">
                    <span className="text-text-secondary font-medium">
                      {MODULE_FILENAMES[activeModule.id] || 'pattern.cpp'}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-surface-high text-[10px] text-text-muted">
                        C++17
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyCode(activeModule.id, activeModule.codeExample)
                        }
                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-high border border-border-subtle text-[11px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors"
                      >
                        {copiedModuleId === activeModule.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-success" />
                            <span className="text-success">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Snippet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Code Body with Line Numbers & Generous Padding */}
                  <div className="p-5 overflow-x-auto bg-canvas/80">
                    <HighlightedCode
                      code={activeModule.codeExample}
                      language="cpp"
                      className="text-[13px] leading-6"
                    />
                  </div>
                </div>
              </div>

              {/* Interview Red Flag / Pitfall Callout */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Interview Red Flag &amp; Memory Pitfall
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    {renderInlineCode(activeModule.interviewTrap)}
                  </p>
                </div>
              </div>

              {/* Recommended Hands-On Problems for this Module */}
              {(() => {
                const targetTopic =
                  MODULE_TO_PILLAR_TOPIC[activeModule.id] || 'Encapsulation & Class Invariants';
                const pillarMeta =
                  OOP_PILLAR_CARDS.find((p) => p.topic === targetTopic) || OOP_PILLAR_CARDS[0];
                return (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                        Recommended Hands-On C++17 Challenges ({pillarMeta.idRange})
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
                        View all 20 {pillarMeta.shortTitle} problems →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {pillarMeta.sampleProblems.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => onSelectProblem(sp.id)}
                          className="p-3.5 rounded-xl bg-surface-elevated/70 hover:bg-surface-high border border-border-subtle hover:border-primary/40 text-left transition-all group flex flex-col justify-between gap-2"
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
                          <div className="text-[11px] font-mono text-primary inline-flex items-center gap-1">
                            <span>Open in C++17 IDE</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Previous / Next Module Footer */}
              <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={activeModuleIdx === 0}
                  onClick={() =>
                    setSelectedModuleId(OOPS_STUDY_MODULES[Math.max(0, activeModuleIdx - 1)].id)
                  }
                  className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high disabled:opacity-40 border border-border-subtle text-xs font-mono text-text-primary inline-flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Module</span>
                </button>

                <span className="text-xs font-mono text-text-muted">
                  Module {activeModuleIdx + 1} of {OOPS_STUDY_MODULES.length}
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
                  className="px-4 py-2 rounded-xl bg-primary text-black disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1.5 transition-opacity"
                >
                  <span>Complete &amp; Next Module</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: PLACEMENT OOPs MCQs ARENA (FOCUS MODE + GRID MODE)             */}
        {/* ===================================================================== */}
        {activeTab === 'mcq' && (
          <div className="space-y-5">
            {/* MCQ Arena Control Bar */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    Interactive C++17 &amp; OOPs Placement Quiz Arena
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary font-mono text-xs font-semibold">
                    {Object.keys(selectedAnswers).length} / {mcqBatch.length} Answered in Batch
                  </span>
                </div>
                <p className="text-xs text-text-muted font-mono">
                  Session Score: {mcqScore.correct}/{mcqScore.attempted} ({mcqAccuracy}%) • Active Streak: {mcqScore.streak} • Press 1–4 or A–D to answer in Focus Mode
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Difficulty Filter */}
                <div className="flex items-center gap-1 bg-surface-elevated border border-border-default rounded-xl p-1 text-xs">
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

                {/* Focus Mode vs Grid Mode Switcher */}
                <div className="flex items-center gap-1 bg-surface-elevated border border-border-default rounded-xl p-1 text-xs">
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
                    <span>Focus Arena</span>
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
                    <span>All 20 Grid</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshMcqs}
                  className="px-4 py-2 rounded-xl bg-primary text-black text-xs font-semibold hover:opacity-95 flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>New 20-Question Batch</span>
                </button>
              </div>
            </div>

            {/* FOCUS ARENA MODE (1 Question at a time + 20-Question Matrix Sidebar) */}
            {mcqLayout === 'focus' && currentMcqItem && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Active Question Card */}
                <div className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary-subtle text-primary font-mono text-xs font-bold">
                        Question {activeMcqIdx + 1} of {filteredMcqs.length}
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

                  {/* Formatted Question with Syntax-Highlighted C++ Code Blocks */}
                  {renderQuestionContent(currentMcqItem.question)}

                  {/* Options A, B, C, D */}
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
                            'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-medium';
                          badgeStyle = 'bg-emerald-500 text-black font-bold';
                        } else if (isSelected) {
                          style = 'bg-red-500/15 border-red-500/50 text-red-200';
                          badgeStyle = 'bg-red-500 text-white font-bold';
                        } else {
                          style =
                            'bg-surface-elevated/30 border-border-subtle text-text-muted opacity-65';
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
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {isAnswered && isSelected && !isCorrectOpt && (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Instant Explanation & Shortcut Tip */}
                  {selectedAnswers[currentMcqItem.id] !== undefined && (
                    <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-2 text-xs sm:text-sm">
                      <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-primary">
                        Engineering Explanation
                      </div>
                      <p className="text-text-secondary leading-relaxed">
                        {renderInlineCode(currentMcqItem.explanation)}
                      </p>
                      <div className="pt-1 flex items-start gap-2 text-primary font-mono text-xs">
                        <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Shortcut Rule: {renderInlineCode(currentMcqItem.shortcutTip)}</span>
                      </div>
                    </div>
                  )}

                  {/* Prev / Next Navigation Footer */}
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

                    <span className="text-xs font-mono text-text-muted hidden sm:inline">
                      Tip: Use keys 1–4 (or A–D) &amp; ArrowRight
                    </span>

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

                {/* Right Question Navigator Matrix */}
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
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                          : 'bg-red-500/20 border-red-500/50 text-red-300 font-bold';
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
                      <span>Current Streak</span>
                      <span className="font-mono text-amber-400 font-semibold">
                        {mcqScore.streak} in a row
                      </span>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* ALL 20 GRID MODE */}
            {mcqLayout === 'grid' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {filteredMcqs.map((item, qIdx) => {
                  const chosen = selectedAnswers[item.id];
                  const isAnswered = chosen !== undefined;
                  return (
                    <div
                      key={item.id}
                      className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3.5 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="text-primary font-semibold">
                            Q{qIdx + 1} • {item.subtopic}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-text-muted">{item.askedIn}</span>
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
                                  'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-medium';
                              } else if (isSelected) {
                                style = 'bg-red-500/15 border-red-500/50 text-red-300';
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
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                                {isAnswered && isSelected && !isCorrectOpt && (
                                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
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
