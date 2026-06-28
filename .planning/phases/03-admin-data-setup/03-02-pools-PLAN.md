---
phase: 03-admin-data-setup
plan: "02"
type: execute
wave: 2
depends_on:
  - 03-01
files_modified:
  - src/app/(admin)/admin/pools/page.tsx
  - src/app/(admin)/admin/pools/actions.ts
  - src/app/(admin)/admin/pools/actions.test.ts
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
    - "All pool mutations call revalidatePath('/admin/pools') before returning"
    - "seed-pools.ts is idempotent — exits without error if pools already exist; inserts 'Pool 1', 'Pool 2', 'Pool 3' on empty table"
    - "Admin can add a new pool by typing a name in AddPoolForm and submitting"
    - "Admin can rename a pool by clicking Rename, entering a new name in EditPoolModal, and saving"
    - "Admin can remove a pool by clicking Remove and confirming in the dialog"
    - "Empty pool list shows 'No pools yet' heading and 'Add a pool to get started.' body"
    - "pool actions tests pass: createPoolAction/renamePoolAction/removePoolAction all reject non-admin"
  artifacts:
    - path: "src/app/(admin)/admin/pools/actions.ts"
      provides: "createPoolAction, renamePoolAction, removePoolAction with requireAdmin guard"
      exports:
        - createPoolAction
        - renamePoolAction
        - removePoolAction
    - path: "src/app/(admin)/admin/pools/page.tsx"
      provides: "Server-rendered pools admin page"
    - path: "src/app/(admin)/admin/pools/components/PoolList.tsx"
      provides: "Client pool list with rename + remove per pool"
    - path: "src/app/(admin)/admin/pools/components/AddPoolForm.tsx"
      provides: "Inline form to add a new pool"
    - path: "src/app/(admin)/admin/pools/components/EditPoolModal.tsx"
      provides: "Modal to rename an existing pool"
    - path: "scripts/seed-pools.ts"
      provides: "Idempotent seed: inserts Pool 1 / Pool 2 / Pool 3"
  key_links:
    - from: "src/app/(admin)/admin/pools/page.tsx"
      to: "src/app/(admin)/admin/pools/actions.ts"
      via: "server action import in PoolList/AddPoolForm/EditPoolModal"
      pattern: "createPoolAction|renamePoolAction|removePoolAction"
    - from: "src/app/(admin)/admin/pools/actions.ts"
      to: "src/db/index.ts"
      via: "import { db } from '@/db'"
      pattern: "db\\.insert|db\\.update|db\\.delete"
---

<objective>
Deliver the complete pools management vertical slice — from database mutations through UI — so admin can add, rename, and remove pools from the browser without touching code (POOL-01), and the database ships with three default pools (POOL-02).

Purpose: Phase 4 requires a list of pools for counselors to select when starting a session. Phase 3 must populate and maintain that list.

Output: Pool Server Actions with requireAdmin, a pools admin page with full CRUD components, and an idempotent seed script that runs immediately to create Pool 1 / Pool 2 / Pool 3.
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
<!-- Analog: src/app/(admin)/admin/users/actions.ts — requireAdmin() and revalidatePath pattern -->
<!-- requireAdmin() (copy verbatim): async function requireAdmin() { const session = await auth.api.getSession({ headers: await headers() }); if (!session || session.user.role !== "admin") { throw new Error("Unauthorized"); } return session; } -->

<!-- Analog: scripts/seed-admin.ts — idempotent check + db.insert pattern -->

<!-- pool table from schema.ts (created in Plan 01): { id: text pk, name: text notNull, createdAt, updatedAt } -->
<!-- db import: import { db } from "@/db" -->
<!-- pool import: import { pool } from "@/db/schema" -->
<!-- eq import: import { eq } from "drizzle-orm" -->

<!-- Analog: src/app/(admin)/admin/users/components/CreateUserModal.tsx — modal overlay + card shell, input classes, button classes -->
<!-- Overlay: div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" -->
<!-- Card: div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm" -->
<!-- Input class: "min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" -->
<!-- Primary button: "min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed" -->

<!-- Analog: src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx — two-button confirm dialog pattern -->
<!-- Two buttons side by side (flex gap-3): cancel border/slate + confirm red filled (bg-red-600) -->

<!-- Analog: src/app/(admin)/admin/users/page.tsx — auth guard + db query + max-w-4xl container -->
<!-- Auth guard: const session = await auth.api.getSession({ headers: await headers() }); if (!session || session.user.role !== "admin") redirect("/pools"); -->
<!-- Page container: main with max-w-4xl mx-auto p-6 -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pool Server Actions + action tests + seed script + execute seed</name>
  <files>
    src/app/(admin)/admin/pools/actions.ts,
    src/app/(admin)/admin/pools/actions.test.ts,
    scripts/seed-pools.ts
  </files>
  <behavior>
    - createPoolAction(non-admin session) → throws "Unauthorized"
    - createPoolAction(admin, name="") → throws (empty name rejected)
    - createPoolAction(admin, name="Pool A") → calls db.insert(pool) and revalidatePath("/admin/pools")
    - renamePoolAction(non-admin, poolId, formData) → throws "Unauthorized"
    - renamePoolAction(admin, poolId, name="New Name") → calls db.update(pool).set({ name }).where(eq(pool.id, poolId)) and revalidatePath("/admin/pools")
    - removePoolAction(non-admin, poolId) → throws "Unauthorized"
    - removePoolAction(admin, poolId) → calls db.delete(pool).where(eq(pool.id, poolId)) and revalidatePath("/admin/pools")
  </behavior>
  <read_first>
    - src/app/(admin)/admin/users/actions.ts — requireAdmin() function (lines 7-13) to copy verbatim; revalidatePath pattern
    - src/app/(admin)/admin/users/actions.test.ts — mock block structure (vi.mock for @/lib/auth, next/headers, next/cache, @/db); requireAdmin rejection test shape; revalidatePath assertion shape
    - scripts/seed-admin.ts — idempotent check (db.select().limit(1)) + process.exit pattern
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — sections for pools/actions.ts and seed-pools.ts
    - src/db/schema.ts — confirm pool table export name and column names (id, name)
  </read_first>
  <action>
Create src/app/(admin)/admin/pools/actions.ts:
- "use server" directive on line 1.
- Imports: headers from "next/headers"; revalidatePath from "next/cache"; auth from "@/lib/auth"; db from "@/db"; pool from "@/db/schema"; eq from "drizzle-orm".
- requireAdmin() function — copy verbatim from users/actions.ts lines 7-13. This function is not exported.
- createPoolAction(formData: FormData): await requireAdmin(); const name = (formData.get("name") as string).trim(); if (!name) throw new Error("Pool name is required"); await db.insert(pool).values({ id: crypto.randomUUID(), name }); revalidatePath("/admin/pools");
- renamePoolAction(poolId: string, formData: FormData): await requireAdmin(); const name = (formData.get("name") as string).trim(); if (!name) throw new Error("Pool name is required"); await db.update(pool).set({ name }).where(eq(pool.id, poolId)); revalidatePath("/admin/pools");
- removePoolAction(poolId: string): await requireAdmin(); await db.delete(pool).where(eq(pool.id, poolId)); revalidatePath("/admin/pools");

Create src/app/(admin)/admin/pools/actions.test.ts:
- Vitest mocks at the top (before any imports of the actions): vi.mock("@/lib/auth", ...), vi.mock("next/headers", ...), vi.mock("next/cache", ...), vi.mock("@/db", ...). See PATTERNS.md Vitest Mock Template for exact structure including db mock with select/insert/update/delete/transaction fns.
- Follow dynamic import pattern from analog (await import("./actions") inside each test after mock setup).
- Test cases (minimum 6): createPoolAction rejects when session is null; createPoolAction calls revalidatePath("/admin/pools") on success (mock admin session + db.insert chain returning {}); renamePoolAction rejects non-admin; renamePoolAction calls revalidatePath("/admin/pools") on success; removePoolAction rejects non-admin; removePoolAction calls revalidatePath("/admin/pools") on success. Use beforeEach to clear vi mocks.

Create scripts/seed-pools.ts:
- Import db from "../src/db" and pool from "../src/db/schema".
- async function seedPools(): check `const existing = await db.select().from(pool).limit(1);` — if existing.length > 0, log "Pools already exist" and process.exit(0). Otherwise insert three records: { id: crypto.randomUUID(), name: "Pool 1" }, { id: crypto.randomUUID(), name: "Pool 2" }, { id: crypto.randomUUID(), name: "Pool 3" }. Log "Default pools seeded: Pool 1, Pool 2, Pool 3". process.exit(0).
- Call seedPools().catch((e) => { console.error(e); process.exit(1); }) at module level.

Run the seed script immediately: `npx tsx scripts/seed-pools.ts`
  </action>
  <verify>
    <automated>npm test -- actions.test 2>&1 | grep -E "passed|failed|Tests"</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/pools/actions.test.ts exists with at least 6 test cases
    - npm test output shows pool action tests passing (0 failures)
    - `npx tsx scripts/seed-pools.ts` exits 0 (logs either "already exist" or "seeded")
    - actions.ts contains three exported async functions: createPoolAction, renamePoolAction, removePoolAction
    - actions.ts contains requireAdmin() (non-exported) that throws "Unauthorized"
    - All three actions call revalidatePath("/admin/pools")
  </acceptance_criteria>
  <done>Pool action tests green; seed exits 0; 3 pools exist in the Supabase database.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Pools page + PoolList + AddPoolForm + EditPoolModal</name>
  <files>
    src/app/(admin)/admin/pools/page.tsx,
    src/app/(admin)/admin/pools/components/PoolList.tsx,
    src/app/(admin)/admin/pools/components/AddPoolForm.tsx,
    src/app/(admin)/admin/pools/components/EditPoolModal.tsx
  </files>
  <read_first>
    - src/app/(admin)/admin/users/page.tsx — auth guard pattern (lines 10-13), page shell with max-w-4xl, h1 heading, db.select query shape
    - src/app/(admin)/admin/users/components/UserTable.tsx — table/list structure, empty state, divide-y pattern
    - src/app/(admin)/admin/users/components/CreateUserModal.tsx — overlay + card shell (lines 42-45), input classes, primary/cancel button classes, useState pattern
    - src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx — two-button confirm dialog (cancel left/slate, confirm right/red) structure
    - .planning/phases/03-admin-data-setup/03-UI-SPEC.md — Pools Page Layout section; Interaction Contract for modals and confirmation dialogs; Copywriting Contract for pool copy strings
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — pools/page.tsx, pools/components/PoolList.tsx, AddPoolForm.tsx, EditPoolModal.tsx sections
  </read_first>
  <action>
Create src/app/(admin)/admin/pools/page.tsx as an async server component:
- Imports: headers from "next/headers"; redirect from "next/navigation"; auth from "@/lib/auth"; db from "@/db"; pool from "@/db/schema"; asc from "drizzle-orm"; PoolList and AddPoolForm from "./components/...".
- Auth guard: same pattern as users/page.tsx (getSession + redirect if not admin).
- Query: `const pools = await db.select().from(pool).orderBy(asc(pool.name));`
- Return: main with className `bg-white min-h-screen`. Container: div className `max-w-4xl mx-auto p-6`. Header row: div with `flex justify-between items-center mb-6`, containing h1 "Pools" (className `text-3xl font-semibold text-slate-900`). Below header: PoolList (passes pools array). Below list: AddPoolForm component.

Create src/app/(admin)/admin/pools/components/PoolList.tsx as a "use client" component:
- Import createPortal from react-dom is NOT needed — keep modals inline.
- Import renamePoolAction and removePoolAction from "../actions".
- Import EditPoolModal and PoolDeleteDialog from same directory.
- Type: type Pool = { id: string; name: string; createdAt: Date; updatedAt: Date }.
- Props: { pools: Pool[] }.
- Empty state: if pools.length === 0, render a centered paragraph with heading "No pools yet" (text-xl font-semibold text-slate-900) and body "Add a pool to get started. The system needs at least one pool before counselors can run sessions." (text-base text-slate-500).
- Non-empty: render a ul with className `divide-y divide-slate-200 border border-slate-200 rounded-md bg-white`. Each li: flex items-center justify-between px-4 py-3. Left: span className `text-base text-slate-900` showing pool.name. Right: div className `flex items-center gap-3`, containing EditPoolModal (pass pool prop) and a PoolDeleteDialog trigger (pass poolId and poolName).
- Inline PoolDeleteDialog: either as a separate PoolDeleteDialog.tsx file in the components/ directory OR as a local component in PoolList.tsx. It must follow the DeleteConfirmDialog pattern exactly: state (open bool), trigger is a button/span with className `text-base text-red-600 hover:underline cursor-pointer min-h-[44px] flex items-center`; when open, shows overlay + card; dialog heading "Remove [poolName]?" (text-xl font-semibold); body "This pool will be permanently removed. Counselors will no longer be able to start sessions in this pool." (text-base text-slate-700); two buttons flex gap-3: cancel "Keep pool" (border-slate-300 button) + confirm "Remove pool" (bg-red-600 button); confirm calls removePoolAction(poolId) then closes.

Create src/app/(admin)/admin/pools/components/AddPoolForm.tsx as a "use client" component:
- Inline form (not a modal). Import createPoolAction from "../actions".
- State: loading bool, error string|null.
- Form onSubmit: preventDefault; setLoading(true); try { const fd = new FormData(e.currentTarget); await createPoolAction(fd); e.currentTarget.reset(); } catch { setError("Could not add pool. Please try again."); } finally { setLoading(false); }.
- Render: form with className `flex gap-3 mt-6 items-start`. Input name="name" placeholder="Pool name" className (standard input class from UI-SPEC). Submit button "Add pool" (primary button class from UI-SPEC) disabled when loading. Error paragraph role="alert" className `text-base text-red-600 mt-2`.

Create src/app/(admin)/admin/pools/components/EditPoolModal.tsx as a "use client" component:
- Import renamePoolAction from "../actions".
- Props: { pool: { id: string; name: string } }.
- State: open bool, loading bool, error string|null.
- Trigger: button className `text-base text-slate-600 hover:text-slate-900 min-h-[44px] flex items-center` with text "Rename".
- Overlay + card shell (same as CreateUserModal lines 42-45 but bg-slate-50).
- h2 "Rename pool" className `text-xl font-semibold text-slate-900 text-center mb-6`.
- Form: input name="name" defaultValue={pool.name} required (standard input class). Submit calls renamePoolAction.bind(null, pool.id) or wraps in handleSubmit that calls renamePoolAction(pool.id, new FormData(form)). On success: setOpen(false). Primary button "Save pool". Close link at bottom.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -15</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/pools/page.tsx exists as an async server component (no "use client" directive)
    - src/app/(admin)/admin/pools/components/PoolList.tsx exists with "use client"
    - src/app/(admin)/admin/pools/components/AddPoolForm.tsx exists with "use client"
    - src/app/(admin)/admin/pools/components/EditPoolModal.tsx exists with "use client"
    - pools/page.tsx calls `db.select().from(pool).orderBy(asc(pool.name))`
    - PoolList renders empty state: grep for `No pools yet` in PoolList.tsx
    - PoolList has a "Remove" trigger (text-red-600) that leads to a confirmation dialog
    - `npm run build` exits 0 (no TypeScript errors)
  </acceptance_criteria>
  <done>/admin/pools renders pool list; Add pool, Rename, and Remove all function; 3 default pools visible; npm run build exits 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Server Action | createPoolAction / renamePoolAction / removePoolAction receive untrusted input (pool name, poolId) |
| Admin layout → Actions | Layout gate provides UX redirect; actions enforce security independently |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-02-E | Elevation of Privilege | createPoolAction / renamePoolAction / removePoolAction | mitigate | requireAdmin() called as first statement in every action; throws "Unauthorized" before touching DB |
| T-03-02-T | Tampering | pool.name — untrusted string input | mitigate | name trimmed and non-empty check before DB write; Drizzle parameterized queries prevent SQL injection |
| T-03-02-S | Spoofing | CSRF on Server Actions | accept | Next.js built-in origin check for Server Actions (verified in RESEARCH.md serverActions.md); no additional CSRF token needed |
| T-03-02-I | Information Disclosure | pool list — unauthenticated access | mitigate | Auth guard in pools/page.tsx redirects unauthenticated/non-admin users to /pools before any DB query runs |
| T-03-02-SC | Tampering | npm install — no new packages in this plan | accept | No new npm packages installed; drizzle-orm and next already in package.json |
</threat_model>

<verification>
After both tasks complete:
- `npm test` shows pool action tests passing
- `npx tsx scripts/seed-pools.ts` exits 0
- `npm run build` exits 0
- /admin/pools page renders (visual check: 3 default pools, add form below, rename + remove per row)
- Adding a pool, renaming it, and removing it all work without page refresh errors
</verification>

<success_criteria>
- createPoolAction, renamePoolAction, removePoolAction reject non-admin sessions with "Unauthorized"
- All three pool mutations call revalidatePath("/admin/pools")
- seed-pools.ts inserts "Pool 1", "Pool 2", "Pool 3" idempotently
- /admin/pools page displays the pool list with Rename and Remove per pool
- Admin can add a pool via the inline AddPoolForm
- Admin can rename a pool via EditPoolModal
- Admin can remove a pool via confirmation dialog (cancel: "Keep pool", confirm: "Remove pool")
- npm run build exits 0
- npm test exits 0
</success_criteria>

<output>
Create `.planning/phases/03-admin-data-setup/03-02-SUMMARY.md` when done.
</output>
