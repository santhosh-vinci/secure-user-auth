import { Router } from 'express';
import {
  signup,
  login,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getMe,
  listUsers,
  updateUserRole,
  unlockUser,
} from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { csrfProtection } from '../middleware/csrfProtection';
import { authRateLimiter, passwordResetLimiter, verifyEmailLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public auth routes — no CSRF (user has no session cookie yet)
router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/verify-email', verifyEmailLimiter, verifyEmail);

// Password reset — no CSRF (user is unauthenticated)
router.post('/password-reset/request', passwordResetLimiter, requestPasswordReset);
router.post('/password-reset/confirm', passwordResetLimiter, resetPassword);

// Protected
router.post('/logout', requireAuth, csrfProtection, logout);
router.get('/me', requireAuth, getMe);

// Admin + Moderator — view users (read-only for moderators)
router.get('/admin/users', requireAuth, requireRole(['ADMIN' as const, 'MODERATOR' as const]), listUsers);

// Admin only — mutate roles / unlock accounts
router.patch('/users/:userId/role', requireAuth, csrfProtection, requireRole(['ADMIN' as const]), updateUserRole);
router.post('/users/:userId/unlock', requireAuth, csrfProtection, requireRole(['ADMIN' as const]), unlockUser);

export default router;
