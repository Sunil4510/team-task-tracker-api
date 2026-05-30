import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../validators/auth.validator';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { status: 429, code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' },
});

router.use(authLimiter);

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), AuthController.refresh);
router.post('/logout', validateRequest(logoutSchema), AuthController.logout);

export default router;
