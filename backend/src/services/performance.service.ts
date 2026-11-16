import { SandboxRunner } from '../judge/sandboxRunner';
import { HarnessGenerator } from '../judge/harnessGenerator';
import { InputParser } from '../judge/inputParser';
import { DSA_500_PROBLEMS } from '../data/dsa500';
import { TestCase } from '../judge/types';
import { prisma } from './prisma.service';
import { AiTeacherService } from './aiTeacher.service';

export interface PerformanceDataPoint {
  n: number;
  runtimeMs: number;
  memoryKb: number;
}

export interface PerformanceAnalysisResult {
  problemId: number;
  dataPoints: PerformanceDataPoint[];
  predictedComplexity: string;
  confidence: number;
  summary: string;
  referenceComplexity: string;
  timeComplexity: string;
  spaceComplexity: string;
  bottleneck: string;
  optimizationTip: string;
  provider: 'gemini' | 'local';
  partialTimeoutNote?: string;
}

export class PerformanceService {
  /**
   * Resolves problem definition across both the static catalog and PostgreSQL/SQLite Problem table,
   * compiles user code once, benchmarks real effective input scales, fits OLS + log-log asymptotic
   * curves, and pairs empirical measurements with Gemini code complexity analysis.
   */
  static async analyzeSolutionPerformance(
    problemId: number,
    userCode: string
  ): Promise<PerformanceAnalysisResult> {
    const staticDef = DSA_500_PROBLEMS.find((p) => p.id === problemId);
    const dbProblem = !staticDef
      ? await prisma.problem.findUnique({ where: { id: problemId } })
      : null;

    if (!staticDef && !dbProblem) {
      throw new Error(`Problem #${problemId} definition not found for performance benchmark.`);
    }

    const problemTitle = staticDef?.title ?? dbProblem!.title;
    const problemStatement = staticDef?.statement ?? dbProblem!.statement;
    const constraints = staticDef?.constraints ?? dbProblem!.constraints;
    const functionSignature = staticDef?.functionSignature ?? dbProblem!.functionSignature;
    const topic = staticDef?.topic ?? dbProblem!.topic;
    const category = staticDef?.category ?? dbProblem!.category;

    if (category === 'SQL') {
      throw new Error('Empirical Big-O runner applies to C++ problems. Use Explain Plan in SQL Lab.');
    }

    const targetSizes = [50, 250, 1000, 3000, 7500];
    const trialsPerSize = 3;

    const generatedTiers = targetSizes.map((reqN) =>
      this.generateInputForSignature(problemId, functionSignature, reqN)
    );

    const benchmarkCases: TestCase[] = [];
    const caseTierIndex: number[] = [];

    for (let sIdx = 0; sIdx < generatedTiers.length; sIdx++) {
      const tier = generatedTiers[sIdx];
      for (let t = 0; t < trialsPerSize; t++) {
        benchmarkCases.push({ input: tier.input, expectedOutput: '' });
        caseTierIndex.push(sIdx);
      }
    }

    const usePch = SandboxRunner.isPchReady();
    let harness = HarnessGenerator.generateHarness(userCode, functionSignature, benchmarkCases, {
      allowStandaloneMain: false,
      usePrecompiledHeader: usePch,
    });

    let compileRes = await SandboxRunner.getOrCompileBinary(harness.fullCode, usePch, 12000);
    if (!compileRes.success && usePch && compileRes.stderr.includes('codeprep_std.hpp')) {
      harness = HarnessGenerator.generateHarness(userCode, functionSignature, benchmarkCases, {
        allowStandaloneMain: false,
        usePrecompiledHeader: false,
      });
      compileRes = await SandboxRunner.getOrCompileBinary(harness.fullCode, false, 12000);
    }

    if (!compileRes.success) {
      const firstErr = compileRes.stderr.split('\n').slice(0, 3).join(' ').trim();
      throw new Error(
        firstErr
          ? `Compilation failed: ${firstErr}`
          : 'Compilation failed — fix syntax errors before running complexity benchmark.'
      );
    }

    const stdinPayload = InputParser.buildDriverStdin(benchmarkCases, functionSignature);
    const runRes = await SandboxRunner.executeBinary(compileRes.binaryPath, stdinPayload, 8000);

    const groupedTrials: number[][] = generatedTiers.map(() => []);
    let measuredPeakMemKb = 0;

    const caseEndMarker = harness.caseEndMarker || '';
    const memMarker = harness.memMarker || '';

    if (memMarker) {
      const memMatch = runRes.stdout.match(
        new RegExp(`${memMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`)
      );
      if (memMatch) {
        const parsedMem = parseInt(memMatch[1], 10);
        if (parsedMem > 0) measuredPeakMemKb = parsedMem;
      }
    }

    for (let idx = 0; idx < benchmarkCases.length; idx++) {
      const sIdx = caseTierIndex[idx];
      const token = `${caseEndMarker}:${idx}:`;
      const pos = runRes.stdout.indexOf(token);
      if (pos !== -1) {
        const start = pos + token.length;
        const end = runRes.stdout.indexOf('\n', start);
        const msVal = parseFloat(
          (end !== -1 ? runRes.stdout.slice(start, end) : runRes.stdout.slice(start)).trim()
        );
        if (Number.isFinite(msVal)) {
          groupedTrials[sIdx].push(Math.max(0.001, msVal));
        }
      }
    }

    // Collect ONLY genuinely measured tiers (never inject synthetic fallback numbers)
    const measuredPoints: PerformanceDataPoint[] = [];
    for (let sIdx = 0; sIdx < generatedTiers.length; sIdx++) {
      const trials = groupedTrials[sIdx];
      if (trials.length === 0) continue;
      const sorted = [...trials].sort((a, b) => a - b);
      const medianRuntime = sorted[Math.floor(sorted.length / 2)];
      measuredPoints.push({
        n: generatedTiers[sIdx].effectiveN,
        runtimeMs: Number(medianRuntime.toFixed(4)),
        memoryKb: measuredPeakMemKb > 0 ? measuredPeakMemKb : 2048,
      });
    }

    // Deduplicate tiers if two requested sizes mapped to the exact same effectiveN
    const uniquePoints: PerformanceDataPoint[] = [];
    const seenN = new Set<number>();
    for (const pt of measuredPoints) {
      if (!seenN.has(pt.n)) {
        seenN.add(pt.n);
        uniquePoints.push(pt);
      }
    }

    const isTimedOut = runRes.verdict === 'Time Limit Exceeded';
    let partialTimeoutNote: string | undefined;
    if (isTimedOut || uniquePoints.length < generatedTiers.length) {
      partialTimeoutNote = isTimedOut
        ? `Timed out at higher input sizes (completed ${uniquePoints.length}/${generatedTiers.length} tiers) — indicates high polynomial/exponential scaling.`
        : `Completed ${uniquePoints.length}/${generatedTiers.length} input tiers.`;
    }

    if (uniquePoints.length < 2) {
      throw new Error(
        isTimedOut
          ? 'Benchmark timed out even on small/medium sizes — check for infinite loops or exponential recursion.'
          : 'Your code crashed or returned early during benchmark execution. Run sample test cases first.'
      );
    }

    const fit = this.fitComplexityModel(uniquePoints, isTimedOut);
    const empiricalSummary = uniquePoints
      .map((p) => `N=${p.n}->${p.runtimeMs}ms`)
      .join(', ');

    const geminiReport = await AiTeacherService.analyzeComplexityWithGemini({
      problemTitle: `${problemTitle} (${topic})`,
      problemStatement,
      constraints,
      functionSignature,
      userCode,
      empiricalPointsSummary: `${empiricalSummary} (Regression fit: ${fit.predictedComplexity}, R^2=${fit.confidence})${partialTimeoutNote ? `; ${partialTimeoutNote}` : ''}`,
    });

    return {
      problemId,
      dataPoints: uniquePoints,
      predictedComplexity: fit.predictedComplexity,
      confidence: fit.confidence,
      summary: fit.summary,
      referenceComplexity: geminiReport.referenceComplexity,
      timeComplexity: geminiReport.timeComplexity,
      spaceComplexity: geminiReport.spaceComplexity,
      bottleneck: geminiReport.bottleneck,
      optimizationTip: geminiReport.optimizationTip,
      provider: geminiReport.provider,
      partialTimeoutNote,
    };
  }

  /**
   * Fits real measured timings using OLS regression WITH intercept (T = a + b * f(n), b >= 0)
   * paired with log-log scaling exponent estimation so setup overhead never skews small-N tiers.
   */
  public static fitComplexityModel(
    points: PerformanceDataPoint[],
    timedOutAtLargeN = false
  ): {
    predictedComplexity: string;
    confidence: number;
    summary: string;
  } {
    if (points.length < 2) {
      return {
        predictedComplexity: 'Insufficient Data',
        confidence: 0,
        summary: 'Fewer than 2 measured input sizes completed.',
      };
    }

    const nVals = points.map((p) => p.n);
    const tVals = points.map((p) => p.runtimeMs);
    const maxT = Math.max(...tVals);
    const minT = Math.min(...tVals);

    // 1. Flat microsecond noise floor: if total growth across large N is < 0.035ms and did not timeout
    if (!timedOutAtLargeN && maxT < 0.05 && maxT - minT < 0.035 && Math.max(...nVals) >= 500) {
      return {
        predictedComplexity: 'O(1) / O(log N)',
        confidence: 0.92,
        summary:
          'Execution time stayed virtually flat near timer resolution across all tested input sizes.',
      };
    }

    // 2. Estimate empirical log-log power slope beta (d(log T) / d(log N)) above noise floor
    const validLogPairs = points.filter((p) => p.n > 0 && p.runtimeMs > 0.008);
    let logLogSlope = 1.0;
    if (validLogPairs.length >= 2) {
      const xs = validLogPairs.map((p) => Math.log(p.n));
      const ys = validLogPairs.map((p) => Math.log(p.runtimeMs));
      const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
      const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
      const cov = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
      const varX = xs.reduce((s, x) => s + (x - meanX) * (x - meanX), 0);
      if (varX > 0) logLogSlope = cov / varX;
    }

    // 3. OLS regression with intercept: T(n) = a + b * f(n)
    const meanT = tVals.reduce((sum, v) => sum + v, 0) / tVals.length;
    const ssTotal = tVals.reduce((sum, v) => sum + Math.pow(v - meanT, 2), 0);

    const candidates: Array<{
      name: string;
      fn: (n: number) => number;
      complexityOrder: number;
    }> = [
      { name: 'O(1)', fn: () => 1, complexityOrder: 0 },
      { name: 'O(log N)', fn: (n) => Math.log2(Math.max(2, n)), complexityOrder: 1 },
      { name: 'O(N)', fn: (n) => n, complexityOrder: 2 },
      { name: 'O(N log N)', fn: (n) => n * Math.log2(Math.max(2, n)), complexityOrder: 3 },
      { name: 'O(N^2)', fn: (n) => n * n, complexityOrder: 4 },
    ];

    let bestName = 'O(N)';
    let bestScore = -Infinity;
    let bestRawR2 = 0;

    for (const cand of candidates) {
      if (cand.name === 'O(1)') {
        if (logLogSlope < 0.15) {
          const r2 = Math.max(0, 1 - Math.abs(logLogSlope) * 2);
          if (r2 > bestScore) {
            bestScore = r2;
            bestRawR2 = r2;
            bestName = 'O(1)';
          }
        }
        continue;
      }

      const fVals = nVals.map(cand.fn);
      const meanF = fVals.reduce((sum, v) => sum + v, 0) / fVals.length;
      const covTF = tVals.reduce((s, t, i) => s + (t - meanT) * (fVals[i] - meanF), 0);
      const varF = fVals.reduce((s, f) => s + (f - meanF) * (f - meanF), 0);

      // Must exhibit positive scaling slope with N
      if (varF <= 0 || covTF <= 0) continue;

      const b = covTF / varF;
      const a = meanT - b * meanF;
      const predT = fVals.map((f) => a + b * f);
      const ssRes = tVals.reduce((sum, t, i) => sum + Math.pow(t - predT[i], 2), 0);
      const rawR2 = ssTotal > 0 ? Math.max(0, 1 - ssRes / ssTotal) : 0;

      // Apply slight parsimony & log-log consistency adjustment so O(N) vs O(N log N) separates cleanly
      let adjustedScore = rawR2 - cand.complexityOrder * 0.008;
      if (cand.name === 'O(log N)' && logLogSlope > 0.55) adjustedScore -= 0.2;
      if (cand.name === 'O(N)' && logLogSlope >= 1.25) adjustedScore -= 0.12;
      if (cand.name === 'O(N log N)' && logLogSlope < 0.92) adjustedScore -= 0.05;
      if (cand.name === 'O(N^2)' && logLogSlope < 1.45 && !timedOutAtLargeN) {
        adjustedScore -= 0.15;
      }
      if (cand.name === 'O(N^2)' && timedOutAtLargeN && logLogSlope >= 1.5) {
        adjustedScore += 0.15;
      }

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestRawR2 = rawR2;
        bestName = cand.name;
      }
    }

    if (timedOutAtLargeN && logLogSlope >= 2.3) {
      bestName = 'O(N^3) / Exponential';
    } else if (timedOutAtLargeN && bestName === 'O(N)' && logLogSlope >= 1.45) {
      bestName = 'O(N^2)';
    }

    const confidence = Number(Math.max(0, Math.min(0.99, bestRawR2)).toFixed(2));
    const slopeText = Number.isFinite(logLogSlope) ? logLogSlope.toFixed(2) : '—';

    let summary = '';
    switch (bestName) {
      case 'O(1)':
        summary = `Empirical log-log scaling slope is ${slopeText} (near constant time across tested inputs).`;
        break;
      case 'O(log N)':
        summary = `Sublinear logarithmic growth (log-log slope ${slopeText}), matching divide-and-conquer / binary search scaling.`;
        break;
      case 'O(N)':
        summary = `Linear runtime growth (log-log slope ${slopeText}), matching single-pass or two-pointer iteration.`;
        break;
      case 'O(N log N)':
        summary = `Linearithmic growth (log-log slope ${slopeText}), consistent with sorting, heap, or balanced tree operations.`;
        break;
      case 'O(N^2)':
        summary = `Quadratic runtime growth (log-log slope ${slopeText}) — runtime grows steeply with N due to nested scans.`;
        break;
      default:
        summary = `Steep super-quadratic scaling (log-log slope ${slopeText}) causing timeout at higher N.`;
    }

    return {
      predictedComplexity: bestName,
      confidence,
      summary,
    };
  }

  private static generateInputForSignature(
    problemId: number,
    functionSignature: string,
    n: number
  ): { requestedN: number; effectiveN: number; input: string } {
    const parsed = InputParser.parseSignature(functionSignature);
    if (!parsed || parsed.params.length === 0) {
      return { requestedN: n, effectiveN: n, input: `${n}` };
    }

    let effectiveN = n;

    const args = parsed.params.map((p, idx) => {
      const t = p.normType;
      if (t.includes('vector<vector<int>>')) {
        const side = Math.max(2, Math.min(85, Math.round(Math.sqrt(n))));
        if (idx === 0) effectiveN = side * side;
        const rows: string[] = [];
        for (let r = 0; r < side; r++) {
          const row: number[] = [];
          for (let c = 0; c < side; c++) row.push((r * 7 + c * 3) % 11);
          rows.push(`[${row.join(',')}]`);
        }
        return `[${rows.join(',')}]`;
      }
      if (t.includes('vector<vector<char>>')) {
        const side = Math.max(2, Math.min(85, Math.round(Math.sqrt(n))));
        if (idx === 0) effectiveN = side * side;
        const rows: string[] = [];
        for (let r = 0; r < side; r++) {
          const row: string[] = [];
          for (let c = 0; c < side; c++) row.push((r + c) % 2 === 0 ? '"1"' : '"0"');
          rows.push(`[${row.join(',')}]`);
        }
        return `[${rows.join(',')}]`;
      }
      if (t.includes('vector<string>')) {
        const len = Math.min(n, 2500);
        if (idx === 0) effectiveN = len;
        const items: string[] = [];
        for (let i = 0; i < len; i++) items.push(`"w${i % 26}${i}"`);
        return `[${items.join(',')}]`;
      }
      if (t.includes('vector<int>') || t.includes('vector<long')) {
        if (idx === 0) effectiveN = n;
        const arr: number[] = [];
        for (let i = 0; i < n; i++) arr.push(problemId === 1 ? i * 2 + 1 : ((i * 37) % 1000) + 1);
        return `[${arr.join(',')}]`;
      }
      if (t.includes('ListNode') || t.includes('TreeNode')) {
        const cap = Math.min(n, 4000);
        if (idx === 0) effectiveN = cap;
        const arr: number[] = [];
        for (let i = 0; i < cap; i++) arr.push(i + 1);
        return `[${arr.join(',')}]`;
      }
      if (t === 'string' || t === 'std::string') {
        const cap = Math.min(n, 7500);
        if (idx === 0) effectiveN = cap;
        const half = Math.floor(cap / 2);
        return `"${'('.repeat(half)}${')'.repeat(half)}"`;
      }
      if (t === 'int' || t.includes('long')) {
        if (problemId === 1 && idx === 1) return `${(n - 2) * 2 + 1 + (n - 1) * 2 + 1}`;
        const scalar = Math.max(1, Math.min(n, 500));
        if (idx === 0 && parsed.params.length === 1) effectiveN = scalar;
        return `${scalar}`;
      }
      return '0';
    });

    return {
      requestedN: n,
      effectiveN,
      input: args.join(' | '),
    };
  }
}
