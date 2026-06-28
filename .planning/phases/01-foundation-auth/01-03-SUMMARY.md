---
phase: 01-foundation-auth
plan: "03"
subsystem: ui-auth
tags: [next.js, better-auth, react, tailwind, vitest, middleware, tdd]
dependency_graph:
  requires:
    - next.js-16-project-scaffold
    - better-auth-server-instance
    - better-auth-client-instance
  provides:
    - login-page-ui
    - pools-placeholder-page
    - auth-middleware
    - root-redirect
  affects:
    - route-protection
    - counselor-auth-flow
tech_stack:
  added: []
  patterns:
    - TDD with vitest + testing-library (RED/GREEN on login page)
    - Dual-layer auth (middleware getSessionCookie + server component auth.api.getSession)
    - Tailwind CSS utility classes for iPad-first layout (min-h-[44px] touch targets)
    - "use client" login form with useRouter redirect on success
    - Server component async redirect via next/navigation
key_files:
  created:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/login/login.test.tsx
    - src/app/(protected)/pools/page.tsx
    - src/middleware.ts
  modified:
    - src/app/page.tsx
    - vitest.config.ts
decisions:
  - Generic error message hardcoded as literal string (D-10, T-03-02 — never displays server error detail)
  - Sessions always persist — no dontRemember:true anywhere (D-07, T-03-06)
  - Dual-layer auth protection: middleware for fast redirect, server component for DB-validated session (T-03-03)
  - Error paragraph uses conditional render (not CSS hidden) so role=alert is absent on initial load
metrics:
  duration_minutes: 12
  completed_date: "2026-06-28"
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 01 Plan 03: UI Summary

**One-liner:** Login page (TDD, 6 passing tests), pools placeholder with server-side session guard, and middleware cookie check — completing the full auth UI layer for the walking skeleton.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Login page with failing test first (TDD RED/GREEN) | eab2dfb | src/app/(auth)/login/login.test.tsx, src/app/(auth)/login/page.tsx, vitest.config.ts |
| 2 | Pool selection placeholder, root redirect, and middleware | 7f45f77 | src/app/(protected)/pools/page.tsx, src/app/page.tsx, src/middleware.ts |

## Verification Results

- `npx vitest run` — exit 0 (6/6 tests pass: heading, username input, password input, submit button, no initial error, error on failed login)
- `npx tsc --noEmit` — exit 0 (zero TypeScript errors)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @/* path alias to vitest.config.ts**
- **Found during:** Task 1 (pre-emptive fix before RED phase)
- **Issue:** vitest.config.ts lacked a `resolve.alias` for `@/*`. Without it, the compiled page.tsx (which imports `@/lib/auth-client`) would fail to resolve in the test environment even though the mock intercepts the module. The tsconfig `paths` are not automatically read by Vite/Vitest.
- **Fix:** Added `resolve.alias: { "@": path.resolve(__dirname, "./src") }` using `fileURLToPath` for ESM-safe `__dirname` computation.
- **Files modified:** vitest.config.ts
- **Commit:** eab2dfb

## TDD Gate Compliance

- RED gate commit (`login.test.tsx` with 6 failing tests): eab2dfb — PASSED (test run failed with "Failed to resolve import './page'")
- GREEN gate commit (`page.tsx` implementation): eab2dfb (same commit — RED/GREEN combined per plan instruction to commit after both phases) — PASSED (6/6 tests pass)

## Known Stubs

- `src/app/(protected)/pools/page.tsx` — Three pool buttons ("Main Pool", "Lap Pool", "Kiddie Pool") have no `onClick` handlers and navigate nowhere. Intentional per plan: these are Phase 1 placeholders proving auth routing works. Phase 4 will replace this page with real session-start logic.

## Threat Flags

No new threat surface beyond what is documented in the plan's `<threat_model>`:
- T-03-01: HTTP-only cookie set by Better Auth server response (login form never touches document.cookie)
- T-03-02: Error message is `"Invalid username or password"` string literal — the signInError object is never displayed
- T-03-03: Dual-layer auth implemented — middleware (getSessionCookie) + server component (auth.api.getSession)
- T-03-05: Middleware matcher explicitly excludes `login`, `api/auth`, `_next/static`, `_next/image`, `favicon.ico`
- T-03-06: No `dontRemember: true` anywhere in login page

## Self-Check: PASSED

Files verified:
- src/app/(auth)/login/page.tsx: FOUND
- src/app/(auth)/login/login.test.tsx: FOUND
- src/app/(protected)/pools/page.tsx: FOUND
- src/middleware.ts: FOUND
- src/app/page.tsx: FOUND (modified)
- vitest.config.ts: FOUND (modified)

Commits verified:
- eab2dfb (Task 1 — login page + tests + vitest alias fix): FOUND
- 7f45f77 (Task 2 — pools, root redirect, middleware): FOUND
