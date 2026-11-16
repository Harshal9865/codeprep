import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { apiRequest } from '../services/api';
import { fetchDashboardAnalytics } from '../services/analyticsCache';
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
  CheckCircle2,
  Clock,
  Code2,
  Eye,
  EyeOff,
  Flag,
  HelpCircle,
  History,
  Lightbulb,
  Minus,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
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

interface RoundConfig {
  trackId: CompanyTrackId;
  easyDsa: number;
  mediumDsa: number;
  hardDsa: number;
  sqlCount: number;
  oopCount: number;
  aptitudeCount: number;
  aptitudeFocus: AptitudeCategory | 'Mixed';
  durationMinutes: number;
  targetWeakTopics?: boolean;
}

interface WeaknessRadar {
  weakTopics: Array<{ topic: string; solved: number; total: number; accuracy: number }>;
  weakAptitudeCategory: AptitudeCategory | null;
  weakAptitudeAccuracy: number | null;
}

interface CompanyProfile {
  id: CompanyTrackId;
  name: string;
  shortLabel: string;
  tagline: string;
  highlights: string[];
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
const MOCK_HISTORY_KEY = 'codeprep_mock_assessment_history_v1';

const COMPANY_PROFILES: CompanyProfile[] = [
  {
    id: 'product-faang',
    name: 'Product / Big Tech OA',
    shortLabel: 'Product OA',
    tagline: 'Balanced Easy–Medium DSA paired with timed Quantitative & Logical screening.',
    highlights: [
      '1 Easy + 2 Medium DSA (Sliding Window, Binary Search, Trees, Graphs, DP)',
      '10 Mixed Aptitude & Logical Reasoning MCQs under 75 minutes',
    ],
    defaultConfig: {
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
    name: 'Startup Coding Screen',
    shortLabel: 'Startup',
    tagline: 'Speed-focused practical coding round prioritizing clean implementation.',
    highlights: [
      '2 Easy + 2 Medium DSA (Hash Maps, Two Pointers, Intervals, BFS/DFS)',
      '8 Mixed Aptitude & Puzzle MCQs in 65 minutes',
    ],
    defaultConfig: {
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
    name: 'Backend & Data Engineering',
    shortLabel: 'Backend + SQL',
    tagline: 'Tests core DSA alongside SQL joins, aggregations, and data interpretation.',
    highlights: [
      'Easy + Medium DSA plus 1 applied SQL query problem',
      '8 Data Interpretation MCQs in 60 minutes',
    ],
    defaultConfig: {
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
    name: 'C++ & Object-Oriented Design',
    shortLabel: 'C++ / OOP',
    tagline: 'Combines DSA with C++ class design, polymorphism, and OOP fundamentals.',
    highlights: [
      'Easy + Medium DSA plus 1 C++ OOP implementation problem',
      '8 OOPs & C++ Design MCQs in 60 minutes',
    ],
    defaultConfig: {
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
    shortLabel: 'Full Loop',
    tagline: 'Complete multi-section simulation covering DSA, SQL, OOP, and Aptitude.',
    highlights: [
      '1 Easy + 1 Medium + 1 Hard DSA, 1 SQL, and 1 OOP challenge',
      '10 Mixed Aptitude MCQs in 90 minutes',
    ],
    defaultConfig: {
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
    localStorage.setItem(SEEN_MOCK_IDS_KEY, JSON.stringify(ids.slice(-450)));
  } catch {
    // Ignore storage quota errors
  }
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
  } catch {
    // Ignore storage errors
  }
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
  } catch {
    // Ignore storage errors
  }
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
  seenIds: Set<number>,
  preferredTopics?: Set<string>
): CatalogProblem[] {
  if (count <= 0 || pool.length === 0) return [];
  const available = pool.filter((p) => !alreadyChosenIds.has(p.id));
  if (available.length === 0) return [];

  const isPreferred = (p: CatalogProblem) =>
    preferredTopics && preferredTopics.size > 0 && preferredTopics.has(p.topic);

  const tier0Pref =
    preferredTopics && preferredTopics.size > 0
      ? shuffleArray(available.filter((p) => isPreferred(p) && !seenIds.has(p.id) && !p.isSolved))
      : [];
  const tier1 = shuffleArray(
    available.filter((p) => !isPreferred(p) && !seenIds.has(p.id) && !p.isSolved)
  );
  const tier2Pref =
    preferredTopics && preferredTopics.size > 0
      ? shuffleArray(
          available.filter((p) => isPreferred(p) && !seenIds.has(p.id) && Boolean(p.isSolved))
        )
      : [];
  const tier2 = shuffleArray(
    available.filter((p) => !isPreferred(p) && !seenIds.has(p.id) && Boolean(p.isSolved))
  );
  const tier3 = shuffleArray(available.filter((p) => seenIds.has(p.id) && !p.isSolved));
  const tier4 = shuffleArray(available.filter((p) => seenIds.has(p.id) && Boolean(p.isSolved)));

  const ordered = [...tier0Pref, ...tier1, ...tier2Pref, ...tier2, ...tier3, ...tier4];
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

interface CounterRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  badgeColor?: string;
  onChange: (next: number) => void;
}

const CounterControl: React.FC<CounterRowProps> = ({
  label,
  value,
  min,
  max,
  badgeColor = 'text-text-primary',
  onChange,
}) => (
  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle">
    <span className={`text-xs font-medium ${badgeColor}`}>{label}</span>
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={`Decrease ${label}`}
        className="w-6 h-6 rounded-md bg-surface-elevated hover:bg-surface-high border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-35 transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-6 text-center font-mono text-xs font-bold text-text-primary">{value}</span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label={`Increase ${label}`}
        className="w-6 h-6 rounded-md bg-surface-elevated hover:bg-surface-high border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-35 transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  </div>
);

export const MockInterviewPage: React.FC<MockInterviewPageProps> = ({
  onSelectProblem,
  onTabChange,
}) => {
  const [config, setConfig] = useState<RoundConfig>({
    trackId: 'product-faang',
    ...COMPANY_PROFILES[0].defaultConfig,
  });

  const [session, setSession] = useState<ActiveMockSession | null>(() => loadActiveMock());
  const [activeSection, setActiveSection] = useState<'aptitude' | 'coding'>(() => {
    const existing = loadActiveMock();
    if (existing && existing.aptitudeQuestions.length === 0 && existing.codingProblems.length > 0) {
      return 'coding';
    }
    return 'aptitude';
  });
  const [aptitudeIndex, setAptitudeIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSyncingSolveStatus, setIsSyncingSolveStatus] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [history, setHistory] = useState<MockHistoryEntry[]>(() => loadMockHistory());
  const [weaknessRadar, setWeaknessRadar] = useState<WeaknessRadar>({
    weakTopics: [],
    weakAptitudeCategory: null,
    weakAptitudeAccuracy: null,
  });
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const existing = loadActiveMock();
    if (!existing) return 0;
    if (existing.submitted) return Math.max(0, existing.durationSec - (existing.elapsedSecOnSubmit || 0));
    return Math.max(0, Math.floor((existing.expiresAtMs - Date.now()) / 1000));
  });

  const initialSyncReadyRef = useRef<boolean>(false);
  const submitMockRef = useRef<() => void>(() => {});

  const selectedProfile = useMemo(
    () => COMPANY_PROFILES.find((p) => p.id === config.trackId) || COMPANY_PROFILES[0],
    [config.trackId]
  );

  const handleSelectProfile = (profile: CompanyProfile) => {
    setConfig((prev) => ({
      trackId: profile.id,
      ...profile.defaultConfig,
      targetWeakTopics: prev.targetWeakTopics,
    }));
  };

  // Sync live solve status from backend for coding problems in active round
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

  // Initial sync + weak-topic stats + auto-sync when user returns from coding workspace
  useEffect(() => {
    const current = loadActiveMock();
    if (current && current.codingProblems.length > 0) {
      syncCodingSolveStatus(current).finally(() => {
        initialSyncReadyRef.current = true;
        if (!current.submitted && current.expiresAtMs <= Date.now()) {
          submitMockRef.current();
        }
      });
    } else {
      initialSyncReadyRef.current = true;
    }

    const loadWeaknessData = async () => {
      let weakTopics: WeaknessRadar['weakTopics'] = [];
      try {
        const dash = await fetchDashboardAnalytics<{
          topicStats?: Array<{ topic: string; total: number; solved: number; accuracy: number }>;
        }>();
        const stats = dash?.topicStats || [];
        weakTopics = [...stats]
          .filter((t) => t.total > t.solved)
          .sort((a, b) => {
            const ratioA = a.total > 0 ? a.solved / a.total : 1;
            const ratioB = b.total > 0 ? b.solved / b.total : 1;
            if (Math.abs(ratioA - ratioB) > 0.05) return ratioA - ratioB;
            return a.accuracy - b.accuracy;
          })
          .slice(0, 3);
      } catch {
        // Optional analytics endpoint
      }

      let weakAptitudeCategory: AptitudeCategory | null = null;
      let weakAptitudeAccuracy: number | null = null;
      try {
        const raw = localStorage.getItem('codeprep_aptitude_dynamic_stats_v1');
        if (raw) {
          const parsed = JSON.parse(raw) as {
            byCategory?: Record<string, { attempted: number; correct: number }>;
          };
          const entries = Object.entries(parsed.byCategory || {}).filter(
            ([, v]) => v && v.attempted >= 2
          );
          if (entries.length > 0) {
            entries.sort((a, b) => a[1].correct / a[1].attempted - b[1].correct / b[1].attempted);
            const [catName, topWeak] = entries[0];
            weakAptitudeCategory = catName as AptitudeCategory;
            weakAptitudeAccuracy = Math.round((topWeak.correct / topWeak.attempted) * 100);
          }
        }
      } catch {
        // Ignore malformed local stats
      }

      setWeaknessRadar({
        weakTopics,
        weakAptitudeCategory,
        weakAptitudeAccuracy,
      });
    };

    void loadWeaknessData();

    const handleReturnSync = () => {
      const latest = loadActiveMock();
      if (latest && latest.codingProblems.length > 0) {
        void syncCodingSolveStatus(latest);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleReturnSync();
      }
    };

    window.addEventListener('focus', handleReturnSync);
    window.addEventListener('codeprep:progress-updated', handleReturnSync);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleReturnSync);
      window.removeEventListener('codeprep:progress-updated', handleReturnSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncCodingSolveStatus]);

  // Countdown timer when unsubmitted mock is running
  useEffect(() => {
    if (!session || session.submitted) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((session.expiresAtMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && initialSyncReadyRef.current) {
        submitMockRef.current();
      }
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
    const totalCoding =
      config.easyDsa + config.mediumDsa + config.hardDsa + config.sqlCount + config.oopCount;
    if (totalCoding === 0 && config.aptitudeCount === 0) {
      setErrorMsg('Select at least 1 Aptitude MCQ or Coding problem.');
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);

    try {
      const pools = await fetchRandomizedPools(config);
      const previouslySeen = loadSeenIds();
      const seenSet = new Set<number>(previouslySeen);
      const chosenIds = new Set<number>();
      const preferredTopicSet =
        config.targetWeakTopics && weaknessRadar.weakTopics.length > 0
          ? new Set(weaknessRadar.weakTopics.map((w) => w.topic))
          : undefined;

      const pickedEasy = pickRandomProblems(
        pools.easyDsa || [],
        config.easyDsa,
        chosenIds,
        seenSet,
        preferredTopicSet
      );
      const pickedMed = pickRandomProblems(
        pools.mediumDsa || [],
        config.mediumDsa,
        chosenIds,
        seenSet,
        preferredTopicSet
      );
      const pickedHard = pickRandomProblems(
        pools.hardDsa || [],
        config.hardDsa,
        chosenIds,
        seenSet,
        preferredTopicSet
      );
      const pickedSql = pickRandomProblems(pools.sql || [], config.sqlCount, chosenIds, seenSet);
      const pickedOop = pickRandomProblems(pools.oop || [], config.oopCount, chosenIds, seenSet);

      const dsaMixed = shuffleArray([...pickedEasy, ...pickedMed, ...pickedHard]);
      const codingProblems = [...dsaMixed, ...pickedSql, ...pickedOop];

      const updatedSeen = [
        ...previouslySeen.filter((id) => !chosenIds.has(id)),
        ...Array.from(chosenIds),
      ];
      saveSeenIds(updatedSeen);

      const aptitudeQuestions =
        config.aptitudeCount > 0
          ? generateAptitudeBatch(config.aptitudeFocus, config.aptitudeCount)
          : [];

      const durationSec = config.durationMinutes * 60;
      const diffParts: string[] = [];
      if (config.easyDsa > 0) diffParts.push(`${config.easyDsa} Easy`);
      if (config.mediumDsa > 0) diffParts.push(`${config.mediumDsa} Med`);
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

      initialSyncReadyRef.current = true;
      persistActiveMock(newSession);
      setSession(newSession);
      setSecondsLeft(durationSec);
      setAptitudeIndex(0);
      setActiveSection(aptitudeQuestions.length > 0 ? 'aptitude' : 'coding');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not load problems from the server.'
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

    const nextHistory = [historyEntry, ...history.filter((h) => h.id !== historyEntry.id)].slice(
      0,
      15
    );
    setHistory(nextHistory);
    saveMockHistory(nextHistory);

    persistActiveMock(completed);
    setSession(completed);
  };

  submitMockRef.current = handleSubmitMock;

  const handleDiscardOrReset = () => {
    persistActiveMock(null);
    setSession(null);
    setAptitudeIndex(0);
    setSecondsLeft(0);
  };

  const aptitudeAnsweredCount = session ? Object.keys(session.aptitudeAnswers).length : 0;
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
  /* ACTIVE TEST SESSION VIEW                                                 */
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
    const effectiveSection =
      session.aptitudeQuestions.length === 0
        ? 'coding'
        : session.codingProblems.length === 0
        ? 'aptitude'
        : activeSection;

    return (
      <AppLayout currentTab="mock-interview" onTabChange={onTabChange}>
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Sticky Compact Assessment Bar */}
          <div className="bg-surface border border-border-subtle rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary truncate">
                    {session.trackName}
                  </span>
                  {session.submitted && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-success-subtle text-success">
                      Submitted
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-text-muted">{session.difficultyLabel}</div>
              </div>

              {session.aptitudeQuestions.length > 0 && session.codingProblems.length > 0 && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-subtle border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setActiveSection('aptitude')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      effectiveSection === 'aptitude'
                        ? 'bg-surface-elevated text-text-primary border border-border-default shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-primary" />
                    <span>
                      Aptitude ({aptitudeAnsweredCount}/{session.aptitudeQuestions.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('coding')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      effectiveSection === 'coding'
                        ? 'bg-surface-elevated text-text-primary border border-border-default shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 text-success" />
                    <span>
                      Coding ({codingSolvedCount}/{session.codingProblems.length})
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 ${
                  isLowTime
                    ? 'bg-danger-subtle border-danger/45 text-danger'
                    : 'bg-surface-subtle border-border-subtle text-text-primary'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>
                  {session.submitted
                    ? formatTimer(session.elapsedSecOnSubmit || 0)
                    : formatTimer(secondsLeft)}
                </span>
              </div>

              {!session.submitted ? (
                <button
                  type="button"
                  onClick={handleSubmitMock}
                  className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Finish &amp; Submit</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartNewMock}
                  disabled={isGenerating}
                  className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Loading...' : 'New Mock'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDiscardOrReset}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          </div>

          {/* Post-Submission Scorecard Strip */}
          {session.submitted && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-surface border border-border-subtle rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono text-text-muted">Aptitude Score</div>
                  <div className="text-xl font-bold text-text-primary font-mono mt-0.5">
                    {aptitudeCorrectCount}/{session.aptitudeQuestions.length}{' '}
                    <span className="text-xs font-normal text-text-secondary">
                      ({aptitudePct}%)
                    </span>
                  </div>
                </div>
                <Trophy className="w-5 h-5 text-primary shrink-0" />
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono text-text-muted">Coding Solved</div>
                  <div className="text-xl font-bold text-text-primary font-mono mt-0.5">
                    {codingSolvedCount}/{session.codingProblems.length}{' '}
                    <span className="text-xs font-normal text-text-secondary">({codingPct}%)</span>
                  </div>
                </div>
                <Code2 className="w-5 h-5 text-success shrink-0" />
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono text-text-muted">Summary</div>
                  <div className="text-sm font-bold text-text-primary mt-0.5">
                    {aptitudePct >= 70 && codingPct >= 50
                      ? 'Target Passed'
                      : 'Review Weak Questions'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => syncCodingSolveStatus(session)}
                  disabled={isSyncingSolveStatus}
                  title="Refresh submission status"
                  className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-text-secondary hover:text-primary transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingSolveStatus ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {/* PART A: APTITUDE SECTION */}
          {effectiveSection === 'aptitude' && currentAptitudeQ && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* MCQ Area */}
              <div className="lg:col-span-8 bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-subtle">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-surface-elevated border border-border-subtle text-text-primary">
                      Q{aptitudeIndex + 1}/{session.aptitudeQuestions.length}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-primary-subtle text-primary">
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
                          ? 'bg-warning-subtle border-warning/45 text-warning'
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

                <h2 className="text-base font-semibold text-text-primary leading-relaxed whitespace-pre-line">
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
                        style = 'bg-success-subtle border border-success/45 text-success font-semibold';
                      } else if (isSelected) {
                        style = 'bg-danger-subtle border border-danger/45 text-danger';
                      } else {
                        style = 'bg-surface-subtle border border-border-subtle opacity-50 text-text-muted';
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

                {session.submitted && (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                      <Lightbulb className="w-4 h-4 text-warning" />
                      <span>Explanation</span>
                    </div>
                    <p className="text-text-secondary text-[13px] leading-relaxed">
                      {currentAptitudeQ.explanation}
                    </p>
                    <div className="pt-2 border-t border-border-subtle text-xs font-mono text-primary">
                      Tip: <span className="text-text-secondary">{currentAptitudeQ.shortcutTip}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    disabled={aptitudeIndex === 0}
                    onClick={() => setAptitudeIndex((i) => Math.max(0, i - 1))}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-xs text-text-secondary hover:text-text-primary disabled:opacity-40"
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
                      className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-black text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : session.codingProblems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveSection('coding')}
                      className="px-4 py-1.5 rounded-lg bg-success text-black text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>Go to Coding</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Compact Navigator */}
              <div className="lg:col-span-4 bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
                    Questions
                  </h3>
                  <span className="text-xs font-mono text-text-secondary">
                    {aptitudeAnsweredCount}/{session.aptitudeQuestions.length}
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
                          ? 'bg-success-subtle border-success/45 text-success'
                          : 'bg-danger-subtle border-danger/45 text-danger';
                    } else if (isFlagged) {
                      pillStyle = 'bg-warning-subtle border-warning/50 text-warning';
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

                <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>Answered: {aptitudeAnsweredCount}</span>
                  <span>Flagged: {session.flaggedIds.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* PART B: CODING ROUND SECTION */}
          {effectiveSection === 'coding' && (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border-subtle rounded-2xl px-5 py-3">
                <span className="text-xs text-text-secondary">
                  Solve problems in the editor — status updates automatically when you return.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleRevealTopics}
                    className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-secondary hover:text-text-primary flex items-center gap-1.5"
                  >
                    {session.revealTopics ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Topics</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show Topics</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => syncCodingSolveStatus(session)}
                    disabled={isSyncingSolveStatus}
                    className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-secondary hover:text-text-primary flex items-center gap-1.5"
                    title="Refresh solve status"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isSyncingSolveStatus ? 'animate-spin' : ''}`}
                    />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <div className="bg-surface border border-border-subtle rounded-2xl divide-y divide-border-subtle overflow-hidden">
                {session.codingProblems.map((prob, idx) => {
                  const diffBadge =
                    prob.difficulty === 'Easy'
                      ? 'bg-success-subtle text-success'
                      : prob.difficulty === 'Medium'
                      ? 'bg-warning-subtle text-warning'
                      : 'bg-danger-subtle text-danger';

                  return (
                    <div
                      key={`${prob.id}-${idx}`}
                      className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-subtle transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-text-muted">#{prob.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${diffBadge}`}
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
                          {prob.isSolved && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-success">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Solved
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-semibold text-text-primary truncate">
                          {prob.title}
                        </h3>

                        {session.revealTopics && (
                          <p className="text-xs font-mono text-primary">
                            {prob.topic}
                            {prob.pattern ? ` · ${prob.pattern}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!session.submitted && (
                          <button
                            type="button"
                            onClick={() => handleSwapCodingProblem(idx)}
                            disabled={isSyncingSolveStatus}
                            className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
                            title="Replace with another problem"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                            <span>Swap</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectProblem(prob.id)}
                          className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-black text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{prob.isSolved ? 'Review' : 'Solve'}</span>
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
  /* SETUP HUB VIEW (Clean 2-Column Assessment Builder)                       */
  /* ------------------------------------------------------------------------ */
  const totalCodingCount =
    config.easyDsa + config.mediumDsa + config.hardDsa + config.sqlCount + config.oopCount;

  return (
    <AppLayout currentTab="mock-interview" onTabChange={onTabChange}>
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border-subtle pb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Mock Interview
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Timed Aptitude MCQs and unseen DSA, SQL, and C++ OOP coding questions in one assessment.
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Prioritizes unsolved problems automatically
          </span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-danger-subtle border border-danger/35 text-xs text-danger font-mono">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Track Selection + Mix Steppers */}
          <div className="lg:col-span-7 space-y-5">
            {/* Format Presets */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
                  Interview Format
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {COMPANY_PROFILES.map((profile) => {
                  const isSelected = config.trackId === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => handleSelectProfile(profile)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-primary-subtle border-primary/50 text-primary font-semibold'
                          : 'bg-surface-subtle border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                      }`}
                    >
                      {profile.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-2">
                <div className="text-sm font-semibold text-text-primary">{selectedProfile.name}</div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {selectedProfile.tagline}
                </p>
                <ul className="space-y-1 pt-0.5">
                  {selectedProfile.highlights.map((pt, i) => (
                    <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Question Count & Topic Settings */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  <span>Round Mix</span>
                </h2>
                <span className="text-xs font-mono text-text-muted">
                  {totalCodingCount} Coding · {config.aptitudeCount} MCQ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <CounterControl
                  label="Easy DSA"
                  badgeColor="text-success"
                  value={config.easyDsa}
                  min={0}
                  max={3}
                  onChange={(easyDsa) => setConfig((p) => ({ ...p, easyDsa }))}
                />
                <CounterControl
                  label="Medium DSA"
                  badgeColor="text-warning"
                  value={config.mediumDsa}
                  min={0}
                  max={4}
                  onChange={(mediumDsa) => setConfig((p) => ({ ...p, mediumDsa }))}
                />
                <CounterControl
                  label="Hard DSA"
                  badgeColor="text-danger"
                  value={config.hardDsa}
                  min={0}
                  max={2}
                  onChange={(hardDsa) => setConfig((p) => ({ ...p, hardDsa }))}
                />
                <CounterControl
                  label="SQL Queries"
                  value={config.sqlCount}
                  min={0}
                  max={2}
                  onChange={(sqlCount) => setConfig((p) => ({ ...p, sqlCount }))}
                />
                <CounterControl
                  label="OOP / C++"
                  value={config.oopCount}
                  min={0}
                  max={2}
                  onChange={(oopCount) => setConfig((p) => ({ ...p, oopCount }))}
                />
                <CounterControl
                  label="Aptitude MCQs"
                  value={config.aptitudeCount}
                  min={0}
                  max={15}
                  onChange={(aptitudeCount) => setConfig((p) => ({ ...p, aptitudeCount }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-text-muted block">
                    Aptitude Focus
                  </label>
                  <select
                    value={config.aptitudeFocus}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        aptitudeFocus: e.target.value as AptitudeCategory | 'Mixed',
                      }))
                    }
                    className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="Mixed">Mixed Categories</option>
                    <option value="Arithmetic Aptitude">Arithmetic Aptitude</option>
                    <option value="Data Interpretation">Data Interpretation</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                    <option value="Verbal Ability">Verbal Ability</option>
                    <option value="Verbal Reasoning">Verbal Reasoning</option>
                    <option value="Nonverbal Reasoning">Nonverbal Reasoning</option>
                    <option value="Interview Puzzles">Interview Puzzles</option>
                    <option value="OOPs & C++ Design">OOPs &amp; C++ Design</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-text-muted block">Time Limit</label>
                  <select
                    value={config.durationMinutes}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, durationMinutes: Number(e.target.value) }))
                    }
                    className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                    <option value={75}>75 Minutes</option>
                    <option value={90}>90 Minutes</option>
                  </select>
                </div>
              </div>

              {(weaknessRadar.weakTopics.length > 0 || weaknessRadar.weakAptitudeCategory) && (
                <label className="flex items-start justify-between gap-3 pt-2 border-t border-border-subtle cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-text-primary">
                      Prioritize weak topics
                    </div>
                    <div className="text-[11px] text-text-muted">
                      {weaknessRadar.weakTopics.length > 0
                        ? `Low solve rate: ${weaknessRadar.weakTopics.map((w) => w.topic).join(', ')}`
                        : `Weak aptitude: ${weaknessRadar.weakAptitudeCategory} (${weaknessRadar.weakAptitudeAccuracy}%)`}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(config.targetWeakTopics)}
                    onChange={(e) => {
                      const nextTargeted = e.target.checked;
                      setConfig((prev) => ({
                        ...prev,
                        targetWeakTopics: nextTargeted,
                        aptitudeFocus:
                          nextTargeted && weaknessRadar.weakAptitudeCategory
                            ? weaknessRadar.weakAptitudeCategory
                            : prev.aptitudeFocus,
                      }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded accent-primary"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Right Column: Launch Summary + History */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-4 shadow-sm">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
                Round Summary
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                  <span className="text-text-muted">Track</span>
                  <span className="font-semibold text-text-primary">{selectedProfile.shortLabel}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                  <span className="text-text-muted">Coding Problems</span>
                  <span className="font-mono text-text-primary">{totalCodingCount}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                  <span className="text-text-muted">Aptitude MCQs</span>
                  <span className="font-mono text-text-primary">
                    {config.aptitudeCount} ({config.aptitudeFocus === 'Mixed' ? 'Mixed' : config.aptitudeFocus})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-text-muted">Duration</span>
                  <span className="font-mono text-text-primary">{config.durationMinutes} min</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartNewMock}
                disabled={isGenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-black font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isGenerating ? 'Preparing Assessment...' : 'Start Mock Interview'}</span>
              </button>
            </div>

            {/* Past Attempts */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-primary" />
                  <span>Past Attempts</span>
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
                <p className="text-xs text-text-muted py-2">
                  Completed rounds will appear here with your score and time.
                </p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
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
                      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                        <span className="truncate">{item.difficultyLabel}</span>
                        <span className="shrink-0 text-text-secondary">
                          MCQ {item.aptitudeScore}/{item.aptitudeTotal} · Code {item.codingSolved}/
                          {item.codingTotal}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
