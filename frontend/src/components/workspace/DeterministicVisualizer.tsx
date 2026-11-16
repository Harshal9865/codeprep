import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

export interface VisualStep {
  step: number;
  description?: string;
  currentIndex?: number;
  currentValue?: number;
  complement?: number;
  hashMap?: Record<string, unknown>;
  stack?: string[];
  minPrice?: number;
  profit?: number;
  maxProfit?: number;
  state?: string;
  decision?: string;
}

export interface VisualTraceData {
  steps: VisualStep[];
}

export const DeterministicVisualizer: React.FC<{ trace: VisualTraceData }> = ({ trace }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const steps = trace.steps || [];
  const currentStep = steps[currentStepIdx] || steps[0];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1600);
    }
    return () => {
      if (interval !== undefined) clearInterval(interval);
    };
  }, [isPlaying, steps.length]);

  if (steps.length === 0) {
    return <div className="p-4 text-xs font-mono text-text-muted">No visual trace available for this problem.</div>;
  }

  return (
    <div className="rounded-xl border border-border-default bg-surface-subtle p-5 space-y-4">
      {/* Visualizer Header & Timeline Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="font-headline font-bold text-xs uppercase tracking-wider text-text-primary">
            Algorithm Step Trace
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/30">
            Step {currentStepIdx + 1} of {steps.length}
          </span>
        </div>

        {/* Player Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setIsPlaying(false); setCurrentStepIdx(0); }}
            className="p-1.5 rounded-md bg-surface-elevated hover:bg-surface-high border border-border-default text-text-secondary hover:text-text-primary transition-colors"
            title="Reset to beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setIsPlaying(false); setCurrentStepIdx((prev) => Math.max(0, prev - 1)); }}
            disabled={currentStepIdx === 0}
            className="p-1.5 rounded-md bg-surface-elevated hover:bg-surface-high border border-border-default text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Step backward"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 text-xs font-mono font-medium shadow-xs"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={() => { setIsPlaying(false); setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1)); }}
            disabled={currentStepIdx === steps.length - 1}
            className="p-1.5 rounded-md bg-surface-elevated hover:bg-surface-high border border-border-default text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Step forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step Description Banner */}
      <div className="p-3.5 rounded-lg bg-surface border border-border-default space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
          Current State Execution:
        </span>
        <p className="text-xs font-mono text-text-primary leading-relaxed">
          {currentStep.description || currentStep.state || currentStep.decision || `Executed Step ${currentStep.step}`}
        </p>
      </div>

      {/* Visual Memory Representation */}
      <div className="p-4 rounded-lg bg-surface border border-border-default space-y-3 font-mono text-xs">
        {/* Dynamic Variable Chips */}
        <div className="flex flex-wrap items-center gap-3">
          {currentStep.currentIndex !== undefined && (
            <div className="px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle">
              <span className="text-text-muted">Index (i): </span>
              <span className="text-primary font-bold">{currentStep.currentIndex}</span>
            </div>
          )}
          {currentStep.currentValue !== undefined && (
            <div className="px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle">
              <span className="text-text-muted">nums[i]: </span>
              <span className="text-text-primary font-bold">{currentStep.currentValue}</span>
            </div>
          )}
          {currentStep.complement !== undefined && (
            <div className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500">
              <span className="text-amber-500/80">Complement: </span>
              <span className="font-bold">{currentStep.complement}</span>
            </div>
          )}
          {currentStep.minPrice !== undefined && (
            <div className="px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle">
              <span className="text-text-muted">minPrice: </span>
              <span className="text-emerald-400 font-bold">{currentStep.minPrice}</span>
            </div>
          )}
          {currentStep.maxProfit !== undefined && (
            <div className="px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle">
              <span className="text-text-muted">maxProfit: </span>
              <span className="text-emerald-400 font-bold">{currentStep.maxProfit}</span>
            </div>
          )}
        </div>

        {/* Stack State if applicable */}
        {currentStep.stack && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-text-muted">ACTIVE STACK:</span>
            <div className="flex items-center gap-2 p-2 rounded bg-surface-subtle border border-border-default min-h-[36px]">
              {currentStep.stack.length === 0 ? (
                <span className="text-text-muted italic">[Empty Stack]</span>
              ) : (
                currentStep.stack.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-bold"
                  >
                    {item}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {/* Hash Map State if applicable */}
        {currentStep.hashMap && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-text-muted">STORED HASH TABLE STATE:</span>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded bg-surface-subtle border border-border-default min-h-[36px]">
              {Object.keys(currentStep.hashMap).length === 0 ? (
                <span className="text-text-muted italic">{"{ } (empty)"}</span>
              ) : (
                Object.entries(currentStep.hashMap).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded bg-surface-elevated border border-border-default text-text-secondary"
                  >
                    <strong className="text-primary">{k}</strong> → index {String(v)}
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

