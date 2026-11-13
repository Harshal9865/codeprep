import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', AnalyticsController.getDashboard);
router.post('/performance/:problemId', AnalyticsController.analyzePerformance);

export default router;

