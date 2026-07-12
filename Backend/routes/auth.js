import express from 'express';
import { 
  register, 
  login, 
  verify2FA, 
  refresh, 
  logout, 
  forgotPassword, 
  resetPassword 
} from '../controllers/authController.js';
import { registerValidator, loginValidator } from '../validators/authValidator.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, registerValidator, register);
router.post('/login', authLimiter, loginValidator, login);
router.post('/verify-2fa', authLimiter, verify2FA);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;
