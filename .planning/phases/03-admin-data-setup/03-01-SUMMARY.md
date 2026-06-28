---
phase: 03-admin-data-setup
plan: "01"
subsystem: database, ui
tags: [drizzle-orm, postgresql, supabase, next.js, tailwind, admin-sidebar]

requires:
  - phase: 02-admin-user-management
    provides: admin layout (admin)/layout.tsx with role guard, schema.ts with user/session/account tables

provides:
  - camper Drizzle table definition (id, first_name, last_name, code text unique, bunk NOT NULL, notes, timestamps)
  - pool Drizzle table definition (id, name, timestamps)
  - camper_code_idx and camper_name_idx database indexes
  - next.config.ts bodySizeLimit "5mb" for Excel uploads
  - AdminSidebar client component with usePathname active-link highlighting
  - Admin shell layout with flex sidebar + content row

affects: [03-02-pools, 03-03-camper-crud, 03-04-excel-import, 04-counselor-screens]

tech-stack:
  added: []
  patterns:
    - "Drizzle pgTable with text primary key + timestamp created_at/updated_at"
    - "index() as second pgTable argument for compound indexes"
    - "$onUpdate(() => /* @__PURE__ */ new Date()) for updatedAt columns"
    - "usePathname().startsWith(href) active-link detection in client sidebar component"
    - "Admin layout: flex min-h-screen with w-48 shrink-0 sidebar and flex-1 min-w-0 content"

key-files:
  created:
    - src/components/AdminSidebar.tsx
  modified:
    - src/db/schema.ts
    - next.config.ts
    - src/app/(admin)/layout.tsx

key-decisions:
  - "bunk column is NOT NULL (D-08) — bunk required for name disambiguation, enforced at DB level"
  - "code column is text type (never numeric) — preserves leading zeros per CAMP-02"
  - "No FK relations added for camper or pool in Phase 3 — kept isolated per plan"
  - "AdminSidebar links use font-semibold per UI-SPEC (not font-medium from PATTERNS.md snippet)"

patterns-established:
  - "AdminSidebar: named export, usePathname().startsWith(href) for active detection, bg-blue-600 text-white active, slate-700/slate-200-hover inactive"
  - "Admin layout shell: flex min-h-screen wrapper; sidebar w-48 shrink-0; content flex-1 min-w-0"

requirements-completed: [CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, POOL-01, POOL-02]

duration: continuation across two sessions
completed: 2026-06-28
---

# Phase 3 Plan 01: Foundation Summary

**Drizzle camper (code=text, bunk NOT NULL) and pool tables pushed to Supabase; 5mb bodySizeLimit; AdminSidebar with usePathname active links; admin layout in flex sidebar+content shell**

## Performance

- **Duration:** continuation (Task 1 prior session, Task 2 human checkpoint, Task 3 this session)
- **Started:** 2026-06-28
- **Completed:** 2026-06-28
- **Tasks:** 3 (1 auto + 1 checkpoint:human-action + 1 auto)
- **Files modified:** 4

## Accomplishments

- camper table defined with all required columns: id, first_name, last_name, code (text unique), bunk (NOT NULL per D-08), notes, timestamps; two indexes: camper_code_idx and camper_name_idx
- pool table defined with id, name, timestamps
- next.config.ts updated with experimental.serverActions.bodySizeLimit = "5mb" for Excel uploads
- Human confirmed drizzle-kit push — camper and pool tables exist in live Supabase database
- AdminSidebar.tsx created: "use client" named export, usePathname active-link detection, Users/Campers/Pools nav links, font-semibold styling per UI-SPEC
- layout.tsx modified: AdminSidebar imported and rendered; auth guard (redirect /login, redirect /pools) unchanged; flex row shell with min-w-0 content area
- TypeScript compiles clean throughout (npx tsc --noEmit exits 0)

## Task Commits

1. **Task 1: Add camper and pool tables to schema.ts; raise bodySizeLimit** - `3847270` (feat)
2. **Task 2: [BLOCKING] Run drizzle-kit push** - manual (human ran it) — no commit
3. **Task 3: Create AdminSidebar component and modify admin layout** - `8811848` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `src/db/schema.ts` — appended camper and pool pgTable exports; code=text.unique(), bunk=text.notNull(), two indexes; existing exports unchanged
- `next.config.ts` — added experimental.serverActions.bodySizeLimit = "5mb"
- `src/components/AdminSidebar.tsx` — new "use client" sidebar; named export AdminSidebar; usePathname active detection; three nav links with blue-600/slate-200-hover styling
- `src/app/(admin)/layout.tsx` — added AdminSidebar import; return wrapped in flex min-h-screen div; auth guard lines unchanged

## Decisions Made

- **bunk is NOT NULL:** enforced at DB level per D-08; any insert or import omitting bunk receives a DB constraint error — intentional for name disambiguation
- **code is text type:** never cast to number; preserves leading zeros (e.g. "042"); unique constraint is DB-level safety net
- **font-semibold on sidebar links:** both active and inactive; per UI-SPEC — overrides font-medium shown in PATTERNS.md code snippet
- **No FK relations:** camper and pool are standalone tables in Phase 3; Phase 4 adds relational queries if needed

## Deviations from Plan

None — plan executed exactly as written across all three tasks.

## Issues Encountered

None.

## User Setup Required

None — drizzle-kit push was completed during the Task 2 checkpoint.

## Known Stubs

None — this plan creates schema and navigation infrastructure only.

## Threat Flags

None — AdminSidebar is cosmetic navigation; auth guard in layout.tsx (session check + role === "admin") is unchanged; all security enforced at Server Action layer via requireAdmin().

## Next Phase Readiness

- Wave 2 plans (03-02-pools, 03-03-camper-crud) are unblocked — camper and pool tables exist in Supabase
- AdminSidebar appears on all (admin) routes automatically via layout — no per-page sidebar wiring needed in Wave 2
- Drizzle types (camper, pool) exported from schema.ts and ready for import in Wave 2 Server Actions
- 03-04 Excel import unblocked by bodySizeLimit "5mb" in next.config.ts

---
*Phase: 03-admin-data-setup*
*Completed: 2026-06-28*
