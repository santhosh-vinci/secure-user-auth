# SecureAuth

An enterprise-grade authentication and RBAC system built from scratch — no third-party auth providers (no Clerk, no Auth0, no Firebase).

**Stack:** React 19 + Vite · Node.js + Express · PostgreSQL + Prisma 6 · Redis (Upstash) · TypeScript end-to-end

---

## Security Architecture

| Layer | Implementation |
|---|---|
| Password hashing | Argon2id — memoryCost 64MB, timeCost 3, parallelism 4 |
| Session tokens | 128-char opaque hex, stored as SHA-256 hash in DB |
| CSRF protection | Double-submit cookie pattern (`X-CSRF-Token` header) |
| Rate limiting | Redis-backed — 5 attempts / 15 min per IP+email |
| Account lockout | 15-minute lockout after 5 consecutive failures |
| Fingerprinting | Risk-based IP /24 subnet + User-Agent — suspicious = log, critical = terminate |
| Session lifecycle | 7-day absolute · 24-hour idle · rotation on login & role change |
| Cookie flags | `HttpOnly` · `Secure` (prod) · `SameSite=lax` · `__Host-` prefix (prod) |
| Security headers | Helmet — HSTS, CSP, X-Frame-Options, noSniff |
| Input validation | Zod on every route — unknown fields stripped |
| Audit logging | Every critical event logged with userId, IP, UA, timestamp |
| Email enumeration | All auth routes return identical generic messages and timing |

---

## Project Structure

```
securedsignuplogin/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # DB schema — users, sessions, audit_logs, tokens
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts             # Zod-validated environment variables
│   │   │   ├── logger.ts          # Winston structured logger
│   │   │   └── redis.ts           # Upstash Redis client
│   │   ├── controllers/
│   │   │   └── authController.ts  # signup, login, logout, verify-email, password-reset, updateUserRole
│   │   ├── db/
│   │   │   └── client.ts          # Prisma client with connection pooling
│   │   ├── middleware/
│   │   │   ├── csrfProtection.ts  # Double-submit CSRF validation
│   │   │   ├── rateLimiter.ts     # Redis-backed rate limiters
│   │   │   ├── requireAuth.ts     # Session token validation + fingerprint check
│   │   │   ├── requireRole.ts     # RBAC role guard
│   │   │   └── validateBody.ts    # Zod request body middleware
│   │   ├── routes/
│   │   │   └── authRoutes.ts      # All auth + admin routes
│   │   ├── services/
│   │   │   ├── auditLog.ts        # Audit log writer
│   │   │   └── email.ts           # Nodemailer SMTP — verification + reset emails
│   │   ├── utils/
│   │   │   ├── crypto.ts          # Argon2id, token generation, SHA-256, CSRF token
│   │   │   ├── fingerprint.ts     # IP/UA extraction and risk scoring
│   │   │   ├── lockout.ts         # Account lockout logic
│   │   │   ├── session.ts         # Session CRUD, cookie helpers, sliding expiry
│   │   │   └── validation.ts      # Zod schemas for all inputs
│   │   └── server.ts              # Express app bootstrap
│   ├── .env                       # Development environment (gitignored)
│   └── .env.production            # Production template (gitignored)
│
└── frontend/
    └── src/
        ├── api/
        │   └── client.ts          # Axios client — withCredentials, CSRF header injection
        ├── context/
        │   └── AuthContext.tsx    # Global auth state
        ├── pages/
        │   ├── SignupPage.tsx      # Live password strength indicator
        │   ├── LoginPage.tsx
        │   ├── VerifyEmailPage.tsx
        │   ├── PasswordResetPage.tsx
        │   └── DashboardPage.tsx
        └── App.tsx                # Route guards — public & protected routes
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register — sends verification email |
| `POST` | `/api/auth/login` | Public | Login — returns session cookie + CSRF token |
| `POST` | `/api/auth/logout` | Session + CSRF | Destroy session |
| `POST` | `/api/auth/verify-email` | Public | Consume single-use email token |
| `POST` | `/api/auth/password-reset/request` | Public | Send password reset email |
| `POST` | `/api/auth/password-reset/confirm` | Public | Reset password, invalidate all sessions |
| `GET` | `/api/auth/me` | Session | Return current user |
| `PATCH` | `/api/auth/users/:userId/role` | Session + CSRF + ADMIN | Change role, rotate sessions |
| `GET` | `/health` | Public | Health check (GET + HEAD) |

---

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ (for Prisma 6, Node 18.18+ works; Prisma 7 requires 20.19+)
- PostgreSQL 14+
- An Upstash Redis instance (optional in dev — falls back to in-memory)
- An SMTP account (Gmail App Password, Mailtrap, Resend, etc.)

---

### 1. Clone & install

```bash
git clone <repo-url>
cd securedsignuplogin

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### 2. Configure environment

Copy the example and fill in your values:

```bash
cd backend
cp .env.example .env
```

**.env fields:**

```env
NODE_ENV=development
PORT=4000

ALLOWED_ORIGINS=http://localhost:5173

DATABASE_URL=postgresql://user:password@localhost:5432/secureauth

# Optional in dev — falls back to in-memory rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
COOKIE_SECRET=<64-byte-hex>

SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=<mailtrap-user>
SMTP_PASS=<mailtrap-pass>
SMTP_FROM=no-reply@secureauth.com
APP_URL=http://localhost:5173
```

> **Dev tip:** In development, verification and reset links are printed to the backend console instead of sent over SMTP — you don't need a real SMTP account to test locally.

---

### 3. Set up the database

```bash
cd backend

# Apply schema to your database
npx prisma db push

# Or run migrations (recommended for production)
npx prisma migrate dev --name init

# Regenerate the Prisma client after schema changes
npx prisma generate
```

---

### 4. Run in development

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

---

### 5. Build for production

```bash
# Backend
cd backend
npm run build
NODE_ENV=production node dist/server.js

# Frontend
cd frontend
npm run build        # outputs to dist/
npm run preview      # preview the production build locally
```

Set `backend/.env.production` values before deploying. In production:
- Redis is **required** for distributed rate limiting
- `COOKIE_SECRET` must be a strong 64-byte random hex value
- `DATABASE_URL` should include `sslmode=require`
- All cookies automatically get `Secure=true` and the `__Host-` prefix

---

## Roles

| Role | Permissions |
|---|---|
| `USER` | Default — access own resources |
| `MODERATOR` | Extended access |
| `ADMIN` | Can change other users' roles via `PATCH /api/auth/users/:userId/role` |

Role changes immediately invalidate all active sessions of the target user, forcing re-authentication with the new privilege level.

---

## Rate Limits

| Route | Limit | Key |
|---|---|---|
| All routes | 100 req / min | Per IP |
| `/signup`, `/login` | 5 failed req / 15 min | Per IP + email |
| `/password-reset/request` | 3 failed req / 15 min | Per IP + email |

Successful requests do not count against auth limits. In production, limits are enforced consistently across multiple servers via Redis.

---

## Email Flows

**Verification:**
1. Signup → single-use token (15 min) emailed to user
2. If the token expires, signing up again with the same email resends a fresh token
3. Account cannot log in until email is verified

**Password Reset:**
1. Request reset → single-use token (15 min) emailed
2. Token consumed on use — all existing sessions are invalidated after reset

---

## Testing the API

A Postman collection is included at the project root:

```
SecureAuth.postman_collection.json
```

Import it into Postman to test all endpoints with pre-configured request bodies and headers.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | Express server port (default 4000) |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS whitelist |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `COOKIE_SECRET` | Yes | Secret for signed cookies (64-byte hex) |
| `UPSTASH_REDIS_REST_URL` | Prod only | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Prod only | Upstash Redis REST token |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP port (587 for TLS) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password / app password |
| `SMTP_FROM` | Yes | From address for outgoing emails |
| `APP_URL` | Yes | Frontend URL (used in email links) |
