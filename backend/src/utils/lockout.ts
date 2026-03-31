import { prisma } from '../db/client';
import { logger } from '../config/logger';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function recordFailedLogin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const newCount = user.failedLoginCount + 1;

  if (newCount >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: newCount,
        isLocked: true,
        lockedUntil,
      },
    });
    logger.warn('Account locked due to repeated failures', { userId, lockedUntil });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: newCount },
    });
  }
}

export async function resetFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, isLocked: false, lockedUntil: null },
  });
}

export async function isAccountLocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isLocked) return false;

  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    // Auto-unlock
    await prisma.user.update({
      where: { id: userId },
      data: { isLocked: false, lockedUntil: null, failedLoginCount: 0 },
    });
    return false;
  }

  return true;
}
