import * as crypto from 'crypto';
import type { Request } from 'express';

export interface FingerprintData {
  ipAddress: string;
  userAgent: string;
}

/** Extract IP and normalized User-Agent from a request. */
export function extractFingerprint(req: Request): FingerprintData {
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const userAgent = req.headers['user-agent'] || 'unknown';

  return { ipAddress: ip, userAgent };
}

/**
 * Risk-based fingerprint comparison.
 * Returns 'ok' | 'suspicious' | 'critical'.
 */
export function assessFingerprintRisk(
  stored: FingerprintData,
  current: FingerprintData,
): 'ok' | 'suspicious' | 'critical' {
  const ipChanged = !isSameSubnet(stored.ipAddress, current.ipAddress);
  const uaChanged = normalizeUA(stored.userAgent) !== normalizeUA(current.userAgent);

  if (ipChanged && uaChanged) return 'critical';
  if (ipChanged || uaChanged) return 'suspicious';
  return 'ok';
}

/** Compare /24 subnets for IPv4, or full address for IPv6. */
function isSameSubnet(a: string, b: string): boolean {
  if (a === b) return true;
  const partsA = a.split('.');
  const partsB = b.split('.');
  if (partsA.length === 4 && partsB.length === 4) {
    // /24 comparison
    return partsA.slice(0, 3).join('.') === partsB.slice(0, 3).join('.');
  }
  return false;
}

/** Strip version numbers from UA string for lenient matching. */
function normalizeUA(ua: string): string {
  return ua
    .replace(/[\d.]+/g, '')       // strip version numbers
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/** Hash a UA string for compact storage. */
export function hashUserAgent(ua: string): string {
  return crypto.createHash('sha256').update(ua).digest('hex').slice(0, 16);
}
