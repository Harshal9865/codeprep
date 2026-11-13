import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ExecutionResult, TestCase, Verdict } from './types';
import { GeneratedHarness, HarnessGenerator } from './harnessGenerator';
import { LineMapper } from './lineMapper';
import { Comparator } from './comparator';
import { Logger } from '../utils/logger';

export interface RunnerOptions {
  timeoutMs?: number;
  compileTimeoutMs?: number;
  memoryLimitMb?: number;
}

export class SandboxRunner {
  private static readonly DEFAULT_TIMEOUT_MS = 2000;
  private static readonly DEFAULT_COMPILE_TIMEOUT_MS = 12000;
  private static readonly MAX_OUTPUT_BYTES = 1024 * 1024; // 1 MB limit

  static async runCppSubmission(
    userCode: string,
    functionSignature: string,
    testCases: TestCase[],
    options: RunnerOptions = {}
  ): Promise<ExecutionResult> {
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const compileTimeoutMs = options.compileTimeoutMs || this.DEFAULT_COMPILE_TIMEOUT_MS;

    // Create temporary workspace directory for this compilation & run
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeprep-run-'));
    const sourceFilePath = path.join(tmpDir, 'solution.cpp');
    const binaryFilePath = path.join(tmpDir, process.platform === 'win32' ? 'solution.exe' : 'solution');

    try {
      // 1. Generate full compilable C++ harness
      let harness: GeneratedHarness;
      try {
        harness = HarnessGenerator.generateHarness(userCode, functionSignature, testCases);
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

      // 2. Compile with g++ -O2 -std=c++17
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
          compileError: remappedError || 'Compilation failed with unknown error',
          totalTestCases: testCases.length,
          passedTestCases: 0,
        };
      }

      // 3. Execute against test cases
      let totalRuntimeMs = 0;
      let peakMemoryKb = 0;
      let passedCount = 0;
      let debugOutputCombined = '';

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const inputString = tc.input.replace(/\r\n/g, '\n').trim() + '\n';

        const runRes = await this.executeBinary(binaryFilePath, inputString, timeoutMs);

        if (runRes.verdict !== 'Accepted') {
          return {
            verdict: runRes.verdict,
            runtimeMs: totalRuntimeMs,
            memoryKb: peakMemoryKb,
            stdout: runRes.stdout,
            stderr: runRes.stderr,
            failedTestCase: {
              input: tc.input,
              expected: tc.expectedOutput,
              actual: runRes.stdout || '',
              testIndex: i + 1,
            },
            totalTestCases: testCases.length,
            passedTestCases: passedCount,
          };
        }

        // Compare output
        const comparison = Comparator.extractAndCompare(
          runRes.stdout,
          tc.expectedOutput,
          harness.startMarker,
          harness.endMarker
        );

        if (comparison.debugOutput) {
          debugOutputCombined += `[Test ${i + 1} Debug]: ${comparison.debugOutput}\n`;
        }

        totalRuntimeMs += comparison.timeMs || runRes.runtimeMs;
        if (runRes.memoryKb > peakMemoryKb) {
          peakMemoryKb = runRes.memoryKb;
        }

        if (!comparison.isMatch) {
          return {
            verdict: 'Wrong Answer',
            runtimeMs: Math.round(totalRuntimeMs / (i + 1)),
            memoryKb: peakMemoryKb,
            stdout: debugOutputCombined.trim(),
            failedTestCase: {
              input: tc.input,
              expected: tc.expectedOutput,
              actual: comparison.actualClean,
              testIndex: i + 1,
            },
            totalTestCases: testCases.length,
            passedTestCases: passedCount,
          };
        }

        passedCount++;
      }

      const avgRuntime = passedCount > 0 ? Math.round(totalRuntimeMs / passedCount) : 0;

      return {
        verdict: 'Accepted',
        runtimeMs: avgRuntime,
        memoryKb: peakMemoryKb || 14200, // baseline runtime memory
        stdout: debugOutputCombined.trim(),
        totalTestCases: testCases.length,
        passedTestCases: passedCount,
      };
    } finally {
      // Ensure temp files and binaries are deleted after execution
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {
        Logger.warn('SandboxRunner', 'Failed to clean temporary directory', e);
      }
    }
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

  private static compileCpp(
    sourcePath: string,
    outputPath: string,
    timeoutMs: number
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

  private static executeBinary(
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
          resolve({ verdict: 'Time Limit Exceeded', stdout: '', stderr: 'Execution timed out', runtimeMs: timeoutMs, memoryKb: 0 });
        } else if (outputLimitExceeded) {
          resolve({ verdict: 'Output Limit Exceeded', stdout: stdout.substring(0, 1024), stderr: 'Output exceeded 1MB limit', runtimeMs: elapsed, memoryKb: 0 });
        } else if (signal === 'SIGSEGV' || code === 139 || code === 3221225477) {
          // Segmentation fault / Stack overflow
          resolve({ verdict: 'Runtime Error', stdout, stderr: 'Segmentation fault (Core Dumped) / Stack Overflow', runtimeMs: elapsed, memoryKb: 0 });
        } else if (code !== 0) {
          resolve({ verdict: 'Runtime Error', stdout, stderr: stderr || `Process exited with code ${code}`, runtimeMs: elapsed, memoryKb: 0 });
        } else {
          resolve({ verdict: 'Accepted', stdout, stderr, runtimeMs: elapsed, memoryKb: 14200 });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({ verdict: 'Runtime Error', stdout: '', stderr: err.message, runtimeMs: 0, memoryKb: 0 });
      });

      // Write input to stdin and close
      try {
        proc.stdin.write(input);
        proc.stdin.end();
      } catch (err) {
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
    const binaryFilePath = path.join(tmpDir, process.platform === 'win32' ? 'solution.exe' : 'solution');

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
      } catch (e) {
        // ignore cleanup error
      }
    }
  }
}

