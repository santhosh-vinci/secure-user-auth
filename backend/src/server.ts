import { env } from './config/env';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { globalRateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import { logger } from './config/logger';
import { startAuditLogRetention } from './services/auditLogRetention';

const app = express();

// ─── Trust proxy (if behind load balancer / reverse proxy) ───────────────────
app.set('trust proxy', 1);

// ─── HTTPS redirect in production ────────────────────────────────────────────
if (env.isProduction) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      res.redirect(301, `https://${req.headers.host}${req.url}`);
      return;
    }
    next();
  });
}

// ─── Security headers (Helmet) ────────────────────────────────────────────────
app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    contentSecurityPolicy: true, // enabled in both dev and prod
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        if (env.isProduction) {
          callback(new Error('CORS: origin required in production'));
        } else {
          callback(null, true);
        }
        return;
      }

      if (env.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    maxAge: 86400,
  }),
);

// ─── Body parsing & cookies ───────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// ─── Global rate limiter ──────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Health check — supports both GET and HEAD (load balancers use HEAD)
app.route('/health')
  .get((_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  })
  .head((_req: Request, res: Response) => {
    res.status(200).end();
  });

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  startAuditLogRetention();
});

export default app;
