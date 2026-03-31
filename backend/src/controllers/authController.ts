import type { Request, Response } from 'express';
import { prisma } from '../db/client';
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  generateSecureToken,
  hashToken,
  generateCsrfToken,
} from '../utils/crypto';
import {
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionCookieName,
} from '../utils/session';
import { recordFailedLogin, resetFailedLogins, isAccountLocked, recordFailedLoginByIp, isIpLocked } from '../utils/lockout';
import { extractFingerprint } from '../utils/fingerprint';
import { createAuditLog } from '../services/auditLog';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { env } from '../config/env';
import {
  signupSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  emailVerificationSchema,
  updateRoleSchema,
} from '../utils/validation';
import { logger } from '../config/logger';

async function constantTimeDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));
}

function setCsrfCookie(res: Response, token: string): void {
  res.cookie('csrf_token', token, {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid input', details: result.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = result.data;
    const { ipAddress, userAgent } = extractFingerprint(req);

    await constantTimeDelay();

    const GENERIC = 'If that email is new, a verification link has been sent.';

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // If already verified, stay silent — don't reveal account existence
      if (existing.isEmailVerified) {
        res.status(201).json({ message: GENERIC });
        return;
      }

      // Unverified account: invalidate old tokens and resend a fresh one
      const verificationToken = generateSecureToken();
      const verificationTokenHash = hashToken(verificationToken);

      await prisma.$transaction([
        prisma.emailVerificationToken.deleteMany({ where: { userId: existing.id } }),
        prisma.emailVerificationToken.create({
          data: {
            userId: existing.id,
            tokenHash: verificationTokenHash,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        }),
      ]);

      await createAuditLog({ userId: existing.id, ipAddress, userAgent, action: 'EMAIL_VERIFICATION_SENT' });

      try {
        await sendVerificationEmail(email, verificationToken);
      } catch {
        res.status(500).json({ error: 'Account exists but we could not send the verification email. Please try again in a few minutes.' });
        return;
      }

      res.status(201).json({ message: GENERIC });
      return;
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(verificationToken);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerificationTokens: {
          create: {
            tokenHash: verificationTokenHash,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        },
      },
    });

    await createAuditLog({ userId: user.id, ipAddress, userAgent, action: 'SIGNUP' });
    await createAuditLog({ userId: user.id, ipAddress, userAgent, action: 'EMAIL_VERIFICATION_SENT' });

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch {
      res.status(500).json({ error: 'Account created but we could not send the verification email. Please try signing up again to resend it.' });
      return;
    }

    res.status(201).json({ message: GENERIC });
  } catch (err) {
    logger.error('Signup error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const result = emailVerificationSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    const { token } = result.data;
    const tokenHash = hashToken(token);
    const { ipAddress, userAgent } = extractFingerprint(req);

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { isEmailVerified: true } } },
    });

    if (!record || record.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invalid or expired verification token.' });
      return;
    }

    // Token already used — if account is verified treat as success (idempotent)
    if (record.usedAt) {
      if (record.user.isEmailVerified) {
        res.json({ message: 'Email already verified. You can sign in.' });
      } else {
        res.status(400).json({ error: 'Invalid or expired verification token.' });
      }
      return;
    }

    // Atomic claim: only succeeds if usedAt is still null — prevents double-use race
    const claimed = await prisma.emailVerificationToken.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (claimed.count === 0) {
      // Another request beat us to it
      res.status(400).json({ error: 'Invalid or expired verification token.' });
      return;
    }

    await prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } });

    await createAuditLog({ userId: record.userId, ipAddress, userAgent, action: 'EMAIL_VERIFIED' });

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    logger.error('Email verification error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      await constantTimeDelay();
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const { email, password } = result.data;
    const { ipAddress, userAgent } = extractFingerprint(req);

    await constantTimeDelay();

    // Per-IP lockout check — fail fast before any DB work
    if (isIpLocked(ipAddress)) {
      await createAuditLog({ ipAddress, userAgent, action: 'LOGIN_LOCKED', metadata: { reason: 'ip_lockout' } });
      res.status(429).json({ error: 'Too many login attempts from this location. Please try again later.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await hashPassword(password);
      recordFailedLoginByIp(ipAddress);
      await createAuditLog({ ipAddress, userAgent, action: 'LOGIN_FAILURE', metadata: { email } });
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    if (await isAccountLocked(user.id)) {
      recordFailedLoginByIp(ipAddress);
      await createAuditLog({ userId: user.id, ipAddress, userAgent, action: 'LOGIN_LOCKED' });
      res.status(403).json({ error: 'Account is temporarily locked. Please try again later.' });
      return;
    }

    const valid = await verifyPassword(user.passwordHash, password);

    if (!valid) {
      await recordFailedLogin(user.id);
      recordFailedLoginByIp(ipAddress);
      await createAuditLog({ userId: user.id, ipAddress, userAgent, action: 'LOGIN_FAILURE' });
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(403).json({ error: 'Please verify your email before logging in.' });
      return;
    }

    if (needsRehash(user.passwordHash)) {
      const newHash = await hashPassword(password);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    }

    await resetFailedLogins(user.id);

    const rawToken = await createSession(user.id, ipAddress, userAgent);
    const csrfToken = generateCsrfToken();

    setSessionCookie(res, rawToken);
    setCsrfCookie(res, csrfToken);

    await createAuditLog({ userId: user.id, ipAddress, userAgent, action: 'LOGIN_SUCCESS' });

    res.json({
      message: 'Logged in successfully.',
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    logger.error('Login error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.cookies[getSessionCookieName()] as string | undefined;
    const { ipAddress, userAgent } = extractFingerprint(req);

    if (rawToken) {
      const userId = (req as any).user?.id as string | undefined;
      if (userId) {
        await createAuditLog({ userId, ipAddress, userAgent, action: 'LOGOUT' });
      }
      await deleteSession(rawToken);
    }

    clearSessionCookie(res);
    res.clearCookie('csrf_token', { path: '/' });
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    logger.error('Logout error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── Password Reset Request ───────────────────────────────────────────────────

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  try {
    const result = passwordResetRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }

    const { email } = result.data;
    const { ipAddress, userAgent } = extractFingerprint(req);

    await constantTimeDelay();

    const GENERIC = 'If that email is registered, a reset link has been sent.';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.json({ message: GENERIC });
      return;
    }

    // Silently block locked accounts — don't reveal lock status to caller
    if (await isAccountLocked(user.id)) {
      res.json({ message: GENERIC });
      return;
    }

    const resetToken = generateSecureToken();
    const resetTokenHash = hashToken(resetToken);

    // Invalidate all previous unused reset tokens — prevents token accumulation
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: resetTokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await createAuditLog({ userId: user.id, ipAddress, userAgent, action: 'PASSWORD_RESET_REQUESTED' });

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch {
      res.status(500).json({ error: 'We could not send the reset email. Please try again in a few minutes.' });
      return;
    }

    res.json({ message: GENERIC });
  } catch (err) {
    logger.error('Password reset request error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── Password Reset Confirm ───────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const result = passwordResetSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid input', details: result.error.flatten().fieldErrors });
      return;
    }

    const { token, password } = result.data;
    const tokenHash = hashToken(token);
    const { ipAddress, userAgent } = extractFingerprint(req);

    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    const newHash = await hashPassword(password);

    // Atomic claim: only succeeds if usedAt is still null — prevents double-use race
    const claimed = await prisma.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (claimed.count === 0) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: newHash } }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    await createAuditLog({ userId: record.userId, ipAddress, userAgent, action: 'PASSWORD_RESET_SUCCESS' });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    logger.error('Password reset error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── Unlock user account (ADMIN only) ────────────────────────────────────────

export async function unlockUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId as string;
    const { ipAddress, userAgent } = extractFingerprint(req);
    const actorId = (req as any).user?.id as string;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required.' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (!target.isLocked) {
      res.status(400).json({ error: 'User account is not locked.' });
      return;
    }

    await resetFailedLogins(userId);

    await createAuditLog({
      userId: actorId,
      ipAddress,
      userAgent,
      action: 'ACCOUNT_LOCKED',
      metadata: { targetUserId: userId, action: 'manual_unlock' },
    });

    res.json({ message: 'Account unlocked successfully.' });
  } catch (err) {
    logger.error('Unlock user error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── List all users (ADMIN only) ─────────────────────────────────────────────

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        isLocked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (err) {
    logger.error('List users error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── Update user role (ADMIN only) ───────────────────────────────────────────

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const result = updateRoleSchema.safeParse({ ...req.params, ...req.body });
    if (!result.success) {
      res.status(400).json({ error: 'Invalid input', details: result.error.flatten().fieldErrors });
      return;
    }

    const { userId, role } = result.data;
    const { ipAddress, userAgent } = extractFingerprint(req);
    const actorId = (req as any).user?.id as string;

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (target.role === role) {
      res.status(400).json({ error: 'User already has this role.' });
      return;
    }

    const previousRole = target.role;

    // Update role and invalidate ALL sessions atomically — forces re-login
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { role } }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);

    await createAuditLog({
      userId: actorId,
      ipAddress,
      userAgent,
      action: 'ROLE_CHANGED',
      metadata: { targetUserId: userId, previousRole, newRole: role },
    });

    res.json({ message: `Role updated to ${role}. User sessions have been invalidated.` });
  } catch (err) {
    logger.error('Update role error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ─── Get current user ─────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as { id: string; email: string; role: string } | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    res.json({ user });
  } catch (err) {
    logger.error('GetMe error', { error: err });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
