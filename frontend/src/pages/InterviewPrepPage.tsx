import React, { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import {
  Cpu,
  BookOpen,
  Code2,
  Timer,
  MessageSquare,
  CheckCircle2,
  Play,
  RotateCcw,
  Save,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

interface InterviewPrepPageProps {
  onTabChange: (tab: string) => void;
  onSelectProblem: (problemId: number) => void;
}

type PrepSectionTab = 'cs-core' | 'stl-bigo' | 'mock-sim' | 'star-hr';
type CsSubject = 'All' | 'OS' | 'DBMS' | 'Networks' | 'C++ & OOPs' | 'System Design';

interface CsFlashcard {
  id: string;
  subject: Exclude<CsSubject, 'All'>;
  question: string;
  answer: string;
  trap: string;
}

const CS_FLASHCARDS: CsFlashcard[] = [
  {
    id: 'os-1',
    subject: 'OS',
    question: 'Process vs Thread — what is shared and what stays isolated?',
    answer:
      'Processes have separate virtual address spaces, file descriptors, and PCB state. Threads inside the same process share heap, code, global data, and open files, while each thread keeps its own stack, registers, and program counter.',
    trap: 'Context-switching threads is cheaper mainly because the TLB/page tables do not need flushing.',
  },
  {
    id: 'os-2',
    subject: 'OS',
    question: 'What are the 4 Coffman conditions required for Deadlock?',
    answer:
      '1) Mutual Exclusion, 2) Hold and Wait, 3) No Preemption, 4) Circular Wait. Breaking ANY one prevents deadlock (most practical systems break Circular Wait via total lock ordering).',
    trap: 'Livelock lets threads keep running without progress; deadlock blocks them completely.',
  },
  {
    id: 'os-3',
    subject: 'OS',
    question: 'Explain Virtual Memory, Paging & Thrashing briefly.',
    answer:
      'Virtual memory maps virtual pages to physical frames via Page Tables + MMU + TLB cache. When working-set pages exceed RAM, constant page faults cause disk thrashing and CPU utilization collapses.',
    trap: 'Page faults trigger kernel traps to load frames from swap/disk into memory.',
  },
  {
    id: 'dbms-1',
    subject: 'DBMS',
    question: 'Explain ACID properties with a real transfer example.',
    answer:
      'Atomicity (all-or-nothing debit+credit), Consistency (constraints/balance invariants remain valid), Isolation (concurrent transfers cannot observe partial state), Durability (WAL/redo log guarantees committed writes survive crashes).',
    trap: 'Write-Ahead Logging (WAL) makes Atomicity and Durability fast without random page flushes per commit.',
  },
  {
    id: 'dbms-2',
    subject: 'DBMS',
    question: 'Why do databases use B+ Trees instead of Hash Indexes or plain B-Trees?',
    answer:
      'B+ Trees keep all data pointers only in linked leaf nodes, giving higher branching factor (fewer disk I/O levels) and fast sequential range scans (BETWEEN, ORDER BY) along leaf pointers—which hash indexes cannot do.',
    trap: 'Hash indexes excel only on exact equality (=) lookups, not range queries.',
  },
  {
    id: 'dbms-3',
    subject: 'DBMS',
    question: 'Difference between 2NF, 3NF, and BCNF?',
    answer:
      '2NF removes partial dependencies on composite keys. 3NF removes transitive dependencies (non-key → non-key). BCNF requires every determinant X in X → Y to be a superkey.',
    trap: 'Denormalization is intentionally added in read-heavy analytics to trade storage for fewer joins.',
  },
  {
    id: 'net-1',
    subject: 'Networks',
    question: 'Walk through the TCP 3-Way Handshake and why TIME_WAIT exists.',
    answer:
      'Client sends SYN(x) → Server replies SYN-ACK(x+1, y) → Client sends ACK(y+1). At teardown, TIME_WAIT ensures delayed packets from the old connection expire and the final ACK reached the peer safely.',
    trap: 'TCP guarantees ordered, reliable byte streams; UDP trades reliability for minimal framing & lower latency.',
  },
  {
    id: 'net-2',
    subject: 'Networks',
    question: 'What happens under the hood when you request https://example.com?',
    answer:
      'Browser checks cache → DNS resolves domain to IP → TCP handshake on port 443 → TLS handshake negotiates cipher & verifies X.509 cert → HTTP/HTTPS request sent → server responds with status/HTML/assets.',
    trap: 'TLS uses asymmetric crypto during handshake only to exchange symmetric session keys.',
  },
  {
    id: 'cpp-1',
    subject: 'C++ & OOPs',
    question: 'How do virtual functions work internally (vptr & vtable)?',
    answer:
      'Any class with a virtual method gets a static vtable of function pointers per class and a hidden vptr in each object instance. Dynamic dispatch dereferences obj->vptr[slot] at runtime.',
    trap: 'Always declare base-class destructors virtual when deleting derived objects via base pointers!',
  },
  {
    id: 'cpp-2',
    subject: 'C++ & OOPs',
    question: 'When to use unique_ptr, shared_ptr, and weak_ptr?',
    answer:
      'unique_ptr models exclusive ownership with zero refcount overhead. shared_ptr tracks atomic reference counts for shared ownership. weak_ptr breaks reference cycles in graphs/caches without incrementing strong refcount.',
    trap: 'Passing shared_ptr by value copies atomically (slower); pass by const& unless transferring ownership.',
  },
  {
    id: 'sd-1',
    subject: 'System Design',
    question: 'Explain the CAP Theorem with practical database choices.',
    answer:
      'During a network Partition (P), a distributed store must choose Consistency (CP: reject stale reads, e.g. ZooKeeper/etcd) or Availability (AP: serve potentially stale replicas, e.g. Cassandra/Dynamo).',
    trap: 'CAP applies specifically when a partition occurs—under healthy links you can maintain both.',
  },
  {
    id: 'sd-2',
    subject: 'System Design',
    question: 'Write-Through vs Write-Back vs Cache-Aside caching?',
    answer:
      'Cache-Aside: app checks cache, falls back to DB and populates cache on miss. Write-Through: writes sync to cache + DB together (consistent, higher write latency). Write-Back: writes to cache first and flushes async (fastest, risk of loss on crash).',
    trap: 'Prevent cache stampedes on hot keys using mutex/singleflight locks or staggered TTL jitter.',
  },
];

const STL_CHEATSHEET = [
  {
    name: 'std::vector<T>',
    ops: 'Index O(1) • push_back O(1) amort. • insert/erase mid O(N)',
    gotcha: 'Reallocation invalidates pointers/iterators; use reserve(n) when size is known.',
  },
  {
    name: 'std::unordered_map<K, V>',
    ops: 'Avg Lookup/Insert O(1) • Worst-case O(N)',
    gotcha: 'Competitive / adversarial inputs can cause hash collisions; use custom splitmix64 hash if needed.',
  },
  {
    name: 'std::map / std::set',
    ops: 'Lookup/Insert/Erase O(log N) • lower_bound/upper_bound O(log N)',
    gotcha: 'Red-Black Tree keeps keys strictly sorted; iterate ranges cleanly.',
  },
  {
    name: 'std::priority_queue<T>',
    ops: 'top() O(1) • push/pop O(log N)',
    gotcha: 'Max-heap by default. Min-heap syntax: priority_queue<int, vector<int>, greater<int>>.',
  },
  {
    name: 'std::sort / std::nth_element',
    ops: 'sort O(N log N) • nth_element O(N) avg',
    gotcha: 'Custom comparators MUST satisfy strict weak ordering (never return true when a == b!).',
  },
  {
    name: 'Binary Search Bounds',
    ops: 'O(log N) time • O(1) space',
    gotcha: 'Compute mid = low + (high - low) / 2 to avoid signed 32-bit overflow.',
  },
];

const DEFAULT_STAR_PROMPTS = [
  {
    id: 'intro',
    title: 'Tell Me About Yourself (60s Elevator Pitch)',
    prompt:
      "Hi, I'm Harshal Patel, a B.Tech ICT student at Dhirubhai Ambani University. I enjoy building practical full-stack systems and solving algorithmic problems in C++ and SQL. Recently I built CodePrep, a self-hosted C++17 & SQLite compiler and interview training workspace, and I'm looking to bring strong fundamentals and ownership to a software engineering role.",
  },
  {
    id: 'challenge',
    title: 'Hardest Technical Bug & Debugging Approach (STAR)',
    prompt:
      'Situation: ... | Task: ... | Action: Isolated logs, reproduced deterministically, checked root schema/execution boundary... | Result: Reduced failures / latency cleanly.',
  },
  {
    id: 'tradeoff',
    title: 'Architecture / Design Trade-off You Made',
    prompt:
      'Explain why you chose SQLite / sandbox isolation / indexing / pagination over alternatives and how you measured impact.',
  },
  {
    id: 'team',
    title: 'Conflict Resolution / Tight Deadline Story',
    prompt:
      'Focus on objective data, splitting critical vs nice-to-have scope, unblocking teammates cleanly, and delivering on time.',
  },
];

interface ProblemLite {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'DSA' | 'SQL';
  topic: string;
  isSolved?: boolean;
}

const MASTERED_KEY = 'codeprep_cs_mastered_v1';
const STAR_KEY = 'codeprep_star_notes_v1';

export const InterviewPrepPage: React.FC<InterviewPrepPageProps> = ({
  onTabChange,
  onSelectProblem,
}) => {
  const [section, setSection] = useState<PrepSectionTab>('cs-core');
  const [subjectFilter, setSubjectFilter] = useState<CsSubject>('All');

  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(MASTERED_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [starNotes, setStarNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STAR_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const init: Record<string, string> = {};
    DEFAULT_STAR_PROMPTS.forEach((p) => {
      init[p.id] = p.prompt;
    });
    return init;
  });
  const [starSavedFlash, setStarSavedFlash] = useState(false);

  // Mock Interview Simulator state
  const [catalog, setCatalog] = useState<ProblemLite[]>([]);
  const [simTrack, setSimTrack] = useState<'sde-oa' | 'full-loop' | 'sql-round'>('sde-oa');
  const [simSlate, setSimSlate] = useState<ProblemLite[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [simSecondsLeft, setSimSecondsLeft] = useState(45 * 60);

  useEffect(() => {
    try {
      localStorage.setItem(MASTERED_KEY, JSON.stringify(masteredIds));
    } catch {}
  }, [masteredIds]);

  useEffect(() => {
    if (section === 'mock-sim' && catalog.length === 0) {
      apiRequest<{ problems: ProblemLite[] }>('/problems?pageSize=600')
        .then((res) => setCatalog(res.problems || []))
        .catch(() => {});
    }
  }, [section, catalog.length]);

  useEffect(() => {
    if (!simRunning) return;
    if (simSecondsLeft <= 0) {
      setSimRunning(false);
      return;
    }
    const timer = window.setInterval(() => {
      setSimSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [simRunning, simSecondsLeft]);

  const filteredCards = useMemo(
    () =>
      subjectFilter === 'All'
        ? CS_FLASHCARDS
        : CS_FLASHCARDS.filter((c) => c.subject === subjectFilter),
    [subjectFilter]
  );

  const masteredCount = useMemo(
    () => CS_FLASHCARDS.filter((c) => masteredIds[c.id]).length,
    [masteredIds]
  );

  const pickRandomItems = (pool: ProblemLite[], count: number) => {
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  };

  const launchMockSimulator = () => {
    const dsaPool = catalog.filter((p) => p.category === 'DSA');
    const sqlPool = catalog.filter((p) => p.category === 'SQL');

    let picked: ProblemLite[] = [];
    let duration = 45 * 60;

    if (simTrack === 'sde-oa') {
      picked = pickRandomItems(dsaPool, 3);
      duration = 45 * 60;
    } else if (simTrack === 'full-loop') {
      picked = [...pickRandomItems(dsaPool, 2), ...pickRandomItems(sqlPool, 1)];
      duration = 60 * 60;
    } else {
      picked = pickRandomItems(sqlPool, 3);
      duration = 25 * 60;
    }

    setSimSlate(picked);
    setSimSecondsLeft(duration);
    setSimRunning(true);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <AppLayout currentTab="prep" onTabChange={onTabChange}>
      <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-7 space-y-6 animate-page-enter">
        {/* Header Banner */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-primary">
              Complete Placement Readiness
            </span>
            <h1 className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
              Interview Kit: CS Core, C++ STL, Timed Mock &amp; STAR
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Everything missing from raw problem lists—OS/DBMS/CN theory, STL complexities, timed round simulation, and HR pitch notes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'cs-core', label: 'CS Core Q&A', icon: <Cpu className="w-3.5 h-3.5" /> },
              { id: 'stl-bigo', label: 'C++ STL & Big-O', icon: <Code2 className="w-3.5 h-3.5" /> },
              { id: 'mock-sim', label: 'Timed Mock', icon: <Timer className="w-3.5 h-3.5" /> },
              { id: 'star-hr', label: 'STAR & Intro', icon: <MessageSquare className="w-3.5 h-3.5" /> },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSection(t.id as PrepSectionTab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  section === t.id
                    ? 'bg-primary text-[#020202] border-primary'
                    : 'bg-surface-elevated text-text-secondary border-border-subtle hover:text-text-primary hover:bg-surface-high'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 1: CS CORE Q&A */}
        {section === 'cs-core' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {(['All', 'OS', 'DBMS', 'Networks', 'C++ & OOPs', 'System Design'] as CsSubject[]).map(
                  (subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSubjectFilter(subj)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        subjectFilter === subj
                          ? 'bg-primary-subtle border-primary/40 text-primary font-semibold'
                          : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {subj}
                    </button>
                  )
                )}
              </div>

              <span className="text-xs font-mono text-text-muted">
                Mastered: <strong className="text-success">{masteredCount}</strong> / {CS_FLASHCARDS.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCards.map((card) => {
                const isDone = Boolean(masteredIds[card.id]);
                return (
                  <div
                    key={card.id}
                    className={`rounded-2xl border p-5 space-y-3 transition-colors ${
                      isDone
                        ? 'bg-surface border-success/35'
                        : 'bg-surface border-border-subtle'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-primary">
                        {card.subject}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMasteredIds((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                          isDone
                            ? 'bg-success-subtle border-success/40 text-success'
                            : 'bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isDone ? 'Mastered' : 'Mark Revised'}</span>
                      </button>
                    </div>

                    <h3 className="font-semibold text-sm text-text-primary leading-snug">
                      {card.question}
                    </h3>

                    <p className="text-xs text-text-secondary leading-relaxed">{card.answer}</p>

                    <div className="p-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] text-warning flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Interviewer Follow-up:</strong> {card.trap}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: C++ STL & COMPLEXITY CHEAT SHEET */}
        {section === 'stl-bigo' && (
          <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-text-primary">
                C++17 STL Containers &amp; Interview Complexity Gotchas
              </h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {STL_CHEATSHEET.map((row) => (
                <div
                  key={row.name}
                  className="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-mono text-sm font-bold text-primary">{row.name}</div>
                    <div className="font-mono text-xs text-text-secondary">{row.ops}</div>
                  </div>
                  <div className="lg:max-w-md text-xs text-text-muted bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2">
                    <strong className="text-text-primary">Gotcha:</strong> {row.gotcha}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: TIMED PLACEMENT SIMULATOR */}
        {section === 'mock-sim' && (
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-base text-text-primary">
                  Timed Coding + SQL Assessment Generator
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Samples fresh questions from your 600-problem SQLite bank and runs a strict round countdown.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {simRunning && (
                  <div className="px-3.5 py-2 rounded-xl bg-danger-subtle border border-danger/35 font-mono text-sm font-bold text-danger">
                    {formatDuration(simSecondsLeft)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={launchMockSimulator}
                  disabled={catalog.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#020202] text-xs font-bold disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{simRunning ? 'Regenerate Slate' : 'Start Mock Round'}</span>
                </button>
                {simRunning && (
                  <button
                    type="button"
                    onClick={() => setSimRunning(false)}
                    className="p-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted hover:text-text-primary"
                    title="Stop Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'sde-oa', title: 'SDE Online Assessment', sub: '3 DSA Problems • 45 mins' },
                { id: 'full-loop', title: 'Technical Round Mix', sub: '2 DSA + 1 SQL • 60 mins' },
                { id: 'sql-round', title: 'Data / SQL Round', sub: '3 SQL Queries • 25 mins' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSimTrack(opt.id as typeof simTrack)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    simTrack === opt.id
                      ? 'bg-primary-subtle border-primary/50 text-text-primary'
                      : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  <div className="font-semibold text-xs text-primary">{opt.title}</div>
                  <div className="text-xs font-mono text-text-muted mt-1">{opt.sub}</div>
                </button>
              ))}
            </div>

            {simSlate.length > 0 && (
              <div className="space-y-2.5 pt-2">
                {simSlate.map((prob, idx) => (
                  <div
                    key={prob.id}
                    className="p-4 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-text-muted">Round Q{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded bg-surface-elevated text-primary">
                          {prob.category}
                        </span>
                        <span
                          className={
                            prob.difficulty === 'Easy'
                              ? 'text-success'
                              : prob.difficulty === 'Medium'
                              ? 'text-warning'
                              : 'text-danger'
                          }
                        >
                          {prob.difficulty}
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-text-primary">
                        #{prob.id}. {prob.title}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectProblem(prob.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-text-primary"
                    >
                      <span>Open IDE</span>
                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: STAR BEHAVIORAL & INTRO WORKSHEET */}
        {section === 'star-hr' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-secondary">
                Edit your personal HR &amp; STAR stories below. Saved locally so you can review right before an interview.
              </p>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(STAR_KEY, JSON.stringify(starNotes));
                    setStarSavedFlash(true);
                    setTimeout(() => setStarSavedFlash(false), 1800);
                  } catch {}
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-[#020202] text-xs font-bold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{starSavedFlash ? 'Saved!' : 'Save Stories'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEFAULT_STAR_PROMPTS.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-2.5"
                >
                  <label className="block font-semibold text-xs text-primary">
                    {item.title}
                  </label>
                  <textarea
                    rows={4}
                    value={starNotes[item.id] ?? ''}
                    onChange={(e) =>
                      setStarNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="w-full p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-primary leading-relaxed focus:outline-none focus:border-primary/60 resize-y"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

