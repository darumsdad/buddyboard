---
phase: 05-real-time-live-board
plan: 05
subsystem: realtime-client
tags: [realtime, supabase, client-component, websocket, subscription]
depends_on:
  requires: [05-01, 05-03, 05-04]
  provides: [LiveBoard component, Realtime subscription owner, live pair state]
  affects: [pools/[poolId]/page.tsx]
tech_stack:
  added: [supabase-browser singleton, ConnectionBanner component]
  patterns: [dual-table postgres_changes subscription, 150ms debounce, removeChannel cleanup, SSR hydration from initialPairs]
key_files:
  created:
    - src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx
    - src/app/(protected)/pools/[poolId]/components/LiveBoard.test.tsx
    - src/lib/supabase-browser.ts
    - src/test/mocks/supabase.ts
    - src/app/(protected)/pools/[poolId]/components/ConnectionBanner.tsx
  modified: []
decisions:
  - removeChannel used instead of channel.unsubscribe() to prevent TooManyChannels under React Strict Mode
  - 150ms debounce absorbs trio INSERT burst (3 pair_member rows) into one Route Handler refetch
  - pair DELETE subscription has no session_id filter because pair table has no session_id column; refetch is session-scoped
  - initialPairs used as useState init so SSR snapshot is rendered immediately with no loading gap
metrics:
  duration_seconds: 319
  completed_date: "2026-06-28"
  tasks_completed: 2
  files_changed: 5
---

# Phase 05 Plan 05: LiveBoard Realtime Subscription Summary

**One-liner:** `"use client"` LiveBoard owns dual-table Supabase postgres_changes channel, 150ms debounced Route Handler refetch, removeChannel cleanup, and SSR-hydrated pair state driving derived counts + ConnectionBanner status.

## What Was Built

`LiveBoard.tsx` — the reactive heart of the phase. It hydrates instantly from the server-provided `initialPairs` snapshot (no loading gap on first paint), then subscribes to a single Supabase Realtime channel named `session:${sessionId}:pairs` that listens for:

- `pair_member INSERT` filtered by `session_id=eq.${sessionId}` — fires when a new pair is checked in
- `pair DELETE` (no filter) — fires when a pair is removed; the pair_member cascade deletion does NOT emit its own events (Critical Finding #1 from RESEARCH.md)

On every event, a 150ms debounced callback fires `refreshPairs` (a `useCallback` that fetches `/api/sessions/${sessionId}/pairs` and calls `setPairs(data.pairs)`). The debounce collapses trio-INSERT bursts into one fetch. The subscribe status callback maps `SUBSCRIBED` → connected and `CHANNEL_ERROR / TIMED_OUT / CLOSED` → disconnected. Cleanup uses `supabase.removeChannel(channel)` to avoid TooManyChannels leaks under React Strict Mode.

Derived counts (`swimmerCount = pairs.reduce(...)`, `pairCount = pairs.length`) are passed to `SessionBoard`. Connection status drives `ConnectionBanner` (hidden when connected, amber for reconnecting, red for disconnected with a Refresh button).

### Prerequisite files created (Rule 3 — plan 05-01/04 not yet merged to worktree)

Since plans 05-01, 05-03, and 05-04 run in parallel worktrees and their commits were not yet merged into this agent's worktree branch, three prerequisite files were created here as Rule 3 blocking-issue fixes:

1. `src/lib/supabase-browser.ts` — supabase-js singleton (from 05-01 pattern)
2. `src/test/mocks/supabase.ts` — mock factory for unit tests (from 05-01 pattern)
3. `src/app/(protected)/pools/[poolId]/components/ConnectionBanner.tsx` — connection status banner (from 05-04 pattern)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prerequisite files missing from worktree**

- **Found during:** Task 1 setup
- **Issue:** Plans 05-01 and 05-04 run in parallel worktrees; their output (supabase-browser.ts, test mock, ConnectionBanner.tsx) was not in this agent's branch
- **Fix:** Created the three prerequisite files using the exact patterns documented in PATTERNS.md before implementing LiveBoard
- **Files modified:** `src/lib/supabase-browser.ts`, `src/test/mocks/supabase.ts`, `src/app/(protected)/pools/[poolId]/components/ConnectionBanner.tsx`
- **Commit:** 7a71a92 (bundled with Task 1)

**2. [Rule 1 - Bug] Comment contained `.unsubscribe()` substring**

- **Found during:** Task 1 verify (automated string check)
- **Issue:** Comment `// NOT channel.unsubscribe()` contained the literal `.unsubscribe()` which the grep gate catches
- **Fix:** Reworded comment to avoid the literal substring while preserving meaning
- **Files modified:** `LiveBoard.tsx`

## Pre-existing Test Failures (Out of Scope)

19 tests in 5 pre-existing test files fail due to `ECONNREFUSED 127.0.0.1:5432` — PostgreSQL is not running in the worktree environment. These failures exist on the base commit before any work in this plan and are entirely unrelated to the LiveBoard implementation:

- `src/app/(admin)/admin/users/actions.test.ts` (1 failure)
- `src/app/(admin)/admin/pools/actions.test.ts` (1 failure)
- `src/app/(admin)/admin/campers/actions.test.ts` (8 failures)
- `src/app/(admin)/admin/users/page.test.tsx` (7 failures)
- `src/app/(protected)/pools/page.test.tsx` (2 failures)

These are out of scope per the SCOPE BOUNDARY rule. The LiveBoard tests (3 of 3) are fully green.

## Threat Surface Scan

No new network endpoints or auth paths were added beyond what's in the plan's threat model. LiveBoard makes client-side calls to `/api/sessions/${sessionId}/pairs` (already covered by T-05-02 in the plan's threat register — sessionId comes from server-provided props, Route Handler re-validates auth). T-05-08 mitigations (removeChannel, 150ms debounce) are both implemented.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/lib/supabase-browser.ts` exists | FOUND |
| `src/test/mocks/supabase.ts` exists | FOUND |
| `src/app/(protected)/pools/[poolId]/components/ConnectionBanner.tsx` exists | FOUND |
| `src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx` exists | FOUND |
| `src/app/(protected)/pools/[poolId]/components/LiveBoard.test.tsx` exists | FOUND |
| `.planning/phases/05-real-time-live-board/05-05-SUMMARY.md` exists | FOUND |
| commit 7a71a92 exists | FOUND |
| commit ab356f0 exists | FOUND |
