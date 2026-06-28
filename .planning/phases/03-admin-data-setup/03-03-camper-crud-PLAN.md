---
phase: 03-admin-data-setup
plan: "03"
type: execute
wave: 2
depends_on:
  - 03-01
files_modified:
  - src/app/(admin)/admin/campers/page.tsx
  - src/app/(admin)/admin/campers/actions.ts
  - src/app/(admin)/admin/campers/actions.test.ts
  - src/app/(admin)/admin/campers/page.test.tsx
  - src/app/(admin)/admin/campers/components/CamperTable.tsx
  - src/app/(admin)/admin/campers/components/AddCamperModal.tsx
  - src/app/(admin)/admin/campers/components/EditCamperModal.tsx
  - src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx
  - src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx
autonomous: true
requirements:
  - CAMP-03
  - CAMP-04
  - CAMP-05

must_haves:
  truths:
    - "addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction all call requireAdmin() and throw 'Unauthorized' for non-admin"
    - "All camper mutations call revalidatePath('/admin/campers') before returning"
    - "addCamperAction rejects a request where code is blank"
    - "CamperTable renders columns: First Name, Last Name, Code, Bunk, Notes, Actions"
    - "Empty bunk or notes fields display '—' in the table"
    - "Each table row has Edit and Remove action triggers"
    - "ClearAllCampersDialog shows heading 'Clear all campers?' with cancel 'Keep roster' and confirm 'Clear all campers'"
    - "CamperDeleteDialog shows heading 'Remove [First Last]?' with cancel 'Keep camper' and confirm 'Remove camper'"
    - "npm test passes with action and page tests green"
  artifacts:
    - path: "src/app/(admin)/admin/campers/actions.ts"
      provides: "addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction"
      exports:
        - addCamperAction
        - editCamperAction
        - removeCamperAction
        - clearAllCampersAction
    - path: "src/app/(admin)/admin/campers/page.tsx"
      provides: "Basic camper admin page (no search/pagination — added in Plan 04)"
    - path: "src/app/(admin)/admin/campers/components/CamperTable.tsx"
      provides: "Client table with 6 columns + action buttons"
    - path: "src/app/(admin)/admin/campers/components/AddCamperModal.tsx"
      provides: "Modal to add a camper with 5 fields (3 required, 2 optional)"
    - path: "src/app/(admin)/admin/campers/components/EditCamperModal.tsx"
      provides: "Modal to edit an existing camper (pre-filled, includes hidden id)"
    - path: "src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx"
      provides: "Confirmation dialog for single camper removal"
    - path: "src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx"
      provides: "Confirmation dialog for clearing the entire roster"
  key_links:
    - from: "src/app/(admin)/admin/campers/page.tsx"
      to: "src/app/(admin)/admin/campers/actions.ts"
      via: "server action calls in ClearAllCampersDialog and AddCamperModal"
      pattern: "clearAllCampersAction|addCamperAction"
    - from: "src/app/(admin)/admin/campers/actions.ts"
      to: "src/db/index.ts"
      via: "import { db } from '@/db'"
      pattern: "db\\.insert|db\\.update|db\\.delete"
---

<objective>
Deliver the camper CRUD vertical slice — from Server Actions through UI — so admin can add, edit, and remove individual campers and clear the entire roster. This plan delivers CAMP-03, CAMP-04, CAMP-05 with full working UI. Search, pagination, and Excel import (CAMP-01, CAMP-02, CAMP-06) are added in Plan 04.

Purpose: A working camper roster management screen is the prerequisite for Plan 04's search and import features. Delivering CRUD first keeps each plan focused and verifiable.

Output: Camper Server Actions with requireAdmin, a campers admin page, CamperTable component, Add/Edit modals, Delete/ClearAll dialogs, and Vitest tests.
</objective>

<execution_context>
@C:/Users/darum/AppData/Roaming/npm/node_modules/@anthropic/claude-code/../../../.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/darum/AppData/Roaming/npm/node_modules/@anthropic/claude-code/../../../.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-admin-data-setup/03-CONTEXT.md
@.planning/phases/03-admin-data-setup/03-RESEARCH.md
@.planning/phases/03-admin-data-setup/03-PATTERNS.md
@.planning/phases/03-admin-data-setup/03-UI-SPEC.md
@.planning/phases/03-admin-data-setup/03-01-SUMMARY.md

<interfaces>
<!-- camper table from schema.ts (created in Plan 01): columns: id text pk, firstName text("first_name") notNull, lastName text("last_name") notNull, code text notNull unique, bunk text nullable, notes text nullable, createdAt, updatedAt -->
<!-- db import: import { db } from "@/db" -->
<!-- camper import: import { camper } from "@/db/schema" -->
<!-- eq import: import { eq } from "drizzle-orm" -->

<!-- requireAdmin() — copy verbatim from src/app/(admin)/admin/users/actions.ts lines 7-13 (not exported) -->

<!-- FORM FIELD NAMES for addCamperAction and editCamperAction (FormData keys): -->
<!-- "first-name", "last-name", "code", "bunk", "notes", "id" (hidden, for edit only) -->

<!-- Camper type used in components: { id: string; firstName: string; lastName: string; code: string; bunk: string | null; notes: string | null; createdAt: Date; updatedAt: Date } -->

<!-- Modal overlay: "fixed inset-0 bg-black/50 flex items-center justify-center z-50" -->
<!-- Modal card (form modals): "bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm" -->
<!-- Input class: "min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" -->
<!-- Primary button: "min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed" -->
<!-- Destructive button: "min-h-[44px] px-4 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md" -->
<!-- Cancel button (dialogs): "min-h-[44px] px-4 border border-slate-300 rounded-md text-base text-slate-700 hover:bg-slate-50" -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Camper Server Actions + action tests</name>
  <files>
    src/app/(admin)/admin/campers/actions.ts,
    src/app/(admin)/admin/campers/actions.test.ts
  </files>
  <behavior>
    - addCamperAction(non-admin session, formData) → throws "Unauthorized"
    - addCamperAction(admin, formData with blank code) → throws (validation error)
    - addCamperAction(admin, valid formData) → calls db.insert(camper) and revalidatePath("/admin/campers")
    - editCamperAction(non-admin, formData) → throws "Unauthorized"
    - editCamperAction(admin, valid formData with id) → calls db.update(camper).set(...).where(eq(camper.id, id)) and revalidatePath("/admin/campers")
    - removeCamperAction(non-admin, camperId) → throws "Unauthorized"
    - removeCamperAction(admin, camperId) → calls db.delete(camper).where(eq(camper.id, camperId)) and revalidatePath("/admin/campers")
    - clearAllCampersAction(non-admin) → throws "Unauthorized"
    - clearAllCampersAction(admin) → calls db.delete(camper) (no where clause) and revalidatePath("/admin/campers")
  </behavior>
  <read_first>
    - src/app/(admin)/admin/users/actions.ts — requireAdmin() verbatim (lines 7-13); revalidatePath pattern
    - src/app/(admin)/admin/users/actions.test.ts — mock block structure and dynamic import pattern; requireAdmin rejection shape; revalidatePath assertion shape
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — sections for campers/actions.ts and actions.test.ts
    - src/db/schema.ts — confirm camper export name and column names before writing imports
  </read_first>
  <action>
Create src/app/(admin)/admin/campers/actions.ts:
- "use server" directive line 1.
- Imports: headers from "next/headers"; revalidatePath from "next/cache"; auth from "@/lib/auth"; db from "@/db"; camper from "@/db/schema"; eq from "drizzle-orm".
- requireAdmin() function — copy verbatim from users/actions.ts, not exported.
- addCamperAction(formData: FormData): await requireAdmin(); read FormData keys "first-name", "last-name", "code", "bunk", "notes" — all .trim(); if !firstName or !lastName or !code throw new Error("First name, last name, and code are required"); await db.insert(camper).values({ id: crypto.randomUUID(), firstName, lastName, code, bunk: bunk || null, notes: notes || null }); revalidatePath("/admin/campers").
- editCamperAction(formData: FormData): await requireAdmin(); read "id", "first-name", "last-name", "code", "bunk", "notes"; validate firstName/lastName/code non-empty; await db.update(camper).set({ firstName, lastName, code, bunk: bunk || null, notes: notes || null }).where(eq(camper.id, id)); revalidatePath("/admin/campers").
- removeCamperAction(camperId: string): await requireAdmin(); await db.delete(camper).where(eq(camper.id, camperId)); revalidatePath("/admin/campers").
- clearAllCampersAction(): await requireAdmin(); await db.delete(camper); revalidatePath("/admin/campers").

Create src/app/(admin)/admin/campers/actions.test.ts:
- Follow the exact mock block structure from users/actions.test.ts: vi.mock for "@/lib/auth", "next/headers", "next/cache", "@/db" (with db object having select/insert/update/delete/transaction vi.fn()). Also vi.mock("@/db/schema") if needed (or return the camper object from the @/db mock context).
- beforeEach: vi.resetAllMocks().
- Helper to mock admin session: vi.mocked(auth.api.getSession).mockResolvedValue({ user: { role: "admin", id: "u1" } } as any).
- Tests (minimum 8): addCamperAction rejects null session; addCamperAction calls revalidatePath("/admin/campers") on success (mock db.insert chain); editCamperAction rejects non-admin; editCamperAction calls revalidatePath on success; removeCamperAction rejects non-admin; removeCamperAction calls db.delete and revalidatePath; clearAllCampersAction rejects non-admin; clearAllCampersAction calls db.delete and revalidatePath.
- For db.insert/update/delete mocks: chain the return value so .values() / .set().where() / (no chain for delete table-level) resolves. See users/actions.test.ts for the chainable mock pattern.
  </action>
  <verify>
    <automated>npm test -- campers/actions.test 2>&1 | grep -E "passed|failed|Tests"</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/campers/actions.ts exports: addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction
    - actions.ts contains requireAdmin() (non-exported)
    - All four actions call revalidatePath("/admin/campers")
    - actions.test.ts has at least 8 test cases
    - npm test output shows camper action tests passing (0 failures)
  </acceptance_criteria>
  <done>Camper action tests green (8+ cases); all four actions guard with requireAdmin and call revalidatePath.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Campers page + CamperTable + AddCamperModal + EditCamperModal + delete dialogs + page test</name>
  <files>
    src/app/(admin)/admin/campers/page.tsx,
    src/app/(admin)/admin/campers/page.test.tsx,
    src/app/(admin)/admin/campers/components/CamperTable.tsx,
    src/app/(admin)/admin/campers/components/AddCamperModal.tsx,
    src/app/(admin)/admin/campers/components/EditCamperModal.tsx,
    src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx,
    src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx
  </files>
  <read_first>
    - src/app/(admin)/admin/users/page.tsx — auth guard, db.select query, page shell (max-w-4xl, flex header, h1)
    - src/app/(admin)/admin/users/page.test.tsx — mock pattern for page.tsx server component; async page render with Promise.resolve({}); h1 heading test; empty state test
    - src/app/(admin)/admin/users/components/UserTable.tsx — table structure (bg-white border rounded-md), thead bg-slate-50, th classes, tbody divide-y, td classes, empty state row with colSpan, row map pattern, action column with flex gap-2
    - src/app/(admin)/admin/users/components/CreateUserModal.tsx — trigger button, overlay + card, form structure, useState (open/loading/error), handleSubmit, input labels, primary/cancel button classes, error paragraph role="alert"
    - src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx — full file: two-button dialog (cancel/confirm), open state, trigger, overlay, heading, body text, button pair structure
    - .planning/phases/03-admin-data-setup/03-UI-SPEC.md — Campers Page Layout, Camper Table Columns, Interaction Contract for modals/dialogs, Copywriting Contract (exact copy strings for all camper UI)
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — sections for all camper components
  </read_first>
  <action>
Create src/app/(admin)/admin/campers/page.tsx as async server component (no "use client"):
- Imports: headers, redirect, auth, db, camper from "@/db/schema", desc from "drizzle-orm", plus CamperTable, AddCamperModal, ClearAllCampersDialog from their paths.
- Auth guard: same pattern as users/page.tsx.
- Query: `const campers = await db.select().from(camper).orderBy(desc(camper.createdAt));` (no searchParams or pagination — that is Plan 04's scope).
- Return: main className `bg-white min-h-screen`. Container: div className `max-w-4xl mx-auto p-6`. Header row: div className `flex justify-between items-center mb-6`. Left: h1 "Campers" (text-3xl font-semibold text-slate-900). Right: div className `flex items-center gap-3`, containing ClearAllCampersDialog (red text link trigger) and AddCamperModal (blue button trigger). Below header: CamperTable passing the campers array. Note: SearchBar/PaginationControls/ImportModal are Plan 04 — do not add them now.

Create src/app/(admin)/admin/campers/components/CamperTable.tsx as "use client":
- Type Camper: { id: string; firstName: string; lastName: string; code: string; bunk: string | null; notes: string | null }.
- Props: { campers: Camper[] }.
- Table wrapper: div className `bg-white border border-slate-200 rounded-md overflow-hidden mt-8`. Table className `w-full`. thead: tr className `bg-slate-50`, six th elements (First Name / Last Name / Code / Bunk / Notes / Actions) each with className `text-sm font-semibold text-slate-900 px-4 py-3 text-left`.
- Empty state: when campers.length === 0, tr with td colSpan={6}, inside: div className `px-4 py-12 text-center`, p className `text-base font-semibold text-slate-900 mb-1` "No campers yet", p className `text-base text-slate-500` "Upload a spreadsheet or add campers one at a time."
- Row map: each tr with key={c.id}. td cells className `text-base text-slate-900 px-4 py-3`. Name cells: separate First Name and Last Name columns. Code: display as-is (string). Bunk: `c.bunk ?? "—"`. Notes: `c.notes ? (c.notes.length > 48 ? c.notes.slice(0, 48) + "…" : c.notes) : "—"`. Actions td: div className `flex items-center gap-2`, containing EditCamperModal (pass camper={c}) and CamperDeleteDialog (pass camperId={c.id} name={`${c.firstName} ${c.lastName}`}).

Create src/app/(admin)/admin/campers/components/AddCamperModal.tsx as "use client":
- Trigger button: className `min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150`, text "Add camper".
- State: open bool, loading bool, error string|null.
- handleSubmit(e: FormEvent): e.preventDefault(); setLoading(true); setError(null); try { await addCamperAction(new FormData(e.currentTarget)); setOpen(false); (e.currentTarget as HTMLFormElement).reset(); } catch (err) { const msg = err instanceof Error ? err.message : ""; setError(msg.includes("duplicate") || msg.includes("unique") ? "That code is already in use. Choose a different code." : "Could not add camper. Please try again."); } finally { setLoading(false); }.
- Modal: overlay + card. h2 "Add camper" text-xl font-semibold text-slate-900 text-center mb-8. Form fields with labels: First Name (name="first-name", required), Last Name (name="last-name", required), Code (name="code", required), Bunk (name="bunk", optional — label suffix " (optional)"), Notes (name="notes", optional — textarea, 3 rows, same border class but without min-h-[44px]; use py-2 px-3 instead). Each label className `text-base font-semibold text-slate-900`. Error paragraph role="alert" className `text-base text-red-600`. Primary button "Add camper" disabled when loading; loading text "Saving...". Close link below button.

Create src/app/(admin)/admin/campers/components/EditCamperModal.tsx as "use client":
- Same structure as AddCamperModal. Props: { camper: Camper }.
- Trigger: button text "Edit" className `text-base text-slate-600 hover:text-slate-900 min-h-[44px] flex items-center`.
- h2 "Edit camper". Hidden input name="id" value={camper.id}. All inputs pre-filled with defaultValue from camper prop. Submit calls editCamperAction. Primary button "Save camper". On success: setOpen(false).

Create src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx as "use client":
- Props: { camperId: string; name: string }.
- Trigger: button text "Remove" className `text-base text-red-600 hover:underline min-h-[44px] flex items-center`.
- State: open bool, loading bool.
- Dialog: overlay + card (bg-white, not bg-slate-50 — this is a dialog, not a form). h2 `Remove ${name}?` className `text-xl font-semibold text-slate-900 text-center mb-4`. p body "They will be permanently removed from the roster. This cannot be undone." className `text-base text-slate-700 text-center mb-6`. Button row div className `flex gap-3 justify-center`. Cancel button "Keep camper" (border-slate-300 pattern). Confirm button "Remove camper" (bg-red-600). Confirm click: setLoading(true); await removeCamperAction(camperId); setOpen(false); setLoading(false).

Create src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx as "use client":
- Trigger: button text "Clear all campers" className `text-base text-red-600 hover:underline min-h-[44px] flex items-center`.
- State: open bool, loading bool.
- Dialog: overlay + card (bg-white). h2 "Clear all campers?" (text-xl font-semibold). p body "This will permanently remove all campers from the roster. This cannot be undone." Button row: cancel "Keep roster" (slate border) + confirm "Clear all campers" (bg-red-600). Confirm: setLoading(true); await clearAllCampersAction(); setOpen(false); setLoading(false).

Create src/app/(admin)/admin/campers/page.test.tsx:
- Follow users/page.test.tsx mock pattern. Mock @/lib/auth, next/headers, next/navigation (redirect), @/db, and all client components with simple stubs.
- Test 1: renders h1 "Campers" — `const jsx = await CampersPage({}); render(jsx); expect(screen.getByRole("heading", { name: /Campers/i })).toBeInTheDocument();`
- Test 2: renders CamperTable when campers array is empty — CamperTable stub renders "No campers yet" when given empty array; verify it appears.
  </action>
  <verify>
    <automated>npm test 2>&1 | grep -E "passed|failed|Tests" | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/campers/page.tsx exists as async server component (no "use client")
    - All 7 component files exist in src/app/(admin)/admin/campers/components/
    - CamperTable.tsx contains "No campers yet" empty state text
    - CamperTable.tsx contains column headers: "First Name", "Last Name", "Code", "Bunk", "Notes", "Actions"
    - ClearAllCampersDialog.tsx contains "Clear all campers?" heading and "Keep roster" cancel text
    - CamperDeleteDialog.tsx contains "Keep camper" cancel text and "Remove camper" confirm text
    - AddCamperModal.tsx contains fields with name="first-name", name="last-name", name="code", name="bunk", name="notes"
    - EditCamperModal.tsx contains hidden `name="id"` input
    - page.test.tsx exists with at least 2 test cases
    - npm test exits 0 (all tests green including action tests from Task 1 and page tests)
    - npm run build exits 0
  </acceptance_criteria>
  <done>Campers page renders with CamperTable, AddCamperModal trigger, ClearAllCampersDialog trigger; Edit and Remove work per row; npm test and npm run build both exit 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → addCamperAction / editCamperAction | Untrusted firstName, lastName, code, bunk, notes from FormData |
| Browser → removeCamperAction / clearAllCampersAction | Untrusted camperId; clearAll has no id (whole-table delete) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-03-E | Elevation of Privilege | addCamperAction / editCamperAction / removeCamperAction / clearAllCampersAction | mitigate | requireAdmin() first statement in all four actions; throws "Unauthorized" before any DB write |
| T-03-03-T | Tampering | camper.code — duplicate code injection | mitigate | In-action non-empty check; DB unique constraint on camper.code is safety net; error message exposes no internal detail |
| T-03-03-T | Tampering | clearAllCampersAction — destructive full delete | mitigate | requireAdmin() guard; ClearAllCampersDialog requires explicit confirmation click (two-step UX); cannot be triggered by GET request |
| T-03-03-T | Tampering | SQL injection via name/code fields | mitigate | Drizzle parameterized queries exclusively; no raw SQL strings constructed from user input |
| T-03-03-S | Spoofing | CSRF on Server Actions | accept | Next.js origin check built-in for Server Actions (no same-origin bypass possible from external sites) |
| T-03-03-I | Information Disclosure | Camper list — unauthenticated access | mitigate | Auth guard in page.tsx redirects before any DB query; actions.ts guard independently enforces at mutation level |
  T-03-03-SC | Tampering | npm/pip/cargo installs | accept | No new packages installed in this plan |
</threat_model>

<verification>
After both tasks complete:
- `npm test` exits 0 — camper action tests (8+ cases) and page tests (2+ cases) all green
- `npm run build` exits 0
- /admin/campers renders the Campers page with full header row (Clear all / Add camper), CamperTable (empty state visible if no campers), no search or import UI (those are Plan 04)
- AddCamperModal opens, form submits, camper appears in table after revalidation
- EditCamperModal opens pre-filled, saves successfully
- CamperDeleteDialog confirmation removes the camper
- ClearAllCampersDialog confirmation clears all campers (only after clicking "Clear all campers" confirm)
</verification>

<success_criteria>
- addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction all reject non-admin with "Unauthorized"
- All four actions call revalidatePath("/admin/campers")
- CamperTable shows 6 columns with correct empty/null display ("—" for bunk/notes)
- AddCamperModal collects first-name, last-name, code (required), bunk, notes (optional)
- EditCamperModal passes hidden id field and pre-fills all values
- ClearAllCampersDialog uses exact copy: heading "Clear all campers?", cancel "Keep roster", confirm "Clear all campers"
- CamperDeleteDialog uses exact copy: heading "Remove [Name]?", cancel "Keep camper", confirm "Remove camper"
- npm test exits 0 (8+ action tests + 2+ page tests green)
- npm run build exits 0
</success_criteria>

<output>
Create `.planning/phases/03-admin-data-setup/03-03-SUMMARY.md` when done.
</output>
