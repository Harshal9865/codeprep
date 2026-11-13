import { Router } from 'express';
import { ProblemsController } from '../controllers/problems.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', ProblemsController.list);
router.get('/:id', ProblemsController.getById);
router.post('/:id/full-code', ProblemsController.getFullCode);
router.post('/:id/draft', ProblemsController.saveDraft);
router.post('/:id/bookmark', ProblemsController.toggleBookmark);
router.post('/:id/notes', ProblemsController.saveNotes);

export default router;

