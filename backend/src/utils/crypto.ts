import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { timingSafeEqual } from 'crypto';

// ─── Argon2id settings ───────────────────────────────────────────────────────
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

/**
 * Returns true if the stored hash used different argon2 parameters
 * and should be rehashed with current settings.
 */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}

// ─── Secure random tokens ────────────────────────────────────────────────────

/** Generate a 128-char hex opaque session token. */
export function generateSessionToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/** Generate a 64-char hex CSRF token. */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Generate a 64-char hex reset/verification token. */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Hashing for DB storage ──────────────────────────────────────────────────

/** SHA-256 hash a token for safe DB storage. */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// ─── Constant-time comparison ────────────────────────────────────────────────

/**
 * Constant-time string comparison to prevent timing attacks.
 * Both inputs are hashed to equal-length buffers before comparison.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(crypto.createHash('sha256').update(a).digest('hex'));
  const bufB = Buffer.from(crypto.createHash('sha256').update(b).digest('hex'));
  return timingSafeEqual(bufA, bufB);
}
