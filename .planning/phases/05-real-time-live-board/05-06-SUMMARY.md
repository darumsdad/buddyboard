---
phase: 05-real-time-live-board
plan: 06
subsystem: session-page
status: partial — Task 2 (multi-device verification) pending human checkpoint
tags: [realtime, liveboard, page, ssr, count-removal]
depends_on:
  requires: [05-05]
  provides: [session page rendering LiveBoard with SSR snapshot]
  affects: [src/app/(protected)/pools/[poolId]/page.tsx]
tech_stack:
  added: []
  patterns: [SSR snapshot passed as initialPairs prop to LiveBoard client component]
key_files:
  created: []
  modified:
    - src/app/(protected)/pools/[poolId]/page.tsx
decisions:
  - Counts (swimmerCount, pairCount) removed from server — LiveBoard derives them client-side from live pair state (D-02)
  - getPairsForSession and the pairs SSR snapshot retained — LiveBoard needs initialPairs for zero-loading-gap first paint (D-11)
  - pair and sql drizzle-orm imports removed as no longer referenced after count query deletion
metrics:
  duration_seconds: 0
  completed_date: "2026-06-28"
  tasks_completed: 1
  files_changed: 1
requirements: [PAIR-05, BOARD-01]
---

# Phase 05 Plan 06: LiveBoard Page Wiring Summary (Partial)

**One-liner:** page.tsx now imports and renders LiveBoard with the SSR pair snapshot, removing the two redundant server-side count queries whose counts are now derived client-side.

**Status:** Task 1 complete and committed. Task 2 (multi-device real-time verification) is a blocking human checkpoint — execution paused awaiting approval.

## What Was Built

### Task 1 — Replace SessionBoard with LiveBoard in page.tsx (COMPLETE)

Modified `src/app/(protected)/pools/[poolId]/page.tsx`:

- **Import change:** `import { SessionBoard } from "./components/SessionBoard"` replaced with `import { LiveBoard } from "./components/LiveBoard"`
- **Removed imports:** `pair` from `@/db/schema` and `sql` from `drizzle-orm` — both were only referenced in the removed count queries
- **Removed Step 5 count block:** The `Promise.all` block that ran two separate `SELECT count(*)` queries (one against `pairMember`, one against `pair`) is gone. These counts are now derived client-side inside LiveBoard as `swimmerCount = pairs.reduce(...)` and `pairCount = pairs.length`
- **Kept:** `getPairsForSession(session.id)` and the resulting `pairs` assignment — LiveBoard's `initialPairs` prop enables SSR hydration with no loading gap
- **Render change:** `<SessionBoard poolName swimmerCount pairCount sessionId poolId pairs />` replaced with `<LiveBoard initialPairs={pairs} sessionId={session.id} poolId={poolId} poolName={poolRecord[0].name} />`
- `JoinSessionModal` conditional and surrounding fragment are unchanged
- Auth gate (`auth.api.getSession` + `redirect("/login")`) is unchanged (T-05-01 mitigation intact)

## Task 2 — Multi-Device Verification (PENDING HUMAN CHECKPOINT)

This task requires two live browser sessions and a real network disruption — it cannot be automated. See checkpoint details below.

## Deviations from Plan

None — Task 1 executed exactly as written. Pre-existing TypeScript errors in LiveBoard.tsx and admin camper test files were present on the base commit and are out of scope.

## Pre-existing TypeScript Errors (Out of Scope)

The following errors existed on the base commit before any changes in this plan and are entirely out of scope:

- `src/app/(admin)/admin/campers/actions.test.ts` — Buffer/BlobPart type incompatibility (2 errors)
- `src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx` — implicit `any` on `.subscribe()` callback params (2 errors, from plan 05-05)
- `src/lib/supabase-browser.ts` — `@supabase/supabase-js` module not found in worktree (1 error, from plan 05-05)

No errors in `page.tsx`.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes. The auth gate in page.tsx is unchanged (T-05-01). The `initialPairs` SSR snapshot passed to LiveBoard is the same auth-gated data previously rendered by SessionBoard (T-05-09 — accepted).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/app/(protected)/pools/[poolId]/page.tsx` renders `<LiveBoard` | FOUND |
| `page.tsx` no longer contains `<SessionBoard` | CONFIRMED |
| `page.tsx` no longer imports from `./components/SessionBoard` | CONFIRMED |
| `page.tsx` no longer contains `swimmerCount` / `pairCount` count queries | CONFIRMED |
| `getPairsForSession` and `pairs` SSR snapshot retained | CONFIRMED |
| commit f81999a exists | FOUND |
