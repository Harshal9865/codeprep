import { Request, Response } from 'express';
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
      const { problemId, userCode, verdict, executionResult, hintLevel, isSolved } = req.body;
      const numericId = parseInt(problemId, 10);
      const def =
        DSA_500_PROBLEMS.find((p) => p.id === numericId) ||
        SQL_100_PROBLEMS.find((p) => p.id === numericId);

      const feedback = await AiTeacherService.getFeedback({
        problemId: def ? def.id : parseInt(problemId, 10),
        problemTitle: def ? def.title : 'Problem',
        problemStatement: def ? def.statement : '',
        userCode: userCode || '',
        verdict,
        executionResult,
        hintLevel: hintLevel ? parseInt(hintLevel, 10) : 1,
        isSolved: Boolean(isSolved),
        topic: def?.topic,
        pattern: def?.pattern,
        category: def?.category,
      });

      res.json({ feedback });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate guidance' });
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

