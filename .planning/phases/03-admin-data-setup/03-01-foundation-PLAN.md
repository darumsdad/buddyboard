---
phase: 03-admin-data-setup
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/db/schema.ts
  - next.config.ts
  - src/app/(admin)/layout.tsx
  - src/components/AdminSidebar.tsx
autonomous: true
requirements:
  - CAMP-02
  - POOL-01
  - POOL-02

must_haves:
  truths:
    - "schema.ts exports const camper = pgTable(\"camper\", ...) with code as text (not numeric — preserves leading zeros)"
    - "schema.ts exports const pool = pgTable(\"pool\", ...) with name as text"
    - "npx drizzle-kit push completes without error — camper and pool tables exist in the live Supabase DB"
    - "next.config.ts has experimental.serverActions.bodySizeLimit set to \"5mb\""
    - "AdminSidebar renders three links: Users (/admin/users), Campers (/admin/campers), Pools (/admin/pools) with usePathname() active state"
    - "Admin layout wraps children in a flex row: AdminSidebar (w-48, left) + main content area (flex-1, right)"
  artifacts:
    - path: "src/db/schema.ts"
      provides: "camper table definition"
      contains: "export const camper = pgTable"
    - path: "src/db/schema.ts"
      provides: "pool table definition"
      contains: "export const pool = pgTable"
    - path: "next.config.ts"
      provides: "5mb body size limit for Excel file uploads"
      contains: "bodySizeLimit"
    - path: "src/components/AdminSidebar.tsx"
      provides: "Client navigation sidebar with active-link highlighting"
      exports:
        - AdminSidebar
    - path: "src/app/(admin)/layout.tsx"
      provides: "Modified admin layout with sidebar shell"
      contains: "AdminSidebar"
  key_links:
    - from: "src/app/(admin)/layout.tsx"
      to: "src/components/AdminSidebar.tsx"
      via: "import { AdminSidebar } from \"@/components/AdminSidebar\""
      pattern: "AdminSidebar"
    - from: "src/db/schema.ts"
      to: "Supabase PostgreSQL"
      via: "npx drizzle-kit push"
      pattern: "camper_code_idx|camper_name_idx"
---

<objective>
Lay the database and UI shell foundation for Phase 3. This plan creates the camper and pool Drizzle table definitions, runs the schema push against the live Supabase database (blocking gate for all Wave 2 plans), raises the Server Action body size limit to accept Excel uploads, and installs the admin sidebar navigation that appears on every admin screen.

Purpose: Wave 2 plans (pools and campers CRUD) cannot run until the schema is live in the database and the admin layout shell is in place. This wave delivers those two prerequisites.

Output: camper + pool tables in schema.ts, drizzle-kit push completed, bodySizeLimit raised, AdminSidebar client component, layout.tsx modified.
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

<interfaces>
<!-- Current schema.ts — executor must read before appending tables -->
<!-- From src/db/schema.ts (read it): imports line 1-2 use: relations, pgTable, text, timestamp, boolean, index -->
<!-- $onUpdate style used in codebase: () => /* @__PURE__ */ new Date() -->
<!-- index() is already imported — add to existing import if needed -->

<!-- Current next.config.ts (read it) — minimal file, add experimental block -->

<!-- Current layout.tsx (read it) — 14 lines, auth guard only, return is <>{children}</> -->
<!-- Modification: keep auth guard unchanged; change return to flex row with AdminSidebar -->

<!-- AdminSidebar: new file, no codebase analog. Full pattern in RESEARCH.md Pattern 4 and PATTERNS.md -->
<!-- Links array: { href: "/admin/users", label: "Users" }, { href: "/admin/campers", label: "Campers" }, { href: "/admin/pools", label: "Pools" } -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add camper and pool table definitions to schema.ts</name>
  <files>src/db/schema.ts</files>
  <read_first>
    - src/db/schema.ts — read the entire file to understand current import line, $onUpdate style, and index() usage before appending
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — section "src/db/schema.ts (model, CRUD)" for exact table definitions to append
    - .planning/phases/03-admin-data-setup/03-RESEARCH.md — Pattern 5: Drizzle Schema for New Tables
  </read_first>
  <action>
Append two new table exports at the bottom of src/db/schema.ts, after the existing relation exports. Do not modify any existing lines.

camper table: pgTable("camper", columns, indexes). Columns: id text("id").primaryKey(); firstName text("first_name").notNull(); lastName text("last_name").notNull(); code text("code").notNull().unique() — text type is mandatory (not varchar, not numeric; CAMP-02 requires string storage to preserve leading zeros); bunk text("bunk") (nullable, no default); notes text("notes") (nullable, no default); createdAt timestamp("created_at").defaultNow().notNull(); updatedAt timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(). Indexes (second argument): index("camper_code_idx").on(table.code) and index("camper_name_idx").on(table.firstName, table.lastName).

pool table: pgTable("pool", columns). Columns: id text("id").primaryKey(); name text("name").notNull(); createdAt timestamp("created_at").defaultNow().notNull(); updatedAt timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(). No indexes needed on pool.

The existing import line already includes pgTable, text, timestamp, index — verify this after reading the file. If `index` is already imported, no import changes are needed. If not, add it to the existing import from "drizzle-orm/pg-core".

Use the exact $onUpdate style already in the file: `.$onUpdate(() => /* @__PURE__ */ new Date())` — copy the comment exactly.

Do NOT add relations for camper or pool in this plan — they have no cross-table relationships in Phase 3.
  </action>
  <verify>
    <automated>node -e "const s = require('fs').readFileSync('src/db/schema.ts','utf8'); if (!s.includes('export const camper = pgTable')) throw new Error('camper table missing'); if (!s.includes('export const pool = pgTable')) throw new Error('pool table missing'); if (!s.includes('text(\"code\").notNull().unique()')) throw new Error('code must be text type'); if (!s.includes('camper_code_idx')) throw new Error('camper_code_idx missing'); console.log('schema.ts assertions passed');"</automated>
  </verify>
  <acceptance_criteria>
    - schema.ts contains the line `export const camper = pgTable(`
    - schema.ts contains the line `export const pool = pgTable(`
    - camper.code uses `text("code").notNull().unique()` — no numeric type
    - camper table has indexes: `index("camper_code_idx")` and `index("camper_name_idx")`
    - Existing table definitions (user, session, account, verification) are unchanged
    - npx tsc --noEmit reports no errors on the file (run as part of npm run build)
  </acceptance_criteria>
  <done>schema.ts exports both camper and pool tables; code column is text type; TypeScript compiles without errors.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: [BLOCKING] DB push + bodySizeLimit + AdminSidebar + layout modification</name>
  <files>next.config.ts, src/components/AdminSidebar.tsx, src/app/(admin)/layout.tsx</files>
  <read_first>
    - next.config.ts — read current file (7 lines) to see where to insert experimental block
    - src/app/(admin)/layout.tsx — read current file (14 lines) to see exact return statement and auth guard pattern
    - .planning/phases/03-admin-data-setup/03-RESEARCH.md — Pattern 4 (AdminSidebar) and Pattern 7 (next.config.ts)
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — sections for AdminSidebar and layout.tsx for exact Tailwind classes
    - .planning/phases/03-admin-data-setup/03-UI-SPEC.md — Layout Contract section for exact sidebar CSS: w-48, shrink-0, bg-slate-50, border-r, border-slate-200, min-h-screen, p-4
  </read_first>
  <action>
Step 1 — BLOCKING: Run `npx drizzle-kit push` from the project root. This pushes the camper and pool table definitions from schema.ts to the live Supabase PostgreSQL database. This step is mandatory before any Wave 2 plans execute. The command must exit 0.

Step 2 — next.config.ts: Replace the empty NextConfig object with one that contains `experimental: { serverActions: { bodySizeLimit: "5mb" } }`. Keep the import line and export default line unchanged.

Step 3 — AdminSidebar.tsx: Create src/components/AdminSidebar.tsx as a "use client" component. Import Link from "next/link" and usePathname from "next/navigation". Define a `links` const array with three entries: { href: "/admin/users", label: "Users" }, { href: "/admin/campers", label: "Campers" }, { href: "/admin/pools", label: "Pools" }. Export function AdminSidebar that calls usePathname() and renders a nav element with className `w-48 shrink-0 bg-slate-50 border-r border-slate-200 min-h-screen p-4`. Inside: ul with className `flex flex-col gap-1`. Map links: active = pathname.startsWith(href). Active link className: `block px-3 py-2 rounded-md text-base font-semibold bg-blue-600 text-white transition-colors`. Inactive link className: `block px-3 py-2 rounded-md text-base font-semibold text-slate-700 hover:bg-slate-200 transition-colors`.

Step 4 — layout.tsx modification: Add import `{ AdminSidebar } from "@/components/AdminSidebar"` at the top. Keep the entire auth guard (getSession, redirect checks) unchanged. Change the return from `<>{children}</>` to: div with className `flex min-h-screen`, containing AdminSidebar component and div with className `flex-1 min-w-0` wrapping children.
  </action>
  <verify>
    <automated>npx drizzle-kit push 2>&1 | tail -5 ; echo "exit:$?" && npm run build 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `npx drizzle-kit push` exits 0 without error messages
    - next.config.ts contains `bodySizeLimit: "5mb"` (grep: `grep -c 'bodySizeLimit' next.config.ts` returns 1)
    - src/components/AdminSidebar.tsx exists and exports `function AdminSidebar`
    - AdminSidebar.tsx contains `"use client"` directive on line 1
    - AdminSidebar.tsx contains `usePathname` from "next/navigation"
    - AdminSidebar.tsx contains href "/admin/users", "/admin/campers", "/admin/pools"
    - layout.tsx contains `AdminSidebar` in its return JSX
    - layout.tsx contains `flex min-h-screen` on the outer div
    - `npm run build` exits 0 (no TypeScript errors)
  </acceptance_criteria>
  <done>DB push succeeded (camper and pool tables live in Supabase); next.config.ts raises body limit to 5mb; AdminSidebar renders with active-link logic; admin layout wraps children in sidebar+content flex row; build passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Schema → Database | Drizzle schema pushed to Supabase; schema.ts is developer-controlled |
| Browser → Admin layout | Auth guard in layout.tsx gates all admin routes; unauthenticated users are redirected |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01-S | Spoofing | src/app/(admin)/layout.tsx — auth guard | mitigate | Auth guard unchanged: session check + role === "admin" redirect; sidebar nav links are cosmetic — server-side guards in actions.ts enforce security |
| T-03-01-T | Tampering | src/db/schema.ts — camper.code column type | mitigate | code column defined as text() — never numeric; unique constraint added at schema level as safety net for duplicate codes |
| T-03-01-E | Elevation of Privilege | AdminSidebar link visibility | accept | Sidebar is rendered inside the role-guarded layout; only authenticated admins reach it; links themselves are not a security boundary |
| T-03-01-SC | Tampering | npm/drizzle-kit install (already installed as devDep) | accept | drizzle-kit is already in package.json devDependencies from Phase 1; no new package installs in this plan |
</threat_model>

<verification>
After both tasks complete:
- `npx drizzle-kit push` has already run and exited 0
- `npm run build` passes (TypeScript clean)
- schema.ts exports camper and pool tables
- next.config.ts has bodySizeLimit "5mb"
- AdminSidebar.tsx exists with "use client" and usePathname active-link logic
- layout.tsx uses sidebar + content flex layout
- Wave 2 plans (03-02-pools, 03-03-camper-crud) may now begin in parallel
</verification>

<success_criteria>
- camper table exists in the live Supabase database with columns: id, first_name, last_name, code (text/unique), bunk, notes, created_at, updated_at
- pool table exists in the live Supabase database with columns: id, name, created_at, updated_at
- next.config.ts sets serverActions.bodySizeLimit to "5mb"
- Navigating to /admin/users (or any admin route) shows a left sidebar with Users, Campers, Pools links
- Active sidebar link highlights in blue-600; inactive links are slate-700 text
- npm run build exits 0
</success_criteria>

<output>
Create `.planning/phases/03-admin-data-setup/03-01-SUMMARY.md` when done.
</output>
