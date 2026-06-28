---
phase: 03-admin-data-setup
reviewed: 2026-06-28T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - public/sample-roster.xlsx
  - scripts/generate-sample-template.ts
  - src/app/(admin)/admin/campers/actions.test.ts
  - src/app/(admin)/admin/campers/actions.ts
  - src/app/(admin)/admin/campers/components/CamperTable.tsx
  - src/app/(admin)/admin/campers/components/ImportModal.tsx
  - src/app/(admin)/admin/campers/components/PaginationControls.tsx
  - src/app/(admin)/admin/campers/components/SearchBar.tsx
  - src/app/(admin)/admin/campers/page.test.tsx
  - src/app/(admin)/admin/campers/page.tsx
  - src/app/(admin)/layout.tsx
  - src/components/AdminSidebar.tsx
  - src/db/schema.ts
findings:
  critical: 2
  warning: 4
  info: 1
  total: 7
status: issues_found
---

# Code Review: Phase 03 — admin-data-setup

**Reviewed:** 2026-06-28
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the DB schema, server actions, page component, all camper-related UI components,
tests, and the sample template generation script. The overall structure is sound: server
actions consistently enforce admin auth, Drizzle uses parameterized queries throughout (no SQL
injection surface), and the import pipeline is all-or-nothing before any DB write. Test
coverage for the actions is thorough.

Two critical defects exist in `importCampersAction`. First, a missing validation gate for blank
`Preferred Name` allows empty `firstName` values to reach the DB insert, which either silently
stores empty-string first names (bypassing the intent of the NOT NULL constraint) or crashes
on other constraints. Second, merge mode reads existing codes outside the transaction, creating
a TOCTOU window where concurrent imports can cause an unhandled unique-constraint crash.

Four warnings cover: a silent no-op in `editCamperAction` when the `id` field is empty, bunk
rendered redundantly in both the Name cell and the Bunk column of `CamperTable`, stale action
state persisting when `ImportModal` is closed and reopened, and `SearchBar` discarding all URL
params on each keystroke (inconsistent with `PaginationControls`). One info item flags that the
sample template script does not type SwimCode cells as text, so Excel auto-strips leading zeros
when users open and re-save the file.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-001 | Critical | actions.ts:170-197

**File:** `src/app/(admin)/admin/campers/actions.ts:170`

**Issue:** `importCampersAction` validates `lastNameNorm`, `swimCode`, and `bunkValue` but
never checks whether `firstName` is blank. When a row has an empty "Preferred Name" cell,
`preferredName` is `""`, `toTitleCase("")` returns `""` (the `.filter(Boolean)` inside drops
every token), and `firstName` is `""`. The row still passes all validation checks and is
appended to `parsed` (line 187). The `camper` schema declares `first_name` as `.notNull()`
(schema.ts line 108), but an empty string satisfies a NOT NULL constraint in Postgres. A
camper with `first_name = ''` is inserted — or, if other DB constraints exist on empty names
in the future, the insert throws an unhandled exception and the action crashes instead of
returning a clean `{ success: false, errors: [...] }`.

The test suite has no case covering blank Preferred Name, so this gap is invisible in CI.

**Fix:** Add a firstName guard alongside the other row checks (after line 172):
```ts
if (!firstName) errors.push(`Row ${rowNum}: Preferred Name is blank`);
```

---

### CR-002 | Critical | actions.ts:219-237

**File:** `src/app/(admin)/admin/campers/actions.ts:219`

**Issue:** Merge mode has a TOCTOU race condition. The set of existing codes is fetched
_outside_ the transaction on lines 220-221:
```ts
const existingCodes = new Set(
  (await db.select({ code: camper.code }).from(camper)).map((r) => r.code),
);
```
The conditional insert then runs inside a separate transaction on lines 224-237. A concurrent
import that runs between those two operations can insert the same SwimCode in the window
between the select and the transaction open. When the inner `tx.insert` then tries to insert
that code, Postgres throws a unique-constraint violation (the `code` column carries `.unique()`
in the schema, line 110). This exception propagates uncaught from the server action as a 500
instead of returning `{ success: false, errors: [...] }`.

**Fix:** Move the existing-codes query inside the transaction so read and insert are atomic:
```ts
} else {
  let insertedCount = 0;
  await db.transaction(async (tx) => {
    const existingRows = await tx.select({ code: camper.code }).from(camper);
    const existingCodes = new Set(existingRows.map((r) => r.code));
    const toInsert = parsed.filter((r) => !existingCodes.has(r.code));
    if (toInsert.length > 0) {
      await tx.insert(camper).values(
        toInsert.map((r) => ({
          id: crypto.randomUUID(),
          firstName: r.firstName,
          lastName: r.lastName,
          code: r.code,
          bunk: r.bunk,
          notes: r.notes,
        })),
      );
    }
    insertedCount = toInsert.length;
  });
  revalidatePath("/admin/campers");
  return { success: true, count: insertedCount };
}
```

---

## Warnings

### WR-001 | Warning | actions.ts:50-71

**File:** `src/app/(admin)/admin/campers/actions.ts:50`

**Issue:** `editCamperAction` extracts `id` from FormData with a default of `""` but never
validates that it is non-empty. If the hidden `id` field is missing or blank, line 70 executes:
```ts
db.update(camper).set({...}).where(eq(camper.id, ""))
```
This matches zero rows. No error is thrown, `revalidatePath` fires, and the action resolves as
if the edit succeeded — the camper data is silently discarded. The user has no indication the
edit was a no-op.

**Fix:** Add an early guard after line 50:
```ts
if (!id) throw new Error("Camper ID is required");
```

---

### WR-002 | Warning | CamperTable.tsx:73-80

**File:** `src/app/(admin)/admin/campers/components/CamperTable.tsx:74`

**Issue:** The Name cell (line 74) renders `{c.firstName} {c.lastName} · {c.bunk}`, embedding
bunk inline with the name. The Bunk cell (line 79) then also renders `{c.bunk}`. Bunk appears
in two separate columns on every row. The table has a dedicated "Bunk" column header, making
the inline annotation in the Name cell redundant and inconsistent.

**Fix:** Remove ` · {c.bunk}` from the Name cell:
```tsx
<td className="text-base text-slate-900 px-4 py-3">
  {c.firstName} {c.lastName}
</td>
```

---

### WR-003 | Warning | ImportModal.tsx:8-12

**File:** `src/app/(admin)/admin/campers/components/ImportModal.tsx:8`

**Issue:** `useActionState` result is never cleared when the modal is closed. Closing sets
`open = false` via line 121 but does not reset `state`. When the user reopens the modal,
the previous success message ("Imported N campers successfully.") or error list is immediately
visible before any new action has been taken. This is confusing: the user sees stale feedback
as if a new submission just occurred.

**Fix:** Remount the form on each open by bumping a key counter in the close handler:
```tsx
const [modalKey, setModalKey] = useState(0);

function handleOpen() {
  setModalKey((k) => k + 1);
  setOpen(true);
}
// Replace onClick={() => setOpen(true)} with onClick={handleOpen}

// Pass key to the form so useActionState resets on remount:
<form key={modalKey} action={formAction} className="flex flex-col gap-4">
```

---

### WR-004 | Warning | SearchBar.tsx:16

**File:** `src/app/(admin)/admin/campers/components/SearchBar.tsx:16`

**Issue:** `SearchBar` constructs a brand-new `URLSearchParams()` with no seed, copying only
`q` and `page`. Any other query parameters present in the current URL are silently dropped on
every keystroke. This is inconsistent with `PaginationControls.tsx` line 14, which correctly
seeds from the current URL via `new URLSearchParams(searchParams.toString())`. The component
also does not import `useSearchParams`, which is the established pattern in this codebase.

While the current page only uses `q` and `page`, the divergence from the codebase pattern is
a latent bug — any future query parameter added to the admin campers route would vanish on
search input.

**Fix:**
```tsx
import { useRouter, usePathname, useSearchParams } from "next/navigation";
// ...
const searchParams = useSearchParams();
// Inside handleChange:
const params = new URLSearchParams(searchParams.toString());
if (q) params.set("q", q); else params.delete("q");
params.set("page", "1");
router.push(`${pathname}?${params.toString()}`);
```

---

## Info

### IN-001 | Info | generate-sample-template.ts:5-9

**File:** `scripts/generate-sample-template.ts:5`

**Issue:** The sample roster script writes SwimCode cells without explicitly marking them as
text type (`t: "s"`). When a user opens the generated `public/sample-roster.xlsx` in Microsoft
Excel, Excel auto-detects "042" as a number and displays/saves it as 42, stripping the leading
zero. If the user then re-saves and uploads the file, `importCampersAction` receives "42"
instead of "042", silently breaking any camper whose code has a leading zero.

The unit test at `actions.test.ts:432-433` works around this by explicitly setting
`ws["C2"] = { v: "042", t: "s" }` — the same approach must be applied in the script.

**Fix:**
```ts
const ws = xlsx.utils.aoa_to_sheet([
  ["Last Name", "Preferred Name", "SwimCode", "Bunk"],
  ["Smith", "Jane", "042", "Cabin 3"],
  ["Doe", "John", "101", "Cabin 7"],
]);
// Force SwimCode cells to text type so Excel does not convert to number
ws["C2"] = { v: "042", t: "s" };
ws["C3"] = { v: "101", t: "s" };
```

---

_Reviewed: 2026-06-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
