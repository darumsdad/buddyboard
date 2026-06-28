---
phase: 03-admin-data-setup
plan: "03"
type: execute
wave: 2
depends_on:
  - 03-01
files_modified:
  - src/app/(admin)/admin/campers/actions.ts
  - src/app/(admin)/admin/campers/actions.test.ts
  - src/app/(admin)/admin/campers/page.tsx
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
    - "addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction all throw 'Unauthorized' for non-admin sessions"
    - "All four camper mutations call revalidatePath('/admin/campers')"
    - "addCamperAction rejects blank code, blank last name, and blank bunk (D-08: bunk is required)"
    - "CamperTable Name column displays '[firstName] [lastName] · [bunk]' per D-11 (one combined Name column, not separate First/Last)"
    - "CamperTable Code column displays code as-is (string, never converted to number)"
    - "CamperTable Notes column truncates at 48 chars with ellipsis; empty shows '—'"
    - "AddCamperModal bunk field is required (D-08); form does not submit without a bunk value"
    - "EditCamperModal bunk field is required (D-08) and pre-filled from camper data"
    - "ClearAllCampersDialog: heading 'Clear all campers?', cancel 'Keep roster', confirm 'Clear all campers'"
    - "CamperDeleteDialog: heading 'Remove [firstName lastName]?', cancel 'Keep camper', confirm 'Remove camper'"
    - "npm test exits 0 (8+ action tests, 2+ page tests)"
  artifacts:
    - path: src/app/(admin)/admin/campers/actions.ts
      provides: addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction with requireAdmin guard
      contains: "export async function addCamperAction"
    - path: src/app/(admin)/admin/campers/actions.test.ts
      provides: unit tests for all four camper actions
      contains: "Unauthorized"
    - path: src/app/(admin)/admin/campers/page.tsx
      provides: campers admin page without search/pagination (Plan 04 adds those)
      contains: "Campers"
    - path: src/app/(admin)/admin/campers/page.test.tsx
      provides: async server component rendering tests
      contains: "CampersPage"
    - path: src/app/(admin)/admin/campers/components/CamperTable.tsx
      provides: client table with combined Name column in [firstName] [lastName] · [bunk] format
      contains: "use client"
    - path: src/app/(admin)/admin/campers/components/AddCamperModal.tsx
      provides: modal to add camper (bunk required per D-08)
      contains: "Add camper"
    - path: src/app/(admin)/admin/campers/components/EditCamperModal.tsx
      provides: modal to edit camper (bunk required, pre-filled)
      contains: "Edit camper"
    - path: src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx
      provides: confirmation dialog for single camper removal
      contains: "Keep camper"
    - path: src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx
      provides: confirmation dialog for clearing entire roster
      contains: "Keep roster"
  key_links:
    - from: src/app/(admin)/admin/campers/page.tsx
      to: src/app/(admin)/admin/campers/actions.ts
      via: import { clearAllCampersAction, addCamperAction } through component props
      pattern: "clearAllCampersAction|addCamperAction"
    - from: src/app/(admin)/admin/campers/components/CamperTable.tsx
      to: src/app/(admin)/admin/campers/actions.ts
      via: import { removeCamperAction, editCamperAction }
      pattern: "removeCamperAction|editCamperAction"
    - from: src/app/(admin)/admin/campers/actions.ts
      to: src/db/index.ts
      via: import { db } from "@/db"
      pattern: "db\\.insert|db\\.update|db\\.delete"
---

<objective>
Deliver the camper CRUD vertical slice — from Server Actions through UI — so admin can add, edit, and remove individual campers and clear the entire roster. Incorporates D-08 (bunk required on add/edit form and enforced in actions) and D-11 (name disambiguation display format "[firstName] [lastName] · [bunk]" in CamperTable).

Purpose: This plan establishes the camper CRUD infrastructure that Plan 04 extends with search, pagination, and Excel import. Runs in parallel with 03-02 (pools). Both depend only on 03-01.

Output: Camper Server Actions (4 actions with requireAdmin), action tests, campers admin page, CamperTable (combined Name column with bunk), Add/Edit modals (bunk required), delete dialogs, and page tests.
</objective>

<execution_context>
@C:/Users/darum/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/darum/.claude/get-shit-done/templates/summary.md
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
<!-- camper table from schema.ts (created in 03-01, bunk is NOT NULL per D-08): -->
export const camper = pgTable("camper", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  code: text("code").notNull().unique(),
  bunk: text("bunk").notNull(),   // NOT NULL — required per D-08
  notes: text("notes"),           // nullable
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")...,
}, ...);

<!-- Camper TypeScript type (inferred from NOT NULL schema): -->
type Camper = {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  bunk: string;        // NOT nullable — DB enforces NOT NULL
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

<!-- D-11 Name disambiguation format (used in CamperTable Name column): -->
`${c.firstName} ${c.lastName} · ${c.bunk}`

<!-- requireAdmin() — copy verbatim from src/app/(admin)/admin/users/actions.ts lines 7-13 -->

<!-- FORM FIELD NAMES for addCamperAction and editCamperAction (FormData keys): -->
"first-name", "last-name", "code", "bunk", "notes", "id" (hidden, edit only)

<!-- Modal overlay + card shell: -->
"fixed inset-0 bg-black/50 flex items-center justify-center z-50"
"bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm"   (form modals)
"bg-white rounded-lg p-8 w-full max-w-sm shadow-sm"       (confirm dialogs)

<!-- Standard input class: -->
"min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"

<!-- Primary button class: -->
"min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"

<!-- Destructive confirm button class: -->
"min-h-[44px] px-4 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md"

<!-- Cancel button (dialogs): -->
"min-h-[44px] px-4 border border-slate-300 rounded-md text-base text-slate-700 hover:bg-slate-50"

<!-- Vitest mock template from PATTERNS.md: -->
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
}));
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
    - addCamperAction(non-admin, formData) → throws "Unauthorized"
    - addCamperAction(admin, formData with blank code) → throws validation error
    - addCamperAction(admin, formData with blank bunk) → throws validation error (D-08: bunk required)
    - addCamperAction(admin, valid formData: first-name="Noah", last-name="Schwartz", code="042", bunk="Cabin 3") → calls db.insert(camper) with those values and calls revalidatePath("/admin/campers")
    - editCamperAction(non-admin, formData) → throws "Unauthorized"
    - editCamperAction(admin, formData with id="c1", all fields valid) → calls db.update(camper).set({...}).where(eq(camper.id, "c1")) and calls revalidatePath("/admin/campers")
    - removeCamperAction(non-admin, "c1") → throws "Unauthorized"
    - removeCamperAction(admin, "c1") → calls db.delete(camper).where(eq(camper.id, "c1")) and calls revalidatePath("/admin/campers")
    - clearAllCampersAction(non-admin) → throws "Unauthorized"
    - clearAllCampersAction(admin) → calls db.delete(camper) (no .where clause — deletes all) and calls revalidatePath("/admin/campers")
  </behavior>
  <read_first>
    - src/app/(admin)/admin/users/actions.ts — read the full file; requireAdmin() function is lines 7-13; copy verbatim
    - src/app/(admin)/admin/users/actions.test.ts — read the full file; mock block structure, dynamic import pattern inside tests, requireAdmin rejection test shape, revalidatePath assertion shape
    - src/db/schema.ts — confirm camper export name and column names (code, bunk, etc.)
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — sections for campers/actions.ts and actions.test.ts (mock template, test shapes)
    - .planning/phases/03-admin-data-setup/03-CONTEXT.md — D-08 (bunk required), D-11 (code preserved as string)
  </read_first>
  <action>
    Create src/app/(admin)/admin/campers/actions.ts:
    - "use server" directive line 1
    - Imports: headers from "next/headers"; revalidatePath from "next/cache"; auth from "@/lib/auth"; db from "@/db"; camper from "@/db/schema"; eq from "drizzle-orm"
    - Non-exported requireAdmin() — copy verbatim from users/actions.ts lines 7-13 (exact same text)
    - addCamperAction(formData: FormData): await requireAdmin(); extract and trim: firstName = (formData.get("first-name") as string ?? "").trim(), lastName = (formData.get("last-name") as string ?? "").trim(), code = (formData.get("code") as string ?? "").trim(), bunk = (formData.get("bunk") as string ?? "").trim(), notes = (formData.get("notes") as string ?? "").trim(); validate: if (!firstName || !lastName) throw new Error("First name and last name are required"); if (!code) throw new Error("Code is required"); if (!bunk) throw new Error("Bunk is required"); await db.insert(camper).values({ id: crypto.randomUUID(), firstName, lastName, code, bunk, notes: notes || null }); revalidatePath("/admin/campers");
    - editCamperAction(formData: FormData): await requireAdmin(); extract id plus same fields as addCamperAction; same validation (firstName, lastName, code, bunk all required); await db.update(camper).set({ firstName, lastName, code, bunk, notes: notes || null }).where(eq(camper.id, id)); revalidatePath("/admin/campers");
    - removeCamperAction(camperId: string): await requireAdmin(); await db.delete(camper).where(eq(camper.id, camperId)); revalidatePath("/admin/campers");
    - clearAllCampersAction(): await requireAdmin(); await db.delete(camper); revalidatePath("/admin/campers");

    Note: importCampersAction is NOT in this file yet — it is added in Plan 04 to keep context budget manageable.

    Create src/app/(admin)/admin/campers/actions.test.ts:
    - Place all vi.mock calls before imports, following the exact structure from users/actions.test.ts
    - vi.mock("@/db", ...) with db object having select/insert/update/delete/transaction as vi.fn()
    - beforeEach: vi.resetAllMocks() (not clearAllMocks — reset removes implementations too; re-apply admin session mock inside each test via mockResolvedValueOnce)
    - Use dynamic imports: const { auth } = await import("@/lib/auth"); const { addCamperAction } = await import("./actions"); inside each test
    - Helper: mock admin session as vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { role: "admin", id: "u1" } } as any)
    - For db.insert mock chain: vi.mocked(db.insert).mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) } as any)
    - For db.update mock chain: vi.mocked(db.update).mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) } as any)
    - For db.delete mock chain: vi.mocked(db.delete).mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) } as any) (and for clearAll: db.delete returns something that resolves directly with no .where)
    - Test all 10 behaviors listed in the behavior block above
  </action>
  <verify>
    <automated>npm test -- campers/actions.test 2>&1 | grep -E "passed|failed|Tests"</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/campers/actions.ts exports: addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction
    - actions.ts contains requireAdmin() (not exported)
    - actions.ts contains validation for blank bunk: grep for `!bunk` or `Bunk is required`
    - All four actions contain revalidatePath("/admin/campers")
    - actions.test.ts exists with at least 10 test cases
    - npm test shows camper action tests passing with 0 failures
  </acceptance_criteria>
  <done>10+ camper action tests green; all four actions guard with requireAdmin, validate bunk as required (D-08), and call revalidatePath.</done>
</task>

<task type="auto">
  <name>Task 2: Camper page shell + CamperTable + Add/Edit modals + delete dialogs + page test</name>
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
    - src/app/(admin)/admin/users/page.tsx — read the full file; auth guard, db.select query, page container class (max-w-4xl mx-auto p-6), flex justify-between header, h1 class
    - src/app/(admin)/admin/users/page.test.tsx — read the full file; mock block, async page render pattern (await CampersPage({}); render(jsx)), heading assertion
    - src/app/(admin)/admin/users/components/UserTable.tsx — read the full file; table wrapper div, thead bg-slate-50, th class, tbody divide-y, td class, empty state row colSpan pattern
    - src/app/(admin)/admin/users/components/CreateUserModal.tsx — read the full file; trigger button, overlay + card, useState (open/loading/error), handleSubmit pattern, label class, input class, primary button, close link
    - src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx — read the full file; trigger, overlay, heading, body text, two-button flex row (cancel left / red right), loading state
    - .planning/phases/03-admin-data-setup/03-UI-SPEC.md — Campers Page Layout; Camper Table Columns; Interaction Contract; Copywriting Contract (all camper strings verbatim)
    - .planning/phases/03-admin-data-setup/03-CONTEXT.md — D-08 (bunk required in forms), D-11 (name display format)
  </read_first>
  <action>
    Create src/app/(admin)/admin/campers/page.tsx as async server component (NO "use client"):
    - Imports: headers from "next/headers"; redirect from "next/navigation"; auth from "@/lib/auth"; db from "@/db"; camper from "@/db/schema"; desc from "drizzle-orm"; CamperTable from "./components/CamperTable"; AddCamperModal from "./components/AddCamperModal"; ClearAllCampersDialog from "./components/ClearAllCampersDialog"
    - Auth guard: same pattern as users/page.tsx (getSession + redirect if null or non-admin)
    - Query: `const campers = await db.select().from(camper).orderBy(desc(camper.createdAt));` — no searchParams or pagination yet (Plan 04 adds these)
    - Return: main className `bg-white min-h-screen`. Container: div className `max-w-4xl mx-auto p-6`. Header: div className `flex justify-between items-center mb-6` containing h1 "Campers" (className `text-3xl font-semibold text-slate-900`) on left; div className `flex items-center gap-3` on right with ClearAllCampersDialog and AddCamperModal. Below header: CamperTable passing campers prop. Note: no SearchBar/PaginationControls/ImportModal in this plan.

    Create src/app/(admin)/admin/campers/components/CamperTable.tsx as "use client":
    - Imports: CamperDeleteDialog and EditCamperModal from same directory; addCamperAction not needed here
    - Type Camper (matches NOT NULL schema from 03-01): { id: string; firstName: string; lastName: string; code: string; bunk: string; notes: string | null }
    - Props: { campers: Camper[] }
    - Table wrapper: div className `bg-white border border-slate-200 rounded-md overflow-hidden mt-8`
    - table className `w-full`. thead tr className `bg-slate-50`. FIVE th elements: "Name" / "Code" / "Bunk" / "Notes" / "Actions" — all with className `text-sm font-semibold text-slate-900 px-4 py-3 text-left`
    - IMPORTANT: The "Name" column is ONE column that displays `{c.firstName} {c.lastName} · {c.bunk}` per D-11 (name disambiguation format — bunk always shown alongside name to distinguish campers with same name in different bunks). Do NOT use separate First Name and Last Name columns.
    - Empty state (campers.length === 0): tr with td colSpan={5}, inside a div className `px-4 py-12 text-center`: p className `text-base font-semibold text-slate-900 mb-1` text "No campers yet"; p className `text-base text-slate-500` text "Upload a spreadsheet or add campers one at a time."
    - Row map: tr key={c.id}. All td className `text-base text-slate-900 px-4 py-3`. Name td: `{c.firstName} {c.lastName} · {c.bunk}`. Code td: {c.code} (string, never converted). Bunk td: {c.bunk} (always a string since NOT NULL). Notes td: `{c.notes ? (c.notes.length > 48 ? c.notes.slice(0, 48) + "…" : c.notes) : "—"}`. Actions td: div className `flex items-center gap-2`, containing EditCamperModal (camper={c}) and CamperDeleteDialog (camperId={c.id} name={`${c.firstName} ${c.lastName}`}).

    Create src/app/(admin)/admin/campers/components/AddCamperModal.tsx as "use client":
    - Import addCamperAction from "../actions"
    - Trigger button: className `min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150` text "Add camper"
    - State: open bool, loading bool, error string|null
    - handleSubmit: prevent default; setLoading(true); setError(null); try { await addCamperAction(new FormData(e.currentTarget)); setOpen(false); (e.currentTarget as HTMLFormElement).reset(); } catch(err) { const msg = err instanceof Error ? err.message : ""; setError(msg.includes("duplicate") || msg.includes("unique") ? "That code is already in use. Choose a different code." : (msg.includes("Bunk") ? "Bunk is required." : "Could not add camper. Please try again.")); } finally { setLoading(false); }
    - Modal: overlay + card (bg-slate-50). h2 "Add camper" (text-xl font-semibold text-slate-900 text-center mb-8). Form with flex flex-col gap-4. Fields:
      1. Label "First Name" + input name="first-name" required placeholder="Enter first name" (standard input class)
      2. Label "Last Name" + input name="last-name" required placeholder="Enter last name" (standard input class)
      3. Label "Code" + input name="code" required placeholder="Enter SwimCode" (standard input class) — note: placeholder says "SwimCode" per D-05 terminology
      4. Label "Bunk" + input name="bunk" required placeholder="Enter bunk" (standard input class) — REQUIRED per D-08, no "(optional)" suffix
      5. Label "Notes (optional)" + textarea name="notes" rows={3} placeholder="Optional notes" (border border-slate-300 rounded-md px-3 py-2 text-base text-slate-900 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none)
    - Error paragraph role="alert" className `text-base text-red-600`
    - Primary button "Add camper" disabled when loading, text "Saving..." when loading
    - Close link: button type="button" onClick close "Close" className `text-base text-slate-600 hover:text-slate-900 text-center mt-2 block mx-auto`

    Create src/app/(admin)/admin/campers/components/EditCamperModal.tsx as "use client":
    - Import editCamperAction from "../actions"
    - Props: { camper: Camper } (same Camper type as CamperTable — bunk is string, not string|null)
    - Trigger: button text "Edit" className `text-base text-slate-600 hover:text-slate-900 min-h-[44px] flex items-center`
    - Same modal structure as AddCamperModal. h2 "Edit camper". Form: hidden input name="id" value={camper.id}. All inputs use defaultValue from camper prop. bunk input is still required (D-08). Primary button "Save camper". Submit calls editCamperAction(new FormData(form)); on success setOpen(false).

    Create src/app/(admin)/admin/campers/components/CamperDeleteDialog.tsx as "use client":
    - Import removeCamperAction from "../actions"
    - Props: { camperId: string; name: string }
    - Trigger: button text "Remove" className `text-base text-red-600 hover:underline min-h-[44px] flex items-center`
    - State: open bool, loading bool, error string|null
    - Dialog (bg-white card): h2 `Remove ${name}?` className `text-xl font-semibold text-slate-900 text-center mb-4`. Body per UI-SPEC Copywriting Contract: "They will be permanently removed from the roster. This cannot be undone." Button row: flex gap-3 justify-center. "Keep camper" cancel button. "Remove camper" confirm (bg-red-600). Confirm click: setLoading(true); try { await removeCamperAction(camperId); setOpen(false); } catch { setError("Could not remove camper. Please try again."); } finally { setLoading(false); }. Error with role="alert".

    Create src/app/(admin)/admin/campers/components/ClearAllCampersDialog.tsx as "use client":
    - Import clearAllCampersAction from "../actions"
    - Trigger: button text "Clear all campers" className `text-base text-red-600 hover:underline min-h-[44px] flex items-center`
    - State: open bool, loading bool, error string|null
    - Dialog (bg-white card): h2 "Clear all campers?" (text-xl font-semibold). Body: "This will permanently remove all campers from the roster. This cannot be undone." Button row: "Keep roster" cancel (slate border). "Clear all campers" confirm (bg-red-600). Confirm: clearAllCampersAction(); on success setOpen(false).

    Create src/app/(admin)/admin/campers/page.test.tsx:
    - Mock pattern from users/page.test.tsx. Mock: "@/lib/auth", "next/headers", "next/navigation" (redirect vi.fn()), "@/db" (db.select chain resolving to []), "./components/CamperTable" (stub rendering campers.length === 0 ? "No campers yet" : "Has campers"), "./components/AddCamperModal" (stub rendering "Add camper" button), "./components/ClearAllCampersDialog" (stub rendering "Clear all campers" button).
    - Test 1: renders h1 "Campers": `const jsx = await CampersPage({}); render(jsx); expect(screen.getByRole("heading", { name: /Campers/i })).toBeInTheDocument();`
    - Test 2: renders CamperTable stub (empty state text visible when no campers): verify "No campers yet" appears.
  </action>
  <verify>
    <automated>npm test 2>&1 | grep -E "passed|failed|Tests" | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/campers/page.tsx exists with no "use client" directive
    - CamperTable.tsx contains `"use client"` and the D-11 name format: grep for the string `· ${c.bunk}` or `· {c.bunk}`
    - CamperTable.tsx has FIVE th elements: "Name", "Code", "Bunk", "Notes", "Actions" (not separate First Name / Last Name columns)
    - CamperTable.tsx contains "No campers yet" empty state text
    - AddCamperModal.tsx has input name="bunk" with `required` attribute (no "(optional)" label suffix) — D-08
    - EditCamperModal.tsx has hidden input `name="id"` and input `name="bunk"` with `required`
    - ClearAllCampersDialog.tsx contains "Keep roster" and "Clear all campers" (exact copy strings)
    - CamperDeleteDialog.tsx contains "Keep camper" and "Remove camper"
    - page.test.tsx exists with at least 2 test cases
    - npm test exits 0 (all tests green including 10+ action tests and 2+ page tests)
    - npm run build exits 0
  </acceptance_criteria>
  <done>Campers page renders with Add, Clear All, CamperTable (D-11 name format, bunk required in forms); Edit and Remove work per row; all tests green; build exits 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → addCamperAction / editCamperAction | Untrusted firstName, lastName, code, bunk, notes from FormData — code must remain string |
| Browser → removeCamperAction | Untrusted camperId string |
| Browser → clearAllCampersAction | No input; full-table delete; must be admin-only |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-03-01 | Elevation of Privilege | All four camper Server Actions | mitigate | requireAdmin() is the first statement in every action; throws "Unauthorized" before any DB operation |
| T-03-03-02 | Tampering | clearAllCampersAction — full table delete | mitigate | requireAdmin() guard + two-step confirmation UI (dialog requires explicit second click); cannot be triggered via GET |
| T-03-03-03 | Tampering | camper.code — type coercion risk | mitigate | code stored as-is (string from FormData, which is always a string); Drizzle column is text(); no parseFloat/parseInt anywhere in the action |
| T-03-03-04 | Tampering | SQL injection via name/code/bunk/notes fields | mitigate | Drizzle parameterized queries only; no raw SQL strings constructed from FormData values |
| T-03-03-05 | Tampering | duplicate camper code — DB unique constraint | mitigate | DB unique constraint on camper.code catches concurrent inserts; action error handler surfaces a readable message; in-action validation in Plan 04 import adds pre-DB check |
| T-03-03-06 | Information Disclosure | Camper list — unauthenticated access | mitigate | Auth guard in page.tsx redirects before any DB query; no camper data reaches an unauthenticated response |
| T-03-03-SC | Tampering | npm installs | accept | No new packages in this plan |
</threat_model>

<verification>
After both tasks complete:
- `npm test` exits 0 — 10+ action tests, 2+ page tests, no regressions
- `npm run build` exits 0
- /admin/campers page renders with "Campers" heading, "Add camper" button (blue), "Clear all campers" link (red)
- CamperTable shows empty state "No campers yet" when roster is empty
- AddCamperModal: all 5 fields present; bunk field is required (D-08); form rejects blank bunk
- EditCamperModal: opens pre-filled; bunk is required; hidden id field present
- CamperDeleteDialog: "Remove [Name]?" heading, "Keep camper" / "Remove camper" buttons
- ClearAllCampersDialog: "Clear all campers?" heading, "Keep roster" / "Clear all campers" buttons
- Name column in table shows "[firstName] [lastName] · [bunk]" format (D-11)
</verification>

<success_criteria>
- addCamperAction, editCamperAction, removeCamperAction, clearAllCampersAction throw "Unauthorized" for non-admin
- addCamperAction and editCamperAction throw when bunk is blank (D-08 enforced at action layer)
- All four actions call revalidatePath("/admin/campers")
- CamperTable Name column renders `{firstName} {lastName} · {bunk}` per D-11
- AddCamperModal bunk field has required attribute (not optional)
- All confirm dialogs use exact copy strings from UI-SPEC Copywriting Contract
- npm test exits 0 (10+ action tests, 2+ page tests)
- npm run build exits 0
- CAMP-03 satisfied: admin can add individual camper (bunk required)
- CAMP-04 satisfied: admin can edit camper name or code
- CAMP-05 satisfied: admin can remove individual camper from roster
</success_criteria>

<output>
Create `.planning/phases/03-admin-data-setup/03-03-SUMMARY.md` when done.
</output>
