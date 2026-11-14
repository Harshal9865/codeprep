import React, { useEffect, useRef, useState } from 'react';
import { Flame, CheckCircle2, Sparkles, ArrowRight, Trophy } from 'lucide-react';

export interface StreakCompletedEventDetail {
  problemId: number;
  problemTitle: string;
  currentStreak: number;
  longestStreak?: number;
  recentDays?: Array<{ date: string; solved: boolean; isToday: boolean }>;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

const EMBER_COLORS = ['#ffa116', '#ffb800', '#2cbb5d', '#34d399', '#ef4444', '#ffffff'];

export const StreakCelebrationOverlay: React.FC = () => {
  const [payload, setPayload] = useState<StreakCompletedEventDetail | null>(null);
  const [displayStreak, setDisplayStreak] = useState<number>(0);
  const [landed, setLanded] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const onStreakCompleted = (event: Event) => {
      const custom = event as CustomEvent<StreakCompletedEventDetail>;
      if (!custom.detail) return;
      setLanded(false);
      setDisplayStreak(Math.max(0, (custom.detail.currentStreak || 1) - 1));
      setPayload(custom.detail);
    };

    window.addEventListener('codeprep:streak-completed', onStreakCompleted);
    return () => window.removeEventListener('codeprep:streak-completed', onStreakCompleted);
  }, []);

  // Animate streak number increment + auto-dismiss
  useEffect(() => {
    if (!payload) return;

    const bumpTimer = window.setTimeout(() => {
      setDisplayStreak(Math.max(1, payload.currentStreak || 1));
      setLanded(true);
    }, 320);

    const closeTimer = window.setTimeout(() => {
      setPayload(null);
    }, 5200);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        setPayload(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(bumpTimer);
      window.clearTimeout(closeTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [payload]);

  // Crisp fullscreen pixel ember & confetti burst simulation
  useEffect(() => {
    if (!payload) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const particles: EmberParticle[] = [];

    const spawnBurst = (count: number, originX: number, originY: number, speedScale: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (2 + Math.random() * 8) * speedScale;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3.2,
          size: 4 + Math.floor(Math.random() * 6),
          color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
          alpha: 1,
          life: 0,
          maxLife: 48 + Math.floor(Math.random() * 44),
        });
      }
    };

    spawnBurst(90, cx, cy - 20, 1.1);
    const secondBurst = window.setTimeout(() => {
      spawnBurst(55, cx - 120, cy, 0.85);
      spawnBurst(55, cx + 120, cy, 0.85);
    }, 260);

    let rafId = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16; // gentle gravity
        p.vx *= 0.985;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(secondBurst);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [payload]);

  if (!payload) return null;

  const recentDays = payload.recentDays || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Streak Completed"
      onClick={() => setPayload(null)}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-up select-none"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 w-full h-full"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-2xl bg-surface border border-primary/50 shadow-[0_0_60px_rgba(255,161,22,0.28)] overflow-hidden p-6 sm:p-7 text-center space-y-5"
      >
        {/* Top Radial Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-72 rounded-full bg-primary/25 blur-3xl"
        />

        {/* Animated Flame Emblem */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/25 via-orange-500/20 to-emerald-500/20 border border-primary/50 flex items-center justify-center shadow-lg animate-streak-glow">
            <Flame className="w-11 h-11 text-primary fill-primary/40" />
          </div>
        </div>

        {/* Status Pill & Title */}
        <div className="space-y-1.5 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-subtle border border-success/35 text-success text-[11px] font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Today&apos;s Streak Completed!</span>
          </div>

          <div className="flex items-baseline justify-center gap-2 pt-2 font-mono">
            <span
              className={`text-6xl font-black tracking-tight text-text-primary transition-transform duration-300 ${
                landed ? 'scale-110 text-primary' : 'scale-95'
              }`}
            >
              {displayStreak}
            </span>
            <span className="text-base font-bold uppercase tracking-wider text-primary">
              Day{displayStreak === 1 ? '' : 's'} Streak
            </span>
          </div>

          <p className="text-xs text-text-secondary font-mono">
            Solved POTD <span className="text-text-primary font-semibold">#{payload.problemId}</span> •{' '}
            <span className="text-text-primary">{payload.problemTitle}</span>
          </p>
        </div>

        {/* 7-Day Streak Check-In Strip */}
        {recentDays.length > 0 && (
          <div className="rounded-xl bg-surface-elevated border border-border-subtle p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span>7-Day Daily Consistency</span>
              {typeof payload.longestStreak === 'number' && payload.longestStreak > 0 && (
                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                  <Trophy className="w-3 h-3" />
                  Best: {payload.longestStreak}d
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {recentDays.map((day) => {
                const dayNum = day.date.slice(-2);
                const solved = day.solved || day.isToday;
                return (
                  <div
                    key={day.date}
                    className={`w-9 h-9 rounded-lg font-mono text-xs font-bold flex flex-col items-center justify-center border transition-all ${
                      day.isToday
                        ? 'bg-success text-black border-success scale-110 shadow-[0_0_16px_rgba(44,187,93,0.55)]'
                        : solved
                        ? 'bg-success-subtle text-success border-success/40'
                        : 'bg-surface text-text-muted border-border-subtle'
                    }`}
                  >
                    {solved ? <CheckCircle2 className="w-4 h-4" /> : dayNum}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action & Auto-dismiss bar */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => setPayload(null)}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-black font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Keep Momentum</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="w-full h-1 rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-amber-400 to-success animate-progress-fill"
              style={{ animationDuration: '5.1s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

