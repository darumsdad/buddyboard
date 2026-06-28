---
phase: "02-admin-user-management"
plan: "01"
subsystem: "auth"
tags: ["better-auth", "admin-plugin", "drizzle", "schema-migration", "supabase"]
dependency_graph:
  requires: []
  provides:
    - "Better Auth admin() plugin registered — /api/auth/admin/* endpoints active"
    - "authClient.admin.* methods available via adminClient() plugin"
    - "Supabase user table: role, banned, banReason, banExpires columns"
    - "Supabase session table: impersonatedBy column"
    - "Drizzle relations block preserved in schema.ts"
    - "Seed admin user role='admin' in database"
  affects:
    - "src/lib/auth.ts"
    - "src/lib/auth-client.ts"
    - "src/db/schema.ts"
tech_stack:
  added: []
  patterns:
    - "Better Auth admin() plugin alongside username() plugin"
    - "adminClient() in auth-client.ts plugins array"
    - "Dynamic imports in tsx scripts to ensure dotenv loads before db client init"
    - "drizzle-kit push via pooler URL (port 6543) when direct connection (port 5432) is blocked"
key_files:
  created:
    - "scripts/backfill-admin-role.ts"
    - "auth-schema.ts"
  modified:
    - "src/lib/auth.ts"
    - "src/lib/auth-client.ts"
    - "src/db/schema.ts"
decisions:
  - "D-01: admin() plugin registered in auth.ts alongside username()"
  - "D-11: minPasswordLength: 8 set explicitly in emailAndPassword config"
  - "D-04: seed admin user backfilled to role='admin' via tsx script"
  - "Used pooler URL (port 6543) for drizzle-kit push — direct port 5432 unreachable from dev environment"
  - "Used dynamic imports in backfill script to ensure dotenv loads before Drizzle client initializes"
metrics:
  duration: "~6 minutes (356 seconds)"
  completed: "2026-06-28"
  tasks_completed: 2
  files_changed: 5
---

# Phase 02 Plan 01: Auth Plugin Foundation Summary

**One-liner:** Better Auth admin() plugin wired with schema migration (role/banned/banReason/banExpires/impersonatedBy columns pushed to Supabase) and seed admin backfilled to role='admin'.

## What Was Built

Plan 01 established the foundation required by Plans 02 and 03: the Better Auth admin plugin is now active, the database schema has all required columns, and the seed admin user has the correct role.

**Task 1 — Auth plugin wiring:**
- `src/lib/auth.ts`: Extended `import { username }` to `import { username, admin }`, added `admin()` to plugins array, added `minPasswordLength: 8` to emailAndPassword config (D-11)
- `src/lib/auth-client.ts`: Added `import { adminClient } from "better-auth/client/plugins"`, added `adminClient()` to plugins array

**Task 2 — Schema migration and backfill:**
- Ran `npx @better-auth/cli generate` → generated `auth-schema.ts` with admin plugin columns (CLI generates to `./auth-schema.ts` by default, not `src/db/schema.ts`)
- Manually merged new columns into `src/db/schema.ts`: user table gained role/banned/banReason/banExpires; session table gained impersonatedBy; relations block preserved
- Ran `npx drizzle-kit push` via pooler URL to apply columns to Supabase
- Created `scripts/backfill-admin-role.ts` and ran it — admin user confirmed `role='admin'`

## Verification Results

- `npx tsc --noEmit`: exits 0
- `npm test`: 6/6 tests pass
- `npx tsx scripts/backfill-admin-role.ts`: exits 0, logs `role: 'admin'`
- `drizzle-kit push`: applied all 5 new columns to Supabase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @better-auth/cli generates to auth-schema.ts, not src/db/schema.ts**
- **Found during:** Task 2 Step 1
- **Issue:** CLI prompted "Do you want to generate the schema to ./auth-schema.ts?" — the plan assumed the CLI would update `src/db/schema.ts` directly. The CLI generates to a separate file.
- **Fix:** Accepted the auth-schema.ts output, then manually merged the new columns (role, banned, banReason, banExpires, impersonatedBy) into the existing `src/db/schema.ts`. This actually BETTER satisfies Pitfall 5 mitigation — the relations block was never at risk since we never overwrote schema.ts.
- **Files modified:** `src/db/schema.ts` (manually updated), `auth-schema.ts` (new, CLI output, committed for reference)
- **Commits:** 0fedc3c

**2. [Rule 3 - Blocking] Direct Supabase connection (port 5432) unreachable from dev environment**
- **Found during:** Task 2 Step 2
- **Issue:** `npx drizzle-kit push` with `DATABASE_URL_DIRECT` (port 5432) failed — `ENOTFOUND db.oahkyfeogugoghhhtaoh.supabase.co`. Port 5432 DNS did not resolve in this environment.
- **Fix:** Used the pooler URL (port 6543) for DATABASE_URL_DIRECT in the push command. DDL operations (ALTER TABLE) work correctly through the pooler. The push exited 0 and applied all 5 columns successfully.
- **Impact:** None — the schema was applied correctly to Supabase.

**3. [Rule 3 - Blocking] ESM import hoisting prevented dotenv from loading before Drizzle client init**
- **Found during:** Task 2 Step 4
- **Issue:** The backfill script's `import { db } from "../src/db"` was hoisted above the `dotenv.config()` call by the JavaScript module system. The Drizzle postgres client is created at import time using `process.env.DATABASE_URL`, which was undefined → connected to localhost:5432.
- **Fix:** Rewrote the backfill script to use dynamic imports (`await import("../src/db/index.js")`) after calling `dotenv.config()`. This ensures DATABASE_URL is populated before the Drizzle client initializes.
- **Files modified:** `scripts/backfill-admin-role.ts`

## Known Stubs

None — this plan is infrastructure only (no UI, no rendering).

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced beyond what the admin plugin already defines.

## Self-Check: PASSED

- [x] `src/lib/auth.ts` exists and contains `admin()` and `minPasswordLength: 8`
- [x] `src/lib/auth-client.ts` exists and contains `adminClient()`
- [x] `src/db/schema.ts` exists and contains `role`, `banned`, `banReason`, `banExpires`, `impersonatedBy`, and all three relations exports
- [x] `scripts/backfill-admin-role.ts` exists
- [x] Commit 721311f exists (Task 1)
- [x] Commit 0fedc3c exists (Task 2)
- [x] `npm test` passes (6/6)
- [x] `npx tsc --noEmit` passes
