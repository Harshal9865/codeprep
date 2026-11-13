import { Router } from 'express';
import { SubmissionsController } from '../controllers/submissions.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/run', SubmissionsController.runCode);
router.post('/submit', SubmissionsController.submitCode);
router.get('/history/:problemId', SubmissionsController.getHistory);

export default router;

