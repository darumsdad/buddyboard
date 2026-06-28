---
phase: 04-sessions-and-buddy-pairs
plan: "01"
subsystem: database-schema
tags: [drizzle, schema, postgresql, sessions, buddy-pairs]
dependency_graph:
  requires: []
  provides:
    - poolSession table definition
    - pair table definition
    - pairMember table definition
    - Drizzle relations for poolSession, pair, pairMember
  affects:
    - All Wave 2+ code that imports poolSession, pair, pairMember from @/db/schema
tech_stack:
  added: []
  patterns:
    - Partial unique index via uniqueIndex().on().where(sql`...`) for D-01 enforcement
    - Junction table (pairMember) for PAIR-04 DB-level enforcement
key_files:
  created: []
  modified:
    - src/db/schema.ts
decisions:
  - Table named poolSession (DB: pool_session) to avoid collision with Better Auth session table
  - Relations appended after all table definitions to satisfy TypeScript forward-reference rules
metrics:
  duration_seconds: 480
  completed_date: "2026-06-28"
  tasks_completed: 1
  tasks_total: 2
  files_modified: 1
---

# Phase 04 Plan 01: Schema Tables (poolSession, pair, pairMember) Summary

**One-liner:** Added poolSession/pair/pairMember Drizzle tables with partial unique index for D-01 and unique_camper_per_session constraint for PAIR-04, ready for drizzle-kit push.

## What Was Built

Three new PostgreSQL tables added to `src/db/schema.ts` via Drizzle ORM schema definitions:

1. **poolSession** (`pool_session`) — swim session lifecycle table. One active session per pool enforced at DB level via partial unique index `unique_active_session_per_pool` on `pool_id WHERE status = 'active'`. Cascades from `pool` table.

2. **pair** (`pair`) — groups campers into buddy pairs within a session. Cascades from `pool_session`.

3. **pairMember** (`pair_member`) — junction table linking campers to pairs. The `unique_camper_per_session` unique index on `(camper_id, session_id)` enforces PAIR-04 at the storage layer. Denormalized `session_id` column enables this constraint. Cascades from both `pair` and `pool_session`.

Three corresponding Drizzle relation definitions (`poolSessionRelations`, `pairRelations`, `pairMemberRelations`) enable relational query API usage in Wave 2+.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add poolSession, pair, pairMember tables and relations | 7d225c5 | src/db/schema.ts |
| 2 | [CHECKPOINT] Run drizzle-kit push and verify tables | — | — (awaiting human) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed forward-reference ordering in schema.ts**

- **Found during:** Task 1 TypeScript verification
- **Issue:** New Drizzle relations (`poolSessionRelations`, `pairRelations`, `pairMemberRelations`) were initially inserted after `accountRelations` at line 102, which is before the `poolSession`, `pair`, `pairMember` table definitions. TypeScript reported errors `TS2448: Block-scoped variable 'poolSession' used before its declaration`.
- **Fix:** Moved all three new relation definitions to after the `pairMember` table definition at the end of the file, after all three tables are fully declared.
- **Files modified:** src/db/schema.ts
- **Commit:** 7d225c5

### Out-of-Scope Pre-existing Issues

Pre-existing TypeScript errors in `src/app/(admin)/admin/campers/actions.test.ts` (Buffer/BlobPart type mismatch — unrelated to this plan) were discovered during `npx tsc --noEmit`. Logged as out-of-scope per deviation scope boundary rule. No changes made; `npx tsc --noEmit` exits non-zero due to these pre-existing test file errors, but `schema.ts` itself has zero TypeScript errors.

## Known Stubs

None — this plan is schema-only with no UI or data-binding code.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. Schema additions are internal Drizzle definitions only; threat mitigations T-04-01 (`unique_camper_per_session`) and T-04-02 (`unique_active_session_per_pool`) are both implemented as required by the plan's threat model.

## Self-Check: PASSED

- [x] `src/db/schema.ts` exists and contains `export const poolSession`
- [x] Commit 7d225c5 exists
- [x] `npx tsc --noEmit` produces zero errors in schema.ts (pre-existing test file errors excluded per scope rule)
