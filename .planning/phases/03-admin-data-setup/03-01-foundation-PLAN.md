---
phase: 03-admin-data-setup
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/db/schema.ts
  - next.config.ts
  - src/components/AdminSidebar.tsx
  - src/app/(admin)/layout.tsx
autonomous: false
requirements:
  - CAMP-01
  - CAMP-02
  - CAMP-03
  - CAMP-04
  - CAMP-05
  - CAMP-06
  - POOL-01
  - POOL-02

must_haves:
  truths:
    - "schema.ts exports camper table with code as text (never numeric — preserves leading zeros)"
    - "schema.ts exports camper table with bunk as NOT NULL (required for name disambiguation per D-08)"
    - "schema.ts exports pool table"
    - "next.config.ts has serverActions.bodySizeLimit set to \"5mb\""
    - "npx drizzle-kit push succeeds and both camper and pool tables exist in Supabase"
    - "AdminSidebar renders Users / Campers / Pools links with usePathname active-link highlighting"
    - "Admin layout wraps all admin pages in a flex row: sidebar (w-48, left) + content (flex-1, right)"
  artifacts:
    - path: src/db/schema.ts
      provides: camper and pool Drizzle table definitions
      contains: "export const camper = pgTable"
    - path: next.config.ts
      provides: Server Action body size limit for Excel file uploads
      contains: "bodySizeLimit"
    - path: src/components/AdminSidebar.tsx
      provides: client navigation sidebar with active-link state
      contains: "export function AdminSidebar"
    - path: src/app/(admin)/layout.tsx
      provides: admin shell with sidebar wrapping all admin routes
      contains: "AdminSidebar"
  key_links:
    - from: src/app/(admin)/layout.tsx
      to: src/components/AdminSidebar.tsx
      via: import { AdminSidebar } from "@/components/AdminSidebar"
      pattern: "AdminSidebar"
    - from: src/db/schema.ts
      to: Supabase PostgreSQL
      via: npx drizzle-kit push
      pattern: "export const camper|export const pool"
---

<objective>
Lay the database schema and admin layout foundation for Phase 3. Adds camper and pool Drizzle table definitions (with bunk as NOT NULL per D-08), pushes the schema to the live Supabase database (BLOCKING gate for all Wave 2 plans), raises the Server Action body limit to 5mb for Excel uploads, and creates the admin sidebar navigation that all Phase 3 admin pages share.

Purpose: Plans 03-02 and 03-03 in Wave 2 cannot start until camper and pool tables exist in Supabase and the Drizzle types are exported. The sidebar lives in the layout so every admin page inherits it without per-page changes.

Output: Updated schema.ts and next.config.ts, new AdminSidebar.tsx, modified layout.tsx, and confirmed camper + pool tables in Supabase.
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

<interfaces>
<!-- Existing schema.ts import line (line 2 of current file): -->
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
<!-- All needed types are already imported. The sql import is NOT needed in schema.ts itself. -->

<!-- $onUpdate style used throughout codebase (lines 13, 21, 32 of schema.ts): -->
.$onUpdate(() => /* @__PURE__ */ new Date())
<!-- Copy the comment exactly — this is the established pattern. -->

<!-- Current layout.tsx return (line 13): -->
return <>{children}</>;
<!-- Must become: -->
return <div className="flex min-h-screen"><AdminSidebar /><div className="flex-1 min-w-0">{children}</div></div>;

<!-- Current next.config.ts (entire file, 7 lines): -->
import type { NextConfig } from "next";
const nextConfig: NextConfig = { /* config options here */ };
export default nextConfig;
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add camper and pool tables to schema.ts; raise bodySizeLimit in next.config.ts</name>
  <files>src/db/schema.ts, next.config.ts</files>
  <read_first>
    - src/db/schema.ts — read the full file; note the existing import block (line 2) to confirm index is already imported; note the exact $onUpdate style on lines 13, 21, 32
    - next.config.ts — read the full file before modifying
    - .planning/phases/03-admin-data-setup/03-CONTEXT.md — D-02 (pool in DB), D-08 (bunk required NOT NULL), CAMP-02 (code as text string)
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — section "src/db/schema.ts (model, CRUD)" for exact column definitions
  </read_first>
  <action>
    Append two new exports to src/db/schema.ts after the last existing export (accountRelations). Do not modify any existing lines.

    Export const camper using pgTable("camper", { ... }, (table) => [...]):
    - id: text("id").primaryKey()
    - firstName: text("first_name").notNull()
    - lastName: text("last_name").notNull()
    - code: text("code").notNull().unique() — MUST be text type, never numeric; this preserves leading zeros per CAMP-02; the unique constraint is a DB-level safety net for duplicate codes
    - bunk: text("bunk").notNull() — NOT NULL required per D-08; bunk is mandatory for name disambiguation (D-11); manual add and import both must provide a bunk value
    - notes: text("notes") — nullable, no default
    - createdAt: timestamp("created_at").defaultNow().notNull()
    - updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
    Second arg (indexes): [index("camper_code_idx").on(table.code), index("camper_name_idx").on(table.firstName, table.lastName)]

    Export const pool using pgTable("pool", { ... }):
    - id: text("id").primaryKey()
    - name: text("name").notNull()
    - createdAt: timestamp("created_at").defaultNow().notNull()
    - updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
    No indexes needed on pool (small table).

    Do NOT add any relations for camper or pool — no cross-table FK relationships in Phase 3.

    Update next.config.ts: replace the empty object `{ /* config options here */ }` with `{ experimental: { serverActions: { bodySizeLimit: "5mb" } } }`. The string "5mb" is intentional — it overrides the default 1MB cap that would truncate Excel file uploads (RESEARCH.md Pitfall 1 — Pitfall 1 is verified from node_modules/next/dist/docs). Keep the import and export default lines unchanged.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - schema.ts contains `export const camper = pgTable`
    - schema.ts contains `export const pool = pgTable`
    - schema.ts contains `code: text("code").notNull().unique()` — must be text(), not varchar() or numeric types
    - schema.ts contains `bunk: text("bunk").notNull()` — NOT nullable (this is the D-08 change from the old plan)
    - schema.ts contains `index("camper_code_idx")`
    - schema.ts contains `index("camper_name_idx")`
    - Existing exports (user, session, account, verification, userRelations, sessionRelations, accountRelations) are unchanged
    - next.config.ts contains `bodySizeLimit`
    - next.config.ts contains `"5mb"`
    - npx tsc --noEmit exits 0
  </acceptance_criteria>
  <done>schema.ts exports camper (code=text unique, bunk=text NOT NULL) and pool; next.config.ts has bodySizeLimit "5mb"; TypeScript compiles clean.</done>
</task>

<task type="checkpoint:human-action">
  <name>Task 2: [BLOCKING] Run drizzle-kit push to create tables in Supabase</name>
  <read_first>
    - src/db/schema.ts — confirm camper and pool exports exist before pushing
  </read_first>
  <what-built>Task 1 added camper and pool table definitions to schema.ts. Those tables do not yet exist in the Supabase PostgreSQL database. drizzle-kit push must run now — Wave 2 plans (03-02-pools, 03-03-camper-crud) will fail with "relation does not exist" errors if this step is skipped.</what-built>
  <how-to-verify>
    Run in the project root terminal:

    npx drizzle-kit push

    Expected: drizzle-kit reads schema.ts, detects the two new tables (camper, pool), and creates them in Supabase. Adding new tables is non-destructive — it will not prompt to confirm data loss. If a prompt appears for anything else, confirm it.

    After the command exits, verify the tables exist:

    npx tsx -e "import { db } from './src/db'; import { camper, pool } from './src/db/schema'; const [c, p] = await Promise.all([db.select().from(camper).limit(1), db.select().from(pool).limit(1)]); console.log('camper table OK, pool table OK'); process.exit(0);"

    Expected output: "camper table OK, pool table OK" (even if no rows exist yet, the query should not throw).
  </how-to-verify>
  <resume-signal>Type "pushed" when both tables are confirmed in Supabase and the tsx verification exits 0</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Create AdminSidebar component and modify admin layout</name>
  <files>src/components/AdminSidebar.tsx, src/app/(admin)/layout.tsx</files>
  <read_first>
    - src/app/(admin)/layout.tsx — read the full current file (14 lines); keep auth guard logic (lines 10-12) exactly as-is
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — section "src/components/AdminSidebar.tsx" for full implementation
    - .planning/phases/03-admin-data-setup/03-UI-SPEC.md — Layout Contract section for exact CSS values
    - .planning/phases/03-admin-data-setup/03-CONTEXT.md — D-01 (left sidebar, text-only links, slate palette, blue-600 accent)
  </read_first>
  <action>
    Create src/components/AdminSidebar.tsx:
    - First line: "use client"
    - Import Link from "next/link"; import usePathname from "next/navigation"
    - Define const links array: [{ href: "/admin/users", label: "Users" }, { href: "/admin/campers", label: "Campers" }, { href: "/admin/pools", label: "Pools" }]
    - Export named function AdminSidebar (not default export)
    - Call const pathname = usePathname() inside the function body
    - Return: nav with className "w-48 shrink-0 bg-slate-50 border-r border-slate-200 min-h-screen p-4"
    - Inside nav: ul with className "flex flex-col gap-1"
    - Map links: const active = pathname.startsWith(href)
    - Active link: Link href={href} className "block px-3 py-2 rounded-md text-base font-semibold bg-blue-600 text-white transition-colors"
    - Inactive link: Link href={href} className "block px-3 py-2 rounded-md text-base font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
    - Text-only links (no icons) — D-01 says icons are Claude's discretion; text-only is cleaner and conventional

    Modify src/app/(admin)/layout.tsx:
    - Add import { AdminSidebar } from "@/components/AdminSidebar" after the existing imports
    - Keep the three auth guard lines completely unchanged: getSession call, redirect("/login"), redirect("/pools")
    - Change return from `return <>{children}</>` to: `return <div className="flex min-h-screen"><AdminSidebar /><div className="flex-1 min-w-0">{children}</div></div>`
    - The outer div is a flex row container; AdminSidebar is the fixed-width left column; the inner div (flex-1 min-w-0) is the expanding right content area
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - src/components/AdminSidebar.tsx exists
    - AdminSidebar.tsx line 1 is `"use client"`
    - AdminSidebar.tsx contains `usePathname` imported from "next/navigation"
    - AdminSidebar.tsx contains `"/admin/users"`, `"/admin/campers"`, `"/admin/pools"` as href values
    - AdminSidebar.tsx contains `pathname.startsWith(href)` for active detection
    - AdminSidebar.tsx contains `bg-blue-600 text-white` (active link style)
    - AdminSidebar.tsx contains `export function AdminSidebar` (named export, not default)
    - layout.tsx contains `import { AdminSidebar } from "@/components/AdminSidebar"`
    - layout.tsx contains `<AdminSidebar />`
    - layout.tsx contains `flex min-h-screen`
    - layout.tsx contains `flex-1 min-w-0`
    - layout.tsx still contains `redirect("/login")` (auth guard unchanged)
    - layout.tsx still contains `redirect("/pools")` (role guard unchanged)
    - npx tsc --noEmit exits 0
  </acceptance_criteria>
  <done>AdminSidebar.tsx exports a client component with three nav links and active-link highlighting; layout.tsx wraps all admin pages in a sidebar+content flex row; TypeScript compiles clean.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Admin layout | Every request to (admin)/* routes through layout.tsx; unauthenticated or non-admin requests are redirected |
| Schema push → Supabase | Schema changes applied directly to the live DB; task is developer-controlled and non-destructive (adds tables only) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01-01 | Elevation of Privilege | layout.tsx auth guard | mitigate | Auth guard left completely unchanged: session check + role === "admin"; sidebar visibility is cosmetic — all security enforced at Server Action layer |
| T-03-01-02 | Tampering | camper.code column type in schema.ts | mitigate | Column defined as text("code") — never numeric; unique constraint is DB-level safety net; plan explicitly prohibits casting code to number anywhere in the stack |
| T-03-01-03 | Tampering | camper.bunk column nullability | mitigate | bunk: text("bunk").notNull() enforces D-08 at DB level; any import or insert that omits bunk will receive a DB NOT NULL constraint error |
| T-03-01-SC | Tampering | npm/cargo installs | accept | No new npm packages installed in this plan; xlsx is installed in 03-04 where the legitimacy audit already cleared it |
</threat_model>

<verification>
After all three tasks complete and human confirms schema push:
- `npx tsc --noEmit` exits 0
- `npm test` passes all existing tests (no regressions)
- schema.ts contains both `export const camper` and `export const pool`
- `bunk: text("bunk").notNull()` — not nullable (critical D-08 change from prior plan)
- `code: text("code").notNull().unique()` — text type preserved throughout
- next.config.ts has `bodySizeLimit: "5mb"`
- AdminSidebar.tsx exists with "use client" and usePathname active detection
- layout.tsx renders `<AdminSidebar />` in a flex row
- Wave 2 plans (03-02, 03-03) may now proceed in parallel
</verification>

<success_criteria>
- camper table in Supabase: id, first_name, last_name, code (text unique), bunk (NOT NULL), notes, created_at, updated_at
- pool table in Supabase: id, name, created_at, updated_at
- Navigating to any /admin/* route shows a left sidebar with Users, Campers, Pools links
- Active sidebar link is blue-600; inactive links are slate-700 with slate-200 hover
- npm test passes with no regressions
- npx tsc --noEmit exits 0
</success_criteria>

<output>
Create `.planning/phases/03-admin-data-setup/03-01-SUMMARY.md` when done.
</output>
