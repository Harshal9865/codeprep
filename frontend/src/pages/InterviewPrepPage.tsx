import React, { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import {
  InterviewQuizCategory,
  GeneratedInterviewQuestion,
  generateInterviewQuestion,
  generateInterviewBatch,
} from '../utils/interviewKitGenerator';
import {
  CS_FLASHCARDS,
  PATTERN_PLAYBOOK,
  SYSTEM_DESIGN_BLUEPRINTS,
  HLD_FRAMEWORK_STEPS,
  LATENCY_NUMBERS,
  STL_CHEATSHEET,
  CPP_INTERVIEW_SNIPPETS,
  CPP_COMMON_BUGS,
  CONSTRAINT_SCALE_TABLE,
  SQL_PATTERNS,
  BRAIN_TEASERS,
  COMPANY_ARCHETYPES,
  THINK_ALOUD_RUBRIC,
  RECOVERY_PHRASES,
  DEFAULT_STAR_PROMPTS,
  QUESTIONS_TO_ASK_INTERVIEWER,
  PRE_INTERVIEW_CHECKLIST,
  BrainTeaserItem,
} from '../data/interviewKitData';
import {
  Home,
  Compass,
  Code2,
  Database,
  Cpu,
  HardDrive,
  Network,
  Layers,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Clock,
  ArrowRight,
  Zap,
  Trophy,
  Sparkles,
  Pause,
  RotateCcw,
  Save,
  ExternalLink,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Flame,
  ShieldCheck,
  HelpCircle,
  Brain,
  Calculator,
  Building2,
  History,
  BookOpen,
  MessageSquare,
  Timer,
} from 'lucide-react';

interface InterviewPrepPageProps {
  onTabChange: (tab: string) => void;
  onSelectProblem: (problemId: number) => void;
}

type VaultView =
  | 'vault-patterns'
  | 'vault-sys-design'
  | 'vault-coding-mock'
  | 'vault-puzzles-co'
  | 'vault-star-hr'
  | 'vault-ai-coach';

type SidebarView = 'Home' | InterviewQuizCategory | VaultView;

interface QuizStats {
  attempted: number;
  correct: number;
  streak: number;
  byCategory: Record<string, { attempted: number; correct: number }>;
}

interface ProblemLite {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'DSA' | 'SQL' | 'OOP';
  topic: string;
  isSolved?: boolean;
}

interface MockLogEntry {
  id: string;
  date: string;
  trackLabel: string;
  rubricDone: number;
  elapsedMinutes: number;
}

const QUIZ_STATS_KEY = 'codeprep_interview_quiz_stats_v1';
const PATTERNS_DONE_KEY = 'codeprep_patterns_done_v1';
const PUZZLES_DONE_KEY = 'codeprep_puzzles_done_v1';
const STAR_KEY = 'codeprep_star_notes_v1';
const MOCK_LOG_KEY = 'codeprep_mock_history_v1';

const CATEGORY_META: Array<{
  id: InterviewQuizCategory;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'DSA Pattern & Complexity',
    label: 'DSA Pattern & Big-O',
    desc: 'Constraint Bounds, Heap vs Sort, Monotonic Stack, DP & 0-1 BFS',
    icon: <Compass className="w-4 h-4" />,
  },
  {
    id: 'C++17 & Output Traps',
    label: 'C++17 & Output Traps',
    desc: 'Unsigned Underflow, Lambdas, Virtual Destructors & STL Complexity',
    icon: <Code2 className="w-4 h-4" />,
  },
  {
    id: 'SQL & Query Internals',
    label: 'SQL & Query Internals',
    desc: 'DENSE_RANK vs RANK, NULL NOT IN Traps, Execution Order & Joins',
    icon: <Database className="w-4 h-4" />,
  },
  {
    id: 'OS & Concurrency',
    label: 'OS & Concurrency',
    desc: 'TLB Math, Deadlocks, Condition Variables, CoW fork() & epoll',
    icon: <Cpu className="w-4 h-4" />,
  },
  {
    id: 'DBMS & Indexing',
    label: 'DBMS & Indexing',
    desc: 'B+ Tree Prefix Rule, WAL Recovery, UUIDv7 & Concurrency Locking',
    icon: <HardDrive className="w-4 h-4" />,
  },
  {
    id: 'Networks & Security',
    label: 'Networks & Security',
    desc: 'TCP TIME_WAIT, HTTP/3 QUIC HoL, TLS 1.3, XSS vs CSRF & Cookies',
    icon: <Network className="w-4 h-4" />,
  },
  {
    id: 'System Design & Scale',
    label: 'System Design & Scale',
    desc: 'Live QPS Math, Quorum W+R>N, Cache Stampede & Hybrid Fan-Out',
    icon: <Layers className="w-4 h-4" />,
  },
];

const VAULT_META: Array<{ id: VaultView; label: string; icon: React.ReactNode }> = [
  { id: 'vault-patterns', label: 'DSA Playbooks & IDE', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'vault-sys-design', label: 'HLD Blueprints & Calc', icon: <Calculator className="w-4 h-4" /> },
  { id: 'vault-coding-mock', label: 'Coding Round Simulator', icon: <Timer className="w-4 h-4" /> },
  { id: 'vault-puzzles-co', label: 'Puzzles & Companies', icon: <Brain className="w-4 h-4" /> },
  { id: 'vault-star-hr', label: 'STAR, Recovery & HR', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'vault-ai-coach', label: 'AI Interview Coach', icon: <Sparkles className="w-4 h-4" /> },
];

function isQuizCategory(v: SidebarView): v is InterviewQuizCategory {
  return CATEGORY_META.some((c) => c.id === v);
}

function mapQuizCatToCsSubject(cat: InterviewQuizCategory): string | null {
  switch (cat) {
    case 'OS & Concurrency':
      return 'OS';
    case 'DBMS & Indexing':
      return 'DBMS';
    case 'SQL & Query Internals':
      return 'SQL Internals';
    case 'Networks & Security':
      return 'Networks';
    case 'C++17 & Output Traps':
      return 'C++ & OOPs';
    case 'System Design & Scale':
      return 'System Design';
    default:
      return null;
  }
}

export const InterviewPrepPage: React.FC<InterviewPrepPageProps> = ({
  onTabChange,
  onSelectProblem,
}) => {
  const [sidebarView, setSidebarView] = useState<SidebarView>('Home');
  const [mode, setMode] = useState<'stream' | 'mock'>('stream');
  const [showRefCheat, setShowRefCheat] = useState(false);

  // Stream quiz state (Aptitude-style continuous procedural/bank drill)
  const [currentQ, setCurrentQ] = useState<GeneratedInterviewQuestion>(() =>
    generateInterviewQuestion('Mixed')
  );
  const [streamSelected, setStreamSelected] = useState<number | null>(null);

  // 10-Q Timed MCQ Mock state (exact Aptitude UX)
  const [mockQuestions, setMockQuestions] = useState<GeneratedInterviewQuestion[]>([]);
  const [mockIdx, setMockIdx] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<number, number>>({});
  const [mockSubmitted, setMockSubmitted] = useState(false);
  const [mockSecondsLeft, setMockSecondsLeft] = useState(600);

  const [quizStats, setQuizStats] = useState<QuizStats>(() => {
    try {
      const saved = localStorage.getItem(QUIZ_STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { attempted: 0, correct: 0, streak: 0, byCategory: {} };
  });

  // Vault states
  const [patternSearch, setPatternSearch] = useState('');
  const [patternsMastered, setPatternsMastered] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(PATTERNS_DONE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [sdKindFilter, setSdKindFilter] = useState<'ALL' | 'HLD' | 'LLD'>('ALL');
  const [dauMillions, setDauMillions] = useState(10);
  const [reqPerUser, setReqPerUser] = useState(20);
  const [payloadKb, setPayloadKb] = useState(2);
  const [readWriteRatio, setReadWriteRatio] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [puzzleFilter, setPuzzleFilter] = useState<'All' | BrainTeaserItem['category']>('All');
  const [puzzleHintOpen, setPuzzleHintOpen] = useState<Record<string, boolean>>({});
  const [puzzleAnsOpen, setPuzzleAnsOpen] = useState<Record<string, boolean>>({});
  const [puzzlesSolved, setPuzzlesSolved] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(PUZZLES_DONE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Live Coding Round Simulator state
  const [catalog, setCatalog] = useState<ProblemLite[]>([]);
  const [potdStreak, setPotdStreak] = useState<number | undefined>(undefined);
  const [simTrack, setSimTrack] = useState<'sde-oa' | 'faang-loop' | 'full-loop' | 'sql-round'>('sde-oa');
  const [simTopicFilter, setSimTopicFilter] = useState<string>('ALL');
  const [unsolvedOnly, setUnsolvedOnly] = useState(true);
  const [simSlate, setSimSlate] = useState<ProblemLite[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [simPaused, setSimPaused] = useState(false);
  const [simInitialSeconds, setSimInitialSeconds] = useState(45 * 60);
  const [simSecondsLeft, setSimSecondsLeft] = useState(45 * 60);
  const [rubricChecks, setRubricChecks] = useState<Record<string, boolean>>({});
  const [mockHistory, setMockHistory] = useState<MockLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(MOCK_LOG_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // STAR + Checklist state
  const [starNotes, setStarNotes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    DEFAULT_STAR_PROMPTS.forEach((p) => {
      init[p.id] = p.prompt;
    });
    try {
      const saved = localStorage.getItem(STAR_KEY);
      if (saved) return { ...init, ...JSON.parse(saved) };
    } catch {}
    return init;
  });
  const [starSavedFlash, setStarSavedFlash] = useState(false);
  const [preChecks, setPreChecks] = useState<Record<number, boolean>>({});

  // Gemini AI Interview Coach state
  const [coachMode, setCoachMode] = useState<'critique' | 'ask'>('critique');
  const [coachTopic, setCoachTopic] = useState('System Design');
  const [coachQuestion, setCoachQuestion] = useState('How would you design a distributed rate limiter using Redis?');
  const [coachAnswer, setCoachAnswer] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachReply, setCoachReply] = useState<{
    reply: string;
    provider: 'gemini' | 'local';
    note?: string;
  } | null>(null);

  const runAiInterviewCoach = async () => {
    setCoachLoading(true);
    try {
      const res = await apiRequest<{
        reply: string;
        provider: 'gemini' | 'local';
        note?: string;
      }>('/ai/interview-coach', {
        method: 'POST',
        body: JSON.stringify({
          topic: coachTopic,
          question: coachQuestion,
          userAnswer: coachAnswer,
          mode: coachMode,
        }),
      });
      setCoachReply(res);
    } catch (err) {
      setCoachReply({
        reply: err instanceof Error ? err.message : 'Unable to reach AI Coach service right now.',
        provider: 'local',
      });
    } finally {
      setCoachLoading(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(QUIZ_STATS_KEY, JSON.stringify(quizStats));
    } catch {}
  }, [quizStats]);

  useEffect(() => {
    try {
      localStorage.setItem(PATTERNS_DONE_KEY, JSON.stringify(patternsMastered));
    } catch {}
  }, [patternsMastered]);

  useEffect(() => {
    try {
      localStorage.setItem(PUZZLES_DONE_KEY, JSON.stringify(puzzlesSolved));
    } catch {}
  }, [puzzlesSolved]);

  useEffect(() => {
    try {
      localStorage.setItem(MOCK_LOG_KEY, JSON.stringify(mockHistory));
    } catch {}
  }, [mockHistory]);

  useEffect(() => {
    Promise.all([
      apiRequest<{ problems: ProblemLite[] }>('/problems?track=algorithms&pageSize=200').catch(() => ({ problems: [] })),
      apiRequest<{ problems: ProblemLite[] }>('/problems?category=SQL&pageSize=100').catch(() => ({ problems: [] })),
      apiRequest<{ problems: ProblemLite[] }>('/problems?category=OOP&pageSize=50').catch(() => ({ problems: [] })),
    ])
      .then(([dsaRes, sqlRes, oopRes]) => {
        const merged = [...(dsaRes.problems || []), ...(sqlRes.problems || []), ...(oopRes.problems || [])];
        const byId = new Map<number, ProblemLite>();
        for (const p of merged) byId.set(p.id, p);
        setCatalog(Array.from(byId.values()));
      })
      .catch(() => {});

    apiRequest<{ analytics?: { currentStreak?: number } }>('/analytics/dashboard')
      .then((res) => {
        if (res?.analytics) setPotdStreak(res.analytics.currentStreak ?? 0);
      })
      .catch(() => {});
  }, []);

  // Countdown for 10-Q Timed Interview Mock
  useEffect(() => {
    if (mode !== 'mock' || mockSubmitted) return;
    if (mockSecondsLeft <= 0) {
      setMockSubmitted(true);
      return;
    }
    const timer = window.setInterval(() => {
      setMockSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, mockSubmitted, mockSecondsLeft]);

  // Countdown for Live Coding Simulator
  useEffect(() => {
    if (!simRunning || simPaused) return;
    if (simSecondsLeft <= 0) {
      setSimRunning(false);
      return;
    }
    const timer = window.setInterval(() => {
      setSimSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [simRunning, simPaused, simSecondsLeft]);

  const recordQuizAnswer = (category: InterviewQuizCategory, isCorrect: boolean) => {
    setQuizStats((prev) => {
      const catEntry = prev.byCategory[category] || { attempted: 0, correct: 0 };
      return {
        attempted: prev.attempted + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        streak: isCorrect ? prev.streak + 1 : 0,
        byCategory: {
          ...prev.byCategory,
          [category]: {
            attempted: catEntry.attempted + 1,
            correct: catEntry.correct + (isCorrect ? 1 : 0),
          },
        },
      };
    });
  };

  const handleOpenCategoryStream = (cat: InterviewQuizCategory | 'Mixed') => {
    if (cat !== 'Mixed') {
      setSidebarView(cat);
    }
    setMode('stream');
    setShowRefCheat(false);
    setCurrentQ(generateInterviewQuestion(cat));
    setStreamSelected(null);
  };

  const handleNextDynamicQuestion = () => {
    const targetCat: InterviewQuizCategory | 'Mixed' = isQuizCategory(sidebarView)
      ? sidebarView
      : 'Mixed';
    let next = generateInterviewQuestion(targetCat);
    for (let i = 0; i < 6 && next.question === currentQ.question; i++) {
      next = generateInterviewQuestion(targetCat);
    }
    setCurrentQ(next);
    setStreamSelected(null);
  };

  const handleSelectStreamOption = (optIdx: number) => {
    if (streamSelected !== null) return;
    setStreamSelected(optIdx);
    recordQuizAnswer(currentQ.category, optIdx === currentQ.correctIndex);
  };

  const handleStartMockRound = (cat: InterviewQuizCategory | 'Mixed') => {
    const batch = generateInterviewBatch(cat, 10);
    setMockQuestions(batch);
    setMockIdx(0);
    setMockAnswers({});
    setMockSubmitted(false);
    setMockSecondsLeft(600);
    setMode('mock');
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    });
  };

  const mockScore = useMemo(() => {
    let right = 0;
    mockQuestions.forEach((q, idx) => {
      if (mockAnswers[idx] === q.correctIndex) right += 1;
    });
    return right;
  }, [mockQuestions, mockAnswers]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const accuracyPct =
    quizStats.attempted > 0 ? Math.round((quizStats.correct / quizStats.attempted) * 100) : 0;

  // Vault filtered memos
  const filteredPatterns = useMemo(() => {
    const q = patternSearch.trim().toLowerCase();
    if (!q) return PATTERN_PLAYBOOK;
    return PATTERN_PLAYBOOK.filter(
      (p) =>
        p.pattern.toLowerCase().includes(q) ||
        p.pitfall.toLowerCase().includes(q) ||
        p.triggerSignals.some((s) => s.toLowerCase().includes(q)) ||
        p.topicKeywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [patternSearch]);

  const filteredBlueprints = useMemo(
    () =>
      sdKindFilter === 'ALL'
        ? SYSTEM_DESIGN_BLUEPRINTS
        : SYSTEM_DESIGN_BLUEPRINTS.filter((b) => b.kind === sdKindFilter),
    [sdKindFilter]
  );

  const filteredPuzzles = useMemo(
    () =>
      puzzleFilter === 'All'
        ? BRAIN_TEASERS
        : BRAIN_TEASERS.filter((b) => b.category === puzzleFilter),
    [puzzleFilter]
  );

  const capacityMetrics = useMemo(() => {
    const dailyReqs = dauMillions * 1_000_000 * reqPerUser;
    const avgQps = dailyReqs / 86400;
    const peakQps = avgQps * 3;
    const writeShare = 1 / Math.max(1, readWriteRatio + 1);
    const writeQps = avgQps * writeShare;
    const readQps = avgQps - writeQps;
    const dailyGb = (dailyReqs * writeShare * payloadKb) / (1024 * 1024);
    const fiveYearTb = (dailyGb * 365 * 5 * 3) / 1024;
    const hotCacheGb = (dailyReqs * payloadKb * 0.2) / (1024 * 1024);

    const fmtQps = (n: number) =>
      n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${Math.round(n)}`;

    return {
      avgQps: fmtQps(avgQps),
      peakQps: fmtQps(peakQps),
      readQps: fmtQps(readQps),
      writeQps: fmtQps(writeQps),
      dailyGb: dailyGb >= 1024 ? `${(dailyGb / 1024).toFixed(2)} TB` : `${dailyGb.toFixed(1)} GB`,
      fiveYearTb: fiveYearTb >= 1000 ? `${(fiveYearTb / 1000).toFixed(2)} PB` : `${fiveYearTb.toFixed(1)} TB`,
      hotCacheGb: hotCacheGb >= 1024 ? `${(hotCacheGb / 1024).toFixed(2)} TB` : `${hotCacheGb.toFixed(1)} GB`,
    };
  }, [dauMillions, reqPerUser, payloadKb, readWriteRatio]);

  const pickRandomItems = (pool: ProblemLite[], count: number) => {
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  };

  const resolvePatternProblems = (keywords: string[]): ProblemLite[] => {
    const dsa = catalog.filter((p) => p.category === 'DSA');
    const lowerKw = keywords.map((k) => k.toLowerCase());
    const matches = dsa.filter((p) => {
      const hay = `${p.topic} ${p.title}`.toLowerCase();
      return lowerKw.some((kw) => hay.includes(kw));
    });
    const unsolvedFirst = [
      ...matches.filter((p) => !p.isSolved),
      ...matches.filter((p) => p.isSolved),
    ];
    return unsolvedFirst.slice(0, 2);
  };

  const launchCodingSimulator = () => {
    const filterBase = (list: ProblemLite[], applyTopic = false) => {
      let result = list;
      if (applyTopic && simTopicFilter !== 'ALL') {
        const topicMatched = result.filter((p) =>
          p.topic.toLowerCase().includes(simTopicFilter.toLowerCase())
        );
        if (topicMatched.length > 0) result = topicMatched;
      }
      const unsolved = unsolvedOnly ? result.filter((p) => !p.isSolved) : result;
      return unsolved.length > 0 ? unsolved : result;
    };

    const dsaPool = filterBase(catalog.filter((p) => p.category === 'DSA'), true);
    const sqlPool = filterBase(catalog.filter((p) => p.category === 'SQL'), false);

    let picked: ProblemLite[] = [];
    let duration = 45 * 60;

    if (simTrack === 'sde-oa') {
      picked = pickRandomItems(dsaPool, 3);
      duration = 45 * 60;
    } else if (simTrack === 'faang-loop') {
      const meds = dsaPool.filter((p) => p.difficulty === 'Medium');
      const hards = dsaPool.filter((p) => p.difficulty === 'Hard');
      picked = [
        ...pickRandomItems(meds.length ? meds : dsaPool, 1),
        ...pickRandomItems(hards.length ? hards : dsaPool, 1),
      ];
      duration = 40 * 60;
    } else if (simTrack === 'full-loop') {
      picked = [...pickRandomItems(dsaPool, 2), ...pickRandomItems(sqlPool, 1)];
      duration = 60 * 60;
    } else {
      picked = pickRandomItems(sqlPool, 3);
      duration = 25 * 60;
    }

    setSimSlate(picked);
    setSimInitialSeconds(duration);
    setSimSecondsLeft(duration);
    setSimPaused(false);
    setSimRunning(true);
    setRubricChecks({});
  };

  const handleLogMockSession = () => {
    const trackNames: Record<typeof simTrack, string> = {
      'sde-oa': 'SDE OA (3 DSA)',
      'faang-loop': 'FAANG Live (Med + Hard)',
      'full-loop': 'Full-Stack (2 DSA + SQL)',
      'sql-round': 'SQL Analytics Round',
    };
    const rubricDone = Object.values(rubricChecks).filter(Boolean).length;
    const elapsedMin = Math.max(1, Math.round((simInitialSeconds - simSecondsLeft) / 60));
    const entry: MockLogEntry = {
      id: `${Date.now()}`,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      trackLabel: trackNames[simTrack],
      rubricDone,
      elapsedMinutes: elapsedMin,
    };
    setMockHistory((prev) => [entry, ...prev].slice(0, 8));
    setSimRunning(false);
  };

  const isQuizView = sidebarView === 'Home' || isQuizCategory(sidebarView);
  const inlineCsSubject = isQuizCategory(sidebarView) ? mapQuizCatToCsSubject(sidebarView) : null;
  const inlineFlashcards = inlineCsSubject
    ? CS_FLASHCARDS.filter((c) => c.subject === inlineCsSubject)
    : [];

  return (
    <AppLayout currentTab="prep" onTabChange={onTabChange} currentStreak={potdStreak}>
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start animate-page-enter">
        {/* Left Navigation Sidebar (Exact Aptitude UX Architecture) */}
        <aside className="w-full lg:w-64 shrink-0 bg-surface border border-border-subtle rounded-2xl p-3 space-y-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setSidebarView('Home');
              setMode('stream');
              setShowRefCheat(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              sidebarView === 'Home' && mode === 'stream'
                ? 'bg-primary-subtle text-primary font-semibold border border-primary/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </button>

          <div className="h-px bg-border-subtle my-2" />
          <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Technical Drills
          </div>

          {CATEGORY_META.map((cat) => {
            const active = sidebarView === cat.id && mode === 'stream';
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleOpenCategoryStream(cat.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-left ${
                  active
                    ? 'bg-primary-subtle text-primary font-semibold border border-primary/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
                }`}
              >
                <span className={active ? 'text-primary' : 'text-text-muted'}>{cat.icon}</span>
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}

          <div className="h-px bg-border-subtle my-2" />

          <button
            type="button"
            onClick={() =>
              handleStartMockRound(isQuizCategory(sidebarView) ? sidebarView : 'Mixed')
            }
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-[#020202] text-xs font-bold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>10-Q Timed Mock Test</span>
          </button>

          <div className="h-px bg-border-subtle my-2" />
          <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Playbooks &amp; Coding Vaults
          </div>

          {VAULT_META.map((v) => {
            const active = sidebarView === v.id && mode === 'stream';
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSidebarView(v.id);
                  setMode('stream');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-colors text-left ${
                  active
                    ? 'bg-primary-subtle text-primary font-semibold border border-primary/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
                }`}
              >
                <span className={active ? 'text-primary' : 'text-text-muted'}>{v.icon}</span>
                <span className="truncate">{v.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Interview Kit Stage */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {/* Top Header Banner */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">
                {mode === 'mock'
                  ? 'Timed Technical Interview Mock Round'
                  : sidebarView === 'Home'
                    ? 'Interactive SDE Interview Kit'
                    : VAULT_META.find((v) => v.id === sidebarView)?.label || sidebarView}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle">
                Solved: <strong className="text-success">{quizStats.correct}</strong>/{quizStats.attempted}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle">
                Accuracy: <strong className="text-primary">{accuracyPct}%</strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-warning" />
                Streak: <strong className="text-text-primary">{quizStats.streak}</strong>
              </div>
              {potdStreak !== undefined && (
                <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-primary" />
                  POTD: <strong className="text-text-primary">{potdStreak}d</strong>
                </div>
              )}
            </div>
          </div>

          {/* HOME OVERVIEW CARDS (EXACT APTITUDE STYLE) */}
          {sidebarView === 'Home' && mode === 'stream' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {CATEGORY_META.map((cat) => {
                const cStat = quizStats.byCategory[cat.id];
                const acc =
                  cStat && cStat.attempted > 0
                    ? Math.round((cStat.correct / cStat.attempted) * 100)
                    : null;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleOpenCategoryStream(cat.id)}
                    className="p-4 rounded-2xl bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-primary/40 text-left transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-9 w-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-primary group-hover:bg-primary-subtle transition-colors">
                        {cat.icon}
                      </div>
                      {acc !== null ? (
                        <span className="text-[11px] font-mono text-success bg-success-subtle px-2 py-0.5 rounded-full">
                          {acc}% acc
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-text-muted">Practice →</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                        {cat.label}
                      </h3>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STREAM MODE: SINGLE LIVE INTERVIEW MCQ + OPTIONAL REFERENCE CHEATSHEET */}
          {mode === 'stream' && isQuizView && (
            <div className="space-y-5">
              <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border-subtle">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary font-mono font-semibold">
                      {currentQ.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-text-secondary">
                      {currentQ.subtopic}
                    </span>
                    <span
                      className={`font-semibold ${
                        currentQ.difficulty === 'Easy'
                          ? 'text-success'
                          : currentQ.difficulty === 'Medium'
                            ? 'text-warning'
                            : 'text-danger'
                      }`}
                    >
                      {currentQ.difficulty}
                    </span>
                    <span className="hidden sm:inline font-mono text-[11px] text-text-muted">
                      • {currentQ.askedIn}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isQuizCategory(sidebarView) && (
                      <button
                        type="button"
                        onClick={() => setShowRefCheat((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                          showRefCheat
                            ? 'bg-primary-subtle border-primary/40 text-primary'
                            : 'bg-surface-elevated hover:bg-surface-high border-border-subtle text-text-secondary'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{showRefCheat ? 'Hide Notes' : 'Topic Cheat Sheet'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleNextDynamicQuestion}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-text-primary transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-primary" />
                      <span>Generate New Question</span>
                    </button>
                  </div>
                </div>

                <h2 className="text-base sm:text-lg font-semibold text-text-primary leading-relaxed whitespace-pre-line">
                  {currentQ.question}
                </h2>

                {currentQ.codeSnippet && (
                  <pre className="p-4 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-mono text-text-primary overflow-x-auto leading-relaxed">
                    {currentQ.codeSnippet}
                  </pre>
                )}

                {/* Options */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, idx) => {
                    const isAnswered = streamSelected !== null;
                    let style =
                      'bg-surface-subtle hover:bg-surface-high border border-border-subtle text-text-primary';
                    if (isAnswered) {
                      if (idx === currentQ.correctIndex) {
                        style = 'bg-success/15 border border-success/45 text-success font-semibold';
                      } else if (idx === streamSelected) {
                        style = 'bg-danger/15 border border-danger/45 text-danger';
                      } else {
                        style = 'bg-surface-subtle border border-border-subtle opacity-45 text-text-muted';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handleSelectStreamOption(idx)}
                        className={`w-full text-left p-3.5 rounded-xl text-xs transition-all flex items-center justify-between gap-3 ${style}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <strong className="font-mono text-text-muted shrink-0">
                            {String.fromCharCode(65 + idx)}.
                          </strong>
                          <span className="leading-snug">{opt}</span>
                        </div>

                        {isAnswered && idx === currentQ.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        )}
                        {isAnswered && idx === streamSelected && idx !== currentQ.correctIndex && (
                          <XCircle className="w-4 h-4 text-danger shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation & Interviewer Trap */}
                {streamSelected !== null && (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5 text-sm animate-fade-up">
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                      <Lightbulb className="w-4 h-4 text-warning" />
                      <span>Why &amp; How It Works</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed text-[13px]">
                      {currentQ.explanation}
                    </p>
                    <div className="pt-2 border-t border-border-subtle text-xs font-mono text-primary">
                      Interview Shortcut: <span className="text-text-secondary">{currentQ.shortcutTip}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => handleOpenCategoryStream('Mixed')}
                    className="text-xs font-mono text-text-muted hover:text-primary transition-colors"
                  >
                    Shuffle Any Category
                  </button>
                  <button
                    type="button"
                    onClick={handleNextDynamicQuestion}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#020202] text-xs font-bold transition-colors"
                  >
                    <span>Next Fresh Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Optional Inline Reference Notes Drawer per Category */}
              {showRefCheat && isQuizCategory(sidebarView) && (
                <div className="space-y-4 animate-fade-up">
                  {inlineFlashcards.length > 0 && (
                    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
                      <h3 className="text-sm font-bold text-text-primary">
                        {sidebarView} — Key Interview Q&amp;As ({inlineFlashcards.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {inlineFlashcards.map((fc) => (
                          <div
                            key={fc.id}
                            className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2"
                          >
                            <div className="font-semibold text-xs text-primary">{fc.question}</div>
                            <p className="text-xs text-text-secondary leading-relaxed">{fc.answer}</p>
                            <div className="text-[11px] text-warning">
                              <strong>Trap:</strong> {fc.trap}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sidebarView === 'C++17 & Output Traps' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
                        <h3 className="text-sm font-bold text-text-primary">C++17 STL Complexities</h3>
                        <div className="space-y-2">
                          {STL_CHEATSHEET.map((s) => (
                            <div key={s.name} className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs space-y-1">
                              <div className="flex justify-between gap-2">
                                <strong className="font-mono text-primary">{s.name}</strong>
                                <span className="font-mono text-[10px] text-text-muted">{s.ops}</span>
                              </div>
                              <div className="text-warning text-[11px]">{s.gotcha}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
                          <h3 className="text-sm font-bold text-text-primary">Silent Segfault &amp; Bug Traps</h3>
                          {CPP_COMMON_BUGS.map((b) => (
                            <div key={b.bug} className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs space-y-1">
                              <div className="font-mono text-danger font-semibold">{b.bug}</div>
                              <div className="text-text-secondary">{b.fix}</div>
                            </div>
                          ))}
                        </div>
                        {CPP_INTERVIEW_SNIPPETS.map((sn) => (
                          <div key={sn.id} className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-text-primary">{sn.title}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(`ref-${sn.id}`, sn.code)}
                                className="p-1 rounded bg-surface-elevated border border-border-subtle text-text-muted"
                              >
                                {copiedId === `ref-${sn.id}` ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <pre className="text-[11px] font-mono text-text-primary overflow-x-auto">{sn.code}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sidebarView === 'SQL & Query Internals' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {SQL_PATTERNS.map((pat) => (
                        <div key={pat.title} className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <h3 className="text-xs font-bold text-text-primary">{pat.title}</h3>
                            <button
                              type="button"
                              onClick={() => handleCopyText(`sqlref-${pat.title}`, pat.syntax)}
                              className="p-1 rounded bg-surface-elevated border border-border-subtle text-text-muted"
                            >
                              {copiedId === `sqlref-${pat.title}` ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <pre className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-mono overflow-x-auto">{pat.syntax}</pre>
                          <div className="text-[11px] text-warning">{pat.gotcha}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {sidebarView === 'DSA Pattern & Complexity' && (
                    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
                      <h3 className="text-sm font-bold text-text-primary">Constraint → Target Big-O (~10⁸ ops/sec)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {CONSTRAINT_SCALE_TABLE.map((row) => (
                          <div key={row.constraint} className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs space-y-1">
                            <div className="font-mono font-bold text-primary">{row.constraint} → {row.maxComplexity}</div>
                            <div className="text-text-secondary text-[11px]">{row.typicalAlgo}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 10-Q TIMED INTERVIEW MOCK TEST MODE (EXACT APTITUDE UX) */}
          {mode === 'mock' && mockQuestions.length > 0 && (
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${mockSecondsLeft < 90 ? 'text-danger' : 'text-primary'}`} />
                  <span className="font-mono text-sm font-bold text-text-primary">
                    {formatTimer(mockSecondsLeft)}
                  </span>
                  <span className="text-xs text-text-muted">
                    • Question {mockIdx + 1} of {mockQuestions.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!mockSubmitted ? (
                    <button
                      type="button"
                      onClick={() => setMockSubmitted(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-[#020202] text-xs font-bold hover:bg-primary-hover"
                    >
                      Submit Mock Test
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleStartMockRound(isQuizCategory(sidebarView) ? sidebarView : 'Mixed')
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-[#020202] text-xs font-bold hover:bg-primary-hover inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate New 10-Q Mock</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMode('stream')}
                    className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-xs text-text-secondary hover:text-text-primary"
                  >
                    Exit Mock
                  </button>
                </div>
              </div>

              {mockSubmitted && (
                <div className="p-4 rounded-xl bg-surface-elevated border border-primary/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-primary" />
                    <div>
                      <div className="text-sm font-bold text-text-primary">
                        Mock Score: {mockScore} / {mockQuestions.length} (
                        {Math.round((mockScore / mockQuestions.length) * 100)}%)
                      </div>
                      <div className="text-xs text-text-muted">
                        Click any numbered badge below to inspect the explanation and interview shortcut.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigator Pills */}
              <div className="flex flex-wrap gap-1.5">
                {mockQuestions.map((mq, idx) => {
                  const chosen = mockAnswers[idx];
                  const isCurrent = idx === mockIdx;
                  let pillCls = 'bg-surface-elevated border-border-subtle text-text-muted';
                  if (mockSubmitted) {
                    pillCls =
                      chosen === mq.correctIndex
                        ? 'bg-success-subtle border-success/40 text-success'
                        : 'bg-danger-subtle border-danger/40 text-danger';
                  } else if (chosen !== undefined) {
                    pillCls = 'bg-primary-subtle border-primary/40 text-primary';
                  }
                  return (
                    <button
                      key={mq.id}
                      type="button"
                      onClick={() => setMockIdx(idx)}
                      className={`w-8 h-8 rounded-lg border text-xs font-mono font-bold transition-all ${pillCls} ${
                        isCurrent ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Active Mock Question */}
              {(() => {
                const mq = mockQuestions[mockIdx];
                const chosen = mockAnswers[mockIdx];
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-primary">
                        {mq.category}
                      </span>
                      <span className="text-text-muted">{mq.subtopic}</span>
                    </div>

                    <h3 className="text-base font-semibold text-text-primary whitespace-pre-line">
                      {mq.question}
                    </h3>

                    {mq.codeSnippet && (
                      <pre className="p-4 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-mono text-text-primary overflow-x-auto leading-relaxed">
                        {mq.codeSnippet}
                      </pre>
                    )}

                    <div className="space-y-2.5">
                      {mq.options.map((opt, oIdx) => {
                        let cls =
                          'bg-surface-subtle hover:bg-surface-high border border-border-subtle text-text-primary';
                        if (mockSubmitted) {
                          if (oIdx === mq.correctIndex) {
                            cls = 'bg-success/15 border-success/45 text-success font-semibold';
                          } else if (oIdx === chosen) {
                            cls = 'bg-danger/15 border-danger/45 text-danger';
                          }
                        } else if (chosen === oIdx) {
                          cls = 'bg-primary-subtle border-primary/60 text-primary font-semibold';
                        }
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={mockSubmitted}
                            onClick={() =>
                              setMockAnswers((prev) => ({ ...prev, [mockIdx]: oIdx }))
                            }
                            className={`w-full text-left p-3.5 rounded-xl text-xs transition-colors flex items-center gap-3 ${cls}`}
                          >
                            <strong className="font-mono text-text-muted">
                              {String.fromCharCode(65 + oIdx)}.
                            </strong>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {mockSubmitted && (
                      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-secondary space-y-1.5">
                        <div>
                          <strong className="text-text-primary">Explanation:</strong> {mq.explanation}
                        </div>
                        <div className="text-primary font-mono">
                          Shortcut: <span className="text-text-secondary">{mq.shortcutTip}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-3 border-t border-border-subtle">
                      <button
                        type="button"
                        disabled={mockIdx === 0}
                        onClick={() => setMockIdx((i) => Math.max(0, i - 1))}
                        className="px-3.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-xs disabled:opacity-35"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={mockIdx >= mockQuestions.length - 1}
                        onClick={() => setMockIdx((i) => Math.min(mockQuestions.length - 1, i + 1))}
                        className="px-3.5 py-2 rounded-xl bg-primary text-[#020202] text-xs font-bold disabled:opacity-35"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* VAULT 1: DSA PATTERN PLAYBOOKS & LIVE CODEPREP IDE DRILLS */}
          {mode === 'stream' && sidebarView === 'vault-patterns' && (
            <div className="space-y-4 animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-text-secondary">
                  Spot trigger keywords → copy C++17 templates → jump straight into matching CodePrep IDE problems.
                </p>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={patternSearch}
                    onChange={(e) => setPatternSearch(e.target.value)}
                    placeholder="Filter DP, Dijkstra, DSU, Trie..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary w-56"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredPatterns.map((item) => {
                  const isDone = Boolean(patternsMastered[item.id]);
                  const copyKey = `pat-${item.id}`;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-5 space-y-3.5 transition-all bg-surface ${
                        isDone ? 'border-success/40' : 'border-border-subtle'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-text-primary">{item.pattern}</h3>
                          <div className="text-[11px] font-mono text-primary mt-0.5">{item.complexity}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPatternsMastered((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors shrink-0 ${
                            isDone
                              ? 'bg-success-subtle border-success/40 text-success'
                              : 'bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDone ? 'Confident' : 'Mark Ready'}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {item.triggerSignals.map((sig) => (
                          <span
                            key={sig}
                            className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] text-text-secondary"
                          >
                            {sig}
                          </span>
                        ))}
                      </div>

                      <div className="relative rounded-xl bg-surface-subtle border border-border-subtle p-3">
                        <button
                          type="button"
                          onClick={() => handleCopyText(copyKey, item.templateSnippet)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-text-muted hover:text-text-primary"
                          title="Copy C++ template"
                        >
                          {copiedId === copyKey ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <pre className="text-[11px] font-mono text-text-primary overflow-x-auto pr-8 leading-relaxed">
                          {item.templateSnippet}
                        </pre>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] text-warning flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span><strong>Watch out:</strong> {item.pitfall}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] font-mono uppercase text-text-muted">Drill now:</span>
                        {(() => {
                          const matched = resolvePatternProblems(item.topicKeywords);
                          if (matched.length === 0) {
                            return (
                              <button
                                type="button"
                                onClick={() => onTabChange('problems')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-mono text-primary"
                              >
                                <span>Browse {item.topicKeywords[0]}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            );
                          }
                          return matched.map((prob) => (
                            <button
                              key={prob.id}
                              type="button"
                              onClick={() => onSelectProblem(prob.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-mono text-primary"
                            >
                              <span>#{prob.id} {prob.title}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VAULT 2: HLD BLUEPRINTS & INTERACTIVE CAPACITY ESTIMATOR */}
          {mode === 'stream' && sidebarView === 'vault-sys-design' && (
            <div className="space-y-5 animate-fade-up">
              <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-text-primary">
                  45-Minute System Design Answering Framework
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {HLD_FRAMEWORK_STEPS.map((st) => (
                    <div key={st.letter} className="p-3 rounded-xl bg-surface-subtle border border-border-subtle space-y-1">
                      <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary text-[#020202] text-xs font-bold font-mono">
                        {st.letter}
                      </div>
                      <div className="text-xs font-semibold text-text-primary pt-1">{st.title}</div>
                      <p className="text-[11px] text-text-secondary leading-snug">{st.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-text-primary">Interactive HLD Capacity &amp; QPS Estimator</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="space-y-1 text-xs">
                    <span className="text-text-muted font-mono">DAU (Millions): {dauMillions}M</span>
                    <input type="range" min={1} max={500} value={dauMillions} onChange={(e) => setDauMillions(Number(e.target.value))} className="w-full accent-primary" />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-text-muted font-mono">Actions/User/Day: {reqPerUser}</span>
                    <input type="range" min={1} max={100} value={reqPerUser} onChange={(e) => setReqPerUser(Number(e.target.value))} className="w-full accent-primary" />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-text-muted font-mono">Write Payload: {payloadKb} KB</span>
                    <input type="range" min={1} max={500} value={payloadKb} onChange={(e) => setPayloadKb(Number(e.target.value))} className="w-full accent-primary" />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-text-muted font-mono">Read:Write Ratio {readWriteRatio}:1</span>
                    <input type="range" min={1} max={100} value={readWriteRatio} onChange={(e) => setReadWriteRatio(Number(e.target.value))} className="w-full accent-primary" />
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    { label: 'Avg QPS', val: capacityMetrics.avgQps },
                    { label: 'Peak QPS (3x)', val: capacityMetrics.peakQps },
                    { label: 'Read / Write QPS', val: `${capacityMetrics.readQps} / ${capacityMetrics.writeQps}` },
                    { label: 'Daily Storage', val: capacityMetrics.dailyGb },
                    { label: '5-Yr Storage (3x)', val: capacityMetrics.fiveYearTb },
                    { label: 'Hot 20% Cache', val: capacityMetrics.hotCacheGb },
                  ].map((m) => (
                    <div key={m.label} className="p-3 rounded-xl bg-surface-elevated border border-border-subtle">
                      <div className="text-[10px] font-mono uppercase text-text-muted">{m.label}</div>
                      <div className="text-sm font-bold font-mono text-primary mt-0.5">{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-text-primary">Numbers Every SDE Should Know by Heart</h2>
                  <span className="text-[11px] font-mono text-text-muted">86,400 sec/day ≈ 10⁵ sec</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {LATENCY_NUMBERS.map((n) => (
                    <div key={n.label} className="p-3 rounded-xl bg-surface-subtle border border-border-subtle space-y-0.5">
                      <div className="text-[11px] text-text-muted">{n.label}</div>
                      <div className="text-xs font-mono font-bold text-primary">{n.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(['ALL', 'HLD', 'LLD'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setSdKindFilter(kind)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-mono border transition-colors ${
                      sdKindFilter === kind
                        ? 'bg-primary-subtle border-primary/40 text-primary font-semibold'
                        : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {kind === 'ALL' ? 'All Blueprints (9)' : kind === 'HLD' ? 'High-Level Design (6)' : 'Low-Level OOP (3)'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredBlueprints.map((bp) => (
                  <div key={bp.id} className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3.5 shadow-sm">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-primary-subtle border border-primary/30 text-primary font-mono text-[10px] font-bold">
                        {bp.kind}
                      </span>
                      <h3 className="text-base font-bold text-text-primary mt-1.5">{bp.title}</h3>
                      <p className="text-[11px] font-mono text-text-muted mt-0.5">{bp.scope}</p>
                    </div>
                    <ul className="space-y-1">
                      {bp.coreComponents.map((comp) => (
                        <li key={comp} className="text-xs text-text-primary flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{comp}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-secondary leading-relaxed">
                      <strong className="text-text-primary">Deep Dive:</strong> {bp.deepDive}
                    </div>
                    <div className="text-xs text-text-secondary">
                      <strong className="text-primary">Trade-off:</strong> {bp.tradeoffs}
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] text-warning">
                      <strong>Follow-Up Curveball:</strong> {bp.followUpQuestion}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VAULT 3: LIVE CODING ROUND SIMULATOR (IDE LAUNCHER) */}
          {mode === 'stream' && sidebarView === 'vault-coding-mock' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start animate-fade-up">
              <div className="xl:col-span-8 space-y-5">
                <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">Live Coding IDE Round Simulator</h2>
                      <p className="text-xs text-text-secondary">
                        Generate real CodePrep DSA/SQL problems under strict interview countdowns.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle font-mono text-lg font-bold text-primary">
                        {formatTimer(simSecondsLeft)}
                      </div>
                      {simRunning && (
                        <button
                          type="button"
                          onClick={() => setSimPaused((p) => !p)}
                          className="p-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary"
                        >
                          {simPaused ? <Play className="w-4 h-4 text-success" /> : <Pause className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={launchCodingSimulator}
                        disabled={catalog.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:opacity-90 text-[#020202] text-xs font-bold disabled:opacity-40"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{simRunning ? 'Regenerate Slate' : 'Start Mock Round'}</span>
                      </button>
                      {simRunning && (
                        <>
                          <button
                            type="button"
                            onClick={handleLogMockSession}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success-subtle border border-success/40 text-success text-xs font-semibold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete &amp; Log</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSimRunning(false)}
                            className="p-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-text-secondary">
                      <input
                        type="checkbox"
                        checked={unsolvedOnly}
                        onChange={(e) => setUnsolvedOnly(e.target.checked)}
                        className="rounded border-border-subtle accent-primary"
                      />
                      <span>Prefer unsolved problems</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted font-mono">DSA Topic:</span>
                      <select
                        value={simTopicFilter}
                        onChange={(e) => setSimTopicFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-surface-subtle border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-primary"
                      >
                        <option value="ALL">Any Topic (Balanced)</option>
                        <option value="Arrays">Arrays &amp; Hashing</option>
                        <option value="Sliding Window">Sliding Window / Two Pointers</option>
                        <option value="Trees">Trees &amp; Graphs</option>
                        <option value="Dynamic Programming">Dynamic Programming</option>
                        <option value="Binary Search">Binary Search / Stack / Heap</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'sde-oa', title: 'SDE Online Assessment', sub: '3 DSA Problems • 45 mins' },
                      { id: 'faang-loop', title: 'FAANG Live Technical Round', sub: '1 Medium + 1 Hard DSA • 40 mins' },
                      { id: 'full-loop', title: 'Full-Stack Technical Mix', sub: '2 DSA + 1 SQL • 60 mins' },
                      { id: 'sql-round', title: 'Data / Analytics SQL Round', sub: '3 SQL Queries • 25 mins' },
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
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-text-muted">Q{idx + 1}</span>
                              <span className="px-2 py-0.5 rounded bg-surface-elevated text-primary">{prob.category}</span>
                              <span className={prob.difficulty === 'Easy' ? 'text-success' : prob.difficulty === 'Medium' ? 'text-warning' : 'text-danger'}>
                                {prob.difficulty}
                              </span>
                              <span className="text-text-muted truncate">• {prob.topic}</span>
                            </div>
                            <div className="font-semibold text-sm text-text-primary truncate">
                              #{prob.id} — {prob.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectProblem(prob.id)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-primary"
                          >
                            <span>Open IDE</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {mockHistory.length > 0 && (
                  <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-text-primary">Recent Mock Session Log</h3>
                      </div>
                      <button type="button" onClick={() => setMockHistory([])} className="text-[11px] font-mono text-text-muted hover:text-danger">
                        Clear Log
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {mockHistory.map((item) => (
                        <div key={item.id} className="p-3 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="font-semibold text-text-primary">{item.trackLabel}</div>
                            <div className="text-[11px] font-mono text-text-muted">{item.date} • {item.elapsedMinutes}m</div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-primary-subtle text-primary font-mono font-bold">
                            Rubric {item.rubricDone}/5
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="xl:col-span-4 bg-surface border border-border-subtle rounded-2xl p-5 space-y-3.5 shadow-sm">
                <div className="pb-2 border-b border-border-subtle">
                  <h3 className="text-sm font-semibold text-text-primary">Think-Aloud Interviewer Rubric</h3>
                  <p className="text-[11px] text-text-muted mt-0.5">Check off every stage while solving.</p>
                </div>
                <div className="space-y-2.5">
                  {THINK_ALOUD_RUBRIC.map((r) => {
                    const ok = Boolean(rubricChecks[r.step]);
                    return (
                      <button
                        key={r.step}
                        type="button"
                        onClick={() => setRubricChecks((prev) => ({ ...prev, [r.step]: !prev[r.step] }))}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          ok ? 'bg-success-subtle/50 border-success/40' : 'bg-surface-subtle border-border-subtle hover:bg-surface-elevated'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${ok ? 'text-success' : 'text-text-muted'}`} />
                          <span>{r.step}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1 pl-6 leading-snug">{r.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VAULT 4: PUZZLES & COMPANY ARCHETYPES */}
          {mode === 'stream' && sidebarView === 'vault-puzzles-co' && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-text-primary">
                    Classic Brainteasers &amp; Probability Puzzles ({Object.values(puzzlesSolved).filter(Boolean).length}/{BRAIN_TEASERS.length})
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {(['All', 'Logic', 'Probability', 'Bitwise / Math'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPuzzleFilter(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          puzzleFilter === cat
                            ? 'bg-primary-subtle border-primary/40 text-primary font-semibold'
                            : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPuzzles.map((pz) => {
                    const solved = Boolean(puzzlesSolved[pz.id]);
                    const showHint = Boolean(puzzleHintOpen[pz.id]);
                    const showAns = Boolean(puzzleAnsOpen[pz.id]);
                    return (
                      <div key={pz.id} className={`bg-surface border rounded-2xl p-5 space-y-3 ${solved ? 'border-success/40' : 'border-border-subtle'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-primary">
                            {pz.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPuzzlesSolved((prev) => ({ ...prev, [pz.id]: !prev[pz.id] }))}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                              solved ? 'bg-success-subtle border-success/40 text-success' : 'bg-surface-elevated border-border-subtle text-text-muted'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{solved ? 'Solved' : 'Mark Solved'}</span>
                          </button>
                        </div>
                        <h3 className="text-sm font-bold text-text-primary">{pz.title}</h3>
                        <p className="text-xs text-text-secondary leading-relaxed">{pz.prompt}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setPuzzleHintOpen((prev) => ({ ...prev, [pz.id]: !prev[pz.id] }))}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-xs text-warning font-medium"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPuzzleAnsOpen((prev) => ({ ...prev, [pz.id]: !prev[pz.id] }))}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-subtle border border-primary/30 text-xs text-primary font-semibold"
                          >
                            {showAns ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showAns ? 'Hide Solution' : 'Reveal Solution'}</span>
                          </button>
                        </div>
                        {showHint && (
                          <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-warning">
                            <strong>Hint:</strong> {pz.hint}
                          </div>
                        )}
                        {showAns && (
                          <div className="p-3 rounded-xl bg-surface-elevated border border-success/30 text-xs text-text-primary leading-relaxed">
                            <strong className="text-success">Answer:</strong> {pz.solution}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-bold text-text-primary">Company-Specific Hiring Playbooks</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COMPANY_ARCHETYPES.map((co) => (
                    <div key={co.company} className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm">
                      <h3 className="text-sm font-bold text-primary">{co.company}</h3>
                      <p className="text-xs font-semibold text-text-primary">{co.focus}</p>
                      <ul className="space-y-1.5">
                        {co.roundsBreakdown.map((rb) => (
                          <li key={rb} className="text-xs text-text-secondary flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{rb}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-primary">
                        <strong className="text-success">Winning Habit:</strong> {co.winningHabit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VAULT 5: STAR STORIES, RECOVERY PHRASES & HR CHECKLIST */}
          {mode === 'stream' && sidebarView === 'vault-star-hr' && (
            <div className="space-y-6 animate-fade-up">
              <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    How to Recover Gracefully When Stuck Live (Exact Scripts)
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {RECOVERY_PHRASES.map((rp) => {
                    const key = `rec-${rp.moment}`;
                    return (
                      <div key={rp.moment} className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-2 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-mono text-primary font-semibold">{rp.moment}</div>
                          <p className="text-xs text-text-secondary italic leading-relaxed">{rp.phrase}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(key, rp.phrase)}
                          className="self-end inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-subtle text-[11px] text-text-muted hover:text-text-primary"
                        >
                          {copiedId === key ? <><Check className="w-3 h-3 text-success" /><span className="text-success">Copied</span></> : <><Copy className="w-3 h-3" /><span>Copy</span></>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-text-primary">STAR Behavioral Story Vault (6 Core Stories)</h2>
                  <p className="text-xs text-text-secondary">Edit &amp; persist your personal project stories locally.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(STAR_KEY, JSON.stringify(starNotes));
                      setStarSavedFlash(true);
                      setTimeout(() => setStarSavedFlash(false), 2000);
                    } catch {}
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-[#020202] text-xs font-bold hover:opacity-90"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{starSavedFlash ? 'Stories Saved ✓' : 'Save Stories'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFAULT_STAR_PROMPTS.map((item) => (
                  <div key={item.id} className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-2.5 shadow-sm">
                    <label className="block text-xs font-semibold text-text-primary">{item.title}</label>
                    <textarea
                      rows={4}
                      value={starNotes[item.id] ?? ''}
                      onChange={(e) => setStarNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-primary resize-y leading-relaxed"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 bg-surface border border-border-subtle rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-text-primary">High-Signal Questions to Ask the Interviewer</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {QUESTIONS_TO_ASK_INTERVIEWER.map((group) => (
                      <div key={group.category} className="space-y-2">
                        <div className="text-[11px] font-mono uppercase text-primary font-semibold">{group.category}</div>
                        <div className="space-y-2">
                          {group.questions.map((q, idx) => {
                            const key = `q-${group.category}-${idx}`;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleCopyText(key, q)}
                                className="w-full text-left p-2.5 rounded-xl bg-surface-subtle hover:bg-surface-elevated border border-border-subtle text-xs text-text-secondary hover:text-text-primary flex items-start justify-between gap-2"
                              >
                                <span className="leading-snug">{q}</span>
                                {copiedId === key ? <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" /> : <Copy className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                    <ShieldCheck className="w-4 h-4 text-success" />
                    <h3 className="text-sm font-semibold text-text-primary">Last-Minute Edge-Case Sanity Checklist</h3>
                  </div>
                  <div className="space-y-2">
                    {PRE_INTERVIEW_CHECKLIST.map((line, i) => {
                      const ok = Boolean(preChecks[i]);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreChecks((prev) => ({ ...prev, [i]: !prev[i] }))}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                            ok ? 'bg-success-subtle/50 border-success/40 text-text-primary' : 'bg-surface-subtle border-border-subtle text-text-secondary'
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${ok ? 'text-success' : 'text-text-muted'}`} />
                          <span>{line}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VAULT 6: GEMINI AI INTERVIEW COACH */}
          {mode === 'stream' && sidebarView === 'vault-ai-coach' && (
            <div className="space-y-5 animate-fade-up">
              <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span>AI Interview Coach &amp; Mock Grader</span>
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Powered by Google Gemini — grade your System Design / CS / STAR answers out of 10 or ask any concept doubt.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCoachMode('critique')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        coachMode === 'critique'
                          ? 'bg-primary text-[#020202] border-primary'
                          : 'bg-surface-elevated border-border-subtle text-text-secondary'
                      }`}
                    >
                      Grade My Answer
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoachMode('ask')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        coachMode === 'ask'
                          ? 'bg-primary text-[#020202] border-primary'
                          : 'bg-surface-elevated border-border-subtle text-text-secondary'
                      }`}
                    >
                      Ask Anything
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-text-muted">Topic / Round</label>
                    <select
                      value={coachTopic}
                      onChange={(e) => setCoachTopic(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="System Design">System Design (HLD / LLD)</option>
                      <option value="DSA & Complexity">DSA &amp; Time Complexity</option>
                      <option value="OS & Concurrency">OS &amp; Concurrency</option>
                      <option value="DBMS & SQL">DBMS &amp; SQL</option>
                      <option value="C++17 & OOPs">C++17 &amp; OOPs</option>
                      <option value="STAR Behavioral / HR">STAR Behavioral / HR</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-text-muted">
                      {coachMode === 'critique' ? 'Interview Question Prompt' : 'Your Technical Doubt / Question'}
                    </label>
                    <input
                      type="text"
                      value={coachQuestion}
                      onChange={(e) => setCoachQuestion(e.target.value)}
                      placeholder={
                        coachMode === 'critique'
                          ? 'e.g., Explain B+ Trees vs Hash Indexes'
                          : 'e.g., Why does Write Skew happen under Postgres Repeatable Read?'
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {coachMode === 'critique' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-text-muted">
                      Your Spoken / Written Answer Draft
                    </label>
                    <textarea
                      rows={5}
                      value={coachAnswer}
                      onChange={(e) => setCoachAnswer(e.target.value)}
                      placeholder="Write how you would explain this aloud to an interviewer (trade-offs, complexity, edge cases, metrics)..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-primary resize-y leading-relaxed"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={coachLoading}
                    onClick={runAiInterviewCoach}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#020202] text-xs font-bold disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {coachLoading
                        ? 'Analyzing with Gemini...'
                        : coachMode === 'critique'
                          ? 'Evaluate & Get Curveball'
                          : 'Ask Gemini Coach'}
                    </span>
                  </button>
                </div>

                {coachReply && (
                  <div className="p-5 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5 animate-fade-up">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-text-primary flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span>Coach Feedback</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] border ${
                          coachReply.provider === 'gemini'
                            ? 'bg-success-subtle border-success/40 text-success'
                            : 'bg-surface-elevated border-border-subtle text-warning'
                        }`}
                      >
                        {coachReply.provider === 'gemini' ? 'Gemini Live' : 'Offline Fallback'}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                      {coachReply.reply}
                    </div>
                    {coachReply.note && (
                      <div className="text-[11px] font-mono text-warning pt-2 border-t border-border-subtle">
                        Note: {coachReply.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
};
