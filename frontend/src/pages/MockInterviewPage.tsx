import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import {
  AptitudeCategory,
  GeneratedAptitudeQuestion,
  generateAptitudeBatch,
} from '../utils/aptitudeGenerator';
import {
  OptionVisualTile,
  QuestionVisualBlock,
} from '../components/aptitude/AptitudeVisuals';
import {
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  Eye,
  EyeOff,
  Flag,
  HelpCircle,
  History,
  Lightbulb,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';

interface MockInterviewPageProps {
  onSelectProblem: (problemId: number) => void;
  onTabChange: (tab: string) => void;
}

export interface CatalogProblem {
  id: number;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  topic: string;
  pattern?: string;
  isSolved?: boolean;
}

type CompanyTrackId =
  | 'product-faang'
  | 'startup-growth'
  | 'backend-data'
  | 'core-cpp-oop'
  | 'full-drive';

type DifficultyMixPreset = 'easy-medium' | 'medium-heavy' | 'mixed-combo' | 'custom';

interface RoundConfig {
  trackId: CompanyTrackId;
  mixPreset: DifficultyMixPreset;
  easyDsa: number;
  mediumDsa: number;
  hardDsa: number;
  sqlCount: number;
  oopCount: number;
  aptitudeCount: number;
  aptitudeFocus: AptitudeCategory | 'Mixed';
  durationMinutes: number;
}

interface CompanyProfile {
  id: CompanyTrackId;
  name: string;
  badge: string;
  tagline: string;
  whatTheyAsk: string[];
  typicalSplit: string;
  defaultConfig: Omit<RoundConfig, 'trackId'>;
}

interface MockHistoryEntry {
  id: string;
  finishedAt: string;
  trackName: string;
  difficultyLabel: string;
  aptitudeScore: number;
  aptitudeTotal: number;
  codingSolved: number;
  codingTotal: number;
  durationSec: number;
}

export interface ActiveMockSession {
  id: string;
  createdAt: string;
  expiresAtMs: number;
  durationSec: number;
  trackId: CompanyTrackId;
  trackName: string;
  difficultyLabel: string;
  aptitudeQuestions: GeneratedAptitudeQuestion[];
  aptitudeAnswers: Record<string, number>;
  flaggedIds: string[];
  codingProblems: CatalogProblem[];
  revealTopics: boolean;
  submitted: boolean;
  finishedAt?: string;
  elapsedSecOnSubmit?: number;
}

export const ACTIVE_MOCK_STORAGE_KEY = 'codeprep_active_mock_session_v1';
const SEEN_MOCK_IDS_KEY = 'codeprep_mock_seen_ids_v1';
const MOCK_HISTORY_KEY = 'codeprep_mock_history_v1';

const COMPANY_PROFILES: CompanyProfile[] = [
  {
    id: 'product-faang',
    name: 'Product / FAANG OA',
    badge: 'Most Popular',
    tagline: 'Tests clean Medium DSA + fast Logical & Quant screening under strict timers.',
    whatTheyAsk: [
      '2 Medium + 1 Easy DSA (Sliding Window, Binary Search, Trees/Graphs, DP)',
      'Edge-case heavy inputs (empty arrays, duplicates, integer overflow)',
      'Timed Data Interpretation, Probability & Logical Deduction screening',
    ],
    typicalSplit: 'Easy–Medium DSA + Mixed Aptitude',
    defaultConfig: {
      mixPreset: 'easy-medium',
      easyDsa: 1,
      mediumDsa: 2,
      hardDsa: 0,
      sqlCount: 0,
      oopCount: 0,
      aptitudeCount: 10,
      aptitudeFocus: 'Mixed',
      durationMinutes: 75,
    },
  },
  {
    id: 'startup-growth',
    name: 'High-Growth Startups',
    badge: 'Practical Speed',
    tagline: 'Favors pragmatic Easy–Medium problems and debugging speed over obscure math.',
    whatTheyAsk: [
      'Hash Maps, Two Pointers, BFS/DFS, Intervals & String parsing',
      'Working code quickly with clean complexity explanations',
      'Puzzles, Arithmetic speed & Verbal/Logical accuracy',
    ],
    typicalSplit: '2 Easy + 2 Medium DSA + Aptitude',
    defaultConfig: {
      mixPreset: 'easy-medium',
      easyDsa: 2,
      mediumDsa: 2,
      hardDsa: 0,
      sqlCount: 0,
      oopCount: 0,
      aptitudeCount: 8,
      aptitudeFocus: 'Mixed',
      durationMinutes: 65,
    },
  },
  {
    id: 'backend-data',
    name: 'Backend & Data Systems',
    badge: 'DSA + SQL',
    tagline: 'Blends core Medium DSA with real SQL querying and data interpretation.',
    whatTheyAsk: [
      'Medium DSA (Graphs, Heaps, Hash Indexing) + SQL JOINs/Aggregations',
      'Data Interpretation charts, ratios & quarterly metric comparisons',
      'Query correctness and handling NULL / ties cleanly',
    ],
    typicalSplit: 'Easy + Medium DSA + SQL + DI Aptitude',
    defaultConfig: {
      mixPreset: 'easy-medium',
      easyDsa: 1,
      mediumDsa: 1,
      hardDsa: 0,
      sqlCount: 1,
      oopCount: 0,
      aptitudeCount: 8,
      aptitudeFocus: 'Data Interpretation',
      durationMinutes: 60,
    },
  },
  {
    id: 'core-cpp-oop',
    name: 'Core C++ & LLD Systems',
    badge: 'DSA + OOP',
    tagline: 'Combines Medium DSA with C++ Object-Oriented Design and OOP conceptual checks.',
    whatTheyAsk: [
      'Medium DSA + Class/System design in C++ (Inheritance, Polymorphism, State)',
      'Virtual destructors, RAII, Smart Pointers & SOLID MCQs',
      'Pointer safety and object lifecycle precision',
    ],
    typicalSplit: 'Easy + Medium DSA + OOP + OOPs Aptitude',
    defaultConfig: {
      mixPreset: 'easy-medium',
      easyDsa: 1,
      mediumDsa: 1,
      hardDsa: 0,
      sqlCount: 0,
      oopCount: 1,
      aptitudeCount: 8,
      aptitudeFocus: 'OOPs & C++ Design',
      durationMinutes: 60,
    },
  },
  {
    id: 'full-drive',
    name: 'Full Campus Placement Drive',
    badge: 'Complete Loop',
    tagline: 'End-to-end simulation mixing Easy, Medium, and Hard DSA plus SQL, OOP & Aptitude.',
    whatTheyAsk: [
      'Mixed-difficulty coding ladder (1 Easy, 1 Medium, 1 Hard DSA)',
      'Applied SQL database task + OOP engineering problem',
      '10 cross-category Aptitude & Interview Puzzle MCQs',
    ],
    typicalSplit: 'Easy + Med + Hard + SQL + OOP + 10 MCQ',
    defaultConfig: {
      mixPreset: 'mixed-combo',
      easyDsa: 1,
      mediumDsa: 1,
      hardDsa: 1,
      sqlCount: 1,
      oopCount: 1,
      aptitudeCount: 10,
      aptitudeFocus: 'Mixed',
      durationMinutes: 90,
    },
  },
];

function notifyMockUpdated() {
  window.dispatchEvent(new CustomEvent('codeprep:mock-updated'));
}

function loadSeenIds(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_MOCK_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function saveSeenIds(ids: number[]) {
  try {
    // Keep most recent 450 drawn problem IDs so cycling eventually resets gracefully
    const trimmed = ids.slice(-450);
    localStorage.setItem(SEEN_MOCK_IDS_KEY, JSON.stringify(trimmed));
  } catch {}
}

function loadMockHistory(): MockHistoryEntry[] {
  try {
    const raw = localStorage.getItem(MOCK_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMockHistory(entries: MockHistoryEntry[]) {
  try {
    localStorage.setItem(MOCK_HISTORY_KEY, JSON.stringify(entries.slice(0, 15)));
  } catch {}
}

function loadActiveMock(): ActiveMockSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_MOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveMockSession;
    if (!parsed || !Array.isArray(parsed.codingProblems) || !Array.isArray(parsed.aptitudeQuestions)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistActiveMock(session: ActiveMockSession | null) {
  try {
    if (!session) {
      localStorage.removeItem(ACTIVE_MOCK_STORAGE_KEY);
    } else {
      localStorage.setItem(ACTIVE_MOCK_STORAGE_KEY, JSON.stringify(session));
    }
    notifyMockUpdated();
  } catch {}
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomProblems(
  pool: CatalogProblem[],
  count: number,
  alreadyChosenIds: Set<number>,
  seenIds: Set<number>
): CatalogProblem[] {
  if (count <= 0 || pool.length === 0) return [];
  const available = pool.filter((p) => !alreadyChosenIds.has(p.id));
  if (available.length === 0) return [];

  // Tier priority so users get genuinely new, unsolved problems every time:
  // Tier 1: Unseen in prior mocks + Unsolved
  // Tier 2: Unseen in prior mocks (even if solved before)
  // Tier 3: Unsolved (seen in an older mock)
  // Tier 4: Remainder of pool
  const tier1 = shuffleArray(available.filter((p) => !seenIds.has(p.id) && !p.isSolved));
  const tier2 = shuffleArray(available.filter((p) => !seenIds.has(p.id) && Boolean(p.isSolved)));
  const tier3 = shuffleArray(available.filter((p) => seenIds.has(p.id) && !p.isSolved));
  const tier4 = shuffleArray(available.filter((p) => seenIds.has(p.id) && Boolean(p.isSolved)));

  const ordered = [...tier1, ...tier2, ...tier3, ...tier4];
  const picked = ordered.slice(0, count);
  picked.forEach((p) => alreadyChosenIds.add(p.id));
  return picked;
}

function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const MockInterviewPage: React.FC<MockInterviewPageProps> = ({
  onSelectProblem,
  onTabChange,
}) => {
  const [config, setConfig] = useState<RoundConfig>({
    trackId: 'product-faang',
    ...COMPANY_PROFILES[0].defaultConfig,
  });

  const [session, setSession] = useState<ActiveMockSession | null>(() => loadActiveMock());
  const [activeSection, setActiveSection] = useState<'aptitude' | 'coding'>('aptitude');
  const [aptitudeIndex, setAptitudeIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSyncingSolveStatus, setIsSyncingSolveStatus] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [history, setHistory] = useState<MockHistoryEntry[]>(() => loadMockHistory());
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const existing = loadActiveMock();
    if (!existing) return 0;
    if (existing.submitted) return Math.max(0, existing.durationSec - (existing.elapsedSecOnSubmit || 0));
    return Math.max(0, Math.floor((existing.expiresAtMs - Date.now()) / 1000));
  });

  const selectedProfile = useMemo(
    () => COMPANY_PROFILES.find((p) => p.id === config.trackId) || COMPANY_PROFILES[0],
    [config.trackId]
  );

  const handleSelectProfile = (profile: CompanyProfile) => {
    setConfig({
      trackId: profile.id,
      ...profile.defaultConfig,
    });
  };

  const handleApplyMixPreset = (preset: DifficultyMixPreset) => {
    if (preset === 'easy-medium') {
      setConfig((prev) => ({
        ...prev,
        mixPreset: 'easy-medium',
        easyDsa: 1,
        mediumDsa: 2,
        hardDsa: 0,
      }));
    } else if (preset === 'medium-heavy') {
      setConfig((prev) => ({
        ...prev,
        mixPreset: 'medium-heavy',
        easyDsa: 0,
        mediumDsa: 3,
        hardDsa: 0,
      }));
    } else if (preset === 'mixed-combo') {
      setConfig((prev) => ({
        ...prev,
        mixPreset: 'mixed-combo',
        easyDsa: 1,
        mediumDsa: 1,
        hardDsa: 1,
      }));
    } else {
      setConfig((prev) => ({ ...prev, mixPreset: 'custom' }));
    }
  };

  // Fetch live solve status for coding problems in the current active mock
  const syncCodingSolveStatus = useCallback(async (targetSession?: ActiveMockSession | null) => {
    const active = targetSession ?? loadActiveMock();
    if (!active || active.codingProblems.length === 0) return;
    setIsSyncingSolveStatus(true);
    try {
      const updatedProblems = await Promise.all(
        active.codingProblems.map(async (prob) => {
          try {
            const res = await apiRequest<{ problem: CatalogProblem }>(`/problems/${prob.id}`);
            return {
              ...prob,
              isSolved: Boolean(res.problem?.isSolved),
            };
          } catch {
            return prob;
          }
        })
      );
      setSession((prev) => {
        if (!prev || prev.id !== active.id) return prev;
        const next: ActiveMockSession = { ...prev, codingProblems: updatedProblems };
        persistActiveMock(next);
        return next;
      });
    } finally {
      setIsSyncingSolveStatus(false);
    }
  }, []);

  // Sync solve status whenever returning to Mock Interview page with an active session
  useEffect(() => {
    if (session && session.codingProblems.length > 0) {
      syncCodingSolveStatus(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live countdown timer when an unsubmitted mock is active
  useEffect(() => {
    if (!session || session.submitted) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((session.expiresAtMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.submitted, session?.expiresAtMs]);

  const fetchRandomizedPools = async (cfg: RoundConfig) => {
    const randomSeedBase = Math.floor(Math.random() * 900_000_000) + 1;
    const requests: Array<Promise<{ key: string; problems: CatalogProblem[] }>> = [];

    if (cfg.easyDsa > 0) {
      requests.push(
        apiRequest<{ problems: CatalogProblem[] }>(
          `/problems?category=DSA&difficulty=Easy&pageSize=120&shuffleSeed=${randomSeedBase + 11}`
        ).then((r) => ({ key: 'easyDsa', problems: r.problems || [] }))
      );
    }
    if (cfg.mediumDsa > 0) {
      requests.push(
        apiRequest<{ problems: CatalogProblem[] }>(
          `/problems?category=DSA&difficulty=Medium&pageSize=120&shuffleSeed=${randomSeedBase + 29}`
        ).then((r) => ({ key: 'mediumDsa', problems: r.problems || [] }))
      );
    }
    if (cfg.hardDsa > 0) {
      requests.push(
        apiRequest<{ problems: CatalogProblem[] }>(
          `/problems?category=DSA&difficulty=Hard&pageSize=100&shuffleSeed=${randomSeedBase + 47}`
        ).then((r) => ({ key: 'hardDsa', problems: r.problems || [] }))
      );
    }
    if (cfg.sqlCount > 0) {
      requests.push(
        apiRequest<{ problems: CatalogProblem[] }>(
          `/problems?category=SQL&pageSize=100&shuffleSeed=${randomSeedBase + 73}`
        ).then((r) => ({ key: 'sql', problems: r.problems || [] }))
      );
    }
    if (cfg.oopCount > 0) {
      requests.push(
        apiRequest<{ problems: CatalogProblem[] }>(
          `/problems?category=OOP&pageSize=80&shuffleSeed=${randomSeedBase + 97}`
        ).then((r) => ({ key: 'oop', problems: r.problems || [] }))
      );
    }

    const results = await Promise.all(requests);
    const byKey: Record<string, CatalogProblem[]> = {};
    results.forEach((item) => {
      byKey[item.key] = item.problems;
    });
    return byKey;
  };

  const handleStartNewMock = async () => {
    const totalCoding = config.easyDsa + config.mediumDsa + config.hardDsa + config.sqlCount + config.oopCount;
    if (totalCoding === 0 && config.aptitudeCount === 0) {
      setErrorMsg('Please select at least 1 Aptitude or Coding problem to start a mock round.');
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);

    try {
      const pools = await fetchRandomizedPools(config);
      const previouslySeen = loadSeenIds();
      const seenSet = new Set<number>(previouslySeen);
      const chosenIds = new Set<number>();

      // Build coding problem lineup (shuffle order lightly within tiers while keeping DSA -> SQL/OOP logical)
      const pickedEasy = pickRandomProblems(pools.easyDsa || [], config.easyDsa, chosenIds, seenSet);
      const pickedMed = pickRandomProblems(pools.mediumDsa || [], config.mediumDsa, chosenIds, seenSet);
      const pickedHard = pickRandomProblems(pools.hardDsa || [], config.hardDsa, chosenIds, seenSet);
      const pickedSql = pickRandomProblems(pools.sql || [], config.sqlCount, chosenIds, seenSet);
      const pickedOop = pickRandomProblems(pools.oop || [], config.oopCount, chosenIds, seenSet);

      const dsaMixed = shuffleArray([...pickedEasy, ...pickedMed, ...pickedHard]);
      const codingProblems = [...dsaMixed, ...pickedSql, ...pickedOop];

      // Record newly drawn problem IDs so the next mock picks fresh ones
      const updatedSeen = [
        ...previouslySeen.filter((id) => !chosenIds.has(id)),
        ...Array.from(chosenIds),
      ];
      saveSeenIds(updatedSeen);

      // Always generate brand-new algorithmic Aptitude MCQs
      const aptitudeQuestions =
        config.aptitudeCount > 0
          ? generateAptitudeBatch(config.aptitudeFocus, config.aptitudeCount)
          : [];

      const durationSec = config.durationMinutes * 60;
      const diffParts: string[] = [];
      if (config.easyDsa > 0) diffParts.push(`${config.easyDsa} Easy`);
      if (config.mediumDsa > 0) diffParts.push(`${config.mediumDsa} Medium`);
      if (config.hardDsa > 0) diffParts.push(`${config.hardDsa} Hard`);
      if (config.sqlCount > 0) diffParts.push(`${config.sqlCount} SQL`);
      if (config.oopCount > 0) diffParts.push(`${config.oopCount} OOP`);

      const newSession: ActiveMockSession = {
        id: `mock-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        createdAt: new Date().toISOString(),
        expiresAtMs: Date.now() + durationSec * 1000,
        durationSec,
        trackId: config.trackId,
        trackName: selectedProfile.name,
        difficultyLabel: diffParts.join(' · ') || 'Aptitude Only',
        aptitudeQuestions,
        aptitudeAnswers: {},
        flaggedIds: [],
        codingProblems,
        revealTopics: false,
        submitted: false,
      };

      persistActiveMock(newSession);
      setSession(newSession);
      setSecondsLeft(durationSec);
      setAptitudeIndex(0);
      setActiveSection(aptitudeQuestions.length > 0 ? 'aptitude' : 'coding');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not draw problems from backend. Ensure backend server is running.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSwapCodingProblem = async (slotIndex: number) => {
    if (!session || session.submitted) return;
    const current = session.codingProblems[slotIndex];
    if (!current) return;

    setIsSyncingSolveStatus(true);
    try {
      const seed = Math.floor(Math.random() * 900_000_000) + 1;
      const cat = current.category === 'SQL' ? 'SQL' : current.category === 'OOP' ? 'OOP' : 'DSA';
      const diffParam = cat === 'DSA' ? `&difficulty=${encodeURIComponent(current.difficulty)}` : '';
      const res = await apiRequest<{ problems: CatalogProblem[] }>(
        `/problems?category=${encodeURIComponent(cat)}${diffParam}&pageSize=100&shuffleSeed=${seed}`
      );
      const previouslySeen = loadSeenIds();
      const seenSet = new Set<number>(previouslySeen);
      const inCurrentRound = new Set<number>(session.codingProblems.map((p) => p.id));

      const replacementList = pickRandomProblems(res.problems || [], 1, inCurrentRound, seenSet);
      if (replacementList.length > 0) {
        const replacement = replacementList[0];
        saveSeenIds([...previouslySeen, replacement.id]);
        setSession((prev) => {
          if (!prev) return prev;
          const nextProblems = [...prev.codingProblems];
          nextProblems[slotIndex] = replacement;
          const next = { ...prev, codingProblems: nextProblems };
          persistActiveMock(next);
          return next;
        });
      }
    } catch {
      // Ignore transient swap error
    } finally {
      setIsSyncingSolveStatus(false);
    }
  };

  const handleSelectAptitudeOption = (questionId: string, optionIdx: number) => {
    if (!session || session.submitted) return;
    setSession((prev) => {
      if (!prev || prev.submitted) return prev;
      const next: ActiveMockSession = {
        ...prev,
        aptitudeAnswers: {
          ...prev.aptitudeAnswers,
          [questionId]: optionIdx,
        },
      };
      persistActiveMock(next);
      return next;
    });
  };

  const handleToggleFlag = (questionId: string) => {
    if (!session || session.submitted) return;
    setSession((prev) => {
      if (!prev) return prev;
      const exists = prev.flaggedIds.includes(questionId);
      const flaggedIds = exists
        ? prev.flaggedIds.filter((id) => id !== questionId)
        : [...prev.flaggedIds, questionId];
      const next = { ...prev, flaggedIds };
      persistActiveMock(next);
      return next;
    });
  };

  const handleToggleRevealTopics = () => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, revealTopics: !prev.revealTopics };
      persistActiveMock(next);
      return next;
    });
  };

  const handleSubmitMock = () => {
    if (!session || session.submitted) return;
    const elapsedSec = Math.max(0, session.durationSec - secondsLeft);
    const aptitudeCorrectCount = session.aptitudeQuestions.reduce((acc, q) => {
      return acc + (session.aptitudeAnswers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);
    const codingSolvedCount = session.codingProblems.filter((p) => p.isSolved).length;

    const completed: ActiveMockSession = {
      ...session,
      submitted: true,
      revealTopics: true,
      finishedAt: new Date().toISOString(),
      elapsedSecOnSubmit: elapsedSec,
    };

    const historyEntry: MockHistoryEntry = {
      id: session.id,
      finishedAt: completed.finishedAt!,
      trackName: session.trackName,
      difficultyLabel: session.difficultyLabel,
      aptitudeScore: aptitudeCorrectCount,
      aptitudeTotal: session.aptitudeQuestions.length,
      codingSolved: codingSolvedCount,
      codingTotal: session.codingProblems.length,
      durationSec: elapsedSec,
    };

    const nextHistory = [historyEntry, ...history.filter((h) => h.id !== historyEntry.id)].slice(0, 15);
    setHistory(nextHistory);
    saveMockHistory(nextHistory);

    persistActiveMock(completed);
    setSession(completed);
  };

  const handleDiscardOrReset = () => {
    persistActiveMock(null);
    setSession(null);
    setAptitudeIndex(0);
    setSecondsLeft(0);
  };

  // Computed metrics when a session exists
  const aptitudeAnsweredCount = session
    ? Object.keys(session.aptitudeAnswers).length
    : 0;
  const aptitudeCorrectCount = session
    ? session.aptitudeQuestions.reduce(
        (acc, q) => acc + (session.aptitudeAnswers[q.id] === q.correctIndex ? 1 : 0),
        0
      )
    : 0;
  const codingSolvedCount = session
    ? session.codingProblems.filter((p) => p.isSolved).length
    : 0;

  const currentAptitudeQ = session?.aptitudeQuestions[aptitudeIndex] || null;

  /* ------------------------------------------------------------------------ */
  /* RENDER ACTIVE SESSION OR RESULTS                                         */
  /* ------------------------------------------------------------------------ */
  if (session) {
    const isLowTime = !session.submitted && secondsLeft <= 300;
    const aptitudePct =
      session.aptitudeQuestions.length > 0
        ? Math.round((aptitudeCorrectCount / session.aptitudeQuestions.length) * 100)
        : 100;
    const codingPct =
      session.codingProblems.length > 0
        ? Math.round((codingSolvedCount / session.codingProblems.length) * 100)
        : 100;

    return (
      <AppLayout currentTab="mock-interview" onTabChange={onTabChange}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6">
          {/* Top Session Header */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-primary-subtle text-primary border border-primary/30">
                  {session.trackName}
                </span>
                <span className="text-xs font-mono text-text-muted">
                  {session.difficultyLabel}
                </span>
                {session.submitted && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-success/15 text-success border border-success/35">
                    Submitted & Graded
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-text-primary">
                Aptitude + Coding Mock Assessment
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className={`px-3.5 py-2 rounded-xl border font-mono text-sm font-bold flex items-center gap-2 ${
                  isLowTime
                    ? 'bg-danger/15 border-danger/45 text-danger'
                    : 'bg-surface-subtle border-border-default text-text-primary'
                }`}
              >
                <Clock className="w-4 h-4 text-primary" />
                <span>
                  {session.submitted
                    ? `Elapsed: ${formatTimer(session.elapsedSecOnSubmit || 0)}`
                    : formatTimer(secondsLeft)}
                </span>
              </div>

              {!session.submitted ? (
                <button
                  type="button"
                  onClick={handleSubmitMock}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Mock Round</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartNewMock}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>{isGenerating ? 'Drawing Fresh Set...' : 'Start New Fresh Mock'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDiscardOrReset}
                className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-default text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
                title="Return to Mock Setup"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Setup</span>
              </button>
            </div>
          </div>

          {/* Post-Submission Scorecard */}
          {session.submitted && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-1.5">
                <div className="text-xs font-mono text-text-muted flex items-center justify-between">
                  <span>Aptitude Round Score</span>
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-text-primary font-mono">
                  {aptitudeCorrectCount} / {session.aptitudeQuestions.length}{' '}
                  <span className="text-sm font-normal text-text-secondary">
                    ({aptitudePct}%)
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  Review full step-by-step shortcuts under the Aptitude tab below.
                </p>
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-1.5">
                <div className="text-xs font-mono text-text-muted flex items-center justify-between">
                  <span>Coding Round Status</span>
                  <Code2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-text-primary font-mono">
                  {codingSolvedCount} / {session.codingProblems.length}{' '}
                  <span className="text-sm font-normal text-text-secondary">
                    ({codingPct}%)
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  Synced directly with accepted submissions in your workspace.
                </p>
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col justify-between gap-2">
                <div className="text-xs font-mono text-text-muted flex items-center justify-between">
                  <span>Overall Readiness</span>
                  <Award className="w-4 h-4 text-warning" />
                </div>
                <div className="text-lg font-bold text-text-primary">
                  {aptitudePct >= 70 && codingPct >= 50
                    ? 'Strong Shortlist Signal'
                    : 'Keep Practicing — Try a Fresh Set'}
                </div>
                <button
                  type="button"
                  onClick={() => syncCodingSolveStatus(session)}
                  disabled={isSyncingSolveStatus}
                  className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1 w-fit"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingSolveStatus ? 'animate-spin' : ''}`} />
                  <span>Re-sync Coding Submissions</span>
                </button>
              </div>
            </div>
          )}

          {/* Section Switcher: Part 1 Aptitude | Part 2 Coding */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              {session.aptitudeQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSection('aptitude')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors ${
                    activeSection === 'aptitude'
                      ? 'bg-primary-subtle border-primary/45 text-primary'
                      : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>
                    Part A: Aptitude ({aptitudeAnsweredCount}/{session.aptitudeQuestions.length})
                  </span>
                </button>
              )}

              {session.codingProblems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSection('coding')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors ${
                    activeSection === 'coding'
                      ? 'bg-primary-subtle border-primary/45 text-primary'
                      : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  <span>
                    Part B: Coding Round ({codingSolvedCount}/{session.codingProblems.length} Solved)
                  </span>
                </button>
              )}
            </div>

            <div className="text-xs font-mono text-text-muted">
              Each new mock draws unseen questions & regenerates Aptitude math/visuals.
            </div>
          </div>

          {/* PART A: APTITUDE SECTION */}
          {activeSection === 'aptitude' && currentAptitudeQ && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Main MCQ Card */}
              <div className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-surface-elevated border border-border-subtle text-text-primary">
                      Q{aptitudeIndex + 1} of {session.aptitudeQuestions.length}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-primary-subtle text-primary border border-primary/30">
                      {currentAptitudeQ.category}
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      {currentAptitudeQ.subtopic} · {currentAptitudeQ.difficulty}
                    </span>
                  </div>

                  {!session.submitted && (
                    <button
                      type="button"
                      onClick={() => handleToggleFlag(currentAptitudeQ.id)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                        session.flaggedIds.includes(currentAptitudeQ.id)
                          ? 'bg-warning/15 border-warning/45 text-warning'
                          : 'bg-surface-subtle border-border-subtle text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>
                        {session.flaggedIds.includes(currentAptitudeQ.id) ? 'Flagged' : 'Flag'}
                      </span>
                    </button>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-semibold text-text-primary leading-relaxed whitespace-pre-line">
                  {currentAptitudeQ.question}
                </h2>

                {currentAptitudeQ.visual && (
                  <QuestionVisualBlock visual={currentAptitudeQ.visual} />
                )}

                <div
                  className={
                    currentAptitudeQ.optionVisuals
                      ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                      : 'space-y-2.5'
                  }
                >
                  {currentAptitudeQ.options.map((opt, idx) => {
                    const selectedIdx = session.aptitudeAnswers[currentAptitudeQ.id];
                    const isSelected = selectedIdx === idx;
                    let style =
                      'bg-surface-subtle hover:bg-surface-high border border-border-subtle text-text-primary';

                    if (session.submitted) {
                      if (idx === currentAptitudeQ.correctIndex) {
                        style = 'bg-success/15 border border-success/45 text-success font-semibold';
                      } else if (isSelected) {
                        style = 'bg-danger/15 border border-danger/45 text-danger';
                      } else {
                        style =
                          'bg-surface-subtle border border-border-subtle opacity-50 text-text-muted';
                      }
                    } else if (isSelected) {
                      style = 'bg-primary-subtle border border-primary/50 text-primary font-semibold';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={session.submitted}
                        onClick={() => handleSelectAptitudeOption(currentAptitudeQ.id, idx)}
                        className={`w-full text-left p-3.5 rounded-xl text-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${style}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <strong className="font-mono shrink-0">
                            {String.fromCharCode(65 + idx)}.
                          </strong>
                          {currentAptitudeQ.optionVisuals?.[idx] && (
                            <OptionVisualTile visual={currentAptitudeQ.optionVisuals[idx]} />
                          )}
                          <span className="leading-snug">{opt}</span>
                        </div>

                        {session.submitted && idx === currentAptitudeQ.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        )}
                        {session.submitted &&
                          isSelected &&
                          idx !== currentAptitudeQ.correctIndex && (
                            <XCircle className="w-4 h-4 text-danger shrink-0" />
                          )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation shown after submit */}
                {session.submitted && (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                      <Lightbulb className="w-4 h-4 text-warning" />
                      <span>Solution & Shortcut</span>
                    </div>
                    <p className="text-text-secondary text-[13px] leading-relaxed">
                      {currentAptitudeQ.explanation}
                    </p>
                    <div className="pt-2 border-t border-border-subtle text-xs font-mono text-primary">
                      Shortcut: <span className="text-text-secondary">{currentAptitudeQ.shortcutTip}</span>
                    </div>
                  </div>
                )}

                {/* Navigation Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    disabled={aptitudeIndex === 0}
                    onClick={() => setAptitudeIndex((i) => Math.max(0, i - 1))}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-elevated border border-border-default text-xs text-text-secondary hover:text-text-primary disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {aptitudeIndex < session.aptitudeQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setAptitudeIndex((i) =>
                          Math.min(session.aptitudeQuestions.length - 1, i + 1)
                        )
                      }
                      className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : session.codingProblems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveSection('coding')}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>Proceed to Coding Round</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Right Question Palette */}
              <div className="lg:col-span-4 bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
                    Question Palette
                  </h3>
                  <span className="text-xs font-mono text-text-secondary">
                    {aptitudeAnsweredCount}/{session.aptitudeQuestions.length} Done
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {session.aptitudeQuestions.map((q, idx) => {
                    const ans = session.aptitudeAnswers[q.id];
                    const isAnswered = ans !== undefined;
                    const isFlagged = session.flaggedIds.includes(q.id);
                    const isCurrent = idx === aptitudeIndex;

                    let pillStyle =
                      'bg-surface-subtle border-border-subtle text-text-secondary hover:border-border-default';
                    if (session.submitted) {
                      pillStyle =
                        ans === q.correctIndex
                          ? 'bg-success/15 border-success/45 text-success'
                          : 'bg-danger/15 border-danger/45 text-danger';
                    } else if (isFlagged) {
                      pillStyle = 'bg-warning/15 border-warning/50 text-warning';
                    } else if (isAnswered) {
                      pillStyle = 'bg-primary-subtle border-primary/45 text-primary';
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setAptitudeIndex(idx)}
                        className={`h-9 rounded-lg border font-mono text-xs font-semibold transition-all ${pillStyle} ${
                          isCurrent ? 'ring-2 ring-primary/60' : ''
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-border-subtle space-y-2 text-[11px] font-mono text-text-muted">
                  <div className="flex items-center justify-between">
                    <span>Answered</span>
                    <span className="text-primary">{aptitudeAnsweredCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Flagged for Review</span>
                    <span className="text-warning">{session.flaggedIds.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Coding Problems</span>
                    <span className="text-emerald-400">
                      {codingSolvedCount}/{session.codingProblems.length} Solved
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PART B: CODING ROUND SECTION */}
          {activeSection === 'coding' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border-subtle rounded-2xl px-5 py-3.5">
                <div className="text-xs text-text-secondary">
                  Click <strong className="text-text-primary">Open in Compiler</strong> to solve in the full workspace. Your timer & session stay active while you code!
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleRevealTopics}
                    className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-secondary hover:text-text-primary flex items-center gap-1.5"
                  >
                    {session.revealTopics ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Pattern Hints</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show Topic Hints</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => syncCodingSolveStatus(session)}
                    disabled={isSyncingSolveStatus}
                    className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-default text-xs font-mono text-primary flex items-center gap-1.5"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isSyncingSolveStatus ? 'animate-spin' : ''}`}
                    />
                    <span>Sync Solve Status</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.codingProblems.map((prob, idx) => {
                  const diffBadge =
                    prob.difficulty === 'Easy'
                      ? 'bg-success/15 text-success border-success/35'
                      : prob.difficulty === 'Medium'
                      ? 'bg-warning/15 text-warning border-warning/35'
                      : 'bg-danger/15 text-danger border-danger/35';

                  return (
                    <div
                      key={`${prob.id}-${idx}`}
                      className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-border-default transition-colors"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-text-muted">
                              Problem {idx + 1} · #{prob.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${diffBadge}`}
                            >
                              {prob.difficulty}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-surface-elevated border border-border-subtle text-text-secondary">
                              {prob.category === 'SQL'
                                ? 'SQL'
                                : prob.category === 'OOP'
                                ? 'OOP / C++'
                                : 'DSA'}
                            </span>
                          </div>

                          {prob.isSolved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-success">
                              <CheckCircle2 className="w-4 h-4" />
                              Solved
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-text-muted">Pending</span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-text-primary leading-snug">
                          {prob.title}
                        </h3>

                        {session.revealTopics ? (
                          <p className="text-xs font-mono text-primary">
                            Topic: {prob.topic}
                            {prob.pattern ? ` · Pattern: ${prob.pattern}` : ''}
                          </p>
                        ) : (
                          <p className="text-xs font-mono text-text-muted">
                            Topic hidden (interview blind mode)
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border-subtle">
                        {!session.submitted && (
                          <button
                            type="button"
                            onClick={() => handleSwapCodingProblem(idx)}
                            disabled={isSyncingSolveStatus}
                            className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-high border border-border-subtle text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
                            title="Draw a different random problem for this slot"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                            <span>Swap Problem</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectProblem(prob.id)}
                          className="ml-auto px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Open in Compiler</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* RENDER MOCK SETUP & COMPANY PATTERN HUB                                  */
  /* ------------------------------------------------------------------------ */
  const totalCodingCount =
    config.easyDsa + config.mediumDsa + config.hardDsa + config.sqlCount + config.oopCount;

  return (
    <AppLayout currentTab="mock-interview" onTabChange={onTabChange}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Header */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-subtle border border-primary/30 text-primary text-xs font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fresh Randomized Aptitude + Coding Assessment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              Mock Interview Simulator
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Simulates real Online Assessments & technical rounds by pairing freshly generated
              Aptitude MCQs with randomized DSA, SQL, and OOP coding problems. Prioritizes unseen
              problems every time you generate a round.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleStartNewMock}
              disabled={isGenerating}
              className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isGenerating ? 'Drawing Fresh Problems...' : 'Start New Mock Interview'}
              </span>
            </button>
            <span className="text-[11px] font-mono text-text-muted text-center lg:text-right">
              {config.aptitudeCount} Aptitude MCQ + {totalCodingCount} Coding ·{' '}
              {config.durationMinutes} min
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-danger/15 border border-danger/40 text-xs text-danger font-mono">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Company Track Blueprint */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span>1. Choose Target Company Format (What Companies Ask)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMPANY_PROFILES.map((profile) => {
              const isSelected = config.trackId === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelectProfile(profile)}
                  className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-primary-subtle/35 border-primary/55 shadow-sm'
                      : 'bg-surface border-border-subtle hover:border-border-default'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-text-primary">{profile.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface-elevated border border-border-subtle text-primary">
                        {profile.badge}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{profile.tagline}</p>
                    <ul className="space-y-1 pt-1">
                      {profile.whatTheyAsk.map((point, idx) => (
                        <li
                          key={idx}
                          className="text-[11px] text-text-muted flex items-start gap-1.5 leading-snug"
                        >
                          <span className="text-primary mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono">
                    <span className="text-text-secondary">{profile.typicalSplit}</span>
                    {isSelected && (
                      <span className="text-primary font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Difficulty Mix & Round Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span>2. Difficulty Mix & Question Count</span>
              </h2>
              <span className="text-xs font-mono text-text-secondary">
                Recommended for practice: Easy–Medium or Medium-heavy
              </span>
            </div>

            {/* Difficulty Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: 'easy-medium' as DifficultyMixPreset,
                  label: 'Easy + Medium',
                  sub: '1 Easy · 2 Med',
                },
                {
                  id: 'medium-heavy' as DifficultyMixPreset,
                  label: 'Medium Focus',
                  sub: '3 Medium DSA',
                },
                {
                  id: 'mixed-combo' as DifficultyMixPreset,
                  label: 'Mixed Ladder',
                  sub: '1 Easy · 1 Med · 1 Hard',
                },
                {
                  id: 'custom' as DifficultyMixPreset,
                  label: 'Custom Mix',
                  sub: 'Adjust sliders below',
                },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyMixPreset(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    config.mixPreset === preset.id
                      ? 'bg-primary-subtle border-primary/50 text-primary'
                      : 'bg-surface-subtle border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="text-xs font-bold">{preset.label}</div>
                  <div className="text-[11px] font-mono opacity-80 mt-0.5">{preset.sub}</div>
                </button>
              ))}
            </div>

            {/* Granular Sliders / Selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <label className="space-y-1.5 text-xs">
                <span className="font-mono text-success font-semibold block">
                  Easy DSA ({config.easyDsa})
                </span>
                <input
                  type="range"
                  min={0}
                  max={3}
                  value={config.easyDsa}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      mixPreset: 'custom',
                      easyDsa: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-500"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="font-mono text-warning font-semibold block">
                  Medium DSA ({config.mediumDsa})
                </span>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={config.mediumDsa}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      mixPreset: 'custom',
                      mediumDsa: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="font-mono text-danger font-semibold block">
                  Hard DSA ({config.hardDsa})
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  value={config.hardDsa}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      mixPreset: 'custom',
                      hardDsa: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-rose-500"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="font-mono text-text-primary flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  SQL Queries ({config.sqlCount})
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  value={config.sqlCount}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, sqlCount: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-500"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="font-mono text-text-primary flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                  OOP / C++ ({config.oopCount})
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  value={config.oopCount}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, oopCount: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-500"
                />
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="font-mono text-text-primary block">
                  Aptitude MCQs ({config.aptitudeCount})
                </span>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={1}
                  value={config.aptitudeCount}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, aptitudeCount: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-500"
                />
              </label>
            </div>

            {/* Aptitude Focus & Timer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border-subtle">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-text-muted block">
                  Aptitude Category Mix
                </label>
                <select
                  value={config.aptitudeFocus}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      aptitudeFocus: e.target.value as AptitudeCategory | 'Mixed',
                    }))
                  }
                  className="w-full bg-surface-subtle border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary"
                >
                  <option value="Mixed">Mixed (Quant, DI, Reasoning, Puzzles, OOP)</option>
                  <option value="Arithmetic Aptitude">Arithmetic Aptitude</option>
                  <option value="Data Interpretation">Data Interpretation (Charts & Tables)</option>
                  <option value="Logical Reasoning">Logical Reasoning</option>
                  <option value="Verbal Ability">Verbal Ability</option>
                  <option value="Verbal Reasoning">Verbal Reasoning</option>
                  <option value="Nonverbal Reasoning">Nonverbal Reasoning (SVG Visuals)</option>
                  <option value="Interview Puzzles">Interview Puzzles</option>
                  <option value="OOPs & C++ Design">OOPs & C++ Design</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-text-muted block">
                  Round Time Limit
                </label>
                <select
                  value={config.durationMinutes}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, durationMinutes: Number(e.target.value) }))
                  }
                  className="w-full bg-surface-subtle border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary"
                >
                  <option value={30}>30 Minutes (Quick Sprint)</option>
                  <option value={45}>45 Minutes (Focused Round)</option>
                  <option value={60}>60 Minutes (Standard OA)</option>
                  <option value={75}>75 Minutes (Product OA)</option>
                  <option value={90}>90 Minutes (Full Drive)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recent Mock Attempts & Quick Summary */}
          <div className="lg:col-span-4 bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span>Recent Mocks</span>
                </h2>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistory([]);
                      saveMockHistory([]);
                    }}
                    className="text-[11px] font-mono text-text-muted hover:text-text-primary"
                  >
                    Clear
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-muted leading-relaxed">
                  No completed mock rounds yet. Click{' '}
                  <strong className="text-text-primary">Start New Mock Interview</strong> to
                  draw a fresh set of questions and track your score progression here.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-surface-subtle border border-border-subtle space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-text-primary">
                        <span className="truncate">{item.trackName}</span>
                        <span className="text-[11px] font-mono text-text-muted shrink-0">
                          {formatTimer(item.durationSec)}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-text-muted truncate">
                        {item.difficultyLabel}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                        <span className="text-primary">
                          Apt: {item.aptitudeScore}/{item.aptitudeTotal}
                        </span>
                        <span className="text-emerald-400">
                          Code: {item.codingSolved}/{item.codingTotal}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleStartNewMock}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Shuffle className="w-4 h-4" />
              <span>{isGenerating ? 'Drawing Questions...' : 'Generate & Launch Round'}</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
