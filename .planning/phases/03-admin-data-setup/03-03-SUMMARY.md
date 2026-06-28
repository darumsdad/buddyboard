---
phase: 03-admin-data-setup
plan: "03"
subsystem: camper-crud
tags: [next.js, drizzle-orm, server-actions, vitest, tailwind]

requires:
  - phase: 03-admin-data-setup
    plan: "01"
    provides: camper Drizzle table (code=text, bunk NOT NULL), pool table, schema.ts exports

provides:
  - addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction (requireAdmin guard)
  - /admin/campers page (server component, no search/pagination — Plan 04 adds those)
  - CamperTable with D-11 name format "[firstName] [lastName] · [bunk]"
  - AddCamperModal (bunk required per D-08)
  - EditCamperModal (bunk required, pre-filled)
  - CamperDeleteDialog ("Keep camper" / "Remove camper")
  - ClearAllCampersDialog ("Keep roster" / "Clear all campers")
  - 10 action tests + 2 page tests (all green)

affects: [03-04-camper-search-import, 04-counselor-screens]

tech-stack:
  added: []
  patterns:
    - "Server Action with requireAdmin() — first statement before any DB operation"
    - "FormData field names: first-name, last-name, code, bunk, notes, id (hidden)"
    - "D-11 name disambiguation: {firstName} {lastName} · {bunk} in CamperTable Name column"
    - "D-08 bunk required: validated at action layer (throws 'Bunk is required') and at form layer (required attribute)"
    - "TDD RED/GREEN: failing tests committed before implementation"

key-files:
  created:
    - src/app/(admin)/admin/campers/actions.ts
    - src/app/(admin)/admin/campers/actions.test.ts
    - src/app/(admin)/admin/campers/page.tsx
    - src/app/(admin)/admin/campers/page.test.tsx
    - src/app/(admin)/admin/campers/components/CamperTable.tsx
    - src/app/(admin)/admin/campers/components/AddCamperModal.tsx
    - src/app/(admin)/admin/campers/components/EditCamperModal.tsx
    - src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx
    - src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx
  modified: []

key-decisions:
  - "bunk validated as required in actions.ts (throws 'Bunk is required') — D-08 enforced at server layer"
  - "code stored as string from FormData — no parseInt/parseFloat anywhere — CAMP-02 preserved"
  - "CamperTable Name column is ONE combined column: '[firstName] [lastName] · [bunk]' per D-11"
  - "page.tsx has no searchParams/pagination — Plan 04 adds those to keep context budget manageable"
  - "clearAllCampersAction calls db.delete(camper) with no .where clause — full table delete"

metrics:
  duration: ~15 min
  completed: 2026-06-28
  tasks_total: 2
  tasks_complete: 2
  files_created: 9
  files_modified: 0
---

# Phase 3 Plan 03: Camper CRUD Summary

**Four camper Server Actions with requireAdmin guard, bunk required (D-08), full admin UI with D-11 name disambiguation format, 12 tests green, build clean**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-28
- **Completed:** 2026-06-28
- **Tasks:** 2 of 2 complete
- **Files created:** 9

## Accomplishments

- `actions.ts`: addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction — all guard with requireAdmin(), validate bunk as required, call revalidatePath("/admin/campers")
- `actions.test.ts`: 10 tests covering all four actions — unauthorized rejection, validation errors (blank code, blank bunk), DB calls, revalidatePath calls
- `page.tsx`: async server component with auth guard, full camper roster query (ordered by createdAt desc), no search/pagination (Plan 04 scope)
- `CamperTable.tsx`: "use client", 5 columns (Name/Code/Bunk/Notes/Actions), D-11 format in Name column `{firstName} {lastName} · {bunk}`, notes truncated at 48 chars, empty state "No campers yet"
- `AddCamperModal.tsx`: 5 fields, bunk `required` (no optional suffix), blue "Add camper" CTA
- `EditCamperModal.tsx`: hidden id field, all inputs pre-filled from camper prop, bunk required
- `CamperDeleteDialog.tsx`: exact copy strings — "Keep camper" / "Remove camper"
- `ClearAllCampersDialog.tsx`: exact copy strings — "Keep roster" / "Clear all campers"
- `page.test.tsx`: 2 tests — heading "Campers" and empty state text

## Task Commits

1. **test(03-03)**: add failing tests for camper server actions (RED) — `f1c9353`
2. **feat(03-03)**: implement camper server actions with requireAdmin guard (GREEN) — `b9029ad`
3. **feat(03-03)**: camper page, CamperTable, Add/Edit modals, delete dialogs, page tests — `9981b2b`

## Verification Results

- `npm test -- campers`: 2 test files, 12 tests — all passed
- `npx tsc --noEmit`: exits 0 (clean)
- `npm run build`: exits 0 — `/admin/campers` listed as dynamic route

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no hardcoded empty values, placeholders, or unwired data sources. The page queries the real camper table and passes results to CamperTable.

## Threat Flags

All threats from the plan's threat register are mitigated:

- T-03-03-01: requireAdmin() is the first statement in all four actions
- T-03-03-02: clearAllCampersAction guarded by requireAdmin + two-step ClearAllCampersDialog confirmation
- T-03-03-03: code stored as text string, no numeric conversion anywhere
- T-03-03-04: Drizzle parameterized queries only — no raw SQL
- T-03-03-06: Auth guard in page.tsx redirects before DB query

No new threat surface introduced beyond what the plan's threat model covers.

## Self-Check: PASSED

- [x] `src/app/(admin)/admin/campers/actions.ts` — exists, exports 4 actions
- [x] `src/app/(admin)/admin/campers/actions.test.ts` — exists, 10 tests
- [x] `src/app/(admin)/admin/campers/page.tsx` — exists, no "use client"
- [x] `src/app/(admin)/admin/campers/page.test.tsx` — exists, 2 tests
- [x] `src/app/(admin)/admin/campers/components/CamperTable.tsx` — exists, "use client"
- [x] `src/app/(admin)/admin/campers/components/AddCamperModal.tsx` — exists
- [x] `src/app/(admin)/admin/campers/components/EditCamperModal.tsx` — exists
- [x] `src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx` — exists
- [x] `src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx` — exists
- [x] Commits f1c9353, b9029ad, 9981b2b — all in git log
- [x] 12 camper tests pass
- [x] Build exits 0

---
*Phase: 03-admin-data-setup*
*Completed: 2026-06-28*
