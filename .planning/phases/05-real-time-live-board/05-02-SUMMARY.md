---
phase: 05-real-time-live-board
plan: 02
subsystem: pair-mutations
tags: [server-actions, callbacks, tdd, revalidatePath]
dependency_graph:
  requires: []
  provides: [callback-seams-for-liveboard]
  affects: [AddPairForm, PairRow, actions.ts]
tech_stack:
  added: []
  patterns: [client-callback-driven-refresh, tdd-red-green]
key_files:
  created:
    - src/app/(protected)/pools/[poolId]/components/AddPairForm.test.tsx
    - src/app/(protected)/pools/[poolId]/components/PairRow.test.tsx
  modified:
    - src/app/(protected)/pools/[poolId]/actions.ts
    - src/app/(protected)/pools/[poolId]/actions.test.ts
    - src/app/(protected)/pools/[poolId]/components/AddPairForm.tsx
    - src/app/(protected)/pools/[poolId]/components/PairRow.tsx
decisions:
  - "onSuccess/onRemoved made required (not optional) — PairList will receive these in Plan 05-04 when LiveBoard is wired"
metrics:
  duration: ~6min
  completed: "2026-06-28T20:45:43Z"
  tasks: 2
  files: 6
---

# Phase 5 Plan 02: Pair Mutation Callback Seams Summary

**One-liner:** Stripped revalidatePath from three pair mutations and added onSuccess/onRemoved client callback props to AddPairForm and PairRow so LiveBoard (not Next.js cache) controls re-fetch.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove revalidatePath from pair mutations | 80bebef | actions.ts, actions.test.ts |
| 2 | Add onSuccess to AddPairForm / onRemoved to PairRow | 241a3dc (RED), 1e7e488 (GREEN) | AddPairForm.tsx, PairRow.tsx, AddPairForm.test.tsx, PairRow.test.tsx |

## What Was Built

**Task 1 — actions.ts mutation cleanup:**
- Removed `revalidatePath(`/pools/${poolId}`)` from `addPairAction`, `addPairMemberAction`, and `removePairAction`
- Retained both `revalidatePath("/pools")` and `revalidatePath("/pools/[poolId]", "page")` in `closeSessionAction` (which navigates away via `redirect("/pools")`)
- `import { revalidatePath } from "next/cache"` kept (still used by closeSessionAction)
- Updated `actions.test.ts` to assert revalidatePath is NOT called on pair mutations (rather than the old assertion that it was)

**Task 2 — TDD: AddPairForm + PairRow callbacks:**
- `AddPairForm`: Added `onSuccess: () => void` to `AddPairFormProps`; `onSuccess()` called as first statement inside `if (result.success)` branch before field resets
- `PairRow`: Added `onRemoved: () => void` to `Props`; destructured in component signature; `onRemoved()` called after `await removePairAction(pair.id, poolId)` inside try block (not in catch)
- Tests cover 4 behaviors: onSuccess fires on success, onSuccess not fired on PAIR-04 error, onRemoved fires on successful removal, onRemoved not fired when action throws

## Verification

- `actions.ts` contains exactly 3 revalidatePath occurrences (import + 2 in closeSessionAction): CONFIRMED
- All 11 tests in pool/[poolId] files pass (7 action tests + 4 new callback tests): CONFIRMED
- Pre-existing failures in admin and pools/page tests are unchanged and out of scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AddPairForm test using wrong role selector**
- **Found during:** Task 2 GREEN phase
- **Issue:** Test used `screen.getByRole("form")` but `<form>` elements don't have ARIA "form" role by default; test failed with TestingLibraryElementError
- **Fix:** Changed to `document.querySelector("form")!` (already used in the negative test case)
- **Files modified:** AddPairForm.test.tsx
- **Commit:** 1e7e488

### Test Updates (Not a Deviation — Required by Plan)

`actions.test.ts` had two tests asserting `revalidatePath` WAS called on pair mutations. After removing those calls, assertions were updated to assert revalidatePath was NOT called (with matching test names). This is a necessary corollary of Task 1, not an unexpected deviation.

## Known Stubs

None — no UI stubs introduced. `PairList` currently passes `PairRow` without `onRemoved` (TypeScript-only issue; esbuild/vitest does not type-check). This will be resolved when `PairList` is updated in Plan 05-04 to accept `onPairRemoved` from the `LiveBoard`.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Changes are limited to removing revalidatePath calls and adding callback props — no new trust boundaries.

## Self-Check: PASSED

- actions.ts modified: CONFIRMED (3 revalidatePath occurrences)
- AddPairForm.tsx modified: CONFIRMED (onSuccess prop added)
- PairRow.tsx modified: CONFIRMED (onRemoved prop added)
- AddPairForm.test.tsx created: CONFIRMED
- PairRow.test.tsx created: CONFIRMED
- Commits 80bebef, 241a3dc, 1e7e488: CONFIRMED via git log
