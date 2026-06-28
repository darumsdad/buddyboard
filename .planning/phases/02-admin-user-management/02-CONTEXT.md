# Phase 2: Admin User Management - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can create counselor/admin accounts (username + password + role), remove accounts (hard delete, cascades sessions), and reset any user's password — all from a protected `/admin/users` page without developer involvement. No email flow. Scope ends at user account management; pool config and camper roster come in Phase 3.

**Success criteria (from ROADMAP.md):**
1. Admin can create a new account with a username, password, and role (admin or counselor)
2. Admin can remove a user account; the removed user can no longer log in
3. Admin can set a new password for any user; no email flow is involved

</domain>

<decisions>
## Implementation Decisions

### Auth & Role System
- **D-01:** Use Better Auth's `admin` plugin — add it to `src/lib/auth.ts` alongside the existing `username` plugin. This provides `createUser`, `listUsers`, `setUserPassword`, `removeUser` server-side handlers and `authClient.admin.*` client-side methods. Avoids building custom API routes for standard CRUD.
- **D-02:** Role mapping: `"user"` role in the database = Counselor; `"admin"` role = Admin. Display "Counselor" and "Admin" as labels in the UI — never expose the raw "user" value. The admin plugin adds `role` and `banReason` columns to the user table via migration; run that migration before Phase 2 code ships.
- **D-03:** Removal is a hard delete — use `admin.removeUser`. The existing `onDelete: "cascade"` on sessions and accounts handles cleanup. No soft-ban or deactivation.
- **D-04:** The existing admin seed user (created in Phase 1) must have `role = 'admin'` after the migration runs. A backfill step or seed update is required.

### Admin Route & Layout
- **D-05:** Create a new `(admin)` route group with its own layout. The user management page lives at `/admin/users`. This keeps admin screens cleanly separated from counselor screens and makes Phase 3 additions (`/admin/pools`, `/admin/campers`) straightforward.
- **D-06:** No admin nav link for now — admin navigates directly to `/admin/users` by URL. Phase 3 will introduce an admin sidebar/nav when multiple admin screens exist.
- **D-07:** `/admin/users` layout: a table with columns Username | Role | Created | Actions. Actions per row: "Reset password" (inline form) and "Delete" (with confirmation dialog). Add a "Create user" form/button above the table.

### Admin Access Control
- **D-08:** Extend `src/middleware.ts` to read the user's role from the session. Requests to `/admin/*` from non-admins redirect to `/pools`. Unauthenticated requests to `/admin/*` already redirect to `/login` via existing middleware logic.

### Password Management
- **D-09:** Admin enters a chosen new password directly when resetting — no auto-generation. Admin communicates the new password to the counselor verbally or via text.
- **D-10:** Delete action requires a confirmation dialog ("Remove [username]? They will lose access immediately."). Password reset is direct — no confirmation step (admin is already filling in an intentional form).
- **D-11:** Minimum password length: 8 characters. Enforced server-side by Better Auth (configured in the auth options). Apply the same validation to both create and reset flows.

### Claude's Discretion
- Exact UI styling for the table, create form, and delete confirmation dialog — follow the established Tailwind pattern (slate palette, blue-600 primary button, min-h-[44px] touch targets, rounded-md, border-slate-300) from the login page.
- Where the create-user form appears — inline above the table, in a modal, or as a separate sub-route. Either works; modal is conventional.
- Error messaging for duplicate username or password too short — standard inline validation below the field.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — AUTH-03, AUTH-04, AUTH-05 are the Phase 2 requirements. Read the full definitions there.
- `.planning/PROJECT.md` — Key Decisions table (no email reset is explicit), Constraints section (admin tasks on desktop), Out of Scope section.
- `.planning/ROADMAP.md` — Phase 2 success criteria (3 items). These are the acceptance tests for this phase.

### Existing Auth Implementation
- `src/lib/auth.ts` — Current Better Auth config (username plugin, session settings). The admin plugin must be added here alongside the existing setup.
- `src/db/schema.ts` — Current Drizzle schema (user table has no role field yet). Migration needed to add role + banReason columns from the admin plugin.
- `src/lib/auth-client.ts` — Better Auth client config. Admin plugin client methods must be added here.
- `src/middleware.ts` — Current middleware (unauthenticated redirect only). Needs role check for /admin/* routes.

### Established UI Patterns
- `src/app/(auth)/login/page.tsx` — Reference for Tailwind patterns: slate color scheme, blue-600 primary button, min-h-[44px] touch targets, rounded-md, border-slate-300. New admin UI should follow this visual language.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Tailwind input/button classes from `login/page.tsx` — identical patterns should be used for the create-user form and password reset form fields.
- Better Auth's `drizzleAdapter` setup in `auth.ts` — admin plugin slots in alongside `username()` with no adapter changes.

### Established Patterns
- Route groups: `(auth)` for public, `(protected)` for auth-required. New `(admin)` follows the same pattern with an added role check.
- All auth operations go through Better Auth (not direct Drizzle queries) — maintain this for user management operations too.

### Integration Points
- Better Auth admin plugin's migration adds `role TEXT` and `banReason TEXT` to the `user` table. This migration must run before the admin UI code ships.
- The existing seeded admin user needs `role = 'admin'` set after migration.
- Middleware at `src/middleware.ts` already intercepts all requests — extend the matcher to check role for `/admin` paths.

</code_context>

<specifics>
## Specific Ideas

- Role display: even though the DB stores `"user"` for counselors, the UI must always show `"Counselor"` — never the raw string. Admin sees `"Admin"`.
- The create-user form collects: Username (text), Password (password input), Role (dropdown: Admin / Counselor). No email field required — email field can be auto-derived or left empty (Better Auth requires it; use `username@buddyboard.local` as a dummy or configure Better Auth to make email optional).

</specifics>

<deferred>
## Deferred Ideas

- Admin sidebar / navigation between admin screens — deferred to Phase 3 when `/admin/pools` and `/admin/campers` exist.
- CI lint/type-check GitHub Actions gate — noted in Phase 1 for Phase 2+; planner should include this if straightforward.
- Forced password change on first login — not required for v1; admin verbally communicates new passwords.

</deferred>

---

*Phase: 2-Admin User Management*
*Context gathered: 2026-06-28*
