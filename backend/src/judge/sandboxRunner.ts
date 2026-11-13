import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ExecutionResult, TestCase, Verdict } from './types';
import { GeneratedHarness, HarnessGenerator } from './harnessGenerator';
import { LineMapper } from './lineMapper';
import { Comparator, ComparisonOptions } from './comparator';
import { InputParser } from './inputParser';
import { Logger } from '../utils/logger';

export interface RunnerOptions {
  timeoutMs?: number;
  compileTimeoutMs?: number;
  memoryLimitMb?: number;
  allowStandaloneMain?: boolean;
  isCustomRun?: boolean;
  comparisonOptions?: ComparisonOptions;
}

export class SandboxRunner {
  private static readonly DEFAULT_TIMEOUT_MS = 2000;
  private static readonly DEFAULT_COMPILE_TIMEOUT_MS = 12000;
  private static readonly MAX_OUTPUT_BYTES = 2 * 1024 * 1024; // 2 MB limit

  static async runCppSubmission(
    userCode: string,
    functionSignature: string,
    testCases: TestCase[],
    options: RunnerOptions = {}
  ): Promise<ExecutionResult> {
    const perTestTimeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const compileTimeoutMs = options.compileTimeoutMs || this.DEFAULT_COMPILE_TIMEOUT_MS;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeprep-run-'));
    const sourceFilePath = path.join(tmpDir, 'solution.cpp');
    const binaryFilePath = path.join(
      tmpDir,
      process.platform === 'win32' ? 'solution.exe' : 'solution'
    );

    try {
      // 1. Generate compilable C++17 harness
      let harness: GeneratedHarness;
      try {
        harness = HarnessGenerator.generateHarness(
          userCode,
          functionSignature,
          testCases,
          { allowStandaloneMain: options.allowStandaloneMain }
        );
        fs.writeFileSync(sourceFilePath, harness.fullCode, 'utf8');
      } catch (err: unknown) {
        return {
          verdict: 'Compile Error',
          runtimeMs: 0,
          memoryKb: 0,
          compileError: err instanceof Error ? err.message : 'Invalid code structure',
          totalTestCases: testCases.length,
          passedTestCases: 0,
        };
      }

      // 2. Compile once with g++ -O2 -std=c++17
      const compileResult = await this.compileCpp(sourceFilePath, binaryFilePath, compileTimeoutMs);
      if (!compileResult.success) {
        const remappedError = LineMapper.remapCompilerOutput(
          compileResult.stderr,
          harness.userCodeStartLine,
          harness.userCodeEndLine
        );
        return {
          verdict: 'Compile Error',
          runtimeMs: 0,
          memoryKb: 0,
          compileError: remappedError || compileResult.stderr || 'Compilation failed with unknown error',
          totalTestCases: testCases.length,
          passedTestCases: 0,
        };
      }

      // 3A. Standalone main() mode (allowed on Run for flexible C++ testing)
      if (harness.isStandaloneMain) {
        return await this.executeStandaloneCases(
          binaryFilePath,
          testCases,
          perTestTimeoutMs,
          options
        );
      }

      // 3B. LeetCode-style single-process batch execution with crash & debug isolation
      if (testCases.length === 0) {
        return {
          verdict: 'Accepted',
          runtimeMs: 0,
          memoryKb: 14200,
          totalTestCases: 0,
          passedTestCases: 0,
        };
      }

      const batchStdin = InputParser.buildDriverStdin(testCases, functionSignature);
      const batchTimeoutMs = Math.min(
        15000,
        Math.max(perTestTimeoutMs + 500, testCases.length * Math.min(perTestTimeoutMs, 1000))
      );

      const runRes = await this.executeBinary(binaryFilePath, batchStdin, batchTimeoutMs);

      const { lastCaseIndex, cleanStderr } = this.parseStderrCaseMarkers(
        runRes.stderr,
        harness.caseBeginStderrMarker || ''
      );

      if (runRes.verdict !== 'Accepted') {
        const failIdx = Math.min(
          Math.max(0, lastCaseIndex >= 0 ? lastCaseIndex : 0),
          testCases.length - 1
        );
        const failedTc = testCases[failIdx];
        const preCrashOut = this.extractPartialDebugBeforeFailure(
          runRes.stdout,
          harness.caseStartMarker || '',
          harness.caseEndMarker || '',
          failIdx
        );

        return {
          verdict: runRes.verdict,
          runtimeMs: runRes.runtimeMs,
          memoryKb: runRes.memoryKb,
          stdout: preCrashOut || undefined,
          stderr: cleanStderr || runRes.stderr,
          failedTestCase: {
            input: failedTc.input,
            expected: failedTc.expectedOutput,
            actual: cleanStderr || runRes.stderr || runRes.verdict,
            testIndex: failIdx + 1,
          },
          totalTestCases: testCases.length,
          passedTestCases: failIdx,
        };
      }

      const caseStartMarker = harness.caseStartMarker || '';
      const caseEndMarker = harness.caseEndMarker || '';
      const memMarker = harness.memMarker || '';

      let peakMemoryKb = 0;
      const memRegex = new RegExp(`${this.escapeRegex(memMarker)}:(\\d+)`);
      const memMatch = runRes.stdout.match(memRegex);
      if (memMatch) {
        peakMemoryKb = parseInt(memMatch[1], 10);
      }

      let cursor = 0;
      let totalRuntimeMs = 0;
      let passedCount = 0;
      const debugLines: string[] = [];
      const customOutputs: string[] = [];

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const startToken = `${caseStartMarker}:${i}:`;
        const endToken = `${caseEndMarker}:${i}:`;

        const startIdx = runRes.stdout.indexOf(startToken, cursor);
        const endIdx =
          startIdx !== -1 ? runRes.stdout.indexOf(endToken, startIdx + startToken.length) : -1;

        if (startIdx === -1 || endIdx === -1) {
          const danglingDebug = runRes.stdout.slice(cursor).trim();
          if (danglingDebug) {
            debugLines.push(
              testCases.length > 1 ? `[Case ${i + 1} stdout]: ${danglingDebug}` : danglingDebug
            );
          }
          return {
            verdict: 'Runtime Error',
            runtimeMs: Math.round(totalRuntimeMs),
            memoryKb: peakMemoryKb || 14200,
            stdout: debugLines.join('\n') || undefined,
            stderr: cleanStderr || 'Process terminated early before returning output (e.g. exit() or abort()).',
            failedTestCase: {
              input: tc.input,
              expected: tc.expectedOutput,
              actual: cleanStderr || 'Runtime Error (early termination)',
              testIndex: i + 1,
            },
            totalTestCases: testCases.length,
            passedTestCases: passedCount,
          };
        }

        const debugChunk = runRes.stdout.slice(cursor, startIdx).trim();
        if (debugChunk) {
          debugLines.push(
            testCases.length > 1 ? `[Case ${i + 1} stdout]: ${debugChunk}` : debugChunk
          );
        }

        const actualSerialized = runRes.stdout.slice(startIdx + startToken.length, endIdx);
        const afterEndStart = endIdx + endToken.length;
        const newlineAfterTime = runRes.stdout.indexOf('\n', afterEndStart);
        const timeSlice =
          newlineAfterTime !== -1
            ? runRes.stdout.slice(afterEndStart, newlineAfterTime)
            : runRes.stdout.slice(afterEndStart);
        const caseMs = parseFloat(timeSlice.trim()) || 0;
        totalRuntimeMs += caseMs;

        cursor = newlineAfterTime !== -1 ? newlineAfterTime + 1 : afterEndStart;

        if (caseMs > perTestTimeoutMs) {
          return {
            verdict: 'Time Limit Exceeded',
            runtimeMs: Math.round(totalRuntimeMs),
            memoryKb: peakMemoryKb || 14200,
            stdout: debugLines.join('\n') || undefined,
            failedTestCase: {
              input: tc.input,
              expected: tc.expectedOutput,
              actual: `Time Limit Exceeded (${caseMs.toFixed(1)} ms > ${perTestTimeoutMs} ms)`,
              testIndex: i + 1,
            },
            totalTestCases: testCases.length,
            passedTestCases: passedCount,
          };
        }

        // Custom Input without Expected Output: report actual computed output cleanly instead of failing
        if (options.isCustomRun && tc.expectedOutput.trim() === '') {
          customOutputs.push(
            testCases.length > 1
              ? `Case ${i + 1} Output: ${actualSerialized}`
              : `Output: ${actualSerialized}`
          );
          passedCount++;
          continue;
        }

        const comparison = Comparator.compareCaseOutput(
          actualSerialized,
          tc.expectedOutput,
          options.comparisonOptions
        );

        if (!comparison.isMatch) {
          return {
            verdict: 'Wrong Answer',
            runtimeMs: Math.round(totalRuntimeMs),
            memoryKb: peakMemoryKb || 14200,
            stdout: debugLines.join('\n') || undefined,
            failedTestCase: {
              input: tc.input,
              expected: comparison.expectedClean,
              actual: comparison.actualClean,
              testIndex: i + 1,
            },
            totalTestCases: testCases.length,
            passedTestCases: passedCount,
          };
        }

        passedCount++;
      }

      const combinedStdoutParts: string[] = [];
      if (customOutputs.length > 0) {
        combinedStdoutParts.push(customOutputs.join('\n'));
      }
      if (debugLines.length > 0) {
        combinedStdoutParts.push(debugLines.join('\n'));
      }

      return {
        verdict: 'Accepted',
        runtimeMs: Math.round(totalRuntimeMs),
        memoryKb: peakMemoryKb || 14200,
        stdout: combinedStdoutParts.join('\n\n') || undefined,
        stderr: cleanStderr || undefined,
        totalTestCases: testCases.length,
        passedTestCases: passedCount,
      };
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {
        Logger.warn('SandboxRunner', 'Failed to clean temporary directory', e);
      }
    }
  }

  private static async executeStandaloneCases(
    binaryFilePath: string,
    testCases: TestCase[],
    perTestTimeoutMs: number,
    options: RunnerOptions
  ): Promise<ExecutionResult> {
    const casesToRun = testCases.length > 0 ? testCases : [{ id: 1, input: '', expectedOutput: '' }];
    let totalRuntimeMs = 0;
    let peakMemKb = 0;
    let passedCount = 0;
    const outputs: string[] = [];

    for (let i = 0; i < casesToRun.length; i++) {
      const tc = casesToRun[i];
      const normalizedStdin = tc.input.replace(/\r\n/g, '\n');
      const stdinPayload = normalizedStdin.endsWith('\n') ? normalizedStdin : normalizedStdin + '\n';

      const runRes = await this.executeBinary(binaryFilePath, stdinPayload, perTestTimeoutMs);
      totalRuntimeMs += runRes.runtimeMs;
      if (runRes.memoryKb > peakMemKb) peakMemKb = runRes.memoryKb;

      if (runRes.verdict !== 'Accepted') {
        return {
          verdict: runRes.verdict,
          runtimeMs: totalRuntimeMs,
          memoryKb: peakMemKb || 14200,
          stdout: runRes.stdout,
          stderr: runRes.stderr,
          failedTestCase: {
            input: tc.input,
            expected: tc.expectedOutput,
            actual: runRes.stderr || runRes.stdout || runRes.verdict,
            testIndex: i + 1,
          },
          totalTestCases: casesToRun.length,
          passedTestCases: passedCount,
        };
      }

      const cleanOut = Comparator.normalizeOutput(runRes.stdout);
      if (options.isCustomRun || tc.expectedOutput.trim() === '') {
        outputs.push(
          casesToRun.length > 1 ? `Case ${i + 1} Output:\n${cleanOut || '(empty)'}` : cleanOut || '(program exited cleanly with empty stdout)'
        );
        passedCount++;
      } else {
        const cmp = Comparator.compareCaseOutput(
          cleanOut,
          tc.expectedOutput,
          options.comparisonOptions
        );
        if (!cmp.isMatch) {
          return {
            verdict: 'Wrong Answer',
            runtimeMs: totalRuntimeMs,
            memoryKb: peakMemKb || 14200,
            stdout: cleanOut || undefined,
            failedTestCase: {
              input: tc.input,
              expected: cmp.expectedClean,
              actual: cmp.actualClean,
              testIndex: i + 1,
            },
            totalTestCases: casesToRun.length,
            passedTestCases: passedCount,
          };
        }
        passedCount++;
      }
    }

    return {
      verdict: 'Accepted',
      runtimeMs: totalRuntimeMs,
      memoryKb: peakMemKb || 14200,
      stdout: outputs.join('\n\n') || undefined,
      totalTestCases: casesToRun.length,
      passedTestCases: passedCount,
    };
  }

  private static parseStderrCaseMarkers(
    rawStderr: string,
    markerPrefix: string
  ): { lastCaseIndex: number; cleanStderr: string } {
    if (!rawStderr) return { lastCaseIndex: -1, cleanStderr: '' };
    if (!markerPrefix) return { lastCaseIndex: -1, cleanStderr: rawStderr.trim() };

    let lastCaseIndex = -1;
    const cleanLines: string[] = [];
    const markerRegex = new RegExp(`^${this.escapeRegex(markerPrefix)}:(\\d+)\\s*$`);

    for (const line of rawStderr.replace(/\r\n/g, '\n').split('\n')) {
      const m = line.match(markerRegex);
      if (m) {
        lastCaseIndex = parseInt(m[1], 10);
      } else if (line.trim().length > 0) {
        cleanLines.push(line);
      }
    }

    return { lastCaseIndex, cleanStderr: cleanLines.join('\n').trim() };
  }

  private static extractPartialDebugBeforeFailure(
    rawStdout: string,
    caseStartMarker: string,
    caseEndMarker: string,
    failIdx: number
  ): string {
    if (!rawStdout) return '';
    if (failIdx <= 0 || !caseEndMarker) return rawStdout.trim().slice(0, 2048);

    const prevEndToken = `${caseEndMarker}:${failIdx - 1}:`;
    const prevIdx = rawStdout.lastIndexOf(prevEndToken);
    if (prevIdx === -1) return rawStdout.trim().slice(0, 2048);

    const afterLine = rawStdout.indexOf('\n', prevIdx);
    const tail = afterLine !== -1 ? rawStdout.slice(afterLine + 1) : '';
    const nextStart = caseStartMarker ? tail.indexOf(caseStartMarker) : -1;
    return (nextStart !== -1 ? tail.slice(0, nextStart) : tail).trim().slice(0, 2048);
  }

  private static escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static resolvedCompiler: string | null = null;
  private static resolvedBinDir: string | null = null;

  public static getCompilerBinary(): string {
    if (this.resolvedCompiler) return this.resolvedCompiler;

    if (process.env.CPP_COMPILER) {
      this.resolvedCompiler = process.env.CPP_COMPILER;
      if (this.resolvedCompiler.includes('\\') || this.resolvedCompiler.includes('/')) {
        this.resolvedBinDir = path.dirname(this.resolvedCompiler);
      }
      return this.resolvedCompiler;
    }

    if (process.platform === 'win32') {
      const candidates = [
        'C:\\msys64\\ucrt64\\bin\\g++.exe',
        'C:\\msys64\\mingw64\\bin\\g++.exe',
        'C:\\MinGW\\bin\\g++.exe',
        'C:\\MinGW-w64\\bin\\g++.exe',
        'C:\\TDM-GCC-64\\bin\\g++.exe',
        'C:\\Program Files\\LLVM\\bin\\clang++.exe',
        'C:\\w64devkit\\bin\\g++.exe',
        'C:\\Strawberry\\c\\bin\\g++.exe',
        'C:\\msys64\\clang64\\bin\\clang++.exe',
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          this.resolvedCompiler = candidate;
          this.resolvedBinDir = path.dirname(candidate);
          Logger.info('SandboxRunner', `Auto-detected Windows C++ compiler: ${candidate}`);
          return candidate;
        }
      }
    }

    this.resolvedCompiler = 'g++';
    return this.resolvedCompiler;
  }

  private static getExecutionEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    if (!this.resolvedCompiler) {
      this.getCompilerBinary();
    }
    if (this.resolvedBinDir) {
      env.PATH = `${this.resolvedBinDir};${env.PATH || ''}`;
    }
    return env;
  }

  public static compileCpp(
    sourcePath: string,
    outputPath: string,
    timeoutMs = this.DEFAULT_COMPILE_TIMEOUT_MS
  ): Promise<{ success: boolean; stderr: string }> {
    return new Promise((resolve) => {
      const compiler = this.getCompilerBinary();
      const env = this.getExecutionEnv();
      const args = [
        '-O2',
        '-std=c++17',
        '-Wall',
        '-Wextra',
        '-Wno-unused-variable',
        '-Wno-sign-compare',
        '-Werror=return-type',
        sourcePath,
        '-o',
        outputPath,
      ];

      let stderr = '';
      let timedOut = false;

      const proc = spawn(compiler, args, { windowsHide: true, env });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
      }, timeoutMs);

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) {
          resolve({ success: false, stderr: 'Compilation timed out after ' + timeoutMs + 'ms' });
        } else {
          resolve({ success: code === 0, stderr });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          stderr: `Compiler binary (${compiler}) could not be executed: ${err.message}.\nMake sure g++ (MinGW-w64) or Clang is installed in PATH.`,
        });
      });
    });
  }

  public static executeBinary(
    binaryPath: string,
    input: string,
    timeoutMs: number
  ): Promise<{ verdict: Verdict; stdout: string; stderr: string; runtimeMs: number; memoryKb: number }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let outputLimitExceeded = false;

      const env = this.getExecutionEnv();
      const proc = spawn(binaryPath, [], { windowsHide: true, env });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
      }, timeoutMs);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > this.MAX_OUTPUT_BYTES) {
          outputLimitExceeded = true;
          proc.kill('SIGKILL');
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code, signal) => {
        clearTimeout(timer);
        const elapsed = Date.now() - startTime;

        if (timedOut) {
          resolve({
            verdict: 'Time Limit Exceeded',
            stdout,
            stderr: 'Execution timed out',
            runtimeMs: timeoutMs,
            memoryKb: 0,
          });
        } else if (outputLimitExceeded) {
          resolve({
            verdict: 'Output Limit Exceeded',
            stdout: stdout.substring(0, 1024),
            stderr: 'Output exceeded 2MB limit',
            runtimeMs: elapsed,
            memoryKb: 0,
          });
        } else if (signal === 'SIGSEGV' || code === 139 || code === 3221225477) {
          resolve({
            verdict: 'Runtime Error',
            stdout,
            stderr: 'Segmentation fault (Core Dumped) / Stack Overflow',
            runtimeMs: elapsed,
            memoryKb: 0,
          });
        } else if (signal === 'SIGABRT' || code === 134) {
          resolve({
            verdict: 'Runtime Error',
            stdout,
            stderr: stderr || 'Aborted (SIGABRT) — check assertions, out-of-bounds access, or bad allocation',
            runtimeMs: elapsed,
            memoryKb: 0,
          });
        } else if (signal === 'SIGFPE' || code === 136) {
          resolve({
            verdict: 'Runtime Error',
            stdout,
            stderr: 'Arithmetic exception (Division by zero or integer overflow)',
            runtimeMs: elapsed,
            memoryKb: 0,
          });
        } else if (code !== 0) {
          resolve({
            verdict: 'Runtime Error',
            stdout,
            stderr: stderr || `Process exited with code ${code}`,
            runtimeMs: elapsed,
            memoryKb: 0,
          });
        } else {
          resolve({ verdict: 'Accepted', stdout, stderr, runtimeMs: elapsed, memoryKb: 14200 });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({ verdict: 'Runtime Error', stdout: '', stderr: err.message, runtimeMs: 0, memoryKb: 0 });
      });

      try {
        proc.stdin.write(input);
        proc.stdin.end();
      } catch {
        // Child closed stdin early
      }
    });
  }

  /**
   * Executes a standalone full C++ code string and returns benchmark metrics
   */
  static async execute(
    fullCode: string,
    input = '',
    timeoutMs = 2000
  ): Promise<{ verdict: Verdict; runtimeMs: number; memoryKb: number; stdout: string }> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeprep-bench-'));
    const sourceFilePath = path.join(tmpDir, 'solution.cpp');
    const binaryFilePath = path.join(
      tmpDir,
      process.platform === 'win32' ? 'solution.exe' : 'solution'
    );

    try {
      fs.writeFileSync(sourceFilePath, fullCode, 'utf8');
      const compileRes = await this.compileCpp(sourceFilePath, binaryFilePath, 12000);
      if (!compileRes.success) {
        return { verdict: 'Compile Error', runtimeMs: 0, memoryKb: 0, stdout: compileRes.stderr };
      }
      const runRes = await this.executeBinary(binaryFilePath, input, timeoutMs);
      return {
        verdict: runRes.verdict,
        runtimeMs: runRes.runtimeMs,
        memoryKb: runRes.memoryKb,
        stdout: runRes.stdout,
      };
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  }
}
