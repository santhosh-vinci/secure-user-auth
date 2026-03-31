# Edge Cases — SecureAuth

> Comprehensive audit of unhandled edge cases across the full stack.
> Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## 1. Data Validation

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 1.1 | Whitespace-only email (`"   "`) passes Zod `.email()` before `.trim()` strips it to `""` | 🟠 High | `validation.ts` |
| 1.2 | No explicit length check on token before hashing (verify/reset endpoints) | 🟡 Medium | `authController.ts` |
| 1.3 | Extremely long User-Agent header (8KB+) stored in DB without truncation | 🟡 Medium | `fingerprint.ts` → `sessions` table |
| 1.4 | `metadata` field in audit logs stores raw JSON with no size limit | 🟢 Low | `auditLog.ts` |

---

## 2. User Account State

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 2.1 | Locked user can still request a password reset — token is created for a locked account | 🟠 High | `requestPasswordReset` |
| 2.2 | Multiple concurrent password reset tokens exist — old ones not invalidated on new request | 🔴 Critical | `requestPasswordReset` |
| 2.3 | Role change does not invalidate outstanding password reset tokens | 🟠 High | `updateUserRole` |
| 2.4 | No admin UI or endpoint to manually unlock a locked account | 🟠 High | Admin panel |
| 2.5 | Locked user re-signs up with same email — new unverified account created, still locked on login | 🟡 Medium | `signup` |
| 2.6 | User deleted directly from DB retains active sessions until expiry | 🟡 Medium | `requireAuth` middleware |

---

## 3. Session & Authentication

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 3.1 | Two simultaneous requests on same session token — race condition in sliding window update | 🟡 Medium | `getSessionByToken` |
| 3.2 | Deleted user's session remains valid — `requireAuth` does not check if user still exists in DB | 🟠 High | `requireAuth` |
| 3.3 | No limit on concurrent sessions per user (unlimited devices) | 🟢 Low | `createSession` |
| 3.4 | No indication to the user when their session silently expires mid-navigation | 🟠 High | Frontend — all protected pages |
| 3.5 | CSRF cookie `maxAge` is 7 days but idle session timeout is 24h — CSRF token outlives the session | 🟡 Medium | `authController.ts` → `setCsrfCookie` |
| 3.6 | CSRF token is never rotated after login — same token for entire session lifetime | 🟡 Medium | `authController.ts` |
| 3.7 | `getCsrfToken()` returns `""` if cookie is missing — empty string header sent, protection silently fails | 🔴 Critical | `frontend/api/client.ts` |

---

## 4. Network & Connectivity

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 4.1 | No request timeout — `fetch()` can hang indefinitely on slow network | 🟠 High | `frontend/api/client.ts` |
| 4.2 | API returns HTML error page (502 from reverse proxy) — `.json()` throws and is caught generically | 🟡 Medium | `frontend/api/client.ts` |
| 4.3 | Malformed `X-Forwarded-For` (e.g. `"invalid,127.0.0.1"`) records `"invalid"` as IP in audit log | 🟡 Medium | `fingerprint.ts` |
| 4.4 | Redis unavailable in production — silently falls back to in-memory, distributed consistency lost | 🟡 Medium | `rateLimiter.ts` |
| 4.5 | No health check for SMTP on startup — email failure only discovered on first send | 🟢 Low | `server.ts` |

---

## 5. Rate Limiting & Brute Force

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 5.1 | Empty/invalid email makes rate limit key `"ip:"` — all users on same IP share one bucket | 🟠 High | `rateLimiter.ts` |
| 5.2 | No rate limit on `POST /verify-email` — 64-char hex token endpoint can be brute forced | 🔴 Critical | `authRoutes.ts` |
| 5.3 | No rate limit on `GET /auth/me` | 🟢 Low | `authRoutes.ts` |
| 5.4 | No rate limit on `GET /admin/users` | 🟡 Medium | `authRoutes.ts` |
| 5.5 | Account lockout is per-user only — attacker rotating IPs attacks the same account freely | 🟡 Medium | `lockout.ts` |
| 5.6 | Five concurrent failed logins arrive simultaneously — all read count before any write, lockout delayed | 🟡 Medium | `lockout.ts` |

---

## 6. Email Service

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 6.1 | SMTP failure is silent — user gets success response but never receives email, no way to retry | 🔴 Critical | `email.ts` |
| 6.2 | Verification/reset tokens are in URLs — exposed in browser history, email server logs, referrer headers | 🟠 High | `email.ts` |
| 6.3 | Email client auto-prefetches verification link — token consumed before user clicks it | 🟠 High | `verifyEmail` controller |
| 6.4 | No retry mechanism for failed email delivery | 🟡 Medium | `email.ts` |
| 6.5 | Rapid re-signup generates new token — user clicks old link from inbox, gets "invalid" error | 🟡 Medium | `signup` re-signup flow |

---

## 7. Fingerprinting & Device Detection

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 7.1 | IPv6 addresses never considered "same subnet" — every IPv6 user flagged as suspicious IP change | 🟠 High | `fingerprint.ts` |
| 7.2 | Both IP and UA are `"unknown"` — comparison succeeds as "ok" (undetected anomaly) | 🟡 Medium | `fingerprint.ts` |
| 7.3 | Attacker can spoof arbitrary `X-Forwarded-For` and `User-Agent` — no validation headers are legitimate | 🟡 Medium | `fingerprint.ts` |

---

## 8. Logic & Race Conditions

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 8.1 | Two simultaneous `POST /verify-email` with same token — both see `usedAt = null`, both succeed | 🟠 High | `verifyEmail` |
| 8.2 | Two simultaneous `POST /password-reset/confirm` — same race condition as above | 🟠 High | `resetPassword` |
| 8.3 | Password rehash failure after successful login — user authenticated but new hash not saved | 🟡 Medium | `login` |
| 8.4 | `constantTimeDelay()` varies ±200ms — not truly constant, DB-hit vs miss timing still leaks | 🟡 Medium | `authController.ts` |
| 8.5 | Form submitted while component unmounts (navigate away mid-request) — `setState` on unmounted component | 🟡 Medium | All form pages |
| 8.6 | Two tabs open — logout in one tab does not invalidate auth context in the other | 🟡 Medium | `AuthContext.tsx` |

---

## 9. UI & User Experience

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 9.1 | No password confirmation field on signup or password reset — typo goes undetected | 🟠 High | `SignupPage`, `PasswordResetPage` |
| 9.2 | Button double-click sends two identical requests — no deduplication or disabled state during submission | 🟠 High | All form pages |
| 9.3 | No confirmation dialog before admin saves a role change — easy accidental click | 🟠 High | `AdminPage` |
| 9.4 | Session expiry gives no warning — user navigates, hits 401, sees generic error | 🟠 High | All protected pages |
| 9.5 | Loading spinner runs indefinitely if network hangs (no timeout) | 🟠 High | All form pages |
| 9.6 | No empty-state message in admin user table if zero users returned | 🟢 Low | `AdminPage` |
| 9.7 | No per-field blur validation — feedback only comes on submit | 🟢 Low | `LoginPage`, `SignupPage` |
| 9.8 | Password reset page doesn't validate token format client-side before posting | 🟢 Low | `PasswordResetPage` |

---

## 10. Database & Transactions

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 10.1 | No index on `createdAt` in `users` — `listUsers()` does full table scan on every admin request | 🟡 Medium | `schema.prisma` |
| 10.2 | Audit logs grow unbounded — no retention policy or archival | 🟡 Medium | `audit_logs` table |
| 10.3 | Prisma transaction 10s timeout — slow DB causes silent rollback with no clear user-visible error | 🟡 Medium | `db/client.ts` |
| 10.4 | User deleted mid-flight via DB tool while request is in progress — FK cascade may fail in-flight writes | 🟢 Low | Any DB write |

---

## 11. Admin Panel

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 11.1 | Backend returns full user list (including locked/unverified status) to MODERATOR — no field-level restriction | 🟡 Medium | `listUsers` |
| 11.2 | Admin changing own role — backend invalidates session but there is no friendly redirect | 🟡 Medium | `AdminPage` + `updateUserRole` |

---

## 12. CSRF Protection

| # | Edge Case | Severity | Location |
|---|---|---|---|
| 12.1 | `getCsrfToken()` returns `""` if cookie missing — empty header is sent, protection silently disabled | 🔴 Critical | `frontend/api/client.ts` |
| 12.2 | CSRF cookie uses `SameSite=lax` — top-level navigations from external sites carry it | 🟡 Medium | `authController.ts` |
| 12.3 | CSRF cookie `maxAge` is 7 days, session idle timeout is 24h — CSRF token outlives the session | 🟡 Medium | `setCsrfCookie` |

---

## Priority Fix List

### Fix Immediately — Critical
- [ ] **5.2** — Add rate limit to `POST /verify-email`
- [ ] **2.2** — Invalidate all old password reset tokens when a new one is requested
- [ ] **6.1** — Surface SMTP failure to user or provide a "resend verification email" option
- [ ] **12.1** — Reject state-mutating requests where `X-CSRF-Token` header is an empty string

### Fix Soon — High
- [ ] **3.2** — `requireAuth` should verify the user still exists in DB on each request
- [ ] **3.4** — Detect 401 responses on protected routes and redirect to login with a message
- [ ] **4.1** — Add `AbortController` with timeout to all frontend API fetch calls
- [ ] **7.1** — Handle IPv6 in subnet fingerprint comparison
- [ ] **8.1 / 8.2** — Use DB-level atomic operation to prevent double token use (e.g. `updateMany` with `WHERE usedAt IS NULL`)
- [ ] **9.1** — Add password confirmation field on signup and password reset
- [ ] **9.2** — Disable submit button for duration of request to prevent double-submit
- [ ] **9.3** — Add confirmation dialog before role change in admin panel
- [ ] **2.4** — Add "Unlock account" action in admin panel
- [ ] **6.3** — Add rate limit to verify-email; consider two-step confirmation (button click) instead of auto-verify on page load to defeat email prefetch

### Fix When Possible — Medium
- [ ] **2.1** — Check account lock status before creating password reset token
- [ ] **3.6** — Rotate CSRF token on sensitive operations
- [ ] **5.1** — Fallback rate limit key to `"ip:anonymous"` when email is empty
- [ ] **5.5** — Combine per-user and per-IP lockout strategies
- [ ] **8.4** — Use `useEffect` cleanup + `AbortController` to cancel requests on component unmount
- [ ] **8.6** — Poll or use `storage` events to sync logout across tabs
- [ ] **10.1** — Add `@@index([createdAt])` to `users` in schema
- [ ] **10.2** — Implement audit log retention (e.g. keep 90 days, archive older)
