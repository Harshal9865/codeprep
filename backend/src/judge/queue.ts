import { ExecutionResult, TestCase } from './types';
import { SandboxRunner } from './sandboxRunner';
import { Logger } from '../utils/logger';

interface QueuedTask {
  id: string;
  userId: string;
  problemId: number;
  userCode: string;
  functionSignature: string;
  testCases: TestCase[];
  resolve: (res: ExecutionResult) => void;
  reject: (err: unknown) => void;
}

export class ExecutionQueue {
  private static taskQueue: QueuedTask[] = [];
  private static activeRuns = 0;
  private static readonly MAX_CONCURRENT = 2;
  private static readonly recentSubmissions = new Map<string, number>();

  /**
   * Enqueues a submission with double-click idempotency guard.
   */
  static enqueue(
    userId: string,
    problemId: number,
    userCode: string,
    functionSignature: string,
    testCases: TestCase[]
  ): Promise<ExecutionResult> {
    const idempotencyKey = `${userId}:${problemId}:${userCode.trim().substring(0, 64)}`;
    const now = Date.now();
    const lastRunTime = this.recentSubmissions.get(idempotencyKey);

    if (lastRunTime && now - lastRunTime < 1500) {
      Logger.warn('ExecutionQueue', 'Duplicate submission dropped by idempotency guard', { idempotencyKey });
      return Promise.reject(new Error('Duplicate submission detected. Please wait for the current run to complete.'));
    }
    this.recentSubmissions.set(idempotencyKey, now);

    return new Promise((resolve, reject) => {
      const taskId = `${userId}-${now}-${Math.random().toString(36).substring(2, 7)}`;
      this.taskQueue.push({
        id: taskId,
        userId,
        problemId,
        userCode,
        functionSignature,
        testCases,
        resolve,
        reject,
      });

      this.processNext();
    });
  }

  private static async processNext(): Promise<void> {
    if (this.activeRuns >= this.MAX_CONCURRENT || this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    this.activeRuns++;

    try {
      const result = await SandboxRunner.runCppSubmission(
        task.userCode,
        task.functionSignature,
        task.testCases
      );
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.activeRuns--;
      this.processNext();
    }
  }
}

