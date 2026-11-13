import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { PerformanceService } from '../services/performance.service';

export class AnalyticsController {
  /**
   * Retrieves aggregated dashboard analytics (heatmap, streaks, topic stats, revision queue)
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const analytics = await AnalyticsService.getDashboardAnalytics(userId);
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to compile dashboard analytics.',
      });
    }
  }

  /**
   * Evaluates empirical performance curve and Big-O fit for a given solution
   */
  static async analyzePerformance(req: Request, res: Response): Promise<void> {
    try {
      const problemId = parseInt(req.params.problemId, 10);
      const { code } = req.body;

      if (!code) {
        res.status(400).json({ error: 'User solution code is required for performance benchmark.' });
        return;
      }

      const result = await PerformanceService.analyzeSolutionPerformance(problemId, code);
      res.json({ result });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Performance analysis failed.',
      });
    }
  }
}

