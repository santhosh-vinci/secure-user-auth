import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { getSessionByToken, deleteSession, clearSessionCookie } from '../utils/session';
import { extractFingerprint, assessFingerprintRisk } from '../utils/fingerprint';
import { createAuditLog } from '../services/auditLog';
import { getSessionCookieName } from '../utils/session';
import { logger } from '../config/logger';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawToken = req.cookies[getSessionCookieName()] as string | undefined;

  if (!rawToken) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const session = await getSessionByToken(rawToken);

  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: 'Session expired or invalid.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  if (!user || user.isLocked) {
    clearSessionCookie(res);
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // Risk-based fingerprint check
  const current = extractFingerprint(req);
  const stored = { ipAddress: session.ipAddress, userAgent: session.userAgent };
  const risk = assessFingerprintRisk(stored, current);

  if (risk === 'critical') {
    logger.warn('Critical fingerprint mismatch — terminating session', {
      userId: user.id,
      stored,
      current,
    });
    await deleteSession(rawToken);
    await createAuditLog({
      userId: user.id,
      ipAddress: current.ipAddress,
      userAgent: current.userAgent,
      action: 'SESSION_TERMINATED_SUSPICIOUS',
      metadata: { storedIp: stored.ipAddress, storedUA: stored.userAgent },
    });
    clearSessionCookie(res);
    res.status(401).json({ error: 'Session terminated due to suspicious activity.' });
    return;
  }

  if (risk === 'suspicious') {
    await createAuditLog({
      userId: user.id,
      ipAddress: current.ipAddress,
      userAgent: current.userAgent,
      action: 'SESSION_FINGERPRINT_MISMATCH',
      metadata: { storedIp: stored.ipAddress, storedUA: stored.userAgent, risk },
    });
  }

  (req as any).user = { id: user.id, email: user.email, role: user.role };
  (req as any).session = session;
  next();
}
