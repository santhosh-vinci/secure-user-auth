import { rateLimit, type Store, type IncrementResponse } from 'express-rate-limit';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type { Request, Response } from 'express';

// ─── Upstash Redis store (production) ────────────────────────────────────────

class UpstashStore implements Store {
  prefix: string;
  windowMs: number;

  constructor(prefix: string, windowMs: number) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  private key(k: string): string { return `${this.prefix}${k}`; }

  async increment(key: string): Promise<IncrementResponse> {
    const { redis } = await import('../config/redis');
    const k = this.key(key);
    const ttlSec = Math.ceil(this.windowMs / 1000);
    const pipeline = redis.pipeline();
    pipeline.incr(k);
    pipeline.expire(k, ttlSec, 'NX');
    const [totalHits] = await pipeline.exec<[number, number]>();
    const remainingTtl = await redis.ttl(k);
    const resetTime = new Date(Date.now() + remainingTtl * 1000);
    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const { redis } = await import('../config/redis');
    await redis.decr(this.key(key));
  }

  async resetKey(key: string): Promise<void> {
    const { redis } = await import('../config/redis');
    await redis.del(this.key(key));
  }
}

// Use Redis store in production if credentials are available, else in-memory
function makeStore(prefix: string, windowMs: number): Store | undefined {
  if (env.isProduction && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    logger.info(`Rate limiter using Redis store for prefix: ${prefix}`);
    return new UpstashStore(prefix, windowMs);
  }
  if (env.isProduction) {
    logger.warn('Redis credentials missing in production — falling back to in-memory rate limiter');
  }
  return undefined; // express-rate-limit defaults to in-memory
}

// ─── Shared handler ───────────────────────────────────────────────────────────

const rateLimitResponse = (_req: Request, res: Response) => {
  res.status(429).json({ error: 'Too many requests. Please try again later.' });
};

// ─── Global: 100 req / min per IP ────────────────────────────────────────────

const GLOBAL_WINDOW = 60 * 1000;
export const globalRateLimiter = rateLimit({
  windowMs: GLOBAL_WINDOW,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: makeStore('global:', GLOBAL_WINDOW),
  handler: rateLimitResponse,
});

// ─── Auth: 5 failed req / 15 min per IP+email ────────────────────────────────

const AUTH_WINDOW = 15 * 60 * 1000;
export const authRateLimiter = rateLimit({
  windowMs: AUTH_WINDOW,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: makeStore('auth:', AUTH_WINDOW),
  keyGenerator: (req) => {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email as string | undefined)?.toLowerCase().trim() || 'anonymous';
    return `${ip}:${email}`;
  },
  handler: rateLimitResponse,
});

// ─── Email verification: 10 attempts / 15 min per IP ─────────────────────────
// Prevents brute-forcing the 64-char hex verification token

export const verifyEmailLimiter = rateLimit({
  windowMs: AUTH_WINDOW,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: makeStore('verify-email:', AUTH_WINDOW),
  handler: rateLimitResponse,
});

// ─── Password reset: 3 failed req / 15 min per IP+email ──────────────────────

export const passwordResetLimiter = rateLimit({
  windowMs: AUTH_WINDOW,
  max: 3,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: makeStore('pwd-reset:', AUTH_WINDOW),
  keyGenerator: (req) => {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email as string | undefined)?.toLowerCase().trim() || 'anonymous';
    return `${ip}:${email}`;
  },
  handler: rateLimitResponse,
});
