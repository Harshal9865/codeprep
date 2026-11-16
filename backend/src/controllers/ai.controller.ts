import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service';
import { TimerService } from '../services/timer.service';
import { AiTeacherService } from '../services/aiTeacher.service';
import { LessonService } from '../services/lesson.service';
import { DSA_500_PROBLEMS } from '../data/dsa500';
import { SQL_100_PROBLEMS } from '../data/sql100';

export class AiController {
  static async heartbeat(req: Request, res: Response): Promise<void> {
    try {
      const { problemId, isTabActive } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await TimerService.recordHeartbeat(
        parseInt(problemId, 10),
        userId,
        Boolean(isTabActive)
      );

      res.json({ timer: status });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Heartbeat failed' });
    }
  }

  static async getTimerStatus(req: Request, res: Response): Promise<void> {
    try {
      const problemId = parseInt(req.params.problemId, 10);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await TimerService.getStatus(problemId, userId);
      res.json({ timer: status });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Problem not found' });
    }
  }

  static async unlockSolution(req: Request, res: Response): Promise<void> {
    try {
      const problemId = parseInt(req.params.problemId, 10);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await TimerService.unlockAiSolution(problemId, userId);
      res.json({ message: 'Reference solution unlocked successfully.' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unlock failed';
      const status = msg.includes('403') ? 403 : 400;
      res.status(status).json({ error: msg });
    }
  }

  static async getGuidance(req: Request, res: Response): Promise<void> {
    try {
      const {
        problemId,
        userCode,
        verdict,
        executionResult,
        hintLevel,
        isSolved,
        userQuestion,
        requestMode,
        conversationHistory,
      } = req.body;
      const numericId = parseInt(problemId, 10);
      const def =
        DSA_500_PROBLEMS.find((p) => p.id === numericId) ||
        SQL_100_PROBLEMS.find((p) => p.id === numericId);
      const dbProb = !def && Number.isFinite(numericId)
        ? await prisma.problem.findUnique({ where: { id: numericId } })
        : null;

      let parsedExamples: Array<{ input?: string; output?: string }> = def?.examples || [];
      if (!def && dbProb?.examplesJson) {
        try {
          parsedExamples = JSON.parse(dbProb.examplesJson);
        } catch {}
      }

      const safeHistory = Array.isArray(conversationHistory)
        ? conversationHistory
            .filter(
              (m: unknown): m is { role: 'user' | 'assistant'; content: string } =>
                Boolean(m) &&
                typeof m === 'object' &&
                ((m as { role?: string }).role === 'user' ||
                  (m as { role?: string }).role === 'assistant') &&
                typeof (m as { content?: string }).content === 'string'
            )
            .slice(-8)
        : undefined;

      const sqlSchema = def && 'schemaDdl' in def ? (def as { schemaDdl?: string }).schemaDdl : undefined;
      const feedback = await AiTeacherService.getFeedback({
        problemId: def ? def.id : dbProb ? dbProb.id : numericId,
        problemTitle: def ? def.title : dbProb ? dbProb.title : `Problem #${numericId}`,
        problemStatement: def ? def.statement : dbProb ? dbProb.statement : '',
        functionSignature: def?.functionSignature ?? dbProb?.functionSignature,
        constraints: def?.constraints ?? dbProb?.constraints,
        schemaDdl: sqlSchema,
        examples: parsedExamples,
        userCode: userCode || '',
        verdict,
        executionResult,
        hintLevel: hintLevel ? parseInt(hintLevel, 10) : 1,
        requestMode,
        userQuestion: typeof userQuestion === 'string' ? userQuestion.slice(0, 600) : undefined,
        conversationHistory: safeHistory,
        isSolved: Boolean(isSolved),
        topic: def?.topic ?? dbProb?.topic,
        pattern: def?.pattern ?? dbProb?.pattern,
        category: def?.category ?? dbProb?.category,
      });

      res.json({ feedback });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate guidance' });
    }
  }

  static async interviewCoach(req: Request, res: Response): Promise<void> {
    try {
      const { topic, question, userAnswer, mode } = req.body as {
        topic?: string;
        question?: string;
        userAnswer?: string;
        mode?: 'critique' | 'ask';
      };
      const result = await AiTeacherService.coachInterviewAnswer({
        topic: (topic || 'General SDE').slice(0, 120),
        question: (question || '').slice(0, 1200),
        userAnswer: (userAnswer || '').slice(0, 4000),
        mode: mode === 'ask' ? 'ask' : 'critique',
      });
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Failed to run AI interview coach' });
    }
  }

  static async getLesson(req: Request, res: Response): Promise<void> {
    try {
      const problemId = parseInt(req.params.problemId, 10);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const lesson = await LessonService.getLessonByProblemId(problemId, userId);
      res.json({ lesson });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch lesson';
      const status = msg.includes('403') ? 403 : 404;
      res.status(status).json({ error: msg });
    }
  }
}

