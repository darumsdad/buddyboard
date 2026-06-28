# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy a working Next.js app to Vercel where counselors can log in with username and password, stay logged in across browser restarts (5-hour idle timeout), and land on a placeholder pool selection screen. Includes: project scaffold, Supabase schema, Drizzle migrations, Better Auth setup, login page, and Vercel CI/CD wired to GitHub.

**Success criteria (from ROADMAP.md):**
1. Navigating to the app URL shows a login page — not a 404 or error
2. Counselor can enter a username and password and reach the protected app
3. Closing the browser and reopening restores the authenticated session without requiring a new login
4. Navigating to a protected route while unauthenticated redirects to the login page

</domain>

<decisions>
## Implementation Decisions

### Frontend Framework
- **D-01:** Next.js with App Router — full-stack React, file-based routing, API routes built in. Native fit for Supabase + Better Auth + Drizzle.
- **D-02:** Strict TypeScript (`strict: true` in tsconfig) + ESLint + Prettier — standard production setup from day one.
- **D-03:** Tailwind CSS for styling — utility-first, fast iteration, excellent for iPad-first responsive design.
- **D-04:** Drizzle schema and migrations live in `src/db/` inside the Next.js app — single-app, single package.json, no monorepo overhead.

### Auth (Better Auth)
- **D-05:** Session duration: 5-hour idle timeout. Clock resets on each user action. Session expires only after 5 hours of inactivity. Rationale: shared poolside iPads — enough for a full shift without forcing re-login mid-session.
- **D-06:** Session token stored in HTTP-only cookie — Better Auth's default, protects against XSS. No localStorage.
- **D-07:** Always-persist sessions (no "Remember me" checkbox). Sessions always survive browser restarts up to the idle limit. Simpler poolside UX.
- **D-08:** Pool session close does NOT affect auth sessions — counselors stay logged in.

### Login Page
- **D-09:** Login page shows "BuddyBoard" heading + username/password form + Login button. Minimal and functional.
- **D-10:** Login errors: generic message only — "Invalid username or password" — regardless of whether username or password is wrong.
- **D-11:** After login, redirect to pool selection screen (placeholder list of pool names with click targets). Not a blank "you are logged in" page — gives something real to verify the routing before Phase 4 builds on it.

### CI/CD & Deployment
- **D-12:** Deploy to Vercel — zero server setup, native Next.js host, git push = deployed. Supabase Realtime runs from Supabase's own servers so no VPS needed for WebSocket.
- **D-13:** Connect GitHub repo to Vercel in Phase 1. Every push to `main` auto-deploys. PR branches get preview URLs. This is Vercel's default behavior — minimal setup.
- **D-14:** No CI test gate in Phase 1. No tests yet — add a GitHub Actions lint/type-check step in Phase 2+ when there's something to validate.
- **D-15:** Hostinger remains available for migration later. Code is identical — moving to Hostinger only requires swapping the deploy pipeline (GitHub Actions + nginx), zero app code changes.

### Claude's Discretion
- Error display style and field validation UX on the login form — standard web patterns apply.
- Exact Drizzle schema column names and types for the users table — follow Better Auth's recommended schema.
- Next.js project structure conventions (e.g., where to put middleware, route groups for auth vs. public).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01 (username/password login) and AUTH-02 (session persists across browser restarts) are the Phase 1 requirements. Read the full requirement definitions there.
- `.planning/PROJECT.md` — Key Decisions table (Supabase, Hostinger, GitHub), Constraints section (no email reset, no OAuth, iPad-first), Out of Scope section.
- `.planning/ROADMAP.md` — Phase 1 success criteria (4 items). These are the acceptance tests for this phase.

### No external specs
No ADRs, design specs, or third-party docs were referenced during discussion. Technology choices (Better Auth, Drizzle, Supabase) are specified in the roadmap — researcher should pull current docs for each.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing components, hooks, or utilities.

### Established Patterns
- None yet — this phase establishes the patterns all subsequent phases follow.

### Integration Points
- Supabase project (to be created) — app connects via environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- Better Auth sits on top of Drizzle and manages the users/sessions tables — planner should check Better Auth's Drizzle adapter docs for the exact schema it expects.
- Next.js middleware (`src/middleware.ts`) — handles unauthenticated redirect to `/login`.

</code_context>

<specifics>
## Specific Ideas

- Pool selection screen in Phase 1 is a placeholder — a simple list of the 3 default pool names (from REQUIREMENTS.md POOL-02) rendered as clickable buttons. No session logic yet (that's Phase 4). Purpose: prove auth works and protected routes are reachable.
- The 5-hour idle timeout decision came from the shared-device context: counselors use camp iPads and laptops that are not personal devices. Admin-set password reset (Phase 2) is the recovery path — no self-serve reset.

</specifics>

<deferred>
## Deferred Ideas

- "Log everyone out when a pool session closes" — discussed briefly, deferred. Not needed for v1. Pool session lifecycle (Phase 4) does not affect auth sessions.
- CI lint/type-check gate — noted for Phase 2+ once there's meaningful code to validate.
- Camp branding on login page — can add later if the camp wants their name/logo. Out of Phase 1 scope.

</deferred>

---

*Phase: 1-Foundation & Auth*
*Context gathered: 2026-06-27*
