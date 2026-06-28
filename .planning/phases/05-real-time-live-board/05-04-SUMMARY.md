---
phase: "05-real-time-live-board"
plan: "04"
subsystem: "ui-components"
tags: ["connection-banner", "pair-skeleton", "session-board", "pair-list", "tdd", "wave-2"]
dependency_graph:
  requires:
    - "05-01 (supabase foundation)"
    - "05-02 (onSuccess/onRemoved callback seams)"
  provides:
    - "ConnectionBanner (BOARD-04) — connected/reconnecting/disconnected states"
    - "PairSkeleton — 3-row loading placeholder matching PairRow dimensions"
    - "SessionBoard — fully presentational, accepts onPairMutated + isRefreshing"
    - "PairList — renders PairSkeleton (isRefreshing) or empty state or pair rows"
  affects:
    - "05-05 (LiveBoard drives onPairMutated and isRefreshing into SessionBoard)"
tech_stack:
  added: []
  patterns:
    - "TDD red-green: failing test then implementation (ConnectionBanner)"
    - "role=status on sticky banners (screen-reader live region)"
    - "Optional-with-default props for forward-compatible prop threading"
key_files:
  created:
    - "src/app/(protected)/pools/[poolId]/components/ConnectionBanner.tsx"
    - "src/app/(protected)/pools/[poolId]/components/PairSkeleton.tsx"
  modified:
    - "src/app/(protected)/pools/[poolId]/components/ConnectionBanner.test.tsx"
    - "src/app/(protected)/pools/[poolId]/components/SessionBoard.tsx"
    - "src/app/(protected)/pools/[poolId]/components/PairList.tsx"
decisions:
  - "ConnectionBanner returns null (not hidden div) for connected status — eliminates layout shift per D-08"
  - "SessionBoard new props made optional with defaults so page.tsx continues to compile until LiveBoard wraps it in Plan 05-05"
  - "Used fireEvent from @testing-library/react instead of userEvent — @testing-library/user-event is not installed in project"
metrics:
  duration: ~5min
  completed_date: "2026-06-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 3
---

# Phase 05 Plan 04: ConnectionBanner, PairSkeleton, and Prop Threading Summary

**One-liner:** Created ConnectionBanner (BOARD-04) with three connection states and TDD tests, PairSkeleton with 3 animated placeholder rows, and threaded onPairMutated/isRefreshing through SessionBoard and PairList for LiveBoard wiring in Plan 05-05.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ConnectionBanner + tests (TDD) | `c73dc77` | ConnectionBanner.tsx, ConnectionBanner.test.tsx |
| 2 | Create PairSkeleton | `a8c743d` | PairSkeleton.tsx |
| 3 | Thread live props through SessionBoard and PairList | `5d18b74` | SessionBoard.tsx, PairList.tsx |

## What Was Built

**Task 1 — ConnectionBanner (TDD RED + GREEN):**
- RED: Replaced 3 `it.todo` stubs with real tests importing `ConnectionBanner`; tests failed (component not found)
- GREEN: Implemented `ConnectionBanner.tsx` as a `"use client"` component
- `status="connected"` → returns `null` (no DOM, no layout shift per D-08)
- `status="reconnecting"` → `bg-slate-100` sticky banner with `Loader2 animate-spin` and `Reconnecting…` text; no Refresh button
- `status="disconnected"` → `bg-amber-50` sticky banner with `Disconnected — data may be stale.` and a `button[aria-label="Refresh pair list"]` that calls `onRefresh`
- Both non-null states: `sticky top-[57px] z-9 role="status"` per UI-SPEC Component Inventory #2

**Task 2 — PairSkeleton:**
- Pure presentational component (no `"use client"`)
- `animate-pulse divide-y divide-slate-200` wrapper with exactly 3 rows
- Each row: `flex items-center justify-between px-4 py-3 aria-hidden="true"` with `h-4 bg-slate-200 rounded-md w-3/5` bar and `w-10 h-10 bg-slate-200 rounded-full` circle
- Mirrors PairRow row padding and button dimensions per UI-SPEC #3

**Task 3 — Prop threading:**
- `SessionBoard`: Added `onPairMutated?: () => void` and `isRefreshing?: boolean` (optional with defaults); passes `onSuccess={onPairMutated}` to `AddPairForm` and `onPairRemoved={onPairMutated}` + `isRefreshing` to `PairList`; no `"use client"` directive
- `PairList`: Added `onPairRemoved: () => void` and `isRefreshing: boolean`; renders `<PairSkeleton />` when `isRefreshing` (State C), empty state when empty (State A), or mapped `PairRow` list with `onRemoved={onPairRemoved}` per row

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Props optional with defaults to avoid TypeScript error in page.tsx**
- **Found during:** Task 3 — `npx tsc --noEmit` reported `SessionBoardProps` missing `onPairMutated` and `isRefreshing` at `page.tsx:154`
- **Issue:** `page.tsx` calls `<SessionBoard>` directly without the new props. This is correct — LiveBoard will wrap SessionBoard in Plan 05-05, but until then, page.tsx is the consumer.
- **Fix:** Made `onPairMutated` and `isRefreshing` optional (`?`) with default values (`() => {}` and `false` respectively). Added JSDoc comments indicating they will be wired by LiveBoard in Plan 05-05.
- **Files modified:** `SessionBoard.tsx`
- **Commit:** `5d18b74`

**2. [Rule 3 - Blocking] Used fireEvent instead of userEvent for Refresh button click test**
- **Found during:** Task 1 GREEN phase — `@testing-library/user-event` not installed
- **Issue:** Test file initially imported `userEvent` but only `@testing-library/react` (with `fireEvent`) is installed
- **Fix:** Replaced `userEvent.click` with `fireEvent.click` to match project's existing test pattern (PairRow.test.tsx, AddPairForm.test.tsx)
- **Files modified:** `ConnectionBanner.test.tsx`
- **Commit:** `c73dc77`

## Known Stubs

None. All behaviors fully implemented and wired. The `onPairMutated` optional default is intentional forward-compatibility scaffolding, not a stub — PairList correctly shows skeleton and threads callbacks.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. All three components are pure client-side presentational — no new data crosses a trust boundary per plan threat model (T-05-06, T-05-07 both accepted).

## Self-Check

Checking created files exist:
- FOUND: `src/app/(protected)/pools/[poolId]/components/ConnectionBanner.tsx`
- FOUND: `src/app/(protected)/pools/[poolId]/components/PairSkeleton.tsx`

Checking modified files:
- FOUND: `src/app/(protected)/pools/[poolId]/components/ConnectionBanner.test.tsx`
- FOUND: `src/app/(protected)/pools/[poolId]/components/SessionBoard.tsx`
- FOUND: `src/app/(protected)/pools/[poolId]/components/PairList.tsx`

Checking commits:
- FOUND: `c73dc77` (Task 1 — ConnectionBanner + tests)
- FOUND: `a8c743d` (Task 2 — PairSkeleton)
- FOUND: `5d18b74` (Task 3 — SessionBoard + PairList)

## Self-Check: PASSED
