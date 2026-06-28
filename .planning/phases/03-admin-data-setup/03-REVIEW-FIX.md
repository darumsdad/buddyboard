---
phase: 03-admin-data-setup
fixed_at: 2026-06-28T00:00:00Z
review_path: .planning/phases/03-admin-data-setup/03-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-06-28
**Source review:** .planning/phases/03-admin-data-setup/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-001: Missing `firstName` validation in `importCampersAction`

**Files modified:** `src/app/(admin)/admin/campers/actions.ts`
**Commit:** f3182ce
**Applied fix:** Added `if (!firstName) errors.push(...)` guard immediately before the `lastNameNorm` check in the row-validation loop (line 174). Empty Preferred Name cells now produce a validation error instead of being silently stored as empty strings.

---

### CR-002: TOCTOU race in merge mode

**Files modified:** `src/app/(admin)/admin/campers/actions.ts`
**Commit:** be73edf
**Applied fix:** Moved the `existingCodes` select and `toInsert` filter computation inside the transaction body. The read and insert are now atomic: `tx.select({ code: camper.code }).from(camper)` runs inside `db.transaction(async (tx) => { ... })`, eliminating the window between the select and the insert where a concurrent import could cause a unique-constraint crash.

---

### WR-001: `editCamperAction` silently no-ops on empty `id`

**Files modified:** `src/app/(admin)/admin/campers/actions.ts`
**Commit:** 6eb7fa9
**Applied fix:** Added `if (!id) throw new Error("Camper ID is required");` immediately after the `id` extraction (line 51). A missing or blank hidden `id` field now throws rather than executing `WHERE id = ''` against zero rows.

---

### WR-002: Bunk rendered twice per row in `CamperTable`

**Files modified:** `src/app/(admin)/admin/campers/components/CamperTable.tsx`
**Commit:** b6f778f
**Applied fix:** Removed ` · {c.bunk}` from the Name cell (line 74). The Name cell now renders only `{c.firstName} {c.lastName}`. The dedicated Bunk column remains and is the sole source of the bunk value per row.

---

### WR-003: Stale `useActionState` result shown on ImportModal re-open

**Files modified:** `src/app/(admin)/admin/campers/components/ImportModal.tsx`
**Commit:** 6985ff6
**Applied fix:** Added `const [modalKey, setModalKey] = useState(0)` state and a `handleOpen` function that increments `modalKey` before setting `open = true`. The trigger button uses `onClick={handleOpen}` instead of the inline arrow. The `<form>` element receives `key={modalKey}`, which forces a full remount on each open — resetting the `useActionState` result to `null` so no stale success/error message is visible.

---

### WR-004: `SearchBar` discards all URL params on each keystroke

**Files modified:** `src/app/(admin)/admin/campers/components/SearchBar.tsx`
**Commit:** f4e5879
**Applied fix:** Imported `useSearchParams` from `next/navigation`. Added `const searchParams = useSearchParams()` call in the component body. Changed `new URLSearchParams()` to `new URLSearchParams(searchParams.toString())` so existing URL params are preserved. Also changed `params.set("q", q)` conditional to the `if (q) ... else params.delete("q")` pattern for correctness, and added `searchParams` to the `useCallback` dependency array.

---

_Fixed: 2026-06-28_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
