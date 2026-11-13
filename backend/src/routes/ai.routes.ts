import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/timer/heartbeat', AiController.heartbeat);
router.get('/timer/status/:problemId', AiController.getTimerStatus);
router.post('/timer/unlock/:problemId', AiController.unlockSolution);
router.post('/guidance', AiController.getGuidance);
router.post('/interview-coach', AiController.interviewCoach);
router.get('/lesson/:problemId', AiController.getLesson);

export default router;

