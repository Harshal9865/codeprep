import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export class HealthController {
  static async getHealth(_req: Request, res: Response): Promise<void> {
    const report = await HealthService.checkHealth();
    const httpStatus = report.overallStatus === 'down' ? 503 : 200;
    res.status(httpStatus).json(report);
  }
}

