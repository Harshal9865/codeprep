import { Request, Response } from 'express';
import { ProblemService } from '../services/problem.service';
import { DSA_500_PROBLEMS } from '../data/dsa500';
import { HarnessGenerator } from '../judge/harnessGenerator';

export class ProblemsController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const { category, topic, difficulty, status, search, page, pageSize } = req.query;

      const result = await ProblemService.listProblems(userId, {
        category: category as string,
        topic: topic as string,
        difficulty: difficulty as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 30,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch problems' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(404).json({ error: 'Invalid problem identifier.' });
        return;
      }

      const userId = req.user?.id || '';
      const problem = await ProblemService.getProblemById(id, userId);
      res.json({ problem });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Problem not found.' });
    }
  }

  static async getFullCode(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const userCode = (req.body.code as string) || '';

      let def = DSA_500_PROBLEMS.find((p) => p.id === id);
      if (!def) {
        const userId = req.user?.id || '';
        const prob = await ProblemService.getProblemById(id, userId);
        if (!prob) {
          res.status(404).json({ error: 'Problem definition not found.' });
          return;
        }
        def = {
          id: prob.id,
          slug: prob.slug,
          title: prob.title,
          difficulty: prob.difficulty as any,
          category: prob.category as any,
          topic: prob.topic,
          pattern: prob.pattern,
          statement: prob.statement,
          constraints: prob.constraints,
          examples: prob.examples as any,
          functionSignature: prob.functionSignature,
          paramTypes: [],
          returnType: '',
          defaultCodeStub: prob.defaultCodeStub || '',
          sampleTestCases: prob.sampleTestCases,
          hiddenTestCases: [],
        };
      }

      const harness = HarnessGenerator.generateHarness(
        userCode || def.defaultCodeStub,
        def.functionSignature,
        def.sampleTestCases
      );

      res.json({ fullCode: harness.fullCode });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to generate full code.' });
    }
  }

  static async saveDraft(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user?.id;
      const { code } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await ProblemService.saveDraft(id, userId, code);
      res.json({ message: 'Draft autosaved successfully.' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to autosave draft.' });
    }
  }

  static async toggleBookmark(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await ProblemService.toggleBookmark(id);
      res.json({ isBookmark: updated.isBookmark });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update bookmark.' });
    }
  }

  static async saveNotes(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { notes } = req.body;
      const updated = await ProblemService.saveNotes(id, notes);
      res.json({ notes: updated.userNotes });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save notes.' });
    }
  }
}

