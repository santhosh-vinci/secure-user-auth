import type { Request, Response, NextFunction } from 'express';
import { safeCompare } from '../utils/crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie CSRF protection.
 * Validates that the X-CSRF-Token header matches the csrf_token cookie.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.csrf_token as string | undefined;
  const headerToken = req.headers['x-csrf-token'] as string | undefined;

  if (!cookieToken || !headerToken || !safeCompare(cookieToken, headerToken)) {
    res.status(403).json({ error: 'Invalid CSRF token.' });
    return;
  }

  next();
}
