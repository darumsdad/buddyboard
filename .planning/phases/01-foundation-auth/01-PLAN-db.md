---
phase: 01-foundation-auth
plan: 02
type: execute
wave: 2
depends_on:
  - 01-PLAN-scaffold
files_modified:
  - .env.local
  - scripts/seed-admin.ts
autonomous: false
requirements:
  - AUTH-01
  - AUTH-02
must_haves:
  truths:
    - "Tables user, session, account, and verification exist in the Supabase public schema"
    - "At least one admin user account exists in the user table (created by seed script)"
    - "drizzle-kit migrate exits with code 0 (migration applied without errors)"
  artifacts:
    - path: ".env.local"
      provides: "Runtime secrets — DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL"
      contains: "DATABASE_URL="
    - path: "scripts/seed-admin.ts"
      provides: "One-time admin user creation script"
      contains: "signUpEmail"
  key_links:
    - from: "drizzle.config.ts"
      to: "Supabase PostgreSQL"
      via: "DATABASE_URL_DIRECT (port 5432 direct connection)"
      pattern: "DATABASE_URL_DIRECT"
    - from: "scripts/seed-admin.ts"
      to: "src/lib/auth.ts"
      via: "auth.api.signUpEmail with username field"
      pattern: "auth\\.api\\.signUpEmail"
---

## Phase Goal

**As a** counselor, **I want to** navigate to the app URL and log in with my username and password, **so that** I can access the pool management screens with a session that persists across browser restarts.

<objective>
This plan connects the running code from Plan 01 to a live Supabase PostgreSQL database. It requires a human action to create the Supabase project, then applies the generated migration to create all Better Auth tables, and seeds the first admin user so login can be tested end-to-end.

Purpose: Without a live database, Better Auth cannot store sessions or validate credentials. This plan is the bridge between working code and a working auth system.

Output: Live Supabase database with auth tables populated, .env.local configured with all secrets, and a seeded admin user account ready for login verification.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-foundation-auth/01-CONTEXT.md
@.planning/phases/01-foundation-auth/01-RESEARCH.md
@.planning/phases/01-foundation-auth/01-01-SUMMARY.md
</context>

<interfaces>
<!-- Key patterns for this plan -->

Supabase connection string formats:
  Transaction pooler (for app runtime — DATABASE_URL):
    postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

  Direct connection (for migrations — DATABASE_URL_DIRECT):
    postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres

BETTER_AUTH_SECRET generation:
  openssl rand -base64 32   (must be 32+ characters)

Seed script pattern (from RESEARCH.md):
  auth.api.signUpEmail({ body: { email: "admin@camp.local", password: "...", name: "Admin", username: "admin" } })
  Note: email is required by emailAndPassword plugin even though users log in by username.
  Note: This is flagged as Assumption A3 in RESEARCH.md — verify the call works with v1.6.22 before committing.
</interfaces>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Create Supabase project and populate .env.local</name>
  <read_first>
    Read .env.example (to see the exact variable names that must be set in .env.local). Read drizzle.config.ts (to confirm DATABASE_URL_DIRECT is what the migration step will use).
  </read_first>
  <what-claude-automated>
    Plan 01 (01-PLAN-scaffold) has already: installed all packages, created src/db/index.ts, src/lib/auth.ts, src/lib/auth-client.ts, src/app/api/auth/[...all]/route.ts, generated src/db/schema.ts via Better Auth CLI, and generated the SQL migration file in drizzle/ via drizzle-kit. Everything is ready — only a live Supabase project is needed to apply the migration.
  </what-claude-automated>
  <how-to-complete>
    1. Go to https://supabase.com and sign in (create a free account if needed).
    2. Click "New project". Set project name to "buddyboard" (or similar). Choose a region close to your location. Set a database password (save it — you will need it for the connection strings).
    3. Wait for the project to finish provisioning (typically 1-2 minutes). The dashboard shows "Project is ready" when done.
    4. In the Supabase dashboard, go to: Project Settings → Database → Connection string.
       - Copy the "Transaction pooler" URI (port 6543) — this is DATABASE_URL.
       - Copy the "Direct connection" URI (port 5432) — this is DATABASE_URL_DIRECT.
       - Replace `[YOUR-PASSWORD]` in both URIs with the database password you set in step 2.
    5. Generate BETTER_AUTH_SECRET: run `openssl rand -base64 32` in your terminal and copy the output (it must be 32+ characters).
    6. Create `.env.local` in the project root (NOT .env.example — .env.local is gitignored). Populate it with:
       - DATABASE_URL=<transaction pooler URI from step 4>
       - DATABASE_URL_DIRECT=<direct connection URI from step 4>
       - BETTER_AUTH_SECRET=<secret from step 5>
       - BETTER_AUTH_URL=http://localhost:3000 (use localhost for now — will be updated to Vercel URL in Plan 04)
       - NEXT_PUBLIC_APP_URL=http://localhost:3000 (same as above)
    7. Confirm .env.local is NOT in git staging: run `git status` and verify .env.local does not appear in untracked or modified files (it should be ignored by .gitignore).
  </how-to-complete>
  <resume-signal>Type "supabase ready" after .env.local is created and the Supabase project is provisioned.</resume-signal>
  <acceptance_criteria>
    - .env.local exists in project root with all 5 variables populated
    - DATABASE_URL in .env.local contains port 6543 (Transaction pooler)
    - DATABASE_URL_DIRECT in .env.local contains port 5432 (direct connection)
    - BETTER_AUTH_SECRET in .env.local is 32+ characters
    - `git status` does not show .env.local (it is gitignored)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: [BLOCKING] Apply database migration and seed admin user</name>
  <files>scripts/seed-admin.ts</files>
  <read_first>
    Read .env.local (confirm DATABASE_URL_DIRECT is set and non-empty before running migration). Read drizzle/[migration-file].sql (review the SQL that will be applied — confirm it creates user, session, account, verification tables). Read src/lib/auth.ts (confirm the auth instance is correctly configured — seed script imports it directly).
  </read_first>
  <action>
    Run `npx drizzle-kit migrate`. This command reads `drizzle.config.ts` (which uses DATABASE_URL_DIRECT), connects to Supabase via the direct connection (port 5432), and applies all pending SQL migration files from the `drizzle/` directory. The migration creates the user, session, account, and verification tables in the Supabase public schema.

    If the migration fails with a connection error, verify DATABASE_URL_DIRECT in .env.local uses port 5432 (not 6543) and that the password is correct. If it fails with "relation already exists", the tables were already created — this is safe to ignore or run with `--force` if drizzle-kit supports it.

    After the migration succeeds, verify in the Supabase dashboard: go to Table Editor and confirm the tables `user`, `session`, `account`, and `verification` exist in the public schema.

    Create `scripts/seed-admin.ts`. This is a one-time script to create the first admin user. Import `auth` from `../src/lib/auth`. Call `auth.api.signUpEmail` with a body containing: `email: "admin@camp.local"` (required by emailAndPassword plugin even though users log in by username), `password: "BuddyBoard2024!"` (a strong default password the developer should change immediately), `name: "Admin"`, `username: "admin"`. Wrap the call in try/catch and log success or error. Add `process.exit(0)` after the successful call so the script terminates (the DB connection pool keeps the process alive otherwise).

    Note on the seed call: RESEARCH.md flags this pattern as Assumption A3 (the username field in signUpEmail with the username plugin). If `auth.api.signUpEmail` does not accept a `username` field in v1.6.22, try `auth.api.signUpUsername` or check the Better Auth v1.6 changelog. The goal is a user account in the `user` table with a non-null `username` column.

    Run `npx tsx scripts/seed-admin.ts` to execute the seed. Confirm it exits cleanly (code 0). In the Supabase Table Editor, verify the `user` table now has at least one row with `username = "admin"`.

    Also install `tsx` as a dev dependency if not already present: `npm install -D tsx`.
  </action>
  <verify>
    <automated>npx tsx scripts/seed-admin.ts</automated>
  </verify>
  <acceptance_criteria>
    - `npx drizzle-kit migrate` exits with code 0
    - Supabase Table Editor shows tables: `user`, `session`, `account`, `verification` in the public schema
    - scripts/seed-admin.ts exists and contains `auth.api.signUpEmail` or equivalent Better Auth user creation call
    - `npx tsx scripts/seed-admin.ts` exits with code 0
    - Supabase Table Editor `user` table has at least 1 row with a non-null `username` column value of "admin"
    - `npx tsx scripts/seed-admin.ts` run a SECOND time either exits cleanly (idempotent) or returns a clear "user already exists" error (not a crash)
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| .env.local → Supabase | DATABASE_URL_DIRECT gives direct DB access — if leaked, attacker has full schema control |
| seed-admin.ts | Creates an account with a known password — must be changed immediately after seeding |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Information Disclosure | DATABASE_URL_DIRECT in .env.local | mitigate | Direct connection string has full DB access. .env.local is gitignored. Never commit. Never log DATABASE_URL_DIRECT to console. drizzle.config.ts only runs at dev/migration time, never at Vercel runtime (Vercel does not use drizzle.config.ts). |
| T-02-02 | Elevation of Privilege | Supabase service role key (if used) | accept | Phase 1 does not use the Supabase service role key — only the database connection string. Row Level Security is not configured in Phase 1 (per STATE.md decision: skip RLS for v1, handle auth at Next.js middleware layer). |
| T-02-03 | Spoofing | Seed admin password "BuddyBoard2024!" | mitigate | Default seed password is documented as temporary. Developer must change admin password immediately after seeding. Phase 2 implements admin password reset. Document in seed script comment: "CHANGE THIS PASSWORD after first login." |
| T-02-04 | Tampering | Migration applied to wrong database | mitigate | DATABASE_URL_DIRECT in .env.local must point to the correct Supabase project. Developer verifies in Supabase Table Editor after migration. Never run migration against a production DB without reviewing the SQL file first. |
| T-02-SC | Tampering | npm install supply chain | mitigate | `tsx` is the only new package installed in this plan. It is a well-established TypeScript runner (npm.im/tsx, github.com/privatenumber/tsx). Verify before install: npm view tsx version. |
</threat_model>

<verification>
After both tasks complete, verify the full plan:

1. In Supabase Table Editor: tables `user`, `session`, `account`, `verification` exist
2. In Supabase Table Editor: `user` table has 1+ rows with `username = "admin"`
3. `git status` — .env.local must NOT appear (gitignored)
4. `npx drizzle-kit migrate` — run again; should report "No pending migrations" (idempotent)
5. `npm run dev` — app should start on localhost:3000 without startup errors (DB connection is validated on first request, not at startup — some errors may only appear on first page load)
</verification>

<success_criteria>
The Supabase database is live with all Better Auth tables created. An admin user account exists. The app can now authenticate real credentials against a real database. The schema migration history is tracked in the drizzle/ directory for future migrations.
</success_criteria>

<output>
Create `.planning/phases/01-foundation-auth/01-02-SUMMARY.md` when done.
</output>
