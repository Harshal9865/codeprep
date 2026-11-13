import React, { useState } from 'react';
import { apiRequest } from '../../services/api';
import { Button } from '../ui/Button';
import { CodePrepLoader } from '../ui/CodePrepLoader';
import { Activity, X, Play, Zap, TrendingUp } from 'lucide-react';

interface PerformancePoint {
  n: number;
  runtimeMs: number;
  memoryKb: number;
}

interface PerformanceResult {
  problemId: number;
  dataPoints: PerformancePoint[];
  predictedComplexity: string;
  confidence: number;
  summary: string;
  referenceComplexity: string;
}

interface PerformanceCurveModalProps {
  problemId: number;
  currentCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceCurveModal: React.FC<PerformanceCurveModalProps> = ({
  problemId,
  currentCode,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PerformanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const runBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ result: PerformanceResult }>(
        `/analytics/performance/${problemId}`,
        {
          method: 'POST',
          body: JSON.stringify({ code: currentCode }),
        }
      );
      setResult(res.result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Benchmark evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate coordinates for pure SVG plotting
  const renderSvgGraph = (points: PerformancePoint[]) => {
    const width = 460;
    const height = 180;
    const padding = 35;

    const maxN = Math.max(...points.map((p) => p.n));
    const maxT = Math.max(...points.map((p) => p.runtimeMs), 0.1);

    const getX = (n: number) => padding + ((n - points[0].n) / (maxN - points[0].n)) * (width - 2 * padding);
    const getY = (t: number) => height - padding - (t / maxT) * (height - 2 * padding);

    const pathData = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.n)} ${getY(p.runtimeMs)}`)
      .join(' ');

    return (
      <svg className="w-full h-48 bg-surface-subtle rounded-lg border border-border-default p-2" viewBox={`0 0 ${width} ${height}`}>
        {/* Axes */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="stroke-border-default"
          strokeWidth="1.5"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          className="stroke-border-default"
          strokeWidth="1.5"
        />

        {/* Labels */}
        <text x={width - padding} y={height - 12} className="fill-text-muted" fontSize="10" textAnchor="end">
          Input Size (N)
        </text>
        <text x={padding} y={18} className="fill-text-muted" fontSize="10">
          Runtime (ms)
        </text>

        {/* Data curve line */}
        <path d={pathData} fill="none" className="stroke-primary" strokeWidth="2.5" />

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={getX(p.n)}
              cy={getY(p.runtimeMs)}
              r="4.5"
              className="fill-primary stroke-canvas"
              strokeWidth="2"
            />
            <text
              x={getX(p.n)}
              y={getY(p.runtimeMs) - 8}
              className="fill-text-primary font-mono"
              fontSize="9"
              textAnchor="middle"
            >
              {p.runtimeMs}ms
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-page-enter">
      <div className="bg-surface border border-border-subtle rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-up">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border-subtle bg-surface-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-text-primary">
              Empirical Performance & Big-O Fit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-xs text-text-secondary">
            Tests your code against 5 scaled input tiers (N = 10, 100, 1000, 10000, 50000). Calculates median runtime across 3 executions per size and estimates theoretical Big-O scaling.
          </p>

          {!result && !loading && (
            <div className="py-12 border border-dashed border-border-default rounded-xl text-center flex flex-col items-center justify-center gap-3 bg-surface-subtle">
              <Zap className="w-8 h-8 text-primary opacity-80" />
              <div className="text-xs text-text-secondary">
                Ready to benchmark your current C++ implementation.
              </div>
              <Button variant="primary" onClick={runBenchmark} className="gap-2">
                <Play className="w-4 h-4" />
                <span>Run Empirical Benchmark</span>
              </Button>
            </div>
          )}

          {loading && (
            <div className="py-8">
              <CodePrepLoader
                variant="section"
                label="Running Benchmark Suite..."
                sublabel="Executing 15 empirical trials across 5 input sizes"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-danger-subtle border border-danger/30 rounded-lg text-xs text-danger">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Curve chart */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-text-primary">Empirical Growth Curve</span>
                  <span className="text-text-secondary">Median of 3 runs per tier</span>
                </div>
                {renderSvgGraph(result.dataPoints)}
              </div>

              {/* Asymptotic Fit Card */}
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="w-6 h-6" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Estimated Time Complexity:</span>
                    <span className="font-mono font-bold text-primary text-base">
                      {result.predictedComplexity}
                    </span>
                  </div>

                  <p className="text-xs text-text-primary leading-relaxed">
                    {result.summary}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-text-muted">
                    <span>Confidence Score: {Math.round(result.confidence * 100)}%</span>
                    <span>Target Interview Standard: {result.referenceComplexity}</span>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-border-default rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle border-b border-border-default text-text-secondary">
                    <tr>
                      <th className="py-2 px-3 font-medium">Input Tier (N)</th>
                      <th className="py-2 px-3 font-medium">Median Runtime</th>
                      <th className="py-2 px-3 font-medium">Approx. Memory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle font-mono text-[11px]">
                    {result.dataPoints.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-surface-elevated/60">
                        <td className="py-2 px-3 text-text-primary">{pt.n.toLocaleString()}</td>
                        <td className="py-2 px-3 text-primary">{pt.runtimeMs} ms</td>
                        <td className="py-2 px-3 text-text-secondary">{pt.memoryKb} KB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={runBenchmark} className="gap-2">
                  <Play className="w-3.5 h-3.5" />
                  <span>Re-run Benchmark</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

