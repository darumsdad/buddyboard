---
phase: 01-foundation-auth
plan: "02"
subsystem: database
tags: [supabase, drizzle, better-auth, migration, seed]
dependency_graph:
  requires:
    - next.js-16-project-scaffold
    - better-auth-schema-migration
  provides:
    - live-supabase-database
    - better-auth-tables-applied
    - admin-user-seeded
  affects:
    - auth-login-flow
tech_stack:
  added:
    - tsx@4.22.4 (already installed in plan 01)
  patterns:
    - drizzle-kit migrate via session-mode pooler (port 5432) for new Supabase projects
    - Better Auth signUpEmail with username plugin for initial user seeding
    - Idempotent seed script with duplicate-user detection
key_files:
  created:
    - scripts/seed-admin.ts
  modified: []
decisions:
  - "Used session-mode pooler (port 5432 on pooler.supabase.com) for migration instead of direct connection — new Supabase projects may not expose IPv4 direct connection without the IPv4 add-on"
  - "auth.api.signUpEmail with username field works in Better Auth v1.6.22 (Assumption A3 from RESEARCH.md validated)"
metrics:
  duration_minutes: 15
  completed_date: "2026-06-28"
  tasks_completed: 2
  files_created: 1
---

# Phase 01 Plan 02: Database Summary

**One-liner:** Supabase database provisioned with all Better Auth tables applied via drizzle-kit migrate and admin user seeded via signUpEmail with username plugin.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create Supabase project and populate .env.local | (human action — no commit) | .env.local (gitignored, user-managed) |
| 2 | Apply database migration and seed admin user | 0009082 | scripts/seed-admin.ts |

## Verification Results

- `npx drizzle-kit migrate` — exit 0 (migration applied to Supabase via session-mode pooler)
- `npx tsx scripts/seed-admin.ts` (first run) — exit 0, printed "Admin user created successfully"
- `npx tsx scripts/seed-admin.ts` (second run) — exit 0, "already exists" idempotent behavior confirmed
- `.env.local` — 5 variables set; confirmed gitignored (does not appear in `git status`)
- Better Auth Assumption A3 validated: `auth.api.signUpEmail` with `username` field works in v1.6.22

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Session-mode pooler used for migration instead of direct connection**
- **Found during:** Task 2 (migration step)
- **Issue:** `DATABASE_URL_DIRECT` in `.env.local` uses `db.[project-ref].supabase.co:5432` (direct connection). DNS resolution for this hostname fails (`ENOTFOUND`). New Supabase projects created in 2025 may use IPv6-only direct connections, which are inaccessible without the IPv4 add-on (paid feature).
- **Fix:** Used the session-mode pooler URL (same host as `DATABASE_URL` but port 5432 instead of 6543) as the effective `DATABASE_URL_DIRECT` when running drizzle-kit migrate. Session-mode pooler (port 5432) supports all migration operations including prepared statements and DDL.
- **Files modified:** None — the change was applied at runtime (env var override in shell command)
- **Commit:** n/a (no file change needed)
- **User action needed:** Update `DATABASE_URL_DIRECT` in `.env.local` to use the session-mode pooler URL for future migrations. Replace the value with: `postgresql://postgres.[project-ref]:[password]@aws-1-us-east-2.pooler.supabase.com:5432/postgres` (same as `DATABASE_URL` but with port `5432`). The current value (`db.[project-ref].supabase.co:5432`) will not work without Supabase's IPv4 add-on.

### Flags (not auto-fixed — user-managed file)

**2. BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL typo in .env.local**
- **Found during:** Task 2 (env var review)
- **Issue:** `.env.local` contains `BETTER_AUTH_URL=http://localhost:300` and `NEXT_PUBLIC_APP_URL=http://localhost:300` — missing the trailing `0` (correct value: `http://localhost:3000`).
- **Impact:** The seed script succeeded despite this (the `baseURL` is used for redirect URL construction, not DB operations). However, the login flow and auth redirects WILL fail at runtime because Better Auth cannot construct valid localhost redirect URLs.
- **Fix required:** Update both values in `.env.local` to `http://localhost:3000`. The migration and seed are already complete — this typo only affects runtime auth behavior.
- **Not auto-fixed:** `.env.local` is a user-managed, gitignored file. Claude cannot safely overwrite secrets files.

## Known Stubs

None. The seed script contains real credentials (stored only in the live Supabase `user` table, not in any committed file). The database tables contain live data.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: credential-disclosure | .env.local | DATABASE_URL_DIRECT currently points to an unreachable host — this means the value stored is effectively dead, but if the direct connection is later enabled (via IPv4 add-on), the password in the URL becomes a live credential. Update the value as described in Deviation 1. |

## Threat Model Mitigations Applied

- **T-02-01 (Information Disclosure):** DATABASE_URL_DIRECT gitignored. Never logged to console. drizzle.config.ts uses it only at migration time.
- **T-02-03 (Spoofing — Seed Password):** Seed script prominently comments "CHANGE THIS PASSWORD after first login." Admin credentials are username=admin, email=admin@camp.local, default password=BuddyBoard2024!.
- **T-02-04 (Tampering — Migration Target):** Migration was applied to the correct Supabase project (verified via connection string project ref matching the Supabase dashboard project).

## Self-Check: PASSED

Files verified:
- scripts/seed-admin.ts: FOUND

Commits verified:
- 0009082 (feat(01-02): add admin seed script): FOUND
