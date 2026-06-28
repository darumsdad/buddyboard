---
phase: 03-admin-data-setup
plan: "04"
subsystem: camper-search-import
tags: [next.js, drizzle-orm, server-actions, xlsx, sheetjs, vitest, tailwind]

requires:
  - phase: 03-admin-data-setup
    plan: "03"
    provides: addCamperAction/editCamperAction/removeCamperAction/clearAllCampersAction, CamperTable, page shell (no search/pagination)

provides:
  - importCampersAction (SheetJS, Merge + Replace modes, CampMinder columns, title case, bunk required)
  - CampersPage with async searchParams, ilike() search on firstName/lastName/code, 50/page pagination
  - SearchBar (debounced 300ms URL updates, ?q= + page=1 reset)
  - PaginationControls (Previous / Page X of Y / Next; disabled at boundaries)
  - ImportModal (merge/replace radio toggle D-04, file input, sample template download link, useActionState feedback)
  - public/sample-roster.xlsx (CampMinder format: Last Name, Preferred Name, SwimCode, Bunk per D-07)
  - 20 camper actions tests + 2 page tests (all green)

affects: [04-counselor-screens]

tech-stack:
  added:
    - xlsx@0.18.5 (SheetJS — Excel parsing server-side)
  patterns:
    - "importCampersAction: raw: false prevents numeric coercion of codes (CAMP-02)"
    - "Fuzzy Bunk detection: Object.keys(norm).find(k => k.toLowerCase().includes('bunk'))"
    - "TDD RED/GREEN: failing tests committed before implementation (ac84433 → fa1219b)"
    - "jsdom File API for test helpers: new File([buffer], ...) so FormData.get() returns File correctly"
    - "searchParams is Promise in Next.js 16: const { q, page } = await searchParams"
    - "page.test.tsx: dual-chain db mock — .where() handles both orderBy chain and direct thenable for count query"

key-files:
  created:
    - src/app/(admin)/admin/campers/components/SearchBar.tsx
    - src/app/(admin)/admin/campers/components/PaginationControls.tsx
    - src/app/(admin)/admin/campers/components/ImportModal.tsx
    - scripts/generate-sample-template.ts
    - public/sample-roster.xlsx
  modified:
    - src/app/(admin)/admin/campers/actions.ts
    - src/app/(admin)/admin/campers/actions.test.ts
    - src/app/(admin)/admin/campers/page.tsx
    - src/app/(admin)/admin/campers/page.test.tsx
    - src/app/(admin)/admin/campers/components/CamperTable.tsx

key-decisions:
  - "D-04 Merge + Replace modes: both all-or-nothing; any row error aborts before any DB write"
  - "D-05/D-12 error terminology: SwimCode is blank / duplicate SwimCode (not Code)"
  - "D-06 CampMinder columns: Preferred Name→firstName, Last Name→lastName, SwimCode→code, fuzzy Bunk"
  - "D-08 bunk required in import: Bunk is blank row error since camper.bunk is NOT NULL in DB"
  - "D-13 title case: toTitleCase() applied to firstName and lastName only, never to code"
  - "D-07 sample template: CampMinder column order (Last Name, Preferred Name, SwimCode, Bunk)"
  - "CAMP-02 satisfied: raw: false + text SheetJS cell type preserves leading zeros throughout"
  - "ImportModal uses plain HTML <form action={formAction}> — NOT next/form Form (anti-pattern)"

metrics:
  duration: ~8 min
  completed: 2026-06-28
  tasks_total: 2
  tasks_complete: 2
  files_created: 5
  files_modified: 5
---

# Phase 3 Plan 04: Search, Import, and Pagination Summary

**importCampersAction with SheetJS (CampMinder columns, Merge + Replace modes, title case, bunk required), server-side ilike search with 300ms debounce, 50/page pagination, and CampMinder-format sample template**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-28
- **Completed:** 2026-06-28
- **Tasks:** 2 of 2 complete
- **Files created:** 5
- **Files modified:** 5

## Accomplishments

- `actions.ts`: appended `importCampersAction` to existing CRUD actions. CampMinder column mapping (Preferred Name, Last Name, SwimCode, fuzzy Bunk via `k.toLowerCase().includes("bunk")`). Merge mode (skip existing SwimCodes) + Replace mode (DELETE all + INSERT all). `toTitleCase()` helper for names (D-13). All-or-nothing validation: SwimCode is blank (D-12), duplicate SwimCode (D-05), Last Name blank, Bunk blank (D-08). `raw: false` in `sheet_to_json` for CAMP-02 code preservation.
- `actions.test.ts`: 10 new tests in `importCampersAction` describe block covering all behaviors. Test helpers use `new File([buffer], ...)` from jsdom so FormData handles File correctly. Fixed merge mock to resolve at `.from()` not `.where()` (no intermediate `.where` in the action's `db.select().from(camper)` query).
- `page.tsx`: updated to accept `searchParams: Promise<{q?,page?}>`, await it, build ilike() OR clause on firstName/lastName/code, parallel `Promise.all` for camper list + count(*), `PAGE_SIZE=50`, pass `searchQuery={q||undefined}` to CamperTable.
- `SearchBar.tsx`: "use client", useRouter + usePathname, 300ms debounce via useRef timer, updates ?q= + resets page=1.
- `PaginationControls.tsx`: "use client", useSearchParams for existing params preservation, Previous/Next with disabled logic, "Page X of Y" span, left-aligned camper count.
- `ImportModal.tsx`: "use client", useActionState(importCampersAction, null), merge/replace radio fieldset (D-04), file input, /sample-roster.xlsx download link, error list (role="alert"), success count message, plain `<form action={formAction}>` (not next/form).
- `CamperTable.tsx`: added optional `searchQuery?: string` prop; empty state shows "No results for '[query]'" when searching, "No campers yet" when no data.
- `scripts/generate-sample-template.ts`: generates `public/sample-roster.xlsx` with CampMinder column order (D-07).
- `page.test.tsx`: updated for new `searchParams` Promise signature, mocks SearchBar/PaginationControls/ImportModal, dual-chain db mock that satisfies both `.where().orderBy().limit().offset()` (camper list) and `.where()` as thenable (count query).

## Task Commits

1. **test(03-04)**: add failing tests for importCampersAction (RED) — `ac84433`
2. **feat(03-04)**: implement importCampersAction with SheetJS (GREEN) — `fa1219b`
3. **feat(03-04)**: SearchBar, PaginationControls, ImportModal, wired campers page, sample template — `2dcbe6c`

## Verification Results

- `npm list xlsx`: xlsx@0.18.5
- `npm test -- campers`: 2 test files, 22 tests — all passed (10 CRUD + 10 import + 2 page)
- `npm run build`: exits 0 — `/admin/campers` listed as dynamic route
- `public/sample-roster.xlsx`: 16KB, CampMinder columns (Last Name, Preferred Name, SwimCode, Bunk)
- Acceptance criteria all met (see self-check below)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] jsdom FormData.set strips non-Blob objects to string**
- **Found during:** Task 1 GREEN phase — import tests failing with "Could not parse file" for all File-based tests
- **Issue:** In jsdom test environment, `FormData.set("file", plainObject)` converts the object to `[object Object]` string. `formData.get("file")` returned a string, `file.arrayBuffer()` didn't exist, SheetJS parse was caught and returned the parse error instead of row errors.
- **Fix:** Changed test helpers from plain object `{ arrayBuffer: () => ..., size: N }` to `new File([buffer], "test.xlsx", { type: XLSX_MIME })` — jsdom's File API handles FormData correctly.
- **Files modified:** `actions.test.ts`
- **Commit:** fa1219b

**2. [Rule 1 - Bug] Merge mode mock chain had extra `.where()` not in action**
- **Found during:** Task 1 GREEN phase — merge mode test failing with "map is not a function"
- **Issue:** Test mock had `db.select().from().where()` chain but action calls `db.select({code}).from(camper)` directly (no `.where()`). The mock's `.from()` returned `{ where: fn }` not a resolved value.
- **Fix:** Changed mock to `from: vi.fn().mockResolvedValue([{ code: "042" }])` — resolves directly after `.from()`.
- **Files modified:** `actions.test.ts`
- **Commit:** fa1219b

**3. [Rule 1 - Bug] page.test.tsx called CampersPage() without required searchParams**
- **Found during:** Task 2 — page tests failed with TypeScript error on missing argument
- **Issue:** The updated page now requires `searchParams: Promise<{q?,page?}>` but the existing test called `CampersPage()` with no args. Also missing mocks for SearchBar, PaginationControls, ImportModal.
- **Fix:** Updated page.test.tsx to pass `searchParams: Promise.resolve({})`, added mocks for new components, fixed db mock to handle both query chains (camper list via `.orderBy().limit().offset()` and count via thenable `.where()`).
- **Files modified:** `page.test.tsx`
- **Commit:** 2dcbe6c

## Known Stubs

None — all data flows are wired. The search uses real ilike() queries, pagination uses real count(*), ImportModal wires to importCampersAction via useActionState, and SearchBar triggers real URL updates.

## Threat Flags

All threats from the plan's threat register are mitigated:

- T-03-04-01: requireAdmin() is the first statement in importCampersAction
- T-03-04-02: xlsx.read() wrapped in try/catch; returns parse error for non-XLSX
- T-03-04-03: requireAdmin() guard + UI clearly labels Replace as "cannot be undone" + Merge is default
- T-03-04-04: ilike() via Drizzle ORM — parameterized queries; q never interpolated into raw SQL
- T-03-04-05: raw: false + text cell type preserves "042" as "042" throughout the pipeline
- T-03-04-06: in-memory seenCodes Map catches duplicates before any DB write
- T-03-04-07: bodySizeLimit "5mb" set in next.config.ts (Plan 03-01)
- T-03-04-08: accepted — Next.js built-in origin check covers Server Actions
- T-03-04-SC: xlsx package legitimacy confirmed in RESEARCH.md

No new threat surface beyond what the plan's threat model covers.

## Self-Check: PASSED

- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `export async function importCampersAction`
- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `raw: false`
- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `norm["SwimCode"]`
- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `norm["Preferred Name"]`
- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `toLowerCase().includes("bunk")`
- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `toTitleCase` helper
- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `mode === "replace"` and `mode === "merge"` (via `else`)
- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `"SwimCode is blank"` and `"duplicate SwimCode"`
- [x] `src/app/(admin)/admin/campers/actions.ts` — contains `"Bunk is blank"`
- [x] `src/app/(admin)/admin/campers/actions.test.ts` — 10 import tests in new describe block
- [x] `src/app/(admin)/admin/campers/components/SearchBar.tsx` — "use client", usePathname, 300ms setTimeout
- [x] `src/app/(admin)/admin/campers/components/PaginationControls.tsx` — "use client", Previous/Next disabled logic
- [x] `src/app/(admin)/admin/campers/components/ImportModal.tsx` — "use client", useActionState(importCampersAction)
- [x] `src/app/(admin)/admin/campers/components/ImportModal.tsx` — `<form action={formAction}` (not next/form)
- [x] `src/app/(admin)/admin/campers/components/ImportModal.tsx` — `name="mode"` with "merge" and "replace" values
- [x] `src/app/(admin)/admin/campers/components/ImportModal.tsx` — `href="/sample-roster.xlsx" download`
- [x] `scripts/generate-sample-template.ts` — CampMinder columns: Last Name, Preferred Name, SwimCode, Bunk
- [x] `public/sample-roster.xlsx` — exists (16KB)
- [x] `npm run build` — exits 0
- [x] `npm test -- campers` — 22 tests passed
- [x] Commits ac84433, fa1219b, 2dcbe6c — all in git log

---
*Phase: 03-admin-data-setup*
*Completed: 2026-06-28*
