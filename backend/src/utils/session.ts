import { prisma } from '../db/client';
import { generateSessionToken, hashToken } from './crypto';
import { env } from '../config/env';
import type { Response } from 'express';

const SESSION_ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
const SESSION_IDLE_TTL_MS = 24 * 60 * 60 * 1000;           // 24 hours

const COOKIE_NAME = env.isProduction ? '__Host-session_id' : 'session_id';

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export async function createSession(
  userId: string,
  ipAddress: string,
  userAgent: string,
): Promise<string> {
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
      lastActivityAt: now,
    },
  });

  return rawToken;
}

export async function getSessionByToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session) return null;

  const now = new Date();

  // Absolute expiry check
  if (session.expiresAt < now) {
    await prisma.session.delete({ where: { tokenHash } });
    return null;
  }

  // Idle timeout check
  const idleDeadline = new Date(session.lastActivityAt.getTime() + SESSION_IDLE_TTL_MS);
  if (idleDeadline < now) {
    await prisma.session.delete({ where: { tokenHash } });
    return null;
  }

  // Slide the idle window
  await prisma.session.update({
    where: { tokenHash },
    data: { lastActivityAt: now },
  });

  return session;
}

export async function deleteSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export function setSessionCookie(res: Response, rawToken: string): void {
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: SESSION_ABSOLUTE_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}
