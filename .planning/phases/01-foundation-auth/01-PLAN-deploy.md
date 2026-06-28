---
phase: 01-foundation-auth
plan: 04
type: execute
wave: 3
depends_on:
  - 01-PLAN-db
  - 01-PLAN-ui
files_modified: []
autonomous: false
requirements:
  - AUTH-01
  - AUTH-02
must_haves:
  truths:
    - "App is live at a Vercel URL (not localhost)"
    - "Navigating to the Vercel URL shows the login page — not a 404 or build error"
    - "A counselor can log in with the seeded admin credentials on the live Vercel URL"
    - "Authenticated session survives browser close and reopen on the live URL"
    - "Navigating to /pools on the live URL while unauthenticated redirects to /login"
    - "Every push to main branch triggers an automatic Vercel redeploy"
  artifacts:
    - path: "Vercel project"
      provides: "Live deployment connected to GitHub main branch"
      contains: "Auto-deploy on push"
  key_links:
    - from: "GitHub main branch"
      to: "Vercel production URL"
      via: "Vercel GitHub integration — push triggers build + deploy"
      pattern: "git push"
    - from: "Vercel environment variables"
      to: "src/lib/auth.ts BETTER_AUTH_URL"
      via: "BETTER_AUTH_URL set to production Vercel domain"
      pattern: "BETTER_AUTH_URL"
---

## Phase Goal

**As a** counselor, **I want to** navigate to the app URL and log in with my username and password, **so that** I can access the pool management screens with a session that persists across browser restarts.

<objective>
This plan deploys the fully-wired BuddyBoard app to Vercel and verifies all four phase success criteria on the live production URL. It requires two human actions: connecting the GitHub repository to Vercel and configuring environment variables in the Vercel dashboard.

Purpose: Local verification is not sufficient — the app must work on Vercel's serverless infrastructure, which has stricter requirements (Transaction pooler, Edge/Node runtime, env var injection at build time vs runtime). This plan proves the walking skeleton works end-to-end in production.

Output: Live Vercel deployment with auto-deploy on git push, all environment variables configured, and all four phase success criteria verified against the production URL.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-foundation-auth/01-CONTEXT.md
@.planning/phases/01-foundation-auth/01-01-SUMMARY.md
@.planning/phases/01-foundation-auth/01-02-SUMMARY.md
@.planning/phases/01-foundation-auth/01-03-SUMMARY.md
</context>

<interfaces>
<!-- Vercel deployment requirements for this stack -->

Required Vercel environment variables:
  DATABASE_URL         — Supabase Transaction pooler URI (port 6543) — set for Production + Preview + Development
  DATABASE_URL_DIRECT  — Supabase direct URI (port 5432) — set for Production + Preview + Development (needed if migrations run from Vercel CLI in future)
  BETTER_AUTH_SECRET   — 32+ char random string (same value as .env.local) — Production only (or all environments with same secret)
  BETTER_AUTH_URL      — Production: https://[your-project].vercel.app — Preview: leave unset or use Vercel system env VERCEL_URL workaround
  NEXT_PUBLIC_APP_URL  — Production: https://[your-project].vercel.app — must match BETTER_AUTH_URL

Important: BETTER_AUTH_URL must match the exact domain Better Auth will serve from.
A mismatch causes auth callbacks to fail with "Invalid URL" or CORS errors in production (RESEARCH.md Pitfall 3).

GitHub push command sequence:
  git add .
  git commit -m "feat(01): walking skeleton — BuddyBoard Phase 1"
  git push origin master    (or main, depending on branch name)
  Verify push triggers Vercel build in the Vercel dashboard.
</interfaces>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Connect GitHub to Vercel and configure environment variables</name>
  <read_first>
    Read .env.example (to see the exact variable names and descriptions that must be set in Vercel). Check git remote: run `git remote -v` to confirm the GitHub remote URL exists. If no remote exists, create the GitHub repo first.
  </read_first>
  <what-claude-automated>
    Plans 01-03 have already: scaffolded the Next.js project, installed all packages, wired Better Auth and Drizzle, generated and applied the schema migration to Supabase, seeded an admin user, built the login page and pools placeholder, and configured middleware. All code is ready to deploy. The git repository exists. This task connects the repo to Vercel and configures secrets.
  </what-claude-automated>
  <how-to-complete>
    Step A — Ensure code is pushed to GitHub:
    1. If the GitHub remote does not exist: go to https://github.com/new, create a repo named "buddyboard" (private), copy the remote URL.
    2. Run `git remote add origin [github-url]` if no remote exists.
    3. Stage and commit all files: `git add -A && git commit -m "feat(01): BuddyBoard walking skeleton — auth, DB, UI"`. Verify .env.local is NOT in the commit: `git status` before committing.
    4. Push: `git push -u origin master` (or `main` if that is your branch name).

    Step B — Create Vercel project:
    1. Go to https://vercel.com and sign in (create a free account if needed).
    2. Click "Add New Project". Select "Import Git Repository". Connect to your GitHub account and select the "buddyboard" repository.
    3. Vercel auto-detects Next.js — accept the default build settings. Do NOT click Deploy yet.

    Step C — Configure environment variables in Vercel BEFORE first deploy:
    Click "Environment Variables" in the project setup screen. Add ALL of the following:
    - Name: `DATABASE_URL`, Value: [transaction pooler URI from .env.local], Environments: Production, Preview, Development
    - Name: `DATABASE_URL_DIRECT`, Value: [direct connection URI from .env.local], Environments: Production, Preview, Development
    - Name: `BETTER_AUTH_SECRET`, Value: [same 32+ char secret from .env.local], Environments: Production, Preview, Development
    - Name: `BETTER_AUTH_URL`, Value: `https://buddyboard.vercel.app` (or your Vercel subdomain — check what Vercel shows as your project URL), Environments: Production only
    - Name: `NEXT_PUBLIC_APP_URL`, Value: `https://buddyboard.vercel.app` (same as BETTER_AUTH_URL), Environments: Production only

    After all variables are added, update .env.local on your local machine: change BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL from `http://localhost:3000` to `https://[your-vercel-url]` for any prod-specific testing. Keep `http://localhost:3000` values for local dev — or keep a separate .env.local.production if needed.

    Step D — Deploy:
    Click "Deploy". Watch the Vercel build log. A successful deployment shows "Ready" status and a production URL.

    Step E — Verify the build succeeded:
    In the Vercel dashboard, confirm: build logs show no errors, deployment status is "Ready", and the production URL is accessible.
  </how-to-complete>
  <resume-signal>Type "vercel deployed" once the deployment shows "Ready" status in the Vercel dashboard, with the production URL available.</resume-signal>
  <done>
    - Vercel project exists and is connected to the GitHub repository
    - All 5 environment variables (DATABASE_URL, DATABASE_URL_DIRECT, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL) are configured in Vercel
    - BETTER_AUTH_URL value matches the actual Vercel production domain (https://[project].vercel.app)
    - Vercel deployment shows "Ready" status (green)
    - Build log in Vercel shows no errors
    - The production URL is accessible (returns HTTP 200, not 404 or 500)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify all four phase success criteria on the live Vercel URL</name>
  <read_first>
    Note the Vercel production URL from Task 1. Have the admin credentials ready: username "admin", password "BuddyBoard2024!" (set in Plan 02 seed script).
  </read_first>
  <what-built>
    The full BuddyBoard walking skeleton is deployed to Vercel: Next.js app with Better Auth username/password authentication, Supabase PostgreSQL database with Better Auth schema, HTTP-only session cookies with 5-hour idle timeout, login page with generic error messages, pool selection placeholder with server-side session validation, and middleware that redirects unauthenticated requests to /login.
  </what-built>
  <how-to-verify>
    Test each of the four ROADMAP Phase 1 success criteria in order:

    **Criterion 1: Navigating to the app URL shows a login page**
    1. Open a fresh incognito/private browser window (no cookies).
    2. Navigate to https://[your-vercel-url].
    3. Expected: The page shows the "BuddyBoard" heading, a username field, a password field, and a "Log in" button. No 404, no server error, no blank page.

    **Criterion 2: Counselor can enter username and password and reach the protected app**
    4. In the login form: enter username "admin", password "BuddyBoard2024!".
    5. Click "Log in".
    6. Expected: Page redirects to /pools showing "Select a Pool" with three pool buttons (Main Pool, Lap Pool, Kiddie Pool). No error message appears.
    7. In browser DevTools → Application → Cookies: confirm a cookie from the app domain is present and marked as HttpOnly.

    **Criterion 3: Closing the browser and reopening restores the session**
    8. Close ALL browser windows (not just the tab — the entire browser application).
    9. Reopen the browser and navigate to https://[your-vercel-url]/pools.
    10. Expected: The pool selection screen loads WITHOUT showing the login page. The session survived the browser restart.

    **Criterion 4: Navigating to a protected route while unauthenticated redirects to /login**
    11. Open a fresh incognito/private browser window.
    12. Navigate directly to https://[your-vercel-url]/pools.
    13. Expected: Page redirects to /login. The /pools content is never shown to unauthenticated users.

    **Bonus — verify auto-deploy works:**
    14. Make a trivial change locally (e.g., add a comment to src/app/page.tsx).
    15. Push to main: `git add . && git commit -m "chore: test auto-deploy" && git push`.
    16. In Vercel dashboard: confirm a new deployment is triggered automatically within ~30 seconds.

    If any criterion fails, document the failure and the URL where it was observed. Common issues and solutions are in RESEARCH.md Pitfalls section.
  </how-to-verify>
  <resume-signal>Type "phase 1 complete" if all four criteria pass. Describe any failures in detail if criteria do not pass (include the exact URL and behavior observed).</resume-signal>
  <done>
    - Criterion 1: https://[vercel-url] shows login page with "BuddyBoard" heading (not 404/500/blank)
    - Criterion 2: Login with admin/BuddyBoard2024! redirects to /pools showing three pool buttons; DevTools shows HttpOnly cookie
    - Criterion 3: After closing all browser windows and reopening, /pools loads without requiring re-login
    - Criterion 4: Fresh incognito window navigating to /pools redirects to /login
    - Auto-deploy: git push to main triggers a Vercel redeploy (confirmed in Vercel dashboard)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Vercel env vars → Production runtime | All secrets injected by Vercel at build/runtime — must match values in .env.local exactly |
| BETTER_AUTH_URL → Auth callback | URL must match production domain — mismatch causes silent auth failures |
| GitHub → Vercel | Every push to main deploys; no approval gate in Phase 1 per D-14 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Spoofing | BETTER_AUTH_URL domain mismatch | mitigate | BETTER_AUTH_URL must exactly match the Vercel production domain. Set in Vercel env vars for Production environment only. Acceptance criterion verifies BETTER_AUTH_URL matches actual Vercel URL. If wrong, auth redirects fail silently or CORS errors appear (RESEARCH.md Pitfall 3). |
| T-04-02 | Spoofing | BETTER_AUTH_SECRET weak or reused | mitigate | Same 32+ char secret from .env.local is used in Vercel. Secret was generated with `openssl rand -base64 32` (per Plan 02). Never use a short or predictable secret (RESEARCH.md Pitfall 4). |
| T-04-03 | Information Disclosure | Secrets in git history | mitigate | .env.local is gitignored. All secrets are configured via Vercel environment variables. Verify `git log -- .env.local` returns nothing before first push. |
| T-04-04 | Tampering | Unsecured deploy pipeline | accept | Per D-14, no CI gate in Phase 1. Any push to main deploys. Risk is acceptable for MVP — add lint/type-check gate in Phase 2. |
| T-04-05 | Information Disclosure | Vercel preview URLs expose staging data | accept | Preview deployments get their own URLs (buddyboard-[hash].vercel.app). They share the same DATABASE_URL, so preview deploys connect to the same Supabase DB. Acceptable for MVP — no sensitive data in Phase 1 beyond the single admin account. |
| T-04-SC | Tampering | npm install during Vercel build | mitigate | All packages were verified in RESEARCH.md Package Legitimacy Audit. Vercel installs from package.json + package-lock.json (pinned versions). package-lock.json should be committed to ensure reproducible builds. |
</threat_model>

<verification>
Phase 1 is complete when all four items below are confirmed on the live Vercel URL:

1. GET https://[vercel-url] → returns 302 redirect to /login or renders login page directly (status 200 with login form)
2. POST /api/auth/sign-in/username with valid credentials → returns 200 + Set-Cookie header with HttpOnly cookie
3. GET https://[vercel-url]/pools with valid session cookie → returns 200 with pool selection page content
4. GET https://[vercel-url]/pools with NO session cookie → returns 302 redirect to /login
5. Browser close + reopen + navigate to /pools → shows pool selection (session persisted, not expired)
</verification>

<success_criteria>
All four ROADMAP Phase 1 success criteria are verified on the live Vercel production URL. The walking skeleton is complete: Next.js scaffold + Supabase DB + Better Auth + login UI + protected route + Vercel CI/CD. Phase 2 can begin.
</success_criteria>

<output>
Create `.planning/phases/01-foundation-auth/01-04-SUMMARY.md` when done.
</output>
