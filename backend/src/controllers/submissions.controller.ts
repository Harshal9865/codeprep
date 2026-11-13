import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import { AnalyticsService } from '../services/analytics.service';
import { DSA_500_PROBLEMS } from '../data/dsa500';
import { SQL_100_PROBLEMS, SqlProblemDefinition } from '../data/sql100';
import { ExecutionQueue } from '../judge/queue';
import { SqlRunner } from '../judge/sqlRunner';
import { TestCase } from '../judge/types';
import { Logger } from '../utils/logger';

export class SubmissionsController {
  private static async getProblemDefinition(pid: number) {
    let def = DSA_500_PROBLEMS.find((p) => p.id === pid) || SQL_100_PROBLEMS.find((p) => p.id === pid);
    if (!def) {
      const dbProb = await prisma.problem.findUnique({ where: { id: pid } });
      if (!dbProb) return null;
      let parsedExamples: Array<{ input?: string; output?: string }> = [];
      try {
        parsedExamples = JSON.parse(dbProb.examplesJson);
      } catch {}
      const sampleTestCases = parsedExamples.map((ex, idx) => ({
        id: idx + 1,
        input: ex.input || '',
        expectedOutput: ex.output || '',
      }));
      def = {
        id: dbProb.id,
        slug: dbProb.slug,
        title: dbProb.title,
        difficulty: dbProb.difficulty as any,
        category: dbProb.category as any,
        topic: dbProb.topic,
        pattern: dbProb.pattern,
        statement: dbProb.statement,
        constraints: dbProb.constraints,
        examples: parsedExamples as any,
        functionSignature: dbProb.functionSignature,
        paramTypes: [],
        returnType: '',
        defaultCodeStub: dbProb.cppHarnessTemplate || '',
        sampleTestCases,
        hiddenTestCases: [],
      };
    }
    return def;
  }

  static async runCode(req: Request, res: Response): Promise<void> {
    try {
      const { problemId, code, customTestCases } = req.body;
      const userId = req.user?.id || 'anonymous';
      const pid = parseInt(problemId, 10);

      const def = await SubmissionsController.getProblemDefinition(pid);
      if (!def) {
        res.status(404).json({ error: 'Problem definition not found.' });
        return;
      }

      if (def.category === 'SQL') {
        const sqlDef = def as SqlProblemDefinition;
        const sqlResult = await SqlRunner.executeQuery(
          code,
          sqlDef.schemaDdl,
          sqlDef.expectedQuery,
          sqlDef.expectedResultJson
        );
        res.json({
          result: {
            verdict: sqlResult.verdict,
            runtimeMs: sqlResult.runtimeMs,
            memoryKb: 2048,
            columns: sqlResult.columns,
            rows: sqlResult.rows,
            expectedColumns: sqlResult.expectedColumns,
            expectedRows: sqlResult.expectedRows,
            error: sqlResult.error,
            stdout: sqlResult.error ? `Error: ${sqlResult.error}` : `Rows returned: ${sqlResult.rows.length}`,
            totalTestCases: 1,
            passedTestCases: sqlResult.verdict === 'Accepted' ? 1 : 0,
          },
        });
        return;
      }

      let testCasesToRun: TestCase[] = def.sampleTestCases;
      if (customTestCases && Array.isArray(customTestCases) && customTestCases.length > 0) {
        testCasesToRun = customTestCases.map((tc, idx) => ({
          id: idx + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput || '',
        }));
      }

      const result = await ExecutionQueue.enqueue(
        userId,
        def.id,
        code,
        def.functionSignature,
        testCasesToRun
      );

      res.json({ result });
    } catch (error) {
      Logger.error('SubmissionsController', 'Run execution failed', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Execution failed.' });
    }
  }

  static async submitCode(req: Request, res: Response): Promise<void> {
    try {
      const { problemId, code } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const pid = parseInt(problemId, 10);
      const def = await SubmissionsController.getProblemDefinition(pid);
      if (!def) {
        res.status(404).json({ error: 'Problem definition not found.' });
        return;
      }

      if (def.category === 'SQL') {
        const sqlDef = def as SqlProblemDefinition;
        const sqlResult = await SqlRunner.executeQuery(
          code,
          sqlDef.schemaDdl,
          sqlDef.expectedQuery,
          sqlDef.expectedResultJson
        );

        const submission = await prisma.submission.create({
          data: {
            problemId: def.id,
            userId,
            language: 'sql',
            code,
            verdict: sqlResult.verdict,
            runtimeMs: sqlResult.runtimeMs,
            memoryKb: 2048,
            stdout: sqlResult.error || `Rows returned: ${sqlResult.rows.length}`,
          },
        });

        if (sqlResult.verdict === 'Accepted') {
          await AnalyticsService.syncBadgesForUser(userId);
        }

        const sqlRuntimePercentile =
          sqlResult.verdict === 'Accepted'
            ? Math.round(Math.min(99.0, Math.max(30.0, 100 - sqlResult.runtimeMs * 0.4)) * 10) / 10
            : 0;

        res.json({
          submissionId: submission.id,
          result: {
            verdict: sqlResult.verdict,
            runtimeMs: sqlResult.runtimeMs,
            memoryKb: 2048,
            columns: sqlResult.columns,
            rows: sqlResult.rows,
            expectedColumns: sqlResult.expectedColumns,
            expectedRows: sqlResult.expectedRows,
            error: sqlResult.error,
            totalTestCases: 1,
            passedTestCases: sqlResult.verdict === 'Accepted' ? 1 : 0,
          },
          benchmarks: {
            runtimePercentile: sqlRuntimePercentile,
            memoryPercentile: sqlResult.verdict === 'Accepted' ? 92.0 : 0,
          },
        });
        return;
      }

      // Combine sample and hidden tests for final submission verdict
      const fullTestSuites: TestCase[] = [...def.sampleTestCases, ...def.hiddenTestCases];

      const result = await ExecutionQueue.enqueue(
        userId,
        def.id,
        code,
        def.functionSignature,
        fullTestSuites
      );

      // Record submission in database
      const submission = await prisma.submission.create({
        data: {
          problemId: def.id,
          userId,
          language: 'cpp17',
          code,
          verdict: result.verdict,
          runtimeMs: result.runtimeMs,
          memoryKb: result.memoryKb,
          failedTestCase: result.failedTestCase ? JSON.stringify(result.failedTestCase) : null,
          stdout: result.stdout,
          stderr: result.compileError || result.stderr,
        },
      });

      if (result.verdict === 'Accepted') {
        await AnalyticsService.syncBadgesForUser(userId);
      }

      // Calculate percentile benchmarks against execution latency/memory bounds
      const benchmarkPercentileRuntime =
        result.verdict === 'Accepted'
          ? Math.min(98.5, Math.max(12.0, 100 - result.runtimeMs * 1.2))
          : 0;
      const benchmarkPercentileMemory =
        result.verdict === 'Accepted'
          ? Math.min(99.0, Math.max(20.0, 100 - result.memoryKb / 2048))
          : 0;

      res.json({
        submissionId: submission.id,
        result,
        benchmarks: {
          runtimePercentile: Math.round(benchmarkPercentileRuntime * 10) / 10,
          memoryPercentile: Math.round(benchmarkPercentileMemory * 10) / 10,
        },
      });
    } catch (error) {
      Logger.error('SubmissionsController', 'Submission failed', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Submission failed.' });
    }
  }

  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const problemId = parseInt(req.params.problemId, 10);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const submissions = await prisma.submission.findMany({
        where: { problemId, userId },
        orderBy: { submittedAt: 'desc' },
        take: 20,
      });

      res.json({ submissions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch submission history.' });
    }
  }
}

