import { prisma } from '../db/client';
import { logger } from '../config/logger';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─── Per-IP lockout (in-memory; swap for Redis in multi-instance deployments) ──

const MAX_IP_FAILURES = 20; // across any accounts from this IP

interface IpRecord { count: number; lockedUntil?: number }
const ipFailures = new Map<string, IpRecord>();

export function recordFailedLoginByIp(ip: string): void {
  const rec = ipFailures.get(ip) ?? { count: 0 };
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) return; // already locked
  rec.count += 1;
  if (rec.count >= MAX_IP_FAILURES) {
    rec.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    logger.warn('IP address temporarily locked after repeated failures', { ip, lockedUntil: new Date(rec.lockedUntil) });
  }
  ipFailures.set(ip, rec);
}

export function resetFailedLoginsByIp(ip: string): void {
  ipFailures.delete(ip);
}

export function isIpLocked(ip: string): boolean {
  const rec = ipFailures.get(ip);
  if (!rec?.lockedUntil) return false;
  if (rec.lockedUntil <= Date.now()) {
    ipFailures.delete(ip);
    return false;
  }
  return true;
}

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
