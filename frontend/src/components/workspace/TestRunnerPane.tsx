import React, { useState, useEffect, useMemo } from 'react';
import { TestCase, ExecutionResult, ExecutionBenchmarks } from '../../types/problem';
import {
  Play,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  FlaskConical,
  Copy,
  Check,
  Plus,
  X,
  RotateCcw,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface TestRunnerPaneProps {
  sampleTestCases: TestCase[];
  functionSignature?: string;
  executionResult: ExecutionResult | null;
  benchmarks?: ExecutionBenchmarks | null;
  isRunning: boolean;
  isSubmitting: boolean;
  onRun: (customTestCases?: TestCase[], debugMode?: boolean) => void;
  onSubmit: () => void;
  heightPx?: number;
  isCollapsed?: boolean;
  isMaximized?: boolean;
  onToggleCollapse?: () => void;
  onToggleMaximize?: () => void;
  onExpandConsole?: () => void;
  onJumpToErrorLine?: (line: number) => void;
}

export const TestRunnerPane: React.FC<TestRunnerPaneProps> = ({
  sampleTestCases,
  functionSignature,
  executionResult,
  benchmarks = null,
  isRunning,
  isSubmitting,
  onRun,
  onSubmit,
  heightPx = 256,
  isCollapsed = false,
  isMaximized = false,
  onToggleCollapse,
  onToggleMaximize,
  onExpandConsole,
  onJumpToErrorLine,
}) => {
  const [activeTab, setActiveTab] = useState<'cases' | 'custom' | 'result'>('cases');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [selectedResultCaseIdx, setSelectedResultCaseIdx] = useState(0);
  const [editableCases, setEditableCases] = useState<TestCase[]>(sampleTestCases);
  const [hasEditedCases, setHasEditedCases] = useState(false);
  const [customInput, setCustomInput] = useState(sampleTestCases[0]?.input || '');
  const [copiedFailed, setCopiedFailed] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    setEditableCases(sampleTestCases.map((tc) => ({ ...tc })));
    setHasEditedCases(false);
    setSelectedCaseIdx(0);
    setCustomInput(sampleTestCases[0]?.input || '');
  }, [sampleTestCases]);

  // Auto-switch to result tab when execution finishes
  useEffect(() => {
    if (executionResult || isRunning || isSubmitting) {
      setActiveTab('result');
      onExpandConsole?.();
      if (executionResult?.caseResults && executionResult.caseResults.length > 0) {
        const firstFailIdx = executionResult.caseResults.findIndex((c) => !c.passed);
        setSelectedResultCaseIdx(firstFailIdx >= 0 ? firstFailIdx : 0);
      } else {
        setSelectedResultCaseIdx(0);
      }
    }
  }, [executionResult, isRunning, isSubmitting, onExpandConsole]);

  const handleTabClick = (tab: 'cases' | 'custom' | 'result') => {
    setActiveTab(tab);
    if (isCollapsed) {
      onExpandConsole?.();
    }
  };

  const handleUseFailedAsCustom = (input: string) => {
    setEditableCases((prev) => {
      const next = [...prev, { input, expectedOutput: '' }];
      setSelectedCaseIdx(next.length - 1);
      return next;
    });
    setHasEditedCases(true);
    setCustomInput(input);
    setActiveTab('cases');
    onExpandConsole?.();
  };

  const handleCopyFailedInput = (input: string) => {
    navigator.clipboard.writeText(input);
    setCopiedFailed(true);
    window.setTimeout(() => setCopiedFailed(false), 1500);
  };

  const handleRunCustom = () => {
    onRun([{ input: customInput, expectedOutput: '' }], debugMode);
    setActiveTab('result');
  };

  const handleAppendCustomToCases = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const next = [...editableCases, { input: trimmed, expectedOutput: '' }];
    setEditableCases(next);
    setSelectedCaseIdx(next.length - 1);
    setHasEditedCases(true);
    setActiveTab('cases');
  };

  const handleRunActiveCases = () => {
    if (hasEditedCases) {
      onRun(editableCases, debugMode);
    } else {
      onRun(undefined, debugMode);
    }
  };

  const handleAddEditableCase = () => {
    const templateInput = editableCases[selectedCaseIdx]?.input ?? sampleTestCases[0]?.input ?? '';
    const next = [...editableCases, { input: templateInput, expectedOutput: '' }];
    setEditableCases(next);
    setSelectedCaseIdx(next.length - 1);
    setHasEditedCases(true);
  };

  const handleRemoveEditableCase = (idx: number) => {
    if (editableCases.length <= 1) return;
    const next = editableCases.filter((_, i) => i !== idx);
    setEditableCases(next);
    setSelectedCaseIdx((prev) => Math.min(prev, next.length - 1));
    setHasEditedCases(true);
  };

  const handleResetEditableCases = () => {
    setEditableCases(sampleTestCases.map((tc) => ({ ...tc })));
    setHasEditedCases(false);
    setSelectedCaseIdx(0);
  };

  const currentTestCase = editableCases[selectedCaseIdx] || editableCases[0];

  const paramNames = useMemo(() => {
    if (!functionSignature) return [] as string[];
    const match = functionSignature.match(/\((.*)\)/);
    if (!match || !match[1]) return [];
    return match[1].split(',').map((param) => {
      const parts = param.trim().split(/\s+/);
      return parts[parts.length - 1].replace(/[*&]/g, '');
    });
  }, [functionSignature]);

  // Parse structured parameters matching LeetCode format
  const paramItems = useMemo(() => {
    if (!currentTestCase) return [];
    const inputParts = currentTestCase.input.split(' | ').map((p) => p.trim());
    return inputParts.map((val, idx) => ({
      name: paramNames[idx] || (inputParts.length === 1 ? 'input' : `param_${idx + 1}`),
      value: val,
    }));
  }, [currentTestCase, paramNames]);

  const handleUpdateParamValue = (paramIdx: number, newVal: string) => {
    setEditableCases((prev) =>
      prev.map((tc, idx) => {
        if (idx !== selectedCaseIdx) return tc;
        const parts = tc.input.split(' | ');
        parts[paramIdx] = newVal;
        const nextInput = parts.join(' | ');
        return {
          ...tc,
          input: nextInput,
          expectedOutput:
            idx < sampleTestCases.length && nextInput === sampleTestCases[idx].input
              ? sampleTestCases[idx].expectedOutput
              : '',
        };
      })
    );
    setHasEditedCases(true);
  };

  // Extract clickable diagnostic line numbers from compile error output
  const compileErrorLines = useMemo(() => {
    if (!executionResult?.compileError) return [] as Array<{ line: number; text: string }>;
    const seen = new Set<number>();
    const results: Array<{ line: number; text: string }> = [];
    for (const rawLine of executionResult.compileError.split('\n')) {
      const m = /(?:^|line\s+|:)(\d+):(?:\d+:)?\s*(?:error|warning|fatal error)?:?\s*(.*)/i.exec(rawLine.trim());
      if (m) {
        const lineNum = parseInt(m[1], 10);
        if (lineNum > 0 && !seen.has(lineNum)) {
          seen.add(lineNum);
          results.push({ line: lineNum, text: (m[2] || rawLine).trim() });
        }
      }
      if (results.length >= 6) break;
    }
    return results;
  }, [executionResult?.compileError]);

  const selectedResultCase =
    executionResult?.caseResults && executionResult.caseResults.length > 0
      ? executionResult.caseResults[Math.min(selectedResultCaseIdx, executionResult.caseResults.length - 1)]
      : null;

  return (
    <div
      style={
        isMaximized
          ? undefined
          : isCollapsed
            ? undefined
            : { height: `${heightPx}px` }
      }
      className={`${
        isMaximized ? 'flex-1 h-full' : isCollapsed ? 'h-11' : ''
      } bg-surface flex flex-col overflow-hidden shrink-0 border-t border-border-subtle transition-colors`}
    >
      {/* Test Runner Header & Tabs */}
      <div className="h-11 bg-surface-subtle/90 px-4 flex items-center justify-between gap-4 select-none shrink-0 border-b border-border-subtle">
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-surface/80 border border-border-subtle">
          <button
            type="button"
            onClick={() => handleTabClick('cases')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'cases'
                ? 'bg-surface-elevated text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/50 border border-transparent'
            }`}
          >
            Testcase ({editableCases.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('custom')}
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
            onClick={() => handleTabClick('result')}
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

        {/* Action Dock: Debug Toggle, Run, Submit & Console Collapse/Maximize */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDebugMode((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-colors border flex items-center gap-1 ${
              debugMode
                ? 'bg-warning-subtle text-warning border-warning/40 font-semibold'
                : 'bg-surface-elevated hover:bg-surface-high text-text-muted hover:text-text-primary border-border-subtle'
            }`}
            title="Enable C++ STL bounds & iterator checks (-D_GLIBCXX_DEBUG) during Run"
          >
            <AlertTriangle className="w-3 h-3" />
            <span className="hidden sm:inline">Debug {debugMode ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleRunActiveCases}
            disabled={isRunning || isSubmitting}
            className="px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high disabled:opacity-50 text-text-primary font-medium text-xs transition-all flex items-center gap-1.5 border border-border-subtle shadow-xs"
            title="Run active test cases (Ctrl+Enter)"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-warning" />
            ) : (
              <Play className="w-3.5 h-3.5 text-text-muted" />
            )}
            <span>
              {isRunning
                ? 'Running...'
                : hasEditedCases || editableCases.length > sampleTestCases.length
                ? `Run All (${editableCases.length})`
                : 'Run'}
            </span>
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isRunning || isSubmitting}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
            title="Submit solution against all tests (Ctrl+Shift+Enter)"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
          </button>

          {onToggleCollapse && !isMaximized && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
              title={isCollapsed ? 'Expand console' : 'Collapse console'}
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMaximized
                  ? 'bg-primary-subtle text-primary border-primary/40'
                  : 'bg-surface-elevated hover:bg-surface-high text-text-muted hover:text-text-primary border-border-subtle'
              }`}
              title={isMaximized ? 'Restore console height' : 'Maximize console pane'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Pane Content */}
      {!isCollapsed && (
      <div className="flex-1 overflow-y-auto p-4 text-xs font-mono bg-surface">
        {activeTab === 'cases' && (
          <div className="space-y-4">
            {/* Case selector buttons + Add / Reset */}
            <div className="flex flex-wrap items-center gap-2">
              {editableCases.map((_, idx) => {
                const isCustomExtra = idx >= sampleTestCases.length;
                return (
                  <div
                    key={idx}
                    className={`inline-flex items-center rounded-lg border transition-colors ${
                      selectedCaseIdx === idx
                        ? 'bg-surface-high text-text-primary font-semibold border-border-default'
                        : 'bg-surface-subtle text-text-muted hover:text-text-primary border-border-subtle'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCaseIdx(idx)}
                      className="px-3 py-1 text-xs"
                    >
                      Case {idx + 1}
                      {isCustomExtra ? ' *' : ''}
                    </button>
                    {editableCases.length > 1 && idx >= sampleTestCases.length && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEditableCase(idx)}
                        className="pr-2 text-text-muted hover:text-danger transition-colors"
                        title="Remove custom testcase"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddEditableCase}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-surface-subtle hover:bg-surface-high text-text-muted hover:text-text-primary border border-dashed border-border-subtle transition-colors"
                title="Add custom testcase cloned from current"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>

              {hasEditedCases && (
                <button
                  type="button"
                  onClick={handleResetEditableCases}
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-surface-subtle hover:bg-surface-high text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
                  title="Reset back to sample test cases"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Cases</span>
                </button>
              )}
            </div>

            {/* Editable Parameter Fields */}
            {currentTestCase && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {paramItems.map((item, pIdx) => (
                    <div key={pIdx} className="space-y-1">
                      <span className="text-xs text-text-muted font-sans font-medium">
                        {item.name} =
                      </span>
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => handleUpdateParamValue(pIdx, e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-surface-subtle text-text-primary border border-border-subtle focus:border-primary/50 focus:outline-none font-mono text-sm transition-colors"
                      />
                    </div>
                  ))}
                </div>

                {currentTestCase.expectedOutput ? (
                  <div className="space-y-1 pt-1">
                    <span className="text-xs text-text-muted font-sans font-medium">Expected Output:</span>
                    <div className="p-2.5 rounded-xl bg-surface-subtle text-success border border-border-subtle font-mono text-sm">
                      {currentTestCase.expectedOutput}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-text-muted font-sans font-medium">
                Custom Testcase Input:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: 'Array', value: '[1,2,3,4,5]' },
                  { label: 'Array + Target', value: '[2,7,11,15] | 9' },
                  { label: '2D Matrix', value: '[[1,3,5],[2,4,6]]' },
                  { label: 'Binary Tree', value: '[3,9,20,null,null,15,7]' },
                  { label: 'Graph Edges', value: '4 | [[0,1],[1,2],[2,3],[3,0]]' },
                ].map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => setCustomInput(tpl.value)}
                    className="px-2 py-0.5 rounded-md bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors"
                    title={`Insert ${tpl.label} template`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-full h-24 p-3 rounded-xl bg-surface-subtle text-sm text-text-primary focus:outline-none focus:bg-surface-elevated transition-colors resize-none border border-border-subtle focus:border-primary/50"
              placeholder="e.g. [1,2,3,4] | 5"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunCustom}
                className="px-4 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high text-text-primary text-xs font-sans transition-colors border border-border-subtle"
              >
                Run Custom Only
              </button>
              <button
                type="button"
                onClick={handleAppendCustomToCases}
                disabled={!customInput.trim()}
                className="px-4 py-1.5 rounded-lg bg-primary-subtle hover:bg-primary/20 text-primary text-xs font-sans font-medium transition-colors border border-primary/35 disabled:opacity-40"
              >
                + Add to Testcases
              </button>
            </div>
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

                {/* LeetCode-style Accepted Benchmarks Distribution Card */}
                {executionResult.verdict === 'Accepted' && benchmarks && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-surface-subtle border border-success/30 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="text-text-muted flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-success" />
                          <span>Runtime</span>
                        </span>
                        <span className="font-mono font-bold text-success">
                          Beats {benchmarks.runtimePercentile.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm font-mono font-bold text-text-primary">
                        {executionResult.runtimeMs} ms
                      </div>
                      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(8, benchmarks.runtimePercentile))}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-subtle border border-primary/25 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="text-text-muted">Memory</span>
                        <span className="font-mono font-bold text-primary">
                          Beats {benchmarks.memoryPercentile.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm font-mono font-bold text-text-primary">
                        {(executionResult.memoryKb / 1024).toFixed(1)} MB
                      </div>
                      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(8, benchmarks.memoryPercentile))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-Testcase Pass/Fail Tabs (from Run) */}
                {executionResult.caseResults && executionResult.caseResults.length > 0 && (() => {
                  const timedCases = executionResult.caseResults!.filter((c) => typeof c.runtimeMs === 'number');
                  const maxCaseMs = Math.max(1, ...timedCases.map((c) => c.runtimeMs || 0));
                  const avgCaseMs =
                    timedCases.length > 0
                      ? Math.round(timedCases.reduce((s, c) => s + (c.runtimeMs || 0), 0) / timedCases.length)
                      : null;

                  return (
                  <div className="space-y-3">
                    {avgCaseMs !== null && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text-muted px-1">
                        <span>Per-Case Breakdown ({executionResult.caseResults!.length} cases)</span>
                        <span>
                          Avg: <strong className="text-text-primary">{avgCaseMs}ms</strong> · Peak:{' '}
                          <strong className="text-text-primary">{maxCaseMs}ms</strong>
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {executionResult.caseResults!.map((c, idx) => {
                        const pct = typeof c.runtimeMs === 'number' ? Math.max(10, Math.round((c.runtimeMs / maxCaseMs) * 100)) : 0;
                        return (
                        <button
                          key={c.index}
                          type="button"
                          onClick={() => setSelectedResultCaseIdx(idx)}
                          className={`relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                            selectedResultCaseIdx === idx
                              ? 'bg-surface-high text-text-primary font-semibold border-border-default'
                              : 'bg-surface-subtle text-text-muted hover:text-text-primary border-border-subtle'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.passed ? 'bg-success' : 'bg-danger'
                            }`}
                          />
                          <span>Case {c.index}</span>
                          {c.runtimeMs != null && (
                            <span className="text-[10px] text-text-muted">{c.runtimeMs}ms</span>
                          )}
                          {pct > 0 && (
                            <span
                              aria-hidden="true"
                              className={`absolute inset-x-0 bottom-0 h-0.5 ${c.passed ? 'bg-success/60' : 'bg-danger/60'}`}
                              style={{ width: `${pct}%` }}
                            />
                          )}
                        </button>
                      );})}
                    </div>

                    {selectedResultCase && (
                      <div
                        className={`p-3.5 rounded-xl bg-surface-subtle border space-y-2.5 text-xs ${
                          selectedResultCase.passed ? 'border-border-subtle' : 'border-danger/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-sans font-semibold ${
                              selectedResultCase.passed ? 'text-success' : 'text-danger'
                            }`}
                          >
                            Case {selectedResultCase.index}: {selectedResultCase.passed ? 'Passed' : 'Wrong Answer'}
                          </span>
                          {!selectedResultCase.passed && (
                            <button
                              type="button"
                              onClick={() => handleUseFailedAsCustom(selectedResultCase.input)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-high text-text-primary text-[11px] font-sans border border-border-subtle"
                            >
                              <FlaskConical className="w-3 h-3 text-primary" />
                              <span>Use Testcase</span>
                            </button>
                          )}
                        </div>
                        <div>
                          <span className="text-text-muted">Input: </span>
                          <span className="text-text-primary">{selectedResultCase.input}</span>
                        </div>
                        <div>
                          <span className={selectedResultCase.passed ? 'text-success' : 'text-danger'}>
                            Output:{' '}
                          </span>
                          <span className="text-text-primary">{selectedResultCase.actual || '(no output)'}</span>
                        </div>
                        {selectedResultCase.expected !== '(custom run)' && (
                          <div>
                            <span className="text-success">Expected: </span>
                            <span className="text-text-primary">{selectedResultCase.expected}</span>
                          </div>
                        )}
                        {selectedResultCase.stdout && (
                          <div className="pt-1 border-t border-border-subtle">
                            <span className="text-text-muted">Stdout: </span>
                            <span className="text-text-primary whitespace-pre-wrap">{selectedResultCase.stdout}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* Failed Test Case Diff (shown for Submit when caseResults is omitted) */}
                {executionResult.failedTestCase && (!executionResult.caseResults || executionResult.caseResults.length === 0) && (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-danger/25 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-danger font-sans font-semibold text-sm">
                        Failed on Test #{executionResult.failedTestCase.testIndex}:
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUseFailedAsCustom(executionResult.failedTestCase!.input)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-elevated hover:bg-surface-high text-text-primary text-[11px] font-sans font-medium border border-border-subtle transition-colors"
                          title="Load this failing test case into Custom Input"
                        >
                          <FlaskConical className="w-3 h-3 text-primary" />
                          <span>Use Testcase</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyFailedInput(executionResult.failedTestCase!.input)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-elevated hover:bg-surface-high text-text-muted hover:text-text-primary text-[11px] font-sans font-medium border border-border-subtle transition-colors"
                          title="Copy failing input"
                        >
                          {copiedFailed ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedFailed ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
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

                {/* Compile Error Output with Clickable Line Jumps */}
                {executionResult.compileError && (
                  <div className="p-4 rounded-xl bg-surface-subtle border border-danger/25 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-danger font-sans font-semibold text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Compilation Error</span>
                      </div>
                      {compileErrorLines.length > 0 && onJumpToErrorLine && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {compileErrorLines.map((err) => (
                            <button
                              key={err.line}
                              type="button"
                              onClick={() => onJumpToErrorLine(err.line)}
                              title={err.text}
                              className="px-2 py-0.5 rounded bg-danger/15 hover:bg-danger/25 text-danger text-[11px] font-mono border border-danger/35 transition-colors"
                            >
                              Jump to Line {err.line}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
      )}
    </div>
  );
};
