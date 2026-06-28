---
phase: 03-admin-data-setup
plan: "02"
subsystem: admin-ui, server-actions, database-seed
tags: [drizzle-orm, next.js, tailwind, server-actions, vitest, pools-management]

requires:
  - phase: 03-admin-data-setup
    plan: "01"
    provides: pool Drizzle table in schema.ts + Supabase, AdminSidebar, admin layout shell

provides:
  - createPoolAction, renamePoolAction, removePoolAction with requireAdmin guard
  - action tests (8 tests) for all three pool mutations
  - seed-pools.ts idempotent script seeding Pool 1, Pool 2, Pool 3
  - /admin/pools server-rendered page (auth guard + db.select orderBy asc)
  - PoolList client component with rename + remove per row, "No pools yet" empty state
  - AddPoolForm inline form (createPoolAction, error display)
  - EditPoolModal (renamePoolAction, "Rename pool" heading, pre-filled input)
  - PoolDeleteDialog ("Keep pool" / "Remove pool" confirmation)

affects: [04-counselor-screens]

tech-stack:
  added: []
  patterns:
    - "Server Action with requireAdmin() + db mutation + revalidatePath('/admin/pools')"
    - "Inline form (AddPoolForm) instead of modal for single-field pool addition"
    - "PoolDeleteDialog as local component inside PoolList.tsx — owns open/loading/error state"
    - "EditPoolModal: 'use client', renamePoolAction(pool.id, formData), defaultValue pre-fill"
    - "Vitest vi.mock chain for db.insert/update/delete (select→values, update→set→where)"

key-files:
  created:
    - src/app/(admin)/admin/pools/actions.ts
    - src/app/(admin)/admin/pools/actions.test.ts
    - src/app/(admin)/admin/pools/page.tsx
    - src/app/(admin)/admin/pools/components/PoolList.tsx
    - src/app/(admin)/admin/pools/components/AddPoolForm.tsx
    - src/app/(admin)/admin/pools/components/EditPoolModal.tsx
    - scripts/seed-pools.ts
  modified: []

key-decisions:
  - "PoolDeleteDialog lives inside PoolList.tsx (not a separate file) — single-use component, no benefit to splitting"
  - "seed-pools.ts run with --env-file flag in worktree (no .env.local symlink); seeded Pool 1, Pool 2, Pool 3 to Supabase"
  - "TDD RED commit included actions.ts alongside test file (minor gate deviation — see TDD Gate Compliance)"

duration: ~25 minutes
completed: 2026-06-28
---

# Phase 3 Plan 02: Pools Management Summary

**Pool Server Actions (requireAdmin guard + revalidatePath), 8-test suite, idempotent seed script (Pool 1/2/3 in Supabase), and /admin/pools page with PoolList + AddPoolForm + EditPoolModal**

## Performance

- **Duration:** ~25 minutes
- **Started:** 2026-06-28
- **Completed:** 2026-06-28
- **Tasks:** 2 (both auto; Task 1 TDD)
- **Files created:** 7

## Accomplishments

- `actions.ts` exports createPoolAction, renamePoolAction, removePoolAction — each calls requireAdmin() then performs the Drizzle mutation then revalidatePath("/admin/pools")
- `actions.test.ts` has 8 tests: all 3 actions reject non-admin (null and role="user"), createPoolAction throws on empty name, all 3 actions call db mutation + revalidatePath on success
- `seed-pools.ts` idempotent: checks `db.select().from(pool).limit(1)` first; exits 0 whether inserting or skipping; Pool 1, Pool 2, Pool 3 confirmed in Supabase
- `pools/page.tsx` is a server component: auth guard redirects non-admin, queries pools ordered by name asc, renders PoolList + AddPoolForm
- `PoolList.tsx` renders "No pools yet" empty state or ul with one li per pool; each row has Rename (opens EditPoolModal) and Remove (opens PoolDeleteDialog)
- `AddPoolForm.tsx` inline form: label + input + "Add pool" button; error paragraph below
- `EditPoolModal.tsx` modal with "Rename pool" heading, pre-filled name input, "Save pool" button, Close link
- PoolDeleteDialog in PoolList.tsx: "Keep pool" / "Remove pool" two-button layout per UI-SPEC copywriting contract
- `npm run build` exits 0; /admin/pools route is Dynamic (ƒ) in build output
- All 8 pool action tests pass; pre-existing 8 failures in users/page.test.tsx and users/actions.test.ts are unchanged

## Task Commits

1. **Task 1: Pool Server Actions + action tests + seed script** — `deaa32b` (test/feat combined)
2. **Task 2: Pools page + PoolList + AddPoolForm + EditPoolModal** — `52617c3` (feat)

## Files Created/Modified

### Created
- `src/app/(admin)/admin/pools/actions.ts` — "use server", requireAdmin, createPoolAction/renamePoolAction/removePoolAction with Drizzle + revalidatePath
- `src/app/(admin)/admin/pools/actions.test.ts` — 8 Vitest tests; vi.mock for @/lib/auth, next/headers, next/cache, @/db
- `src/app/(admin)/admin/pools/page.tsx` — async server component, no "use client", auth guard, db.select orderBy asc
- `src/app/(admin)/admin/pools/components/PoolList.tsx` — "use client", Pool type, PoolDeleteDialog, PoolList export
- `src/app/(admin)/admin/pools/components/AddPoolForm.tsx` — "use client", createPoolAction, loading/error state
- `src/app/(admin)/admin/pools/components/EditPoolModal.tsx` — "use client", renamePoolAction, "Rename pool" h2
- `scripts/seed-pools.ts` — idempotent seed; Pool 1, Pool 2, Pool 3; process.exit(0)

## Decisions Made

- **PoolDeleteDialog inside PoolList.tsx:** Single-use, tightly coupled — no separate file needed; plan allowed this approach
- **Seed requires --env-file in worktree:** Worktree lacks .env.local symlink; seed ran with `npx tsx --env-file "../../../.env.local" scripts/seed-pools.ts`; functionally correct, pools in Supabase
- **No separate PoolDeleteDialog.tsx file:** Plan said "create as a standalone component in PoolList.tsx or as src/.../PoolDeleteDialog.tsx" — chose the inline approach

## Deviations from Plan

### Auto-fixed Issues

None

### Minor Deviations

**1. TDD Gate: RED and GREEN committed together**
- **Found during:** Task 1 commit
- **Issue:** actions.ts and seed-pools.ts were committed in the same commit as actions.test.ts (labeled `test(03-02)`) instead of a separate `feat(03-02)` commit for GREEN
- **Impact:** Minor protocol deviation; all 8 tests pass and implementation is correct; no functional difference
- **Mitigation:** Documented in TDD Gate Compliance section below

## TDD Gate Compliance

| Gate | Status | Commit |
|------|--------|--------|
| RED — test commit | Confirmed fail before implementation (actions.ts did not exist) | `deaa32b` |
| GREEN — feat commit | Tests pass (8/8), but feat files committed with test commit rather than separately | `deaa32b` |
| REFACTOR | Not required | — |

**Warning:** GREEN gate `feat(...)` commit is absent — implementation was committed alongside tests in `deaa32b`. Tests pass and implementation is correct. This is a commit-ordering deviation only.

## Known Stubs

None — all three actions call real Drizzle mutations; PoolList renders real pool data passed from page.tsx; AddPoolForm and EditPoolModal call real actions.

## Threat Flags

None — threat model mitigations all applied:
- T-03-02-01 (EoP): requireAdmin() is first statement in every action
- T-03-02-02 (Tampering): name.trim() + non-empty check before DB write
- T-03-02-04 (Info Disclosure): auth guard in pools/page.tsx redirects non-admin before any DB query

## Self-Check: PASSED

Files verified:
- `src/app/(admin)/admin/pools/actions.ts` — FOUND
- `src/app/(admin)/admin/pools/actions.test.ts` — FOUND
- `src/app/(admin)/admin/pools/page.tsx` — FOUND
- `src/app/(admin)/admin/pools/components/PoolList.tsx` — FOUND
- `src/app/(admin)/admin/pools/components/AddPoolForm.tsx` — FOUND
- `src/app/(admin)/admin/pools/components/EditPoolModal.tsx` — FOUND
- `scripts/seed-pools.ts` — FOUND

Commits verified:
- `deaa32b` — FOUND (test + actions + seed)
- `52617c3` — FOUND (pools page + UI components)

---
*Phase: 03-admin-data-setup*
*Completed: 2026-06-28*
