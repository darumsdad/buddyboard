---
phase: 03-admin-data-setup
reviewed: 2026-06-28T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - src/db/schema.ts
  - next.config.ts
  - drizzle.config.ts
  - src/components/AdminSidebar.tsx
  - src/app/(admin)/layout.tsx
  - src/app/(admin)/admin/pools/actions.ts
  - src/app/(admin)/admin/pools/actions.test.ts
  - src/app/(admin)/admin/pools/page.tsx
  - src/app/(admin)/admin/pools/components/PoolList.tsx
  - src/app/(admin)/admin/pools/components/AddPoolForm.tsx
  - src/app/(admin)/admin/pools/components/EditPoolModal.tsx
  - scripts/seed-pools.ts
  - src/app/(admin)/admin/campers/actions.ts
  - src/app/(admin)/admin/campers/actions.test.ts
  - src/app/(admin)/admin/campers/page.tsx
  - src/app/(admin)/admin/campers/page.test.tsx
  - src/app/(admin)/admin/campers/components/CamperTable.tsx
  - src/app/(admin)/admin/campers/components/AddCamperModal.tsx
  - src/app/(admin)/admin/campers/components/EditCamperModal.tsx
  - src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx
  - src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx
  - src/app/(admin)/admin/campers/components/SearchBar.tsx
  - src/app/(admin)/admin/campers/components/PaginationControls.tsx
  - src/app/(admin)/admin/campers/components/ImportModal.tsx
  - scripts/generate-sample-template.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-06-28
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

This phase implements pool and camper management: schema definitions, server actions, paginated list/search pages, and an Excel import pipeline. The overall structure is sound — server actions enforce admin auth, Drizzle is used with parameterized queries, and import validation is all-or-nothing before any DB write. Two blockers require fixes before ship: a missing firstName validation hole in the import pipeline that allows empty first names into the database, and a silent no-op in `editCamperAction` when the hidden `id` field is absent. Four warnings cover LIKE wildcard semantics, stale modal state, redundant auth, and a wrong type annotation.

## Critical Issues

### CR-01: Import accepts campers with empty first name

**File:** `src/app/(admin)/admin/campers/actions.ts:170-186`

**Issue:** `importCampersAction` validates `lastNameNorm`, `swimCode`, and `bunkValue` but never checks whether `firstName` is blank. When a row has an empty "Preferred Name" cell, `preferredName` is `""`, `toTitleCase("")` returns `""`, and `firstName` becomes `""`. The code still calls `parsed.push({ firstName: "", ... })`. The DB schema declares `first_name` as `.notNull()`, but an empty string satisfies that constraint. The row passes validation and a camper with an empty first name is inserted.

```typescript
// After line 170, add:
if (!firstName) errors.push(`Row ${rowNum}: Preferred Name is blank`);
```

---

### CR-02: `editCamperAction` silently no-ops when `id` is empty or missing

**File:** `src/app/(admin)/admin/campers/actions.ts:50-71`

**Issue:** The `id` is read from `formData` with a default of `""` (line 50). If the hidden `<input type="hidden" name="id" />` is absent or tampered with, `id` is `""`. The query `db.update(camper).set(...).where(eq(camper.id, ""))` updates zero rows — no error is thrown, `revalidatePath` is called, and the caller receives a resolved promise indicating success. The edit is silently discarded. Additionally, an attacker who can craft a formData payload could supply any arbitrary `id` and edit any camper's data (because no check confirms the `id` actually exists before updating).

```typescript
// After trimming id on line 50:
if (!id) throw new Error("Camper ID is required");

// After the db.update call, check rows updated:
const result = await db
  .update(camper)
  .set({ firstName, lastName, code, bunk, notes: notes || null })
  .where(eq(camper.id, id))
  .returning({ id: camper.id });
if (result.length === 0) throw new Error("Camper not found");
```

## Warnings

### WR-01: LIKE wildcard injection in camper search

**File:** `src/app/(admin)/admin/campers/page.tsx:31-36`

**Issue:** The raw user search string `q` is embedded directly into the LIKE pattern with `%${q}%` before being passed to `ilike()`. Drizzle parameterizes the full pattern string (so this is not SQL injection), but PostgreSQL's LIKE treats `%` and `_` as wildcards. If a user types `%`, the pattern `%%` matches every row in every column. If a user types `_`, every single-character value matches. The search no longer filters meaningfully.

```typescript
// Escape LIKE special characters before interpolation:
function escapeLike(s: string) {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`);
}

const escaped = escapeLike(q);
const where = q
  ? or(
      ilike(camper.firstName, `%${escaped}%`),
      ilike(camper.lastName, `%${escaped}%`),
      ilike(camper.code, `%${escaped}%`),
    )
  : undefined;
```

Note: when using a backslash escape, also set `{ escape: '\\' }` if the Drizzle `ilike` overload supports it; otherwise use a raw `sql` expression.

---

### WR-02: ImportModal shows stale state when reopened

**File:** `src/app/(admin)/admin/campers/components/ImportModal.tsx:119-125`

**Issue:** The Close button calls `setOpen(false)` but does not reset the `useActionState` result. When the modal is closed after a failed or successful import and then reopened, the previous error list or success message is still rendered immediately — before any new action is taken. This is confusing: users see "Imported 47 campers successfully." on a freshly opened import dialog.

`useActionState` does not expose a reset function directly. The standard workaround is to key the form on a counter or use a separate piece of state to suppress displaying stale results:

```typescript
const [open, setOpen] = useState(false);
const [submitCount, setSubmitCount] = useState(0);
// ...
// Suppress stale state: only show result after the most recent submission
// Track whether state belongs to the current open session
const [sessionKey, setSessionKey] = useState(0);

function handleClose() {
  setOpen(false);
  // bump key so next open gets a fresh form + cleared state display
}
// Re-mount the form with key={sessionKey} on open, increment on close
```

Alternatively, wrap the inner form in a component that re-mounts on open by passing `key={open ? sessionKey : 0}`.

---

### WR-03: Redundant auth checks in page components already covered by layout

**File:** `src/app/(admin)/admin/pools/page.tsx:11-12`, `src/app/(admin)/admin/campers/page.tsx:21-23`

**Issue:** `AdminLayout` (`src/app/(admin)/layout.tsx:11-13`) already checks session and redirects non-admins before rendering any children. The per-page auth checks in both page components are unreachable dead code: the layout redirect fires first. This is a maintenance hazard — if the role name or redirect target ever changes, the developer must remember to update both the layout and each individual page. The per-page checks give a false sense of defense-in-depth but provide none in practice.

**Fix:** Remove the duplicate auth checks from `pools/page.tsx` (lines 11–12) and `campers/page.tsx` (lines 21–23). Auth is fully delegated to the layout.

---

### WR-04: `sql<number>` type annotation is wrong for PostgreSQL `count(*)`

**File:** `src/app/(admin)/admin/campers/page.tsx:46`

**Issue:** PostgreSQL returns `count(*)` as `bigint`, which the `pg` driver delivers to JavaScript as a `string` (to avoid 64-bit integer loss). The generic `sql<number>` annotation tells TypeScript this field is a `number`, which is incorrect. Line 49 uses `Number(totalResult[0]?.count ?? 0)` which happens to coerce the string correctly at runtime, but the type annotation is wrong and will mislead any future code that uses `.count` without the `Number()` wrapper.

```typescript
// Change the generic to string:
db.select({ count: sql<string>`count(*)` }).from(camper).where(where),

// Line 49 stays the same and is then correct:
const total = Number(totalResult[0]?.count ?? 0);
```

## Info

### IN-01: `CamperTable` renders bunk in both the Name column and the dedicated Bunk column

**File:** `src/app/(admin)/admin/campers/components/CamperTable.tsx:74,80`

**Issue:** The Name column cell renders `{c.firstName} {c.lastName} · {c.bunk}` (line 74), embedding the bunk inline with the name. Line 80 also renders `{c.bunk}` in the dedicated Bunk column. The same value appears twice in every row. If this is intentional, the pattern is confusing; if accidental, the inline bunk in the Name column should be removed.

**Fix:** Remove `· {c.bunk}` from line 74 to keep name and bunk in their respective columns.

---

### IN-02: Error detection in camper modals relies on server error string parsing

**File:** `src/app/(admin)/admin/campers/components/AddCamperModal.tsx:21-22`, `src/app/(admin)/admin/campers/components/EditCamperModal.tsx:33-34`

**Issue:** Both modals detect a duplicate-code constraint violation by checking `msg.includes("duplicate") || msg.includes("unique")`. This couples client display logic to internal DB/ORM error message wording, which is not part of any stable API. A Drizzle or pg driver upgrade that changes error formatting would silently break this discrimination, causing all constraint violations to fall through to the generic "Could not add camper" message.

**Fix:** Wrap the server action with a structured error type (e.g., throw a tagged object or return `{ success: false; code: "DUPLICATE_CODE" }`), then switch on the code in the component.

---

### IN-03: Invalid rows are appended to `parsed` before the error gate

**File:** `src/app/(admin)/admin/campers/actions.ts:186-194`

**Issue:** The `parsed.push({ ... })` call at the end of the row loop runs for every row regardless of whether errors were collected for that row. Rows with blank codes, bunk, or names are still pushed (with their blank/empty field values) into `parsed`. The guard at line 197 prevents `parsed` from ever being used when errors exist, so there is no correctness bug, but the code implies that `parsed` contains validated data when it may not.

**Fix:** Wrap the `parsed.push` in `else` logic (i.e., only push when the row has no errors), or collect errors and valid rows separately.

---

_Reviewed: 2026-06-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
