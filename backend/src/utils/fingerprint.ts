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

/** Compare /24 subnets for IPv4, or /64 prefix for IPv6. */
function isSameSubnet(a: string, b: string): boolean {
  if (a === b) return true;

  // IPv4: compare first 3 octets (/24)
  const partsA = a.split('.');
  const partsB = b.split('.');
  if (partsA.length === 4 && partsB.length === 4) {
    return partsA.slice(0, 3).join('.') === partsB.slice(0, 3).join('.');
  }

  // IPv6: compare first 4 groups (/64 prefix)
  if (a.includes(':') && b.includes(':')) {
    const expandA = expandIPv6(a);
    const expandB = expandIPv6(b);
    if (expandA && expandB) {
      return expandA.slice(0, 4).join(':') === expandB.slice(0, 4).join(':');
    }
    // Fallback: compare raw prefix up to first 4 colon-delimited groups
    return a.split(':').slice(0, 4).join(':') === b.split(':').slice(0, 4).join(':');
  }

  return false;
}

/** Expand compressed IPv6 address into 8 groups. Returns null if unparseable. */
function expandIPv6(addr: string): string[] | null {
  try {
    // Strip zone ID (e.g. %eth0)
    const clean = addr.split('%')[0];
    const sides = clean.split('::');
    if (sides.length > 2) return null;

    const left = sides[0] ? sides[0].split(':') : [];
    const right = sides[1] ? sides[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0000');
    const groups = [...left, ...middle, ...right];
    if (groups.length !== 8) return null;
    return groups.map((g) => g.padStart(4, '0'));
  } catch {
    return null;
  }
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
