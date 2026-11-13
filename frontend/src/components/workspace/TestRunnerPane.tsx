import React, { useState, useEffect } from 'react';
import { TestCase, ExecutionResult } from '../../types/problem';
import { Play, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface TestRunnerPaneProps {
  sampleTestCases: TestCase[];
  functionSignature?: string;
  executionResult: ExecutionResult | null;
  isRunning: boolean;
  isSubmitting: boolean;
  onRun: (customTestCases?: TestCase[]) => void;
  onSubmit: () => void;
}

export const TestRunnerPane: React.FC<TestRunnerPaneProps> = ({
  sampleTestCases,
  functionSignature,
  executionResult,
  isRunning,
  isSubmitting,
  onRun,
  onSubmit,
}) => {
  const [activeTab, setActiveTab] = useState<'cases' | 'custom' | 'result'>('cases');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState(sampleTestCases[0]?.input || '');

  useEffect(() => {
    setSelectedCaseIdx(0);
    setCustomInput(sampleTestCases[0]?.input || '');
  }, [sampleTestCases]);

  // Auto-switch to result tab when execution finishes
  useEffect(() => {
    if (executionResult || isRunning || isSubmitting) {
      setActiveTab('result');
    }
  }, [executionResult, isRunning, isSubmitting]);

  const handleRunCustom = () => {
    onRun([{ input: customInput, expectedOutput: '' }]);
    setActiveTab('result');
  };

  const currentTestCase = sampleTestCases[selectedCaseIdx] || sampleTestCases[0];

  // Parse structured parameters matching LeetCode format
  const paramItems = React.useMemo(() => {
    if (!currentTestCase) return [];
    const inputParts = currentTestCase.input.split(' | ').map((p) => p.trim());

    let paramNames: string[] = [];
    if (functionSignature) {
      const match = functionSignature.match(/\((.*)\)/);
      if (match && match[1]) {
        paramNames = match[1].split(',').map((param) => {
          const parts = param.trim().split(/\s+/);
          const varName = parts[parts.length - 1].replace(/[*&]/g, '');
          return varName;
        });
      }
    }

    return inputParts.map((val, idx) => ({
      name: paramNames[idx] || (inputParts.length === 1 ? 'input' : `param_${idx + 1}`),
      value: val,
    }));
  }, [currentTestCase, functionSignature]);

  return (
    <div className="h-64 bg-surface flex flex-col overflow-hidden shrink-0 border-t border-border-subtle transition-colors">
      {/* Test Runner Header & Tabs */}
      <div className="h-11 bg-surface-subtle/90 px-4 flex items-center justify-between gap-4 select-none shrink-0 border-b border-border-subtle">
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-surface/80 border border-border-subtle">
          <button
            type="button"
            onClick={() => setActiveTab('cases')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'cases'
                ? 'bg-surface-elevated text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/50 border border-transparent'
            }`}
          >
            Testcase ({sampleTestCases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'custom'
                ? 'bg-surface-elevated text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/50 border border-transparent'
            }`}
          >
            Custom Input
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('result')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'result'
                ? 'bg-surface-elevated text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/50 border border-transparent'
            }`}
          >
            {executionResult ? (
              executionResult.verdict === 'Accepted' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-danger" />
              )
            ) : isRunning || isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-warning" />
            ) : null}
            <span>
              {isRunning || isSubmitting
                ? 'Executing...'
                : executionResult
                ? `Result: ${executionResult.verdict}`
                : 'Test Result'}
            </span>
          </button>
        </div>

        {/* Action Dock: Run and Submit */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRun()}
            disabled={isRunning || isSubmitting}
            className="px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high disabled:opacity-50 text-text-primary font-medium text-xs transition-all flex items-center gap-1.5 border border-border-subtle shadow-xs"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-warning" />
            ) : (
              <Play className="w-3.5 h-3.5 text-text-muted" />
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isRunning || isSubmitting}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-y-auto p-4 text-xs font-mono bg-surface">
        {activeTab === 'cases' && (
          <div className="space-y-4">
            {/* Case selector buttons */}
            <div className="flex items-center gap-2">
              {sampleTestCases.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedCaseIdx(idx)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    selectedCaseIdx === idx
                      ? 'bg-surface-high text-text-primary font-semibold border border-border-default'
                      : 'bg-surface-subtle text-text-muted hover:text-text-primary border border-border-subtle'
                  }`}
                >
                  Case {idx + 1}
                </button>
              ))}
            </div>

            {/* Selected case preview */}
            {currentTestCase && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {paramItems.map((item, pIdx) => (
                    <div key={pIdx} className="space-y-1">
                      <span className="text-xs text-text-muted font-sans font-medium">
                        {item.name} =
                      </span>
                      <div className="p-2.5 rounded-xl bg-surface-subtle text-text-primary border border-border-subtle font-mono text-sm">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-xs text-text-muted font-sans font-medium">Expected Output:</span>
                  <div className="p-2.5 rounded-xl bg-surface-subtle text-success border border-border-subtle font-mono text-sm">
                    {currentTestCase.expectedOutput}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-3">
            <span className="text-xs text-text-muted font-sans font-medium">Custom Testcase Input:</span>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-full h-24 p-3 rounded-xl bg-surface-subtle text-sm text-text-primary focus:outline-none focus:bg-surface-elevated transition-colors resize-none border border-border-subtle focus:border-primary/50"
              placeholder="e.g. [1,2,3,4] | 5"
            />
            <button
              type="button"
              onClick={handleRunCustom}
              className="px-4 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high text-text-primary text-xs font-sans transition-colors border border-border-subtle"
            >
              Run Custom Input
            </button>
          </div>
        )}

        {activeTab === 'result' && (
          <div>
            {isRunning || isSubmitting ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin text-warning" />
                <span className="text-xs font-mono">Compiling C++17 solution and executing test suite...</span>
              </div>
            ) : !executionResult ? (
              <div className="py-12 text-center text-text-muted text-xs font-mono space-y-1">
                <p>You must run or submit your code first.</p>
                <p className="text-[11px] text-text-muted/60">Execution time, memory, and test case pass/fail diffs will be displayed here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Result Summary Bar */}
                <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-surface-subtle border border-border-subtle">
                  <span
                    className={`text-sm font-bold font-sans ${
                      executionResult.verdict === 'Accepted' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {executionResult.verdict}
                  </span>

                  <span className="text-text-muted text-xs">
                    Passed: <strong className="text-text-primary">{executionResult.passedTestCases}</strong> / {executionResult.totalTestCases} Tests
                  </span>

                  {executionResult.runtimeMs != null && (
                    <span className="text-text-muted text-xs">
                      Runtime: <strong className="text-text-primary">{executionResult.runtimeMs} ms</strong>
                    </span>
                  )}

                  {executionResult.memoryKb != null && (
                    <span className="text-text-muted text-xs">
                      Memory: <strong className="text-text-primary">{(executionResult.memoryKb / 1024).toFixed(1)} MB</strong>
                    </span>
                  )}
                </div>

                {/* Failed Test Case Diff */}
                {executionResult.failedTestCase && (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-danger/25 space-y-3">
                    <div className="text-danger font-sans font-semibold text-sm">
                      Failed on Test #{executionResult.failedTestCase.testIndex}:
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-text-muted">Input: </span>
                        <span className="text-text-primary">{executionResult.failedTestCase.input}</span>
                      </div>
                      <div>
                        <span className="text-success">Expected: </span>
                        <span className="text-text-primary">{executionResult.failedTestCase.expected}</span>
                      </div>
                      <div>
                        <span className="text-danger">Your Output: </span>
                        <span className="text-text-primary">{executionResult.failedTestCase.actual || '(no output)'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compile Error Output */}
                {executionResult.compileError && (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-danger/25 space-y-2">
                    <div className="text-danger font-sans font-semibold text-sm">Compilation Error:</div>
                    <pre className="text-danger text-xs whitespace-pre-wrap font-mono">
                      {executionResult.compileError}
                    </pre>
                  </div>
                )}

                {/* Stdout / Debug Output */}
                {executionResult.stdout && (
                  <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle space-y-1">
                    <span className="text-xs text-text-muted uppercase tracking-wider font-sans font-semibold">Standard Output</span>
                    <pre className="text-text-primary text-xs whitespace-pre-wrap">{executionResult.stdout}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
