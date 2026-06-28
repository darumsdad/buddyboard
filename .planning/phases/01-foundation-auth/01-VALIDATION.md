---
phase: 1
slug: foundation-auth
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` — installed in Wave 1 (Plan 01 Task 1) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds (unit tests only; no E2E in Phase 1) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| scaffold-T1 | 01-01-scaffold | 1 | AUTH-01, AUTH-02 | T-01-SC | Packages from legitimacy-audited list only; .env.local gitignored | lint | `npm run lint` | ❌ W0 | ⬜ pending |
| scaffold-T2 | 01-01-scaffold | 1 | AUTH-01, AUTH-02 | T-01-01, T-01-02, T-01-03 | prepare:false present; BETTER_AUTH_SECRET documented; schema generated via CLI not by hand | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| db-T1 | 01-02-db | 2 | AUTH-01, AUTH-02 | T-02-01 | .env.local not in git; DATABASE_URL_DIRECT never committed | manual | See Manual-Only section | manual | ⬜ pending |
| db-T2 | 01-02-db | 2 | AUTH-01, AUTH-02 | T-02-03, T-02-04 | Seed password documented as temporary; migration against correct DB | manual | See Manual-Only section | manual | ⬜ pending |
| ui-T1 | 01-03-ui | 2 | AUTH-01 | T-03-01, T-03-02 | HTTP-only cookie; generic error message hardcoded; dontRemember never passed | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| ui-T2 | 01-03-ui | 2 | AUTH-01, AUTH-02 | T-03-03, T-03-05, T-03-06 | Middleware excludes api/auth; no dontRemember; pools validates via auth.api.getSession() | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| deploy-T1 | 01-04-deploy | 3 | AUTH-01, AUTH-02 | T-04-01, T-04-03 | BETTER_AUTH_URL matches exact Vercel domain; no secrets in git | manual | See Manual-Only section | manual | ⬜ pending |
| deploy-T2 | 01-04-deploy | 3 | AUTH-01, AUTH-02 | T-04-01 | All 4 ROADMAP success criteria verified on live URL | manual | See Manual-Only section | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest config for Next.js (jsdom, globals, @vitejs/plugin-react) — created in scaffold-T1
- [ ] `src/test/setup.ts` — imports `@testing-library/jest-dom` — created in scaffold-T1
- [ ] `src/app/(auth)/login/login.test.tsx` — login form render tests (covers AUTH-01 render path) — created in ui-T1
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom` — run in scaffold-T1

All Wave 0 infrastructure is created within Phase 1 Plan 01 (scaffold-T1 and ui-T1). No pre-existing test infrastructure exists.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase tables created | AUTH-01 | Requires live Supabase DB — no local DB in Phase 1 | Open Supabase dashboard → Table Editor; confirm user, session, account, verification tables exist in public schema |
| Admin user seeded with username | AUTH-01 | Requires live DB; seed is a one-time operation | Open Supabase dashboard → Table Editor → user table; confirm 1 row exists with username = "admin" |
| .env.local not in git | AUTH-01, AUTH-02 | Git status check — no automated test for gitignore behavior at runtime | Run `git status` before any commit; confirm .env.local does not appear |
| BETTER_AUTH_URL matches Vercel domain | AUTH-01, AUTH-02 | Requires Vercel account to exist; no API to query during plan | In Vercel dashboard, compare BETTER_AUTH_URL value against the actual production deployment URL |
| Session persists after browser close (AUTH-02) | AUTH-02 | Requires real browser + live Vercel URL; no automated browser restart test in Phase 1 | Close all browser windows, reopen, navigate to /pools on Vercel URL; confirm session is active without re-login |
| Unauthenticated /pools redirects to /login | AUTH-01 | Best verified on live URL end-to-end | Open incognito window, navigate to https://[vercel-url]/pools; confirm redirect to /login |

---

## Validation Sign-Off

- [x] All auto tasks have `<automated>` verify (scaffold-T1: `npm run lint`, scaffold-T2: `npx tsc --noEmit`, ui-T1: `npx vitest run`, ui-T2: `npx tsc --noEmit`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (scaffold-T1 and scaffold-T2 both have automated verify; ui-T1 and ui-T2 both have automated verify)
- [x] Wave 0 covers all MISSING references (vitest.config.ts, src/test/setup.ts, login.test.tsx all created in Plan 01 Wave 1)
- [x] No watch-mode flags (all verify commands use `npx vitest run` not `npx vitest`)
- [x] Feedback latency < 10s (unit tests only — no integration tests in Phase 1)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
