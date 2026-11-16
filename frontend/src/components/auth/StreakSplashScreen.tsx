import React, { useEffect, useRef, useState } from 'react';
import { Flame, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../services/api';

interface StreakSplashScreenProps {
  displayName?: string;
  onComplete: () => void;
}

type SplashPhase = 'ignite' | 'surge' | 'closing';

/**
 * 16x16 Crisp Pixel-Art Fire Emblem in Orange, Yellow & Hot White Core
 */
const PixelFireCodeEmblem: React.FC<{ isSurge: boolean }> = ({ isSurge }) => (
  <svg
    viewBox="0 0 16 16"
      isSurge ? 'scale-110 drop-shadow-[0_0_24px_rgba(251,146,60,0.9)]' : 'drop-shadow-[0_0_14px_rgba(250,204,21,0.6)]'
    }`}
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    {/* Deep Amber & Orange Outer Flame */}
    <rect x="7" y="1" width="2" height="1" fill="#fde047" />
    <rect x="6" y="2" width="4" height="1" fill="#fb923c" />
    <rect x="5" y="3" width="6" height="2" fill="#f97316" />
    <rect x="4" y="5" width="8" height="2" fill="#ea580c" />
    <rect x="3" y="7" width="10" height="4" fill="#ea580c" />
    <rect x="4" y="11" width="8" height="2" fill="#c2410c" />
    <rect x="5" y="13" width="6" height="1" fill="#9a3412" />
    {/* Bright Golden Yellow Mid Flame */}
    <rect x="6" y="5" width="4" height="2" fill="#fde047" />
    <rect x="5" y="7" width="6" height="4" fill="#facc15" />
    <rect x="6" y="11" width="4" height="2" fill="#f59e0b" />
    {/* Hot White-Yellow Pixel Core */}
    <rect x="7" y="7" width="2" height="1" fill="#fef08a" />
    <rect x="6" y="8" width="4" height="3" fill="#ffffff" />
    <rect x="7" y="11" width="2" height="1" fill="#fef9c3" />
    {/* Rising Code Sparks */}
    <rect x="2" y="3" width="1" height="1" fill="#ffffff" />
    <rect x="13" y="2" width="1" height="1" fill="#fde047" />
    <rect x="12" y="5" width="1" height="1" fill="#ffffff" />
    <rect x="3" y="5" width="1" height="1" fill="#fb923c" />
  </svg>
);

const CODE_TOKENS = ['{ }', '01', '</>', 'fn()', 'O(n)', 'SELECT', '++i', '&&'];

export const StreakSplashScreen: React.FC<StreakSplashScreenProps> = ({
  displayName,
  onComplete,
}) => {
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [displayStreak, setDisplayStreak] = useState<number>(0);
  const [totalSolved, setTotalSolved] = useState<number>(0);
  const [phase, setPhase] = useState<SplashPhase>('ignite');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<SplashPhase>('ignite');
  phaseRef.current = phase;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Fetch live DB streak while animation runs
  useEffect(() => {
    let cancelled = false;
    apiRequest<{
      analytics: { currentStreak?: number; totalSolved?: number };
    }>('/analytics/dashboard')
      .then((res) => {
        if (cancelled) return;
        setCurrentStreak(res.analytics?.currentStreak ?? 0);
        setTotalSolved(res.analytics?.totalSolved ?? 0);
      })
      .catch(() => {
        // Keep safe defaults
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Smooth streak number count-up
  useEffect(() => {
    if (currentStreak <= 0) {
      setDisplayStreak(0);
      return;
    }
    let step = 0;
    const totalSteps = Math.min(18, Math.max(6, currentStreak));
    const timer = window.setInterval(() => {
      step += 1;
      setDisplayStreak(Math.round((currentStreak * step) / totalSteps));
      if (step >= totalSteps) window.clearInterval(timer);
    }, 32);
    return () => window.clearInterval(timer);
  }, [currentStreak]);

  // Exact 3-second choreography:
  // 0ms -> 2050ms: Red + White pixel fire ignites upward
  // 2050ms -> 2440ms: Fire surge flare before closure
  // 2440ms -> 3000ms: Top & Bottom pixel-edged shutters close cleanly
  useEffect(() => {
    const surgeTimer = window.setTimeout(() => setPhase('surge'), 2050);
    const closeTimer = window.setTimeout(() => setPhase('closing'), 2440);
    const doneTimer = window.setTimeout(() => onCompleteRef.current(), 3000);

    return () => {
      window.clearTimeout(surgeTimer);
      window.clearTimeout(closeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  // Keyboard Escape skips cleanly
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCompleteRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Real-time Pixelated Red & White Doom-style Fire Cellular Simulation on <canvas>
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 128;
    const H = 72;
    canvas.width = W;
    canvas.height = H;

    // 36-level Deep Amber -> Vivid Orange -> Golden Yellow -> Hot White Palette
    const palette: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 36; i++) {
      if (i === 0) {
        palette.push([2, 2, 2, 0]);
      } else if (i < 10) {
        const t = i / 10;
        palette.push([Math.round(120 + t * 129), Math.round(32 + t * 83), Math.round(t * 22), Math.round(95 + t * 145)]);
      } else if (i < 24) {
        const t = (i - 10) / 14;
        palette.push([Math.round(249 + t * 6), Math.round(115 + t * 109), Math.round(22 + t * 50), 255]);
      } else {
        const t = (i - 24) / 11;
        palette.push([255, Math.round(224 + t * 31), Math.round(72 + t * 183), 255]);
      }
    }

    const firePixels = new Uint8Array(W * H);
    for (let x = 0; x < W; x++) {
      firePixels[(H - 1) * W + x] = 35;
    }

    const imgData = ctx.createImageData(W, H);
    let animId = 0;
    let lastTick = 0;

    const stepSimulation = (timestamp: number) => {
      animId = window.requestAnimationFrame(stepSimulation);
      if (timestamp - lastTick < 38) return; // Crisp ~26fps pixel animation
      lastTick = timestamp;

      const currentPhase = phaseRef.current;
      const baseHeat = currentPhase === 'surge' ? 35 : currentPhase === 'closing' ? 33 : 32;

      // Ignite bottom emitter row across center band + sparse edge embers
      for (let x = 0; x < W; x++) {
        const edgeDist = Math.abs(x - W / 2) / (W / 2);
        const keep = currentPhase === 'surge' || Math.random() > edgeDist * 0.45;
        firePixels[(H - 1) * W + x] = keep ? baseHeat : Math.max(0, 18 - Math.floor(Math.random() * 14));
      }

      for (let x = 0; x < W; x++) {
        for (let y = 1; y < H; y++) {
          const src = y * W + x;
          const pixel = firePixels[src];
          if (pixel === 0) {
            firePixels[(y - 1) * W + x] = 0;
            continue;
          }
          const rand = Math.floor(Math.random() * 3);
          const dstX = Math.min(W - 1, Math.max(0, x - rand + 1));
          const dst = (y - 1) * W + dstX;
          const decay =
            currentPhase === 'surge'
              ? rand & 1
              : Math.random() < 0.35
              ? 1
              : rand & 1;
          firePixels[dst] = Math.max(0, pixel - decay);
        }
      }

      const data = imgData.data;
      for (let i = 0; i < W * H; i++) {
        const [r, g, b, a] = palette[firePixels[i]] || palette[0];
        const p = i * 4;
        data[p] = r;
        data[p + 1] = g;
        data[p + 2] = b;
        data[p + 3] = a;
      }
      ctx.putImageData(imgData, 0, 0);
    };

    animId = window.requestAnimationFrame(stepSimulation);
    return () => window.cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020202] text-white overflow-hidden select-none flex flex-col items-center justify-center"
      role="status"
      aria-live="polite"
    >
      {/* Subtle Pixel Grid Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Fullscreen Crisp Pixelated Red & White Fire Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full opacity-90"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Floating Pixel Code Tokens rising from flames */}
      <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-around px-6 opacity-80">
        {CODE_TOKENS.map((tok, idx) => (
          <span
            key={tok}
            className={`font - mono text - [11px] font - bold px - 1.5 py - 0.5 border animate - pixel - float ${
  idx % 3 === 0
    ? 'text-white border-white/35 bg-orange-500/35'
    : idx % 3 === 1
      ? 'text-yellow-300 border-amber-400/50 bg-black/55'
      : 'text-orange-200 border-orange-400/45 bg-orange-950/50'
} `}
            style={{ animationDelay: `${ idx * 160 } ms` }}
          >
            {tok}
          </span>
        ))}
      </div>

      {/* Center Streak & Code Ignition Card */}
      <div
        className={`relative z - 10 flex flex - col items - center text - center px - 6 py - 7 rounded - none border - 2 transition - all duration - 300 bg - black / 80 backdrop - blur - sm max - w - sm w - [90 %] ${
  phase === 'surge'
      ? 'border-white scale-105 shadow-[0_0_42px_rgba(250,204,21,0.75)]'
      : 'border-amber-400/75 shadow-[0_0_26px_rgba(249,115,22,0.5)]'
} `}
      >
        <PixelFireCodeEmblem isSurge={phase === 'surge'} />

        <div className="mt-3 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-amber-400/50 bg-orange-950/60 font-mono text-[11px] tracking-widest uppercase text-amber-100">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>{displayName ? `Welcome, ${ displayName } ` : 'CodePrep Ignited'}</span>
          </div>

          <div className="flex items-baseline justify-center gap-2 pt-2 font-mono">
            <span className="text-5xl font-black tracking-tight text-white">
              {displayStreak}
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-amber-400">
              Day{displayStreak === 1 ? '' : 's'} Streak
            </span>
          </div>

          <p className="font-mono text-xs text-neutral-300 pt-1">
            {totalSolved} solved • Launching Explore Workspace
          </p>
        </div>

        {/* Pixelated Ignition Meter */}
        <div className="w-full mt-5 space-y-1.5">
          <div className="w-full h-2 bg-neutral-900 border border-orange-900/70 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-orange-600 via-yellow-400 to-white animate-progress-fill"
              style={{ animationDuration: '2.9s' }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            <span>
              {phase === 'closing'
                ? 'Closing Shutters...'
                : phase === 'surge'
                ? 'Core Ignited'
                : 'Compiling Arena...'}
            </span>
            <span className="text-white">3.0s</span>
          </div>
        </div>
      </div>

      {/* Skip control for quick access */}
      <button
        type="button"
        onClick={() => onCompleteRef.current()}
        className="fixed top-4 right-4 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/80 hover:bg-orange-950/90 border border-amber-400/50 text-xs font-mono text-white transition-colors"
      >
        <span>Skip</span>
        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
      </button>

      {/* Top & Bottom Pixelated Closing Shutters (ignite edge meets at center at 3.0s) */}
      {phase === 'closing' && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-x-0 top-0 h-1/2 z-40 bg-[#020202] animate-fire-shutter-top flex flex-col justify-end pointer-events-none"
          >
            {/* Pixelated Orange + Yellow + White Ignition Edge on Top Shutter */}
            <div className="w-full h-3 bg-gradient-to-r from-orange-600 via-yellow-400 to-orange-600 flex justify-around items-center">
              <span className="w-6 h-1.5 bg-white" />
              <span className="w-10 h-2 bg-white" />
              <span className="w-4 h-1.5 bg-yellow-200" />
              <span className="w-12 h-2 bg-white" />
              <span className="w-6 h-1.5 bg-yellow-300" />
            </div>
          </div>

          <div
            aria-hidden="true"
            className="fixed inset-x-0 bottom-0 h-1/2 z-40 bg-[#020202] animate-fire-shutter-bottom flex flex-col justify-start pointer-events-none"
          >
            {/* Pixelated Orange + Yellow + White Ignition Edge on Bottom Shutter */}
            <div className="w-full h-3 bg-gradient-to-r from-orange-600 via-white to-orange-600 flex justify-around items-center">
              <span className="w-8 h-1.5 bg-white" />
              <span className="w-4 h-2 bg-yellow-300" />
              <span className="w-12 h-2 bg-white" />
              <span className="w-6 h-1.5 bg-amber-200" />
              <span className="w-8 h-1.5 bg-white" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
