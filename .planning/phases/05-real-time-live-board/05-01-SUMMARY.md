---
phase: "05-real-time-live-board"
plan: "01"
subsystem: "realtime"
status: "complete"
tags: ["supabase", "realtime", "test-infrastructure", "wave-0"]
dependency_graph:
  requires: []
  provides:
    - "src/lib/supabase-browser.ts (Supabase singleton client)"
    - "src/test/mocks/supabase.ts (reusable Supabase vi.mock)"
    - "Wave 0 stub test files for BOARD-01, BOARD-02, BOARD-04, BOARD-05, V4 access control"
    - "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set locally and on Vercel"
    - "pair and pair_member tables on supabase_realtime publication"
  affects:
    - "All Phase 5 plans (supabase-browser.ts consumed by LiveBoard.tsx in 05-02)"
    - "Test infrastructure consumed by 05-02 (LiveBoard tests) and 05-03 (route tests)"
tech_stack:
  added:
    - "@supabase/supabase-js ^2.108.2"
  patterns:
    - "Singleton named-export client (mirrors auth-client.ts)"
    - "Capturable subscribe callback mock pattern for Supabase Realtime tests"
    - "it.todo Wave 0 stub pattern for components not yet created"
key_files:
  created:
    - "src/lib/supabase-browser.ts"
    - "src/test/mocks/supabase.ts"
    - "src/app/(protected)/pools/[poolId]/components/LiveBoard.test.tsx"
    - "src/app/(protected)/pools/[poolId]/components/ConnectionBanner.test.tsx"
    - "src/app/api/sessions/[sessionId]/pairs/route.test.ts"
  modified:
    - "package.json (added @supabase/supabase-js)"
    - "package-lock.json"
decisions:
  - "Used createClient from @supabase/supabase-js (not createBrowserClient from @supabase/ssr) — project uses Better Auth, not Supabase Auth"
  - "Stub test files use it.todo only — no component imports — to stay green until components are created in 05-02/05-03"
  - "Pre-existing test failures (5 in admin+pools files, DB ECONNREFUSED) documented as out-of-scope — not caused by this plan"
metrics:
  completed_date: "2026-06-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 2
---

# Phase 05 Plan 01: Supabase Foundation & Wave 0 Test Scaffolding Summary

**One-liner:** Installed @supabase/supabase-js, created the singleton browser client, scaffolded Wave 0 test stubs (mock + 3 it.todo files), and completed manual Supabase setup (env vars + dual-table publication).

**Status: COMPLETE — All 3 tasks done.**

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install @supabase/supabase-js and create singleton browser client | `9edab06` | `src/lib/supabase-browser.ts`, `package.json`, `package-lock.json` |
| 2 | Scaffold Wave 0 test infrastructure (Supabase mock + 3 stub test files) | `e732a47` | `src/test/mocks/supabase.ts`, `LiveBoard.test.tsx`, `ConnectionBanner.test.tsx`, `route.test.ts` |
| 3 | Complete manual Supabase setup (env vars + dual-table publication) | human-action | `.env.local`, Vercel env vars, supabase_realtime publication |

---

## Task 3 — Human Action Confirmed

Task 3 was a `checkpoint:human-action` gate completed by the user on 2026-06-28. The user confirmed:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local` (local development).
- Both variables are also set on Vercel (Production + Preview + Development environments).
- Both `pair` and `pair_member` tables are members of the `supabase_realtime` publication (verified via `select tablename from pg_publication_tables where pubname='supabase_realtime';`).

This enables Postgres Realtime change events for both tables, which is required for the subscription in LiveBoard.tsx (Plan 05-02) to receive pair and pair_member updates.

---

## Verification Results

### Task 1
- `package.json` contains `@supabase/supabase-js: ^2.108.2` — PASS
- `src/lib/supabase-browser.ts` exports `export const supabase` — PASS
- Imports `createClient` from `@supabase/supabase-js` — PASS
- References `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — PASS
- Does NOT import from `@supabase/ssr` — PASS

### Task 2
- `src/test/mocks/supabase.ts` references `@/lib/supabase-browser` and `removeChannel` — PASS
- `LiveBoard.test.tsx` contains describe labels `BOARD-01`, `BOARD-02`, `BOARD-05` — PASS
- `ConnectionBanner.test.tsx` contains describe label `BOARD-04` — PASS
- `route.test.ts` contains `Route Handler V4 access control` — PASS
- None of the stub files import `./LiveBoard`, `./ConnectionBanner`, or `../pairs/route` — PASS
- Running stub files in isolation: `3 skipped (9 todo)`, exit 0 — PASS

### Task 3
- `NEXT_PUBLIC_SUPABASE_URL` set in `.env.local` and Vercel — CONFIRMED by user
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in `.env.local` and Vercel — CONFIRMED by user
- `pair` table on `supabase_realtime` publication — CONFIRMED by user
- `pair_member` table on `supabase_realtime` publication — CONFIRMED by user

---

## Deviations from Plan

### Pre-existing Test Failures (Out of Scope)

The full `npm test` suite shows 5 pre-existing failing test files in the admin section (`admin/campers/actions.test.ts`, `admin/pools/actions.test.ts`, `admin/users/actions.test.ts`, `admin/users/page.test.tsx`, `pools/page.test.tsx`) with `ECONNREFUSED` on port 5432 (PostgreSQL not running locally) and rendering errors. These failures were identical before and after Task 2's changes. They are out of scope per the deviation rule scope boundary — only issues directly caused by this plan's changes qualify for auto-fix.

The 3 new stub files (Task 2) exit clean as `3 skipped / 9 todo` when run in isolation.

---

## Known Stubs

All stub test files are intentional Wave 0 scaffolding:

| File | Stub Type | Resolved In |
|------|-----------|-------------|
| `LiveBoard.test.tsx` | `it.todo` for BOARD-01, BOARD-02, BOARD-05 | Plan 05-02 (LiveBoard component) |
| `ConnectionBanner.test.tsx` | `it.todo` for BOARD-04 | Plan 05-02 (ConnectionBanner component) |
| `route.test.ts` | `it.todo` for V4 access control | Plan 05-03 (Route Handler) |

These stubs are intentional — components don't exist yet. Importing them would break the suite.

---

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced in this plan. `supabase-browser.ts` establishes a client singleton but does not itself open a WebSocket — the channel/subscription is opened in LiveBoard.tsx (Plan 05-02). The anon key exposure is documented in the plan's threat register as `T-05-03 (accept)`.

---

## Self-Check

Checking commits:
- FOUND: `9edab06` (Task 1 — install + browser client)
- FOUND: `e732a47` (Task 2 — Wave 0 test scaffolding)
- Task 3 human-action confirmed by user on 2026-06-28

## Self-Check: PASSED
