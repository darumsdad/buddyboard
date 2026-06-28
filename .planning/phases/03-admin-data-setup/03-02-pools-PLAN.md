---
phase: 03-admin-data-setup
plan: "02"
type: execute
wave: 2
depends_on:
  - 03-01
files_modified:
  - src/app/(admin)/admin/pools/actions.ts
  - src/app/(admin)/admin/pools/actions.test.ts
  - src/app/(admin)/admin/pools/page.tsx
  - src/app/(admin)/admin/pools/components/PoolList.tsx
  - src/app/(admin)/admin/pools/components/AddPoolForm.tsx
  - src/app/(admin)/admin/pools/components/EditPoolModal.tsx
  - scripts/seed-pools.ts
autonomous: true
requirements:
  - POOL-01
  - POOL-02

must_haves:
  truths:
    - "createPoolAction, renamePoolAction, removePoolAction all call requireAdmin() and throw 'Unauthorized' for non-admin sessions"
    - "All three pool mutations call revalidatePath('/admin/pools') before returning"
    - "seed-pools.ts is idempotent: exits without error if pools exist; inserts 'Pool 1', 'Pool 2', 'Pool 3' on empty table"
    - "Admin can add a pool via AddPoolForm; new pool appears immediately after submit"
    - "Admin can rename a pool via EditPoolModal ('Rename pool' heading, pre-filled name field)"
    - "Admin can remove a pool via confirmation dialog (cancel: 'Keep pool', confirm: 'Remove pool')"
    - "Empty pool list shows 'No pools yet' text"
    - "Pool action tests green: all three actions reject non-admin; all three call revalidatePath"
  artifacts:
    - path: src/app/(admin)/admin/pools/actions.ts
      provides: createPoolAction, renamePoolAction, removePoolAction with requireAdmin guard
      contains: "export async function createPoolAction"
    - path: src/app/(admin)/admin/pools/actions.test.ts
      provides: unit tests for pool actions
      contains: "Unauthorized"
    - path: scripts/seed-pools.ts
      provides: idempotent seed inserting 3 default pools
      contains: "Pool 1"
    - path: src/app/(admin)/admin/pools/page.tsx
      provides: server-rendered pools admin page
      contains: "Pools"
    - path: src/app/(admin)/admin/pools/components/PoolList.tsx
      provides: client pool list with rename + remove per row
      contains: "use client"
    - path: src/app/(admin)/admin/pools/components/AddPoolForm.tsx
      provides: inline form to add a pool
      contains: "Add pool"
    - path: src/app/(admin)/admin/pools/components/EditPoolModal.tsx
      provides: modal to rename a pool
      contains: "Rename pool"
  key_links:
    - from: src/app/(admin)/admin/pools/components/PoolList.tsx
      to: src/app/(admin)/admin/pools/actions.ts
      via: import { renamePoolAction, removePoolAction }
      pattern: "renamePoolAction|removePoolAction"
    - from: src/app/(admin)/admin/pools/actions.ts
      to: src/db/index.ts
      via: import { db } from "@/db"
      pattern: "db\\.insert|db\\.update|db\\.delete"
---

<objective>
Deliver the complete pools management vertical slice — from database mutations through UI — so admin can add, rename, and remove pools from the browser without touching code (POOL-01), and the database ships with three default pools (POOL-02).

Purpose: Phase 4 requires a list of pools for counselors to select when starting a session. Phase 3 must establish and maintain that list. This plan runs in parallel with 03-03 (camper CRUD); both are unblocked once 03-01's schema push completes.

Output: Pool Server Actions with requireAdmin guard, action tests, idempotent seed script (run immediately to create defaults), and pools admin page with PoolList + AddPoolForm + EditPoolModal.
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
<!-- requireAdmin() — copy verbatim from src/app/(admin)/admin/users/actions.ts lines 7-13: -->
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

<!-- pool table from schema.ts (created in 03-01): -->
export const pool = pgTable("pool", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(...).notNull(),
});

<!-- Vitest mock template (from PATTERNS.md Shared Patterns): -->
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
}));

<!-- Modal overlay + card shell (from CreateUserModal.tsx lines 42-45): -->
className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm"

<!-- Standard input class (from CreateUserModal.tsx line 62): -->
"min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"

<!-- Primary button class (from CreateUserModal.tsx lines 138-142): -->
"min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pool Server Actions + action tests + seed script + run seed</name>
  <files>
    src/app/(admin)/admin/pools/actions.ts,
    src/app/(admin)/admin/pools/actions.test.ts,
    scripts/seed-pools.ts
  </files>
  <behavior>
    - createPoolAction(non-admin) → throws "Unauthorized"
    - createPoolAction(admin, name="") → throws "Pool name is required"
    - createPoolAction(admin, name="Pool A") → calls db.insert(pool) with { id: string, name: "Pool A" } and calls revalidatePath("/admin/pools")
    - renamePoolAction(non-admin, poolId, formData) → throws "Unauthorized"
    - renamePoolAction(admin, "pool-1", formData with name="Lap Pool") → calls db.update(pool).set({ name: "Lap Pool" }).where(eq(pool.id, "pool-1")) and calls revalidatePath("/admin/pools")
    - removePoolAction(non-admin, poolId) → throws "Unauthorized"
    - removePoolAction(admin, "pool-1") → calls db.delete(pool).where(eq(pool.id, "pool-1")) and calls revalidatePath("/admin/pools")
  </behavior>
  <read_first>
    - src/app/(admin)/admin/users/actions.ts — read the full file; requireAdmin() is lines 7-13; copy verbatim
    - src/app/(admin)/admin/users/actions.test.ts — read the full file; mock block structure, dynamic import pattern, requireAdmin rejection test shape, revalidatePath assertion shape
    - scripts/seed-admin.ts — idempotent check + process.exit pattern
    - src/db/schema.ts — confirm pool table export and column names
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — sections for pools/actions.ts and seed-pools.ts
  </read_first>
  <action>
    Create src/app/(admin)/admin/pools/actions.ts:
    - Line 1: "use server"
    - Imports: headers from "next/headers"; revalidatePath from "next/cache"; auth from "@/lib/auth"; db from "@/db"; pool from "@/db/schema"; eq from "drizzle-orm"
    - Non-exported requireAdmin() function — copy verbatim from users/actions.ts lines 7-13 (exact same text, no modifications)
    - createPoolAction(formData: FormData): await requireAdmin(); const name = (formData.get("name") as string ?? "").trim(); if (!name) throw new Error("Pool name is required"); await db.insert(pool).values({ id: crypto.randomUUID(), name }); revalidatePath("/admin/pools");
    - renamePoolAction(poolId: string, formData: FormData): await requireAdmin(); const name = (formData.get("name") as string ?? "").trim(); if (!name) throw new Error("Pool name is required"); await db.update(pool).set({ name }).where(eq(pool.id, poolId)); revalidatePath("/admin/pools");
    - removePoolAction(poolId: string): await requireAdmin(); await db.delete(pool).where(eq(pool.id, poolId)); revalidatePath("/admin/pools");

    Create src/app/(admin)/admin/pools/actions.test.ts:
    - Vitest mocks block at top (before any action imports): vi.mock for @/lib/auth, next/headers, next/cache, and @/db (with select/insert/update/delete/transaction all as vi.fn()). Use beforeEach(() => vi.clearAllMocks()).
    - Dynamic imports inside each test: const { auth } = await import("@/lib/auth"); const { revalidatePath } = await import("next/cache"); const { createPoolAction } = await import("./actions");
    - Mock admin session: vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { role: "admin" } } as any)
    - Mock db chains: vi.mocked(db.insert).mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) } as any)
    - At minimum, test all 7 behaviors in the behavior block above

    Create scripts/seed-pools.ts:
    - Import db from "../src/db" and pool from "../src/db/schema"
    - async function seedPools(): `const existing = await db.select().from(pool).limit(1);` — if existing.length > 0, log "Pools already exist — seed is idempotent, no action needed." and process.exit(0). Otherwise: await db.insert(pool).values([{ id: crypto.randomUUID(), name: "Pool 1" }, { id: crypto.randomUUID(), name: "Pool 2" }, { id: crypto.randomUUID(), name: "Pool 3" }]); console.log("Default pools seeded: Pool 1, Pool 2, Pool 3"); process.exit(0).
    - seedPools().catch((e) => { console.error(e); process.exit(1); });

    After creating all three files, run the seed script: `npx tsx scripts/seed-pools.ts`
  </action>
  <verify>
    <automated>npm test -- --reporter=verbose 2>&1 | grep -E "pools|PASS|FAIL|Tests"</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/pools/actions.ts exports createPoolAction, renamePoolAction, removePoolAction
    - actions.ts contains requireAdmin() function (not exported)
    - All three actions contain revalidatePath("/admin/pools")
    - actions.test.ts contains at least 7 test cases
    - npm test shows no failures in pools action tests
    - scripts/seed-pools.ts exists and `npx tsx scripts/seed-pools.ts` exits 0
  </acceptance_criteria>
  <done>Pool action tests green; seed exits 0; Pool 1, Pool 2, Pool 3 exist in Supabase (or "already exist" logged idempotently).</done>
</task>

<task type="auto">
  <name>Task 2: Pools page + PoolList + AddPoolForm + EditPoolModal</name>
  <files>
    src/app/(admin)/admin/pools/page.tsx,
    src/app/(admin)/admin/pools/components/PoolList.tsx,
    src/app/(admin)/admin/pools/components/AddPoolForm.tsx,
    src/app/(admin)/admin/pools/components/EditPoolModal.tsx
  </files>
  <read_first>
    - src/app/(admin)/admin/users/page.tsx — read the full file; auth guard pattern, db.select query, max-w-4xl container, flex justify-between header
    - src/app/(admin)/admin/users/components/UserTable.tsx — empty state pattern, divide-y tbody, th/td class names
    - src/app/(admin)/admin/users/components/CreateUserModal.tsx — read the full file; modal overlay + card, useState, handleSubmit, input class, button classes, close link
    - src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx — read the full file; trigger button, overlay, two-button layout (cancel left / red confirm right)
    - .planning/phases/03-admin-data-setup/03-UI-SPEC.md — Pools Page Layout section; Interaction Contract modals; Copywriting Contract (pool strings)
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — sections for pools/page.tsx, PoolList, AddPoolForm, EditPoolModal
  </read_first>
  <action>
    Create src/app/(admin)/admin/pools/page.tsx as an async server component (no "use client"):
    - Imports: headers from "next/headers"; redirect from "next/navigation"; auth from "@/lib/auth"; db from "@/db"; pool from "@/db/schema"; asc from "drizzle-orm"; PoolList and AddPoolForm from "./components/..."
    - Auth guard: `const session = await auth.api.getSession({ headers: await headers() }); if (!session || session.user.role !== "admin") redirect("/pools");`
    - Query: `const pools = await db.select().from(pool).orderBy(asc(pool.name));`
    - Return: main className `bg-white min-h-screen`. Inner container: div className `max-w-4xl mx-auto p-6`. Header: div className `flex justify-between items-center mb-6` with h1 "Pools" (className `text-3xl font-semibold text-slate-900`). Body: PoolList (pass pools prop). AddPoolForm below the list.

    Create src/app/(admin)/admin/pools/components/PoolList.tsx as a "use client" component:
    - Type: type Pool = { id: string; name: string; createdAt: Date; updatedAt: Date }
    - Props: { pools: Pool[] }
    - Import EditPoolModal from "./EditPoolModal"; import removePoolAction from "../actions"
    - Empty state (pools.length === 0): render a text-center block with heading "No pools yet" (text-xl font-semibold text-slate-900) and body per UI-SPEC Copywriting Contract (text-base text-slate-500)
    - Non-empty: ul className `divide-y divide-slate-200 border border-slate-200 rounded-md bg-white mt-4`. Each li: className `flex items-center justify-between px-4 py-3`. Left: span className `text-base text-slate-900` with pool.name. Right: div className `flex items-center gap-3` containing EditPoolModal (pool prop) and a PoolDeleteDialog.
    - PoolDeleteDialog: create as a standalone component in PoolList.tsx or as src/app/(admin)/admin/pools/components/PoolDeleteDialog.tsx. Props: { poolId: string; poolName: string }. State: open bool, loading bool, error string|null. Trigger: button (or span) className `text-base text-red-600 hover:underline cursor-pointer min-h-[44px] flex items-center` text "Remove". When open: overlay + card (bg-white). h2 "Remove [poolName]?" text-xl font-semibold. Body per Copywriting Contract. Two flex gap-3 buttons: "Keep pool" (border border-slate-300 rounded-md px-4 min-h-[44px] text-base text-slate-700) and "Remove pool" (bg-red-600 hover:bg-red-700 text-white rounded-md px-4 min-h-[44px] text-base font-semibold). Confirm handler: setLoading(true); try { await removePoolAction(poolId); setOpen(false); } catch { setError("Could not remove pool. Please try again."); } finally { setLoading(false); }. Show error paragraph with role="alert" in red-600 when error is set.

    Create src/app/(admin)/admin/pools/components/AddPoolForm.tsx as a "use client" component:
    - Import createPoolAction from "../actions"
    - State: loading bool, error string|null
    - Form onSubmit: e.preventDefault(); setLoading(true); setError(null); try { await createPoolAction(new FormData(e.currentTarget)); (e.currentTarget as HTMLFormElement).reset(); } catch(err) { setError("Could not add pool. Please try again."); } finally { setLoading(false); }
    - Render: div className `mt-6`. Label for pool-name "Pool name" className `text-base font-semibold text-slate-900 block mb-1`. form with className `flex gap-3 items-start`. Input id="pool-name" name="name" type="text" required placeholder="Enter pool name" (standard input class from UI-SPEC). Submit button "Add pool" disabled={loading} (primary button class but not full-width: `min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed`). Error paragraph below form: role="alert" className `text-base text-red-600 mt-2`.

    Create src/app/(admin)/admin/pools/components/EditPoolModal.tsx as a "use client" component:
    - Import renamePoolAction from "../actions"
    - Props: { pool: { id: string; name: string } }
    - State: open bool, loading bool, error string|null
    - Trigger button: className `text-base text-slate-600 hover:text-slate-900 min-h-[44px] flex items-center` text "Rename"
    - When open: overlay + card (bg-slate-50). h2 "Rename pool" className `text-xl font-semibold text-slate-900 text-center mb-6`.
    - Form: label "Pool name" (same label class). Input name="name" type="text" required defaultValue={pool.name} (standard input class). Submit "Save pool" (primary button class). Close link: "Close" text-base text-slate-600. Submit handler: prevent default, call renamePoolAction(pool.id, new FormData(form)), close modal on success.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/pools/page.tsx exists with no "use client" directive (server component)
    - pools/page.tsx contains `db.select().from(pool).orderBy(`
    - PoolList.tsx contains "use client" and "No pools yet"
    - PoolList.tsx contains `text-red-600` (remove trigger) and "Remove pool" (confirm button)
    - AddPoolForm.tsx contains "Add pool" button text
    - EditPoolModal.tsx contains "Rename pool" heading text
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>/admin/pools renders the pool list with all 3 CRUD actions; AddPoolForm inline below; EditPoolModal for rename; remove confirmation dialog with correct copy; npm run build exits 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Pool Server Actions | createPoolAction, renamePoolAction, removePoolAction receive untrusted string inputs |
| Admin layout → Actions | Layout provides UX redirect; actions enforce security independently per defense-in-depth |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-02-01 | Elevation of Privilege | All three pool Server Actions | mitigate | requireAdmin() called as first statement in every action; throws "Unauthorized" if session missing or non-admin role |
| T-03-02-02 | Tampering | pool.name — untrusted string from form input | mitigate | name.trim() + non-empty validation before DB write; Drizzle parameterized queries prevent SQL injection |
| T-03-02-03 | Spoofing | CSRF on Server Actions | accept | Next.js built-in origin-check for Server Actions (verified from node_modules/next/dist/docs/serverActions.md); no additional token needed |
| T-03-02-04 | Information Disclosure | pools page — unauthenticated access | mitigate | Auth guard in pools/page.tsx redirects non-admin before any DB query |
| T-03-02-SC | Tampering | npm installs | accept | No new npm packages installed in this plan |
</threat_model>

<verification>
After both tasks complete:
- `npm test` shows pool action tests passing (no failures)
- `npx tsx scripts/seed-pools.ts` exits 0
- `npm run build` exits 0
- /admin/pools renders 3 default pools with Rename and Remove actions
- Adding a new pool via AddPoolForm updates the list after submit
- Renaming a pool via EditPoolModal updates the name after save
- Remove pool confirmation shows "Keep pool" / "Remove pool" buttons and removes on confirm
</verification>

<success_criteria>
- createPoolAction, renamePoolAction, removePoolAction throw "Unauthorized" for non-admin
- All three actions call revalidatePath("/admin/pools")
- seed-pools.ts inserts Pool 1, Pool 2, Pool 3 idempotently
- /admin/pools page displays the pool list and all CRUD components
- npm test exits 0; npm run build exits 0
- POOL-01 satisfied: admin can add, rename, remove pools from the browser
- POOL-02 satisfied: 3 default pools exist after seed-pools.ts runs
</success_criteria>

<output>
Create `.planning/phases/03-admin-data-setup/03-02-SUMMARY.md` when done.
</output>
