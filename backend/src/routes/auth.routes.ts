import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/status', AuthController.checkStatus);
router.post('/register', AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/quick-login', AuthController.quickLogin);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.me);

export default router;

