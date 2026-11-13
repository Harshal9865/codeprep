import React, { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
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
  CsSubject,
  BrainTeaserItem,
} from '../data/interviewKitData';
import {
  Cpu,
  BookOpen,
  Code2,
  Timer,
  MessageSquare,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Save,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Network,
  Compass,
  Database,
  Flame,
  ShieldCheck,
  HelpCircle,
  Brain,
  Calculator,
  Building2,
  Layers,
  ChevronRight,
  ChevronLeft,
  Shuffle,
  History,
  Lightbulb,
} from 'lucide-react';

interface InterviewPrepPageProps {
  onTabChange: (tab: string) => void;
  onSelectProblem: (problemId: number) => void;
}

type PrepSectionTab =
  | 'patterns'
  | 'cs-core'
  | 'sys-design'
  | 'stl-sql'
  | 'puzzles-co'
  | 'mock-sim'
  | 'star-hr';

interface ProblemLite {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'DSA' | 'SQL';
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

const MASTERED_KEY = 'codeprep_cs_mastered_v1';
const PATTERNS_DONE_KEY = 'codeprep_patterns_done_v1';
const PUZZLES_DONE_KEY = 'codeprep_puzzles_done_v1';
const STAR_KEY = 'codeprep_star_notes_v1';
const MOCK_LOG_KEY = 'codeprep_mock_history_v1';

export const InterviewPrepPage: React.FC<InterviewPrepPageProps> = ({
  onTabChange,
  onSelectProblem,
}) => {
  const [section, setSection] = useState<PrepSectionTab>('patterns');

  // Pattern Playbook state
  const [patternSearch, setPatternSearch] = useState('');
  const [patternsMastered, setPatternsMastered] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(PATTERNS_DONE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // CS Core state
  const [subjectFilter, setSubjectFilter] = useState<CsSubject>('All');
  const [csSearch, setCsSearch] = useState('');
  const [recallMode, setRecallMode] = useState(true);
  const [deckMode, setDeckMode] = useState(false);
  const [deckIdx, setDeckIdx] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(MASTERED_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // System Design & Capacity Calculator state
  const [sdKindFilter, setSdKindFilter] = useState<'ALL' | 'HLD' | 'LLD'>('ALL');
  const [dauMillions, setDauMillions] = useState(10);
  const [reqPerUser, setReqPerUser] = useState(20);
  const [payloadKb, setPayloadKb] = useState(2);
  const [readWriteRatio, setReadWriteRatio] = useState(10);

  // STL / SQL sub-tab + Copy helper
  const [edgeSubTab, setEdgeSubTab] = useState<'stl' | 'sql'>('stl');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Puzzles & Companies state
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

  // Mock Interview Simulator state
  const [catalog, setCatalog] = useState<ProblemLite[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<{
    totalSolved: number;
    totalProblems: number;
    currentStreak: number;
  } | null>(null);
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

  useEffect(() => {
    try {
      localStorage.setItem(MASTERED_KEY, JSON.stringify(masteredIds));
    } catch {}
  }, [masteredIds]);

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
    apiRequest<{ problems: ProblemLite[] }>('/problems?pageSize=600')
      .then((res) => setCatalog(res.problems || []))
      .catch(() => {});

    apiRequest<{
      analytics?: { totalSolved?: number; totalProblems?: number; currentStreak?: number };
    }>('/analytics/dashboard')
      .then((res) => {
        if (res?.analytics) {
          setAnalyticsStats({
            totalSolved: res.analytics.totalSolved ?? 0,
            totalProblems: res.analytics.totalProblems ?? 600,
            currentStreak: res.analytics.currentStreak ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

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

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    });
  };

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

  const filteredCards = useMemo(() => {
    const q = csSearch.trim().toLowerCase();
    return CS_FLASHCARDS.filter((c) => {
      const subjOk = subjectFilter === 'All' || c.subject === subjectFilter;
      const searchOk =
        !q ||
        c.question.toLowerCase().includes(q) ||
        c.answer.toLowerCase().includes(q) ||
        c.trap.toLowerCase().includes(q);
      return subjOk && searchOk;
    });
  }, [subjectFilter, csSearch]);

  useEffect(() => {
    if (deckIdx >= filteredCards.length) {
      setDeckIdx(0);
    }
  }, [filteredCards.length, deckIdx]);

  const masteredCount = useMemo(
    () => CS_FLASHCARDS.filter((c) => masteredIds[c.id]).length,
    [masteredIds]
  );

  const patternsCount = useMemo(
    () => PATTERN_PLAYBOOK.filter((p) => patternsMastered[p.id]).length,
    [patternsMastered]
  );

  const puzzlesCount = useMemo(
    () => BRAIN_TEASERS.filter((b) => puzzlesSolved[b.id]).length,
    [puzzlesSolved]
  );

  const readinessScore = useMemo(() => {
    const csPart = (masteredCount / Math.max(1, CS_FLASHCARDS.length)) * 30;
    const patPart = (patternsCount / Math.max(1, PATTERN_PLAYBOOK.length)) * 30;
    const puzPart = (puzzlesCount / Math.max(1, BRAIN_TEASERS.length)) * 10;
    const solveRatio = Math.min(1, (analyticsStats?.totalSolved ?? 0) / 75);
    const solvePart = solveRatio * 30;
    return Math.round(csPart + patPart + puzPart + solvePart);
  }, [masteredCount, patternsCount, puzzlesCount, analyticsStats]);

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

  // Capacity math calculations (live)
  const capacityMetrics = useMemo(() => {
    const dailyReqs = dauMillions * 1_000_000 * reqPerUser;
    const avgQps = dailyReqs / 86400;
    const peakQps = avgQps * 3;
    const writeShare = 1 / Math.max(1, readWriteRatio + 1);
    const writeQps = avgQps * writeShare;
    const readQps = avgQps - writeQps;
    const dailyGb = (dailyReqs * writeShare * payloadKb) / (1024 * 1024);
    const fiveYearTb = (dailyGb * 365 * 5 * 3) / 1024; // 3x replication
    const hotCacheGb = (dailyReqs * payloadKb * 0.2) / (1024 * 1024); // 20% hot read working set

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

  const launchMockSimulator = () => {
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

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const jumpToUnmasteredCard = () => {
    if (filteredCards.length === 0) return;
    const unmasteredIndices = filteredCards
      .map((c, idx) => (!masteredIds[c.id] ? idx : -1))
      .filter((idx) => idx !== -1);
    const pool = unmasteredIndices.length > 0 ? unmasteredIndices : filteredCards.map((_, i) => i);
    const nextIdx = pool[Math.floor(Math.random() * pool.length)];
    setDeckIdx(nextIdx);
  };

  const activeDeckCard = filteredCards[deckIdx];

  return (
    <AppLayout currentTab="prep" onTabChange={onTabChange} currentStreak={analyticsStats?.currentStreak}>
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-7 space-y-6 animate-page-enter">
        {/* Placement Command Hero */}
        <section className="relative overflow-hidden bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm space-y-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl opacity-10"
            style={{ backgroundColor: 'var(--border-active)' }}
          />

          <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-semibold border border-primary/25">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Complete SDE Placement Command Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Interview Kit
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                14 DSA pattern playbooks, 31 active-recall CS Core cards, HLD capacity math &amp; 9 design blueprints, C++/SQL trap busters, tech brainteasers, company playbooks, and timed mock rounds.
              </p>
            </div>

            {/* Live Readiness Scoreboard */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0">
              <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
                <div className="text-[10px] font-mono uppercase text-text-muted">Readiness</div>
                <div className="text-lg font-bold font-mono text-primary mt-0.5">{readinessScore}%</div>
              </div>
              <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
                <div className="text-[10px] font-mono uppercase text-text-muted">Patterns</div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                  {patternsCount}
                  <span className="text-xs font-normal text-text-muted">/{PATTERN_PLAYBOOK.length}</span>
                </div>
              </div>
              <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
                <div className="text-[10px] font-mono uppercase text-text-muted">CS Core</div>
                <div className="text-lg font-bold font-mono text-success mt-0.5">
                  {masteredCount}
                  <span className="text-xs font-normal text-text-muted">/{CS_FLASHCARDS.length}</span>
                </div>
              </div>
              <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
                <div className="text-[10px] font-mono uppercase text-text-muted">Puzzles</div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                  {puzzlesCount}
                  <span className="text-xs font-normal text-text-muted">/{BRAIN_TEASERS.length}</span>
                </div>
              </div>
              <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono uppercase text-text-muted flex items-center gap-1">
                  <Flame className="w-3 h-3 text-primary" />
                  <span>POTD Streak</span>
                </div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                  {analyticsStats?.currentStreak ?? 0}d
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Section Navigation */}
          <div className="relative flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
            {[
              { id: 'patterns', label: 'Pattern Playbook (14)', icon: <Compass className="w-3.5 h-3.5" /> },
              { id: 'cs-core', label: 'CS Core Recall (31)', icon: <Cpu className="w-3.5 h-3.5" /> },
              { id: 'sys-design', label: 'System Design & Calc', icon: <Network className="w-3.5 h-3.5" /> },
              { id: 'stl-sql', label: 'C++ STL, Bugs & SQL', icon: <Code2 className="w-3.5 h-3.5" /> },
              { id: 'puzzles-co', label: 'Puzzles & Companies', icon: <Brain className="w-3.5 h-3.5" /> },
              { id: 'mock-sim', label: 'Timed Mock & Log', icon: <Timer className="w-3.5 h-3.5" /> },
              { id: 'star-hr', label: 'STAR, Recovery & HR', icon: <MessageSquare className="w-3.5 h-3.5" /> },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSection(t.id as PrepSectionTab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  section === t.id
                    ? 'bg-primary text-[#020202] border-primary shadow-sm'
                    : 'bg-surface-elevated text-text-secondary border-border-subtle hover:text-text-primary hover:bg-surface-high'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* TAB 1: DSA PATTERN PLAYBOOK */}
        {section === 'patterns' && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-text-secondary">
                Spot the prompt keyword → lock the right template in under 30 seconds → jump straight into CodePrep practice problems.
              </p>
              <div className="flex items-center gap-3">
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
                <span className="text-xs font-mono text-text-muted shrink-0">
                  Mastered: <strong className="text-primary">{patternsCount}</strong>/{PATTERN_PLAYBOOK.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                        title="Copy C++ template"
                      >
                        {copiedId === copyKey ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <pre className="text-[11px] font-mono text-text-primary overflow-x-auto pr-8 leading-relaxed">
                        {item.templateSnippet}
                      </pre>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] text-warning flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Watch out:</strong> {item.pitfall}
                      </span>
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-mono text-primary transition-colors"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-mono text-primary transition-colors"
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

        {/* TAB 2: CS CORE ACTIVE RECALL + FOCUS DECK */}
        {section === 'cs-core' && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {(
                  ['All', 'OS', 'DBMS', 'SQL Internals', 'Networks', 'C++ & OOPs', 'System Design'] as CsSubject[]
                ).map((subj) => (
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
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={csSearch}
                    onChange={(e) => setCsSearch(e.target.value)}
                    placeholder="Filter OS, ACID, epoll, Kafka..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary w-52"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setDeckMode((d) => !d)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-colors ${
                    deckMode
                      ? 'bg-primary text-[#020202] border-primary font-semibold'
                      : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{deckMode ? 'Grid View' : '1-by-1 Study Deck'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecallMode((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-colors ${
                    recallMode
                      ? 'bg-primary-subtle border-primary/40 text-primary'
                      : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {recallMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{recallMode ? 'Blur On' : 'Show Answers'}</span>
                </button>
              </div>
            </div>

            {deckMode && activeDeckCard ? (
              <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 max-w-3xl mx-auto shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-primary">
                      {activeDeckCard.subject}
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      Card {deckIdx + 1} / {filteredCards.length} • {activeDeckCard.frequency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={jumpToUnmasteredCard}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-secondary"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-primary" />
                      <span>Random Unmastered</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMasteredIds((prev) => ({
                          ...prev,
                          [activeDeckCard.id]: !prev[activeDeckCard.id],
                        }))
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                        masteredIds[activeDeckCard.id]
                          ? 'bg-success-subtle border-success/40 text-success'
                          : 'bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{masteredIds[activeDeckCard.id] ? 'Mastered' : 'Mark Revised'}</span>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-text-primary leading-snug">
                  {activeDeckCard.question}
                </h3>

                <div className="relative rounded-xl bg-surface-subtle border border-border-subtle p-4 min-h-[110px]">
                  <p
                    className={`text-sm text-text-secondary leading-relaxed transition-all ${
                      recallMode && !revealedCards[activeDeckCard.id] ? 'blur-sm select-none' : ''
                    }`}
                  >
                    {activeDeckCard.answer}
                  </p>
                  {recallMode && !revealedCards[activeDeckCard.id] && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedCards((prev) => ({ ...prev, [activeDeckCard.id]: true }))
                      }
                      className="absolute inset-0 m-auto w-fit h-fit px-4 py-2 rounded-xl bg-surface-elevated border border-primary/40 text-xs font-semibold text-primary shadow-sm hover:bg-surface-high"
                    >
                      Reveal Answer
                    </button>
                  )}
                </div>

                {(!recallMode || revealedCards[activeDeckCard.id]) && (
                  <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle text-xs text-warning flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Interviewer Follow-up Trap:</strong> {activeDeckCard.trap}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    disabled={deckIdx <= 0}
                    onClick={() => setDeckIdx((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-xs font-semibold text-text-primary disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={deckIdx >= filteredCards.length - 1}
                    onClick={() => setDeckIdx((i) => Math.min(filteredCards.length - 1, i + 1))}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-[#020202] text-xs font-bold disabled:opacity-40"
                  >
                    <span>Next Card</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCards.map((card) => {
                  const isDone = Boolean(masteredIds[card.id]);
                  const isRevealed = !recallMode || Boolean(revealedCards[card.id]);
                  return (
                    <div
                      key={card.id}
                      className={`rounded-2xl border p-5 space-y-3 transition-all bg-surface ${
                        isDone ? 'border-success/40' : 'border-border-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-primary">
                            {card.subject}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">{card.frequency}</span>
                        </div>
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

                      <h3 className="text-sm font-semibold text-text-primary leading-snug">{card.question}</h3>

                      <div className="relative rounded-xl bg-surface-subtle border border-border-subtle p-3">
                        <p
                          className={`text-xs text-text-secondary leading-relaxed transition-all ${
                            isRevealed ? '' : 'blur-sm select-none'
                          }`}
                        >
                          {card.answer}
                        </p>
                        {!isRevealed && (
                          <button
                            type="button"
                            onClick={() => setRevealedCards((prev) => ({ ...prev, [card.id]: true }))}
                            className="absolute inset-0 m-auto w-fit h-fit px-3.5 py-1.5 rounded-lg bg-surface-elevated border border-primary/40 text-xs font-semibold text-primary shadow-sm hover:bg-surface-high"
                          >
                            Click to Recall Answer
                          </button>
                        )}
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] text-warning flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>Interviewer Trap:</strong> {card.trap}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYSTEM DESIGN, RADIO FRAMEWORK & INTERACTIVE QPS CALCULATOR */}
        {section === 'sys-design' && (
          <div className="space-y-5 animate-fade-up">
            {/* RADIO 5-Step Interview Answering Framework */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-text-primary">
                45-Minute System Design Answering Playbook (Never Freeze on Vague Prompts)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {HLD_FRAMEWORK_STEPS.map((st) => (
                  <div
                    key={st.letter}
                    className="p-3 rounded-xl bg-surface-subtle border border-border-subtle space-y-1"
                  >
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary text-[#020202] text-xs font-bold font-mono">
                      {st.letter}
                    </div>
                    <div className="text-xs font-semibold text-text-primary pt-1">{st.title}</div>
                    <p className="text-[11px] text-text-secondary leading-snug">{st.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Back-of-the-Envelope Capacity Estimator */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">
                  Interactive HLD Capacity &amp; QPS Estimator
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="text-text-muted font-mono">DAU (Millions): {dauMillions}M</span>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    value={dauMillions}
                    onChange={(e) => setDauMillions(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-text-muted font-mono">Actions/User/Day: {reqPerUser}</span>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={reqPerUser}
                    onChange={(e) => setReqPerUser(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-text-muted font-mono">Write Payload: {payloadKb} KB</span>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    value={payloadKb}
                    onChange={(e) => setPayloadKb(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-text-muted font-mono">Read:Write Ratio {readWriteRatio}:1</span>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={readWriteRatio}
                    onChange={(e) => setReadWriteRatio(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                {[
                  { label: 'Avg QPS', val: capacityMetrics.avgQps },
                  { label: 'Peak QPS (3x)', val: capacityMetrics.peakQps },
                  { label: 'Read / Write QPS', val: `${capacityMetrics.readQps} / ${capacityMetrics.writeQps}` },
                  { label: 'Daily New Storage', val: capacityMetrics.dailyGb },
                  { label: '5-Yr Storage (3x rep)', val: capacityMetrics.fiveYearTb },
                  { label: 'Hot 20% Cache RAM', val: capacityMetrics.hotCacheGb },
                ].map((m) => (
                  <div key={m.label} className="p-3 rounded-xl bg-surface-elevated border border-border-subtle">
                    <div className="text-[10px] font-mono uppercase text-text-muted">{m.label}</div>
                    <div className="text-sm font-bold font-mono text-primary mt-0.5">{m.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latency & Scale Estimation Strip */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-text-primary">
                  Numbers Every SDE Should Know by Heart
                </h2>
                <span className="text-[11px] font-mono text-text-muted">86,400 sec/day ≈ 10⁵ sec</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {LATENCY_NUMBERS.map((n) => (
                  <div
                    key={n.label}
                    className="p-3 rounded-xl bg-surface-subtle border border-border-subtle space-y-0.5"
                  >
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
                  {kind === 'ALL' ? 'All Blueprints (9)' : kind === 'HLD' ? 'High-Level Design (6)' : 'Low-Level OOP / Concurrency (3)'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredBlueprints.map((bp) => (
                <div
                  key={bp.id}
                  className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-primary-subtle border border-primary/30 text-primary font-mono text-[10px] font-bold">
                        {bp.kind}
                      </span>
                      <h3 className="text-base font-bold text-text-primary mt-1.5">{bp.title}</h3>
                      <p className="text-[11px] font-mono text-text-muted mt-0.5">{bp.scope}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono uppercase text-text-muted">Core Architecture</div>
                    <ul className="space-y-1">
                      {bp.coreComponents.map((comp) => (
                        <li key={comp} className="text-xs text-text-primary flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{comp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">Deep Dive:</strong> {bp.deepDive}
                  </div>

                  <div className="text-xs text-text-secondary">
                    <strong className="text-primary">Key Trade-off:</strong> {bp.tradeoffs}
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] text-warning">
                    <strong>Follow-Up Curveball:</strong> {bp.followUpQuestion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: C++17 STL, BUG TRAPS & SQL PATTERNS */}
        {section === 'stl-sql' && (
          <div className="space-y-5 animate-fade-up">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEdgeSubTab('stl')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  edgeSubTab === 'stl'
                    ? 'bg-primary-subtle border-primary/40 text-primary'
                    : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>C++17 STL, Snippets &amp; Bug Traps</span>
              </button>
              <button
                type="button"
                onClick={() => setEdgeSubTab('sql')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  edgeSubTab === 'sql'
                    ? 'bg-primary-subtle border-primary/40 text-primary'
                    : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>SQL Interview Patterns (6)</span>
              </button>
            </div>

            {edgeSubTab === 'stl' ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  <div className="xl:col-span-8 bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-sm text-text-primary">
                        C++17 STL Containers &amp; Interview Complexity Gotchas
                      </h2>
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {STL_CHEATSHEET.map((row) => (
                        <div key={row.name} className="p-4 sm:px-6 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-primary">{row.name}</span>
                            <span className="font-mono text-[11px] text-text-secondary bg-surface-elevated px-2.5 py-0.5 rounded-full border border-border-subtle">
                              {row.ops}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary">{row.whenToUse}</p>
                          <div className="text-xs text-text-muted bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2">
                            <strong className="text-warning">Gotcha:</strong> {row.gotcha}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="xl:col-span-4 space-y-5">
                    <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-5 py-4 border-b border-border-subtle">
                        <h3 className="font-semibold text-sm text-text-primary">
                          Constraint → Target Big-O (~10⁸ ops/sec)
                        </h3>
                      </div>
                      <div className="divide-y divide-border-subtle">
                        {CONSTRAINT_SCALE_TABLE.map((r) => (
                          <div key={r.constraint} className="p-3.5 space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs font-mono">
                              <span className="text-text-primary font-semibold">{r.constraint}</span>
                              <span className="text-primary font-bold">{r.maxComplexity}</span>
                            </div>
                            <div className="text-[11px] text-text-muted">{r.typicalAlgo}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm">
                      <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span>Silent C++ Bug &amp; Segfault Busters</span>
                      </h3>
                      <div className="space-y-2.5">
                        {CPP_COMMON_BUGS.map((item) => (
                          <div
                            key={item.bug}
                            className="p-3 rounded-xl bg-surface-subtle border border-border-subtle space-y-1 text-xs"
                          >
                            <div className="font-mono text-danger font-semibold">{item.bug}</div>
                            <div className="text-text-secondary">{item.fix}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copyable C++ Snippets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {CPP_INTERVIEW_SNIPPETS.map((snip) => {
                    const copyKey = `cpp-${snip.id}`;
                    return (
                      <div
                        key={snip.id}
                        className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-text-primary">{snip.title}</h3>
                          <button
                            type="button"
                            onClick={() => handleCopyText(copyKey, snip.code)}
                            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                          >
                            {copiedId === copyKey ? (
                              <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <pre className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-mono text-text-primary overflow-x-auto leading-relaxed">
                          {snip.code}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {SQL_PATTERNS.map((pat) => {
                  const copyKey = `sql-${pat.title}`;
                  return (
                    <div
                      key={pat.title}
                      className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-text-primary">{pat.title}</h3>
                        <button
                          type="button"
                          onClick={() => handleCopyText(copyKey, pat.syntax)}
                          className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                          title="Copy SQL query"
                        >
                          {copiedId === copyKey ? (
                            <Check className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-mono text-text-primary overflow-x-auto leading-relaxed">
                        {pat.syntax}
                      </pre>
                      <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-[11px] text-warning">
                        <strong>Edge Case:</strong> {pat.gotcha}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: BRAINTEASER PUZZLES & COMPANY ARCHETYPES */}
        {section === 'puzzles-co' && (
          <div className="space-y-6 animate-fade-up">
            {/* Puzzles Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    Classic Interview Brainteasers &amp; Probability Puzzles
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Frequently asked in Quant, Goldman Sachs, Microsoft, Google, and top product company rounds.
                  </p>
                </div>
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
                    <div
                      key={pz.id}
                      className={`bg-surface border rounded-2xl p-5 space-y-3 ${
                        solved ? 'border-success/40' : 'border-border-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-[11px] font-mono text-primary">
                          {pz.category}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPuzzlesSolved((prev) => ({ ...prev, [pz.id]: !prev[pz.id] }))
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                            solved
                              ? 'bg-success-subtle border-success/40 text-success'
                              : 'bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary'
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
                          onClick={() =>
                            setPuzzleHintOpen((prev) => ({ ...prev, [pz.id]: !prev[pz.id] }))
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs text-warning font-medium"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPuzzleAnsOpen((prev) => ({ ...prev, [pz.id]: !prev[pz.id] }))
                          }
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

            {/* Company Round Archetypes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-text-primary">
                  Company-Specific Hiring Playbooks
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COMPANY_ARCHETYPES.map((co) => (
                  <div
                    key={co.company}
                    className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm"
                  >
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

        {/* TAB 6: TIMED MOCK INTERVIEW SIMULATOR + LOG + THINK-ALOUD RUBRIC */}
        {section === 'mock-sim' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start animate-fade-up">
            <div className="xl:col-span-8 space-y-5">
              <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Live Mock Round Simulator</h2>
                    <p className="text-xs text-text-secondary">
                      Pick a company format &amp; optional topic focus, run under countdown pressure, and log completed sessions.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="px-4 py-2 rounded-xl bg-surface-subtle border border-border-subtle font-mono text-lg font-bold text-primary">
                      {formatDuration(simSecondsLeft)}
                    </div>

                    {simRunning && (
                      <button
                        type="button"
                        onClick={() => setSimPaused((p) => !p)}
                        className="p-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary hover:bg-surface-high"
                        title={simPaused ? 'Resume timer' : 'Pause timer'}
                      >
                        {simPaused ? <Play className="w-4 h-4 text-success" /> : <Pause className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={launchMockSimulator}
                      disabled={catalog.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:opacity-90 text-[#020202] text-xs font-bold disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{simRunning ? 'Regenerate Slate' : 'Start Mock Round'}</span>
                    </button>

                    {simRunning && (
                      <button
                        type="button"
                        onClick={handleLogMockSession}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success-subtle border border-success/40 text-success text-xs font-semibold hover:opacity-90"
                        title="Finish and log session"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete &amp; Log</span>
                      </button>
                    )}

                    {simRunning && (
                      <button
                        type="button"
                        onClick={() => setSimRunning(false)}
                        className="p-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted hover:text-text-primary"
                        title="Reset Timer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
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
                    <span>Prefer unsolved problems when generating slate</span>
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
                            <span className="text-text-muted truncate">• {prob.topic}</span>
                          </div>
                          <div className="font-semibold text-sm text-text-primary truncate">
                            #{prob.id} — {prob.title}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectProblem(prob.id)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-primary transition-colors"
                        >
                          <span>Open IDE</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Mock History Log */}
              {mockHistory.length > 0 && (
                <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-text-primary">Recent Mock Session Log</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMockHistory([])}
                      className="text-[11px] font-mono text-text-muted hover:text-danger"
                    >
                      Clear Log
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {mockHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-text-primary">{item.trackLabel}</div>
                          <div className="text-[11px] font-mono text-text-muted">
                            {item.date} • {item.elapsedMinutes}m elapsed
                          </div>
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

            {/* Live Think-Aloud Grading Rubric */}
            <div className="xl:col-span-4 bg-surface border border-border-subtle rounded-2xl p-5 space-y-3.5 shadow-sm">
              <div className="pb-2 border-b border-border-subtle">
                <h3 className="text-sm font-semibold text-text-primary">
                  Think-Aloud Interviewer Rubric
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Check off every stage while solving to pass communication signals.
                </p>
              </div>
              <div className="space-y-2.5">
                {THINK_ALOUD_RUBRIC.map((r) => {
                  const ok = Boolean(rubricChecks[r.step]);
                  return (
                    <button
                      key={r.step}
                      type="button"
                      onClick={() =>
                        setRubricChecks((prev) => ({ ...prev, [r.step]: !prev[r.step] }))
                      }
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        ok
                          ? 'bg-success-subtle/50 border-success/40'
                          : 'bg-surface-subtle border-border-subtle hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${ok ? 'text-success' : 'text-text-muted'}`}
                        />
                        <span>{r.step}</span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-1 pl-6 leading-snug">
                        {r.detail}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: STAR BEHAVIORAL BANK, RECOVERY PHRASES & INTERVIEWER QUESTIONS */}
        {section === 'star-hr' && (
          <div className="space-y-6 animate-fade-up">
            {/* Emergency Live Recovery Phrases */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">
                  How to Recover Gracefully When Stuck Live (Exact Scripts)
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {RECOVERY_PHRASES.map((rp) => {
                  const key = `rec-${rp.moment}`;
                  return (
                    <div
                      key={rp.moment}
                      className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono text-primary font-semibold">{rp.moment}</div>
                        <p className="text-xs text-text-secondary italic leading-relaxed">{rp.phrase}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(key, rp.phrase)}
                        className="self-end inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-subtle text-[11px] text-text-muted hover:text-text-primary"
                      >
                        {copiedId === key ? (
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
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  STAR Behavioral Story Vault (6 Core Stories)
                </h2>
                <p className="text-xs text-text-secondary">
                  Customize your concrete resume numbers &amp; stories (saved locally in this browser).
                </p>
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
                <div
                  key={item.id}
                  className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-2.5 shadow-sm"
                >
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

            {/* Smart Questions + Pre-Interview Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 bg-surface border border-border-subtle rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    High-Signal Questions to Ask the Interviewer (Click to Copy)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {QUESTIONS_TO_ASK_INTERVIEWER.map((group) => (
                    <div key={group.category} className="space-y-2">
                      <div className="text-[11px] font-mono uppercase text-primary font-semibold">
                        {group.category}
                      </div>
                      <div className="space-y-2">
                        {group.questions.map((q, idx) => {
                          const key = `q-${group.category}-${idx}`;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleCopyText(key, q)}
                              className="w-full text-left p-2.5 rounded-xl bg-surface-subtle hover:bg-surface-elevated border border-border-subtle text-xs text-text-secondary hover:text-text-primary transition-colors flex items-start justify-between gap-2"
                            >
                              <span className="leading-snug">{q}</span>
                              {copiedId === key ? (
                                <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                              )}
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
                  <h3 className="text-sm font-semibold text-text-primary">
                    Last-Minute Edge-Case Sanity Checklist
                  </h3>
                </div>
                <div className="space-y-2">
                  {PRE_INTERVIEW_CHECKLIST.map((line, i) => {
                    const ok = Boolean(preChecks[i]);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreChecks((prev) => ({ ...prev, [i]: !prev[i] }))}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-colors ${
                          ok
                            ? 'bg-success-subtle/50 border-success/40 text-text-primary'
                            : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-elevated'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${ok ? 'text-success' : 'text-text-muted'}`}
                        />
                        <span>{line}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
