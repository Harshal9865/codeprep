import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import { Button } from '../ui/Button';
import { CodePrepLoader } from '../ui/CodePrepLoader';
import { Activity, X, Play, Zap, TrendingUp, Cpu, AlertTriangle } from 'lucide-react';

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
  timeComplexity?: string;
  spaceComplexity?: string;
  bottleneck?: string;
  optimizationTip?: string;
  provider?: 'gemini' | 'local';
  partialTimeoutNote?: string;
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

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [problemId]);

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
      setError(err instanceof Error ? err.message : 'Complexity analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderSvgGraph = (points: PerformancePoint[]) => {
    const width = 460;
    const height = 175;
    const padding = 36;

    const minN = Math.min(...points.map((p) => p.n));
    const maxN = Math.max(...points.map((p) => p.n));
    const spanN = Math.max(1, maxN - minN);
    const maxT = Math.max(...points.map((p) => p.runtimeMs), 0.02);

    const getX = (n: number) => padding + ((n - minN) / spanN) * (width - 2 * padding);
    const getY = (t: number) => height - padding - (t / maxT) * (height - 2 * padding);

    const pathData = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.n)} ${getY(p.runtimeMs)}`)
      .join(' ');

    return (
      <svg
        className="w-full h-44 bg-surface-subtle rounded-xl border border-border-subtle p-2"
        viewBox={`0 0 ${width} ${height}`}
      >
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

        <text
          x={width - padding}
          y={height - 10}
          className="fill-text-muted"
          fontSize="10"
          textAnchor="end"
        >
          Effective Input N ({minN.toLocaleString()} → {maxN.toLocaleString()})
        </text>
        <text x={padding} y={16} className="fill-text-muted" fontSize="10">
          Median Runtime (ms)
        </text>

        <path d={pathData} fill="none" className="stroke-primary" strokeWidth="2.5" />

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
              y={Math.max(24, getY(p.runtimeMs) - 8)}
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
      <div className="bg-surface border border-border-subtle rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle bg-surface-elevated flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-text-primary">Complexity Analyzer</h3>
              <p className="text-[11px] text-text-muted">
                Real C++ scaling benchmark + static/AI Big-O verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close complexity analyzer"
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!result && !loading && (
            <div className="py-10 border border-dashed border-border-default rounded-xl text-center flex flex-col items-center justify-center gap-3 bg-surface-subtle px-4">
              <Zap className="w-7 h-7 text-primary" />
              <div className="text-xs text-text-secondary max-w-md leading-relaxed">
                Compiles your current C++ solution, measures median runtime across scaled test tiers, fits OLS + log-log scaling curves, and verifies Time/Space complexity with AI.
              </div>
              <Button variant="primary" onClick={runBenchmark} className="gap-2">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Analyze Time &amp; Space Complexity</span>
              </Button>
            </div>
          )}

          {loading && (
            <div className="py-8">
              <CodePrepLoader
                variant="section"
                label="Analyzing Complexity..."
                sublabel="Running scaled C++ benchmarks & verifying asymptotic bounds"
              />
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-danger-subtle border border-danger/30 rounded-xl text-xs text-danger font-mono">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.partialTimeoutNote && (
                <div className="p-3 rounded-xl bg-warning-subtle/50 border border-warning/35 flex items-start gap-2 text-xs text-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{result.partialTimeoutNote}</span>
                </div>
              )}

              {/* Primary Complexity Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-elevated border border-primary/35 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-text-muted">
                    <span>Code Time</span>
                    {result.provider && (
                      <span className="text-primary">
                        {result.provider === 'gemini' ? 'Gemini' : 'Static'}
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-bold text-base text-primary">
                    {result.timeComplexity || result.predictedComplexity}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                  <div className="text-[10px] font-mono uppercase text-text-muted">Space</div>
                  <div className="font-mono font-bold text-base text-text-primary">
                    {result.spaceComplexity || 'O(1)'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-text-muted">
                    <span>Empirical Fit</span>
                    <span>R² {Math.round(result.confidence * 100)}%</span>
                  </div>
                  <div className="font-mono font-bold text-base text-success">
                    {result.predictedComplexity}
                  </div>
                </div>
              </div>

              {/* Bottleneck & Optimization Insight */}
              {(result.bottleneck || result.optimizationTip) && (
                <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2 text-xs">
                  {result.bottleneck && (
                    <div className="flex items-start gap-2">
                      <Cpu className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-text-primary">Bottleneck: </span>
                        <span className="text-text-secondary">{result.bottleneck}</span>
                      </div>
                    </div>
                  )}
                  {result.optimizationTip && (
                    <div className="flex items-start gap-2 pt-1.5 border-t border-border-subtle">
                      <TrendingUp className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-text-primary">Assessment: </span>
                        <span className="text-text-secondary">{result.optimizationTip}</span>
                        <span className="block text-[11px] font-mono text-text-muted mt-1">
                          Optimal Target: {result.referenceComplexity}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empirical Curve */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Measured Growth Curve</span>
                  <span className="text-[11px] font-mono text-text-muted">{result.summary}</span>
                </div>
                {renderSvgGraph(result.dataPoints)}
              </div>

              {/* Measurements Table */}
              <div className="border border-border-subtle rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle border-b border-border-subtle text-text-muted font-mono text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Effective N</th>
                      <th className="py-2 px-3">Median Runtime</th>
                      <th className="py-2 px-3">Peak Memory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle font-mono text-[11px]">
                    {result.dataPoints.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-surface-elevated/50">
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
                  <span>Re-run Analysis</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
