import { Router } from 'express';
import {
  signup,
  login,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getMe,
  updateUserRole,
} from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { csrfProtection } from '../middleware/csrfProtection';
import { authRateLimiter, passwordResetLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public auth routes — no CSRF (user has no session cookie yet)
router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/verify-email', verifyEmail);

// Password reset — no CSRF (user is unauthenticated)
router.post('/password-reset/request', passwordResetLimiter, requestPasswordReset);
router.post('/password-reset/confirm', passwordResetLimiter, resetPassword);

// Protected
router.post('/logout', requireAuth, csrfProtection, logout);
router.get('/me', requireAuth, getMe);

// Admin — role management (session rotation enforced on role change)
router.patch('/users/:userId/role', requireAuth, csrfProtection, requireRole(['ADMIN' as const]), updateUserRole);

export default router;
