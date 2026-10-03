import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/security.js';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);

export default router;
