---
phase: 03-admin-data-setup
plan: "01"
subsystem: database
tags: [drizzle-orm, postgresql, supabase, next.js, tailwind]

requires:
  - phase: 02-admin-user-management
    provides: admin layout (admin)/layout.tsx with role guard, schema.ts with user/session/account tables

provides:
  - camper Drizzle table definition (id, first_name, last_name, code text unique, bunk NOT NULL, notes, timestamps)
  - pool Drizzle table definition (id, name, timestamps)
  - camper_code_idx and camper_name_idx database indexes
  - next.config.ts bodySizeLimit "5mb" for Excel uploads
  - AdminSidebar client component with usePathname active-link highlighting (Task 3 — pending checkpoint)
  - Admin shell layout with flex sidebar+content row (Task 3 — pending checkpoint)

affects: [03-02-pools, 03-03-camper-crud, 04-counselor-screens]

tech-stack:
  added: []
  patterns:
    - "Drizzle pgTable with text primary key + timestamp created_at/updated_at"
    - "index() as second pgTable argument for compound indexes"
    - "$onUpdate(() => /* @__PURE__ */ new Date()) for updatedAt columns"
    - "usePathname() active-link detection in client sidebar component"

key-files:
  created:
    - src/components/AdminSidebar.tsx (Task 3 — pending)
  modified:
    - src/db/schema.ts
    - next.config.ts
    - src/app/(admin)/layout.tsx (Task 3 — pending)

key-decisions:
  - "bunk column is NOT NULL (D-08) — bunk required for name disambiguation, enforced at DB level"
  - "code column is text type (never numeric) — preserves leading zeros per CAMP-02"
  - "No FK relations added for camper or pool in Phase 3 — kept isolated per plan"

patterns-established:
  - "AdminSidebar: usePathname().startsWith(href) for active detection, bg-blue-600 text-white active, slate-700/slate-200-hover inactive"

requirements-completed: [CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, POOL-01, POOL-02]

duration: partial (stopped at checkpoint Task 2)
completed: 2026-06-28
---

# Phase 3 Plan 01: Foundation Summary

**Drizzle camper table (code=text, bunk NOT NULL) and pool table added to schema.ts; bodySizeLimit raised to 5mb; drizzle-kit push required before Task 3 can run**

## Performance

- **Duration:** ~5 min (Task 1 complete; stopped at blocking checkpoint)
- **Started:** 2026-06-28T16:34:35Z
- **Completed:** 2026-06-28T16:34:35Z (partial — checkpoint)
- **Tasks:** 1 of 3 complete (Task 2 awaiting human action, Task 3 pending)
- **Files modified:** 2

## Accomplishments
- camper table defined with all required columns: id, first_name, last_name, code (text unique), bunk (NOT NULL per D-08), notes, timestamps
- pool table defined with id, name, timestamps
- Two indexes added: camper_code_idx (on code) and camper_name_idx (on first_name, last_name)
- next.config.ts updated with experimental.serverActions.bodySizeLimit = "5mb" to allow Excel file uploads
- TypeScript compiles clean (npx tsc --noEmit exits 0)

## Task Commits

1. **Task 1: Add camper and pool tables to schema.ts; raise bodySizeLimit** - `3847270` (feat)
2. **Task 2: [BLOCKING] Run drizzle-kit push** - checkpoint:human-action — awaiting human
3. **Task 3: Create AdminSidebar component and modify admin layout** — pending Task 2 confirmation

## Files Created/Modified
- `src/db/schema.ts` - Added camper and pool pgTable exports after accountRelations
- `next.config.ts` - Added experimental.serverActions.bodySizeLimit = "5mb"

## Decisions Made
- bunk is `text("bunk").notNull()` — NOT NULL constraint at DB level (D-08 requirement: bunk mandatory for name disambiguation)
- code is `text("code").notNull().unique()` — text type, never numeric, preserves leading zeros (CAMP-02)
- No FK relations defined for camper or pool in this plan — Phase 4 will add them if needed

## Deviations from Plan

None - Task 1 executed exactly as written.

## Issues Encountered
None.

## User Setup Required

**Blocking gate — human must run drizzle-kit push before Task 3 can proceed.**

Run in project root:
```
npx drizzle-kit push
```

Verify with:
```
npx tsx -e "import { db } from './src/db'; import { camper, pool } from './src/db/schema'; const [c, p] = await Promise.all([db.select().from(camper).limit(1), db.select().from(pool).limit(1)]); console.log('camper table OK, pool table OK'); process.exit(0);"
```

When both tables are confirmed, type "pushed" to continue with Task 3 (AdminSidebar + layout update).

## Next Phase Readiness
- Task 3 (AdminSidebar + layout) pending drizzle-kit push confirmation
- Wave 2 plans (03-02-pools, 03-03-camper-crud) cannot start until camper and pool tables exist in Supabase

---
*Phase: 03-admin-data-setup*
*Completed: 2026-06-28 (partial — stopped at checkpoint)*
