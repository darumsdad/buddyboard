---
phase: "02-admin-user-management"
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/auth.ts
  - src/lib/auth-client.ts
  - src/db/schema.ts
  - scripts/backfill-admin-role.ts
autonomous: true
requirements:
  - AUTH-03
  - AUTH-04
  - AUTH-05

must_haves:
  truths:
    - "Better Auth admin plugin is registered — /api/auth/admin/* endpoints are active"
    - "authClient.admin.* methods are available via adminClient plugin"
    - "Supabase user table has role, banned, banReason, banExpires columns"
    - "Supabase session table has impersonatedBy column"
    - "Drizzle relations block (userRelations, sessionRelations, accountRelations) is preserved in schema.ts"
    - "Seed admin user (username='admin') has role='admin' in the database"
    - "emailAndPassword.minPasswordLength is set to 8 in auth.ts (D-11)"
  artifacts:
    - path: "src/lib/auth.ts"
      provides: "Better Auth config with admin() plugin and minPasswordLength: 8"
      contains: "admin()"
    - path: "src/lib/auth-client.ts"
      provides: "Auth client with adminClient() plugin"
      contains: "adminClient()"
    - path: "src/db/schema.ts"
      provides: "Drizzle schema with admin plugin columns"
      contains: "role"
    - path: "scripts/backfill-admin-role.ts"
      provides: "One-time script to set seed admin role to 'admin'"
  key_links:
    - from: "src/lib/auth.ts"
      to: "/api/auth/admin/* endpoints"
      via: "admin() plugin registration"
      pattern: "admin\\(\\)"
    - from: "src/db/schema.ts"
      to: "Supabase user table"
      via: "npx drizzle-kit push"
      pattern: "role.*text"
---

## Phase Goal

**As an** admin, **I want to** create, remove, and reset passwords for counselor accounts from a protected screen, **so that** I can manage staff access without developer involvement.

<objective>
Wire the Better Auth admin plugin into auth.ts and auth-client.ts, regenerate the Drizzle schema to add admin plugin columns (role, banned, banReason, banExpires, impersonatedBy), push the updated schema to Supabase, and backfill the seed admin user's role to 'admin'.

Purpose: Plans 02 and 03 depend entirely on the admin plugin being active and the role column existing in the database. This plan creates that foundation.
Output: auth.ts with admin() + minPasswordLength, auth-client.ts with adminClient(), schema.ts with new columns, Supabase DB migrated, seed admin role backfilled.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/02-admin-user-management/02-CONTEXT.md
@.planning/phases/02-admin-user-management/02-RESEARCH.md
@.planning/phases/02-admin-user-management/02-PATTERNS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire admin plugin in auth.ts and auth-client.ts</name>
  <files>src/lib/auth.ts, src/lib/auth-client.ts</files>
  <read_first>
    - src/lib/auth.ts — read current state before modifying; do not touch fields not listed below
    - src/lib/auth-client.ts — read current state before modifying
    - .planning/phases/02-admin-user-management/02-RESEARCH.md — Pattern 1 (auth.ts change) and Pattern 2 (auth-client.ts change)
    - .planning/phases/02-admin-user-management/02-PATTERNS.md — auth.ts and auth-client.ts sections for exact change instructions
  </read_first>
  <action>
    Modify src/lib/auth.ts (three changes only — touch nothing else):
    1. Extend the plugins import: change `import { username } from "better-auth/plugins"` to `import { username, admin } from "better-auth/plugins"` (per D-01)
    2. Add minPasswordLength to emailAndPassword config: change `emailAndPassword: { enabled: true }` to `emailAndPassword: { enabled: true, minPasswordLength: 8 }` (per D-11)
    3. Add admin() after username() in plugins array: `plugins: [username(), admin()]`

    Modify src/lib/auth-client.ts (two changes only — touch nothing else):
    1. Add import on its own line: `import { adminClient } from "better-auth/client/plugins"`
    2. Add adminClient() after usernameClient() in plugins array: `plugins: [usernameClient(), adminClient()]`
    Preserve the existing comment about usernameClient being required.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - src/lib/auth.ts plugins array contains `admin()` after `username()`
    - src/lib/auth.ts emailAndPassword config contains `minPasswordLength: 8`
    - src/lib/auth-client.ts imports `adminClient` from "better-auth/client/plugins"
    - src/lib/auth-client.ts plugins array contains `adminClient()` after `usernameClient()`
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>auth.ts registers admin endpoints; auth-client.ts exposes authClient.admin.* methods; TypeScript compiles</done>
</task>

<task type="auto">
  <name>Task 2 [BLOCKING]: Schema generation, DB push, and admin role backfill</name>
  <files>src/db/schema.ts, scripts/backfill-admin-role.ts</files>
  <read_first>
    - src/db/schema.ts — read the FULL file first and copy lines 78-95 (userRelations, sessionRelations, accountRelations) into memory; you will need to restore them if the CLI drops them
    - scripts/seed-admin.ts — pattern for the backfill script (import paths, tsx-compatible syntax, process.exit usage)
    - .planning/phases/02-admin-user-management/02-RESEARCH.md — Pattern 6 (migration sequence), Pitfall 3 (deploy before migration), Pitfall 4 (seed user missing role), Pitfall 5 (CLI overwrites relations)
    - .planning/phases/02-admin-user-management/02-PATTERNS.md — schema.ts section (relations block to preserve, exact columns CLI will add)
  </read_first>
  <action>
    Step 1 — Regenerate schema:
    Run `npx @better-auth/cli generate` from project root. This adds to schema.ts:
    - user table: role TEXT, banned BOOLEAN DEFAULT false, banReason TEXT (column name: ban_reason), banExpires TIMESTAMP (column name: ban_expires)
    - session table: impersonatedBy TEXT (column name: impersonated_by)

    After the CLI runs, read src/db/schema.ts and verify the relations block is present. Check for all three exports: userRelations, sessionRelations, accountRelations. If any are missing, restore them from the snapshot you memorized in read_first. The CLI must not remove existing custom content.

    Step 2 — Push schema to Supabase [BLOCKING]:
    Run `npx drizzle-kit push` from project root. This applies the new columns to Supabase directly. The command must exit 0. If it prompts for confirmation, answer yes.

    Step 3 — Create backfill script:
    Create scripts/backfill-admin-role.ts following the exact import style of scripts/seed-admin.ts. The script must:
    - Import db from "../src/db" and { user } from "../src/db/schema" and { eq } from "drizzle-orm"
    - Run: `await db.update(user).set({ role: "admin" }).where(eq(user.username, "admin")).returning()`
    - If returning() yields 0 rows: log error "Admin user not found" and call process.exit(1)
    - If returning() yields rows: log the result and call process.exit(0)
    Wrap in an async function and call it.

    Step 4 — Run backfill:
    Run `npx tsx scripts/backfill-admin-role.ts` from project root. It must exit 0 and log the admin user row with role='admin'.
  </action>
  <verify>
    <automated>npx tsx scripts/backfill-admin-role.ts</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>npm test</automated>
  </verify>
  <acceptance_criteria>
    - `npx drizzle-kit push` exited 0 (schema applied to Supabase)
    - src/db/schema.ts user table definition includes role, banned, banReason, banExpires columns
    - src/db/schema.ts session table definition includes impersonatedBy column
    - src/db/schema.ts contains userRelations, sessionRelations, accountRelations exports (not dropped by CLI)
    - `npx tsx scripts/backfill-admin-role.ts` exits 0 and logs a user row with role='admin'
    - `npx tsc --noEmit` exits 0
    - `npm test` passes (existing login tests unaffected by schema changes)
  </acceptance_criteria>
  <done>Supabase has all admin plugin columns; seed admin user has role='admin'; schema.ts compiles with relations preserved</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CLI → src/db/schema.ts | @better-auth/cli generate modifies the source file on disk |
| scripts → Supabase | backfill-admin-role.ts writes directly to the production database via DATABASE_URL |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-02-01 | Tampering | emailAndPassword config | Medium | mitigate | Set `minPasswordLength: 8` explicitly in auth.ts (D-11); the default is 8 but explicit config documents intent and prevents silent change if Better Auth defaults shift |
| T-02-02 | Tampering | src/db/schema.ts (CLI overwrite) | Medium | mitigate | Read and memorize relations block BEFORE running CLI; verify after CLI run; restore manually if dropped (Pitfall 5 in RESEARCH.md) |
| T-02-SC | Tampering | @better-auth/cli, drizzle-kit installs | Low | accept | Both packages pre-installed and audited in Phase 1 RESEARCH; no new package installs in this plan |
</threat_model>

<verification>
After both tasks complete:
- `npx tsc --noEmit` passes — TypeScript sees admin(), adminClient(), new schema columns with correct types
- `npm test` passes — existing login tests unaffected
- src/lib/auth.ts grep: `admin()` in plugins array + `minPasswordLength: 8` in emailAndPassword
- src/lib/auth-client.ts grep: `adminClient()` in plugins array
- src/db/schema.ts grep: `role` column on user table + relations exports present
- `npx tsx scripts/backfill-admin-role.ts` exits 0
</verification>

<success_criteria>
- auth.ts: admin() in plugins + minPasswordLength: 8 in emailAndPassword config
- auth-client.ts: adminClient() in plugins
- schema.ts: role/banned/banReason/banExpires on user, impersonatedBy on session, relations preserved
- Supabase DB: drizzle-kit push exited 0 (columns exist in live database)
- Seed admin: role='admin' confirmed by backfill script exit 0
- TypeScript compiles: npx tsc --noEmit exits 0
- All existing tests pass: npm test exits 0
</success_criteria>

<output>
Create `.planning/phases/02-admin-user-management/02-01-SUMMARY.md` when done
</output>
