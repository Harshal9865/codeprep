import React, { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  Home,
  Sigma,
  BarChart3,
  BookCheck,
  PieChart,
  Type,
  LayoutGrid,
  Puzzle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Clock,
  ArrowRight,
  Zap,
  Trophy,
  Play,
  Sparkles,
} from 'lucide-react';
import {
  AptitudeCategory,
  GeneratedAptitudeQuestion,
  GridShapeFrame,
  QuestionVisual,
  OptionVisual,
  generateAptitudeBatch,
  generateAptitudeQuestion,
} from '../utils/aptitudeGenerator';

interface AptitudePageProps {
  onTabChange: (tab: string) => void;
}

type SidebarView = 'Home' | AptitudeCategory;

interface SessionStats {
  attempted: number;
  correct: number;
  streak: number;
  byCategory: Record<string, { attempted: number; correct: number }>;
}

const STATS_STORAGE_KEY = 'codeprep_aptitude_dynamic_stats_v1';

const CATEGORY_META: Array<{
  id: AptitudeCategory;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'Arithmetic Aptitude',
    label: 'Arithmetic Aptitude',
    desc: 'Trains, Time & Work, Pipes, Profit & Loss, CI/SI, Probability',
    icon: <Sigma className="w-4 h-4" />,
  },
  {
    id: 'Data Interpretation',
    label: 'Data Interpretation',
    desc: 'Dynamic SVG Bar Charts, Quarterly Tables & Growth Ratios',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: 'Verbal Ability',
    label: 'Verbal Ability',
    desc: 'Technical Vocabulary, Grammar Correction & Parallelism',
    icon: <BookCheck className="w-4 h-4" />,
  },
  {
    id: 'Logical Reasoning',
    label: 'Logical Reasoning',
    desc: 'Number Series, Coding-Decoding, Direction Sense & Ranking',
    icon: <PieChart className="w-4 h-4" />,
  },
  {
    id: 'Verbal Reasoning',
    label: 'Verbal Reasoning',
    desc: 'Syllogisms, Logical Contrapositives & Inference Checks',
    icon: <Type className="w-4 h-4" />,
  },
  {
    id: 'Nonverbal Reasoning',
    label: 'Nonverbal Reasoning',
    desc: 'Visual SVG Rotation Patterns & 4x4 Pixel Mirror Matrices',
    icon: <LayoutGrid className="w-4 h-4" />,
  },
  {
    id: 'Interview Puzzles',
    label: 'Interview Puzzles',
    desc: 'Two Eggs, Poisoned Bottles, Clock Angle, Pirates & Weighing',
    icon: <Puzzle className="w-4 h-4" />,
  },
];

/* -------------------------------------------------------------------------- */
/* INLINE SVG / CHART / TABLE RENDERERS FOR VISUAL QUESTIONS & OPTIONS        */
/* -------------------------------------------------------------------------- */

const SvgFrameGlyph: React.FC<{ frame: GridShapeFrame; size?: number }> = ({
  frame,
  size = 64,
}) => {
  const cornerCoords: Array<[number, number]> = [
    [10, 10],
    [54, 10],
    [54, 54],
    [10, 54],
  ];
  const [dotX, dotY] = cornerCoords[frame.dotCorner % 4] || [10, 10];
  const fillCol = frame.filled ? 'var(--color-primary)' : 'none';
  const strokeCol = 'var(--color-primary)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="rounded-lg bg-canvas border border-border-subtle shrink-0"
    >
      {/* Quadrant Dot Marker */}
      <circle cx={dotX} cy={dotY} r="3.5" fill="#10b981" />

      <g transform={`rotate(${frame.rotation} 32 32)`}>
        {frame.shape === 'arrow' && (
          <path
            d="M32 13 L46 30 L37 30 L37 50 L27 50 L27 30 L18 30 Z"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {frame.shape === 'triangle' && (
          <polygon
            points="32,14 49,47 15,47"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {frame.shape === 'l-piece' && (
          <path
            d="M22 15 L31 15 L31 39 L45 39 L45 48 L22 48 Z"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {frame.shape === 'diamond' && (
          <polygon
            points="32,13 48,32 32,51 16,32"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2.5"
          />
        )}
      </g>
    </svg>
  );
};

const PixelGridTile: React.FC<{ cells: number[][]; tileSize?: number }> = ({
  cells,
  tileSize = 68,
}) => {
  const cellPx = tileSize / 4;
  return (
    <svg
      width={tileSize}
      height={tileSize}
      viewBox={`0 0 ${tileSize} ${tileSize}`}
      shapeRendering="crispEdges"
      className="rounded-lg bg-canvas border border-border-subtle shrink-0"
    >
      {cells.map((row, r) =>
        row.map((val, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cellPx + 1.5}
            y={r * cellPx + 1.5}
            width={cellPx - 3}
            height={cellPx - 3}
            rx="1.5"
            fill={val === 1 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'}
          />
        ))
      )}
    </svg>
  );
};

const QuestionVisualBlock: React.FC<{ visual: QuestionVisual }> = ({ visual }) => {
  if (visual.type === 'bar-chart') {
    const maxVal = Math.max(...visual.items.map((i) => i.value), 10);
    return (
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-text-muted">
          <span className="font-semibold text-text-primary">{visual.title}</span>
          <span>Unit: {visual.unit}</span>
        </div>
        <div className="grid grid-cols-5 gap-3 items-end h-40 pt-5 px-2">
          {visual.items.map((item) => {
            const pct = Math.max(12, Math.round((item.value / maxVal) * 100));
            return (
              <div key={item.label} className="flex flex-col items-center justify-end h-full gap-1.5">
                <span className="text-[11px] font-mono font-bold text-text-primary">
                  {item.value}
                </span>
                <div
                  className={`w-full max-w-[44px] rounded-t-md transition-all ${
                    item.highlight ? 'bg-primary' : 'bg-emerald-500/70'
                  }`}
                  style={{ height: `${pct}%` }}
                />
                <span className="text-[11px] font-mono text-text-secondary text-center truncate w-full">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual.type === 'data-table') {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-subtle overflow-hidden">
        <div className="px-4 py-2 bg-surface-elevated/60 border-b border-border-subtle text-xs font-mono font-semibold text-text-primary">
          {visual.title}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted bg-surface-subtle">
                {visual.headers.map((h) => (
                  <th key={h} className="py-2 px-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {visual.rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-surface/40' : ''}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-4 text-text-primary">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (visual.type === 'svg-sequence') {
    return (
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5">
        <div className="text-xs font-mono text-text-muted">{visual.title}</div>
        <div className="flex flex-wrap items-center gap-3">
          {visual.frames.map((frame, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <SvgFrameGlyph frame={frame} size={64} />
                <span className="text-[10px] font-mono text-text-muted">Step {i + 1}</span>
              </div>
              <span className="text-text-muted font-mono text-xs">→</span>
            </React.Fragment>
          ))}
          {visual.showQuestionMark && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-lg border border-dashed border-primary/50 bg-primary-subtle/20 flex items-center justify-center font-mono text-xl font-bold text-primary">
                ?
              </div>
              <span className="text-[10px] font-mono text-primary">Step 5</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (visual.type === 'mirror-grid') {
    return (
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5">
        <div className="text-xs font-mono text-text-muted">{visual.title}</div>
        <div className="flex items-center gap-5">
          <PixelGridTile cells={visual.cells} tileSize={84} />
          <div className="h-20 w-0.5 bg-danger/70 relative flex items-center">
            <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-danger">
              Mirror Axis
            </span>
          </div>
          <div className="w-[84px] h-[84px] rounded-lg border border-dashed border-primary/50 bg-primary-subtle/15 flex items-center justify-center font-mono text-xl font-bold text-primary">
            ?
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const OptionVisualTile: React.FC<{ visual: OptionVisual }> = ({ visual }) => {
  if (visual.type === 'svg-frame' && visual.frame) {
    return <SvgFrameGlyph frame={visual.frame} size={46} />;
  }
  if (visual.type === 'mirror-grid' && visual.cells) {
    return <PixelGridTile cells={visual.cells} tileSize={52} />;
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/* MAIN APTITUDE PAGE                                                         */
/* -------------------------------------------------------------------------- */

export const AptitudePage: React.FC<AptitudePageProps> = ({ onTabChange }) => {
  const [sidebarView, setSidebarView] = useState<SidebarView>('Home');
  const [mode, setMode] = useState<'stream' | 'mock'>('stream');

  // Stream mode: always generates a brand new question on demand
  const [currentQ, setCurrentQ] = useState<GeneratedAptitudeQuestion>(() =>
    generateAptitudeQuestion('Mixed')
  );
  const [streamSelected, setStreamSelected] = useState<number | null>(null);

  // Mock test mode: batch of 10 freshly generated interview questions + countdown
  const [mockQuestions, setMockQuestions] = useState<GeneratedAptitudeQuestion[]>([]);
  const [mockIdx, setMockIdx] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<number, number>>({});
  const [mockSubmitted, setMockSubmitted] = useState(false);
  const [mockSecondsLeft, setMockSecondsLeft] = useState(600);

  const [stats, setStats] = useState<SessionStats>(() => {
    try {
      const saved = localStorage.getItem(STATS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage failure
    }
    return { attempted: 0, correct: 0, streak: 0, byCategory: {} };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage error
    }
  }, [stats]);

  // Countdown for timed mock mode
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

  const recordAnswer = (category: AptitudeCategory, isCorrect: boolean) => {
    setStats((prev) => {
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

  const handleOpenCategoryStream = (cat: AptitudeCategory | 'Mixed') => {
    if (cat !== 'Mixed') {
      setSidebarView(cat);
    }
    setMode('stream');
    setCurrentQ(generateAptitudeQuestion(cat));
    setStreamSelected(null);
  };

  const handleNextDynamicQuestion = () => {
    const targetCat: AptitudeCategory | 'Mixed' =
      sidebarView === 'Home' ? 'Mixed' : sidebarView;
    setCurrentQ(generateAptitudeQuestion(targetCat));
    setStreamSelected(null);
  };

  const handleSelectStreamOption = (optIdx: number) => {
    if (streamSelected !== null) return;
    setStreamSelected(optIdx);
    recordAnswer(currentQ.category, optIdx === currentQ.correctIndex);
  };

  const handleStartMockRound = (cat: AptitudeCategory | 'Mixed') => {
    const batch = generateAptitudeBatch(cat, 10);
    setMockQuestions(batch);
    setMockIdx(0);
    setMockAnswers({});
    setMockSubmitted(false);
    setMockSecondsLeft(600);
    setMode('mock');
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
    stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;

  return (
    <AppLayout currentTab="aptitude" onTabChange={onTabChange}>
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start animate-page-enter">
        {/* Left Navigation Sidebar (Screenshot-Inspired Categories) */}
        <aside className="w-full lg:w-64 shrink-0 bg-surface border border-border-subtle rounded-2xl p-3 space-y-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setSidebarView('Home');
              setMode('stream');
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
              handleStartMockRound(sidebarView === 'Home' ? 'Mixed' : sidebarView)
            }
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-[#020202] text-xs font-bold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>10-Q Timed Mock Test</span>
          </button>
        </aside>

        {/* Main Dynamic Aptitude Stage */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {/* Top Telemetry Banner */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Procedural Engine • New Question Every Time</span>
              </div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">
                {mode === 'mock'
                  ? 'Timed Placement Mock Round'
                  : sidebarView === 'Home'
                  ? 'Dynamic Interview Aptitude & Puzzles'
                  : sidebarView}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle">
                Solved: <strong className="text-success">{stats.correct}</strong>/{stats.attempted}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle">
                Accuracy: <strong className="text-primary">{accuracyPct}%</strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-warning" />
                Streak: <strong className="text-text-primary">{stats.streak}</strong>
              </div>
            </div>
          </div>

          {/* HOME OVERVIEW + INSTANT LIVE STREAM */}
          {sidebarView === 'Home' && mode === 'stream' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {CATEGORY_META.map((cat) => {
                const cStat = stats.byCategory[cat.id];
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
                        <span className="text-[11px] font-mono text-text-muted">Live Gen</span>
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

          {/* STREAM MODE: SINGLE LIVE GENERATED PROBLEM */}
          {mode === 'stream' && (
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

                <button
                  type="button"
                  onClick={handleNextDynamicQuestion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-text-primary transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  <span>Generate New Problem</span>
                </button>
              </div>

              <h2 className="text-base sm:text-lg font-semibold text-text-primary leading-relaxed whitespace-pre-line">
                {currentQ.question}
              </h2>

              {currentQ.visual && <QuestionVisualBlock visual={currentQ.visual} />}

              {/* Options */}
              <div
                className={
                  currentQ.optionVisuals
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                    : 'space-y-2.5'
                }
              >
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
                        {currentQ.optionVisuals?.[idx] && (
                          <OptionVisualTile visual={currentQ.optionVisuals[idx]} />
                        )}
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

              {/* Solution Breakdown & Interview Shortcut */}
              {streamSelected !== null && (
                <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5 text-sm animate-fade-up">
                  <div className="flex items-center gap-2 font-semibold text-text-primary">
                    <Lightbulb className="w-4 h-4 text-warning" />
                    <span>Step-by-Step Solution</span>
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
          )}

          {/* MOCK TEST MODE (10 FRESHLY GENERATED QUESTIONS + TIMER) */}
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
                      onClick={() => handleStartMockRound(sidebarView === 'Home' ? 'Mixed' : sidebarView)}
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
                        Click any numbered badge below to inspect the explanation.
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

                    {mq.visual && <QuestionVisualBlock visual={mq.visual} />}

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
                            {mq.optionVisuals?.[oIdx] && (
                              <OptionVisualTile visual={mq.optionVisuals[oIdx]} />
                            )}
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {mockSubmitted && (
                      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-secondary space-y-1">
                        <strong className="text-text-primary">Explanation:</strong> {mq.explanation}
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
        </main>
      </div>
    </AppLayout>
  );
};
