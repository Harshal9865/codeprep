import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/profile', UserController.getProfile);
router.patch('/profile', UserController.updateProfile);
router.post('/avatar', UserController.uploadAvatar);
router.post('/password', UserController.changePassword);
router.get('/export', UserController.exportData);
router.post('/import', UserController.importData);

export default router;

