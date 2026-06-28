# Phase 2: Admin User Management - Research

**Researched:** 2026-06-28
**Domain:** Better Auth admin plugin + Next.js App Router (admin route group) + Drizzle schema migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use Better Auth's `admin` plugin — add it to `src/lib/auth.ts` alongside the existing `username` plugin. This provides `createUser`, `listUsers`, `setUserPassword`, `removeUser` server-side handlers and `authClient.admin.*` client-side methods. Avoids building custom API routes for standard CRUD.
- **D-02:** Role mapping: `"user"` role in the database = Counselor; `"admin"` role = Admin. Display "Counselor" and "Admin" as labels in the UI — never expose the raw "user" value. The admin plugin adds `role` and `banReason` columns to the user table via migration; run that migration before Phase 2 code ships.
- **D-03:** Removal is a hard delete — use `admin.removeUser`. The existing `onDelete: "cascade"` on sessions and accounts handles cleanup. No soft-ban or deactivation.
- **D-04:** The existing admin seed user (created in Phase 1) must have `role = 'admin'` after the migration runs. A backfill step or seed update is required.
- **D-05:** Create a new `(admin)` route group with its own layout. The user management page lives at `/admin/users`. This keeps admin screens cleanly separated from counselor screens and makes Phase 3 additions (`/admin/pools`, `/admin/campers`) straightforward.
- **D-06:** No admin nav link for now — admin navigates directly to `/admin/users` by URL. Phase 3 will introduce an admin sidebar/nav when multiple admin screens exist.
- **D-07:** `/admin/users` layout: a table with columns Username | Role | Created | Actions. Actions per row: "Reset password" (inline form) and "Delete" (with confirmation dialog). Add a "Create user" form/button above the table.
- **D-08:** Extend `src/middleware.ts` to read the user's role from the session. Requests to `/admin/*` from non-admins redirect to `/pools`. Unauthenticated requests to `/admin/*` already redirect to `/login` via existing middleware logic.
- **D-09:** Admin enters a chosen new password directly when resetting — no auto-generation. Admin communicates the new password to the counselor verbally or via text.
- **D-10:** Delete action requires a confirmation dialog. Password reset is direct — no confirmation step.
- **D-11:** Minimum password length: 8 characters. Enforced server-side by Better Auth (configured in the auth options). Apply the same validation to both create and reset flows.

### Claude's Discretion

- Exact UI styling for the table, create form, and delete confirmation dialog — follow the established Tailwind pattern (slate palette, blue-600 primary button, min-h-[44px] touch targets, rounded-md, border-slate-300) from the login page.
- Where the create-user form appears — inline above the table, in a modal, or as a separate sub-route. Either works; modal is conventional.
- Error messaging for duplicate username or password too short — standard inline validation below the field.

### Deferred Ideas (OUT OF SCOPE)

- Admin sidebar / navigation between admin screens — deferred to Phase 3 when `/admin/pools` and `/admin/campers` exist.
- CI lint/type-check GitHub Actions gate — noted in Phase 1 for Phase 2+; planner should include this if straightforward.
- Forced password change on first login — not required for v1; admin verbally communicates new passwords.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-03 | Admin can add a new user account (username + password + role) | `auth.api.createUser` / `authClient.admin.createUser` confirmed via plugin source; username passed via `data` field; email must be synthetic (`${username}@buddyboard.local`) |
| AUTH-04 | Admin can remove a user account; removed user can no longer log in | `auth.api.removeUser` / `authClient.admin.removeUser` confirmed; actively calls `deleteUserSessions` before `deleteUser`, so sessions are immediately invalidated |
| AUTH-05 | Admin can reset any user's password; no email flow | `auth.api.setUserPassword` / `authClient.admin.setUserPassword` confirmed; takes `userId` + `newPassword`; existing sessions remain active (by design, acceptable per D-09) |
</phase_requirements>

---

## Summary

Phase 2 extends the Phase 1 auth foundation by adding the Better Auth `admin` plugin, which provides ready-made endpoints for the three required user management operations: `createUser`, `removeUser`, and `setUserPassword`. No custom API routes are needed; the plugin mounts endpoints at `/api/auth/admin/*` automatically via the existing Better Auth route handler.

The primary non-trivial work is: (1) migrating the database schema to add `role`, `banned`, `banReason`, and `banExpires` columns to the user table (and `impersonatedBy` to session), (2) backfilling the seed admin's `role` to `"admin"`, (3) creating the `(admin)` route group with a server-component layout that enforces role-based access, and (4) building the `/admin/users` page UI.

The middleware role check (D-08) is the most architecturally interesting decision. The current middleware uses `getSessionCookie()` which only checks cookie existence, not the user's role. Two approaches are available: enabling Better Auth's `cookieCache` to store an encrypted session/user blob in a second cookie readable by middleware, or doing the authoritative role check in the `(admin)` layout server component instead. Both satisfy D-08's intent. The layout-level approach is simpler, always DB-validated, and recommended here — the middleware can remain lightweight while the layout provides the role gate.

**Primary recommendation:** Add `admin()` plugin to `auth.ts`, run `@better-auth/cli generate` to update the schema, migrate the DB, backfill the admin user's role, then build the `(admin)` route group. All user management calls go through `authClient.admin.*` on the client side (which posts to `/api/auth/admin/*`). The admin layout validates role server-side. No new npm packages are required.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User CRUD (create/remove/reset password) | API / Backend (Better Auth `/api/auth/admin/*` endpoints) | Browser (admin UI calls `authClient.admin.*`) | Auth operations must run server-side; credentials never touch client |
| Admin role enforcement | Frontend Server (`(admin)/layout.tsx` server component) | API / Backend (admin plugin permission checks on each endpoint) | Dual-layer: layout redirects non-admins fast; plugin validates on every API call regardless |
| Middleware auth gate | Frontend Server (`src/middleware.ts`) | — | Cookie existence check for authenticated redirect; role check deferred to layout |
| User list display | Browser / Client | Frontend Server (initial SSR render) | Table renders server-side; delete/reset actions trigger client-side calls |
| Schema migration | Database / Storage (Drizzle + Supabase) | — | `role`, `banned`, `banReason`, `banExpires` columns added to existing `user` table |

---

## Standard Stack

### Core (no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | 1.6.22 (installed) | Admin plugin (`admin()`) — already in use | The admin plugin is bundled inside `better-auth`; no additional install [VERIFIED: npm registry] |
| `better-auth/plugins` | (same) | Server: `import { admin } from "better-auth/plugins"` | Same import path as `username` plugin; already familiar pattern [VERIFIED: package source] |
| `better-auth/client/plugins` | (same) | Client: `import { adminClient } from "better-auth/client/plugins"` | Mirrors `usernameClient()` pattern used in Phase 1 [VERIFIED: package source] |
| `@better-auth/cli` | 1.4.21 (installed) | Regenerate `schema.ts` after adding admin plugin | Same workflow as Phase 1 schema generation [VERIFIED: npm registry] |
| `drizzle-kit` | 0.31.10 (installed) | Generate + apply SQL migration for new columns | Existing migration workflow [VERIFIED: npm registry] |

**No new npm packages are required for Phase 2.** The `admin` plugin, `adminClient`, and all necessary schema support are bundled in the already-installed `better-auth@1.6.22`.

### Package Legitimacy Audit

> No new packages are installed in this phase. All dependencies were audited in Phase 1 Research.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Admin's iPad/laptop)
  │
  │  GET /admin/users
  ▼
Next.js Middleware (src/middleware.ts)
  │  getSessionCookie() — optimistic check (unchanged from Phase 1)
  │  ├─ no cookie → redirect to /login
  │  └─ cookie present → pass through
  ▼
(admin) Layout Server Component (src/app/(admin)/layout.tsx)
  │  auth.api.getSession(headers) — DB-validated
  │  ├─ no session → redirect to /login
  │  ├─ session.user.role !== 'admin' → redirect to /pools
  │  └─ role === 'admin' → render children
  ▼
/admin/users Page Server Component
  │  auth.api.admin.listUsers() — server-side
  │  renders: Create User form + Users table
  │
  ├─ [Create User] → POST /api/auth/admin/create-user
  │     Better Auth admin plugin handler
  │     → validates email, hashes password, creates user with role
  │
  ├─ [Reset Password] → POST /api/auth/admin/set-user-password
  │     Better Auth admin plugin handler
  │     → validates min length, updates password hash
  │     → active sessions NOT invalidated
  │
  └─ [Delete User] (after confirmation dialog)
        → POST /api/auth/admin/remove-user
              Better Auth admin plugin handler
              → deleteUserSessions(userId)
              → deleteUser(userId)
              → cascade clears accounts, sessions tables
                ↓
           Supabase PostgreSQL
```

### Recommended Project Structure

```
src/app/
├── (auth)/login/               — unchanged (Phase 1)
├── (protected)/pools/          — unchanged (Phase 1)
├── (admin)/
│   ├── layout.tsx              — role gate: redirect non-admins to /pools
│   └── users/
│       ├── page.tsx            — server component: list users, render table
│       └── actions.ts          — "use server" file: createUser, removeUser, setPassword
├── api/auth/[...all]/route.ts  — unchanged (handles /api/auth/admin/* automatically)
└── ...
```

### Pattern 1: Admin Plugin Server Configuration

**What:** Add `admin()` to the plugins array in `src/lib/auth.ts` alongside the existing `username()` plugin.
**When to use:** One-time change; plugin registers all admin endpoints automatically.

```typescript
// src/lib/auth.ts — updated for Phase 2
// Source: node_modules/better-auth/dist/plugins/admin/index.d.mts [VERIFIED: package source]
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { username, admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,  // D-11: enforce 8-char minimum on all password operations
  },
  plugins: [
    username(),
    admin(),    // Add after username() — ordering does not matter but username first is consistent
  ],
  session: {
    expiresIn: 60 * 60 * 5,
    updateAge: 60 * 30,
  },
});

export type Session = typeof auth.$Infer.Session;
```

**Key detail:** `minPasswordLength: 8` in `emailAndPassword` is the global password config. The admin plugin's `setUserPassword` endpoint reads `ctx.context.password.config.minPasswordLength`, which comes from this setting. Default is already 8 — explicitly setting it documents D-11.

### Pattern 2: Admin Client Configuration

**What:** Add `adminClient()` to `auth-client.ts` to expose `authClient.admin.*` methods.
**When to use:** Required to call admin operations from client components.

```typescript
// src/lib/auth-client.ts — updated for Phase 2
// Source: node_modules/better-auth/dist/plugins/admin/client.d.mts [VERIFIED: package source]
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    usernameClient(),
    adminClient(),
  ],
});
```

**Available client methods after adding `adminClient()`:**
- `authClient.admin.createUser({ email, password, name, role, data })`
- `authClient.admin.listUsers({ limit?, offset?, sortBy?, filterField?, filterValue? })`
- `authClient.admin.removeUser({ userId })`
- `authClient.admin.setUserPassword({ userId, newPassword })`
- `authClient.admin.setRole({ userId, role })`
- `authClient.admin.banUser({ userId, banReason?, banExpiresIn? })`
- `authClient.admin.revokeUserSessions({ userId })`

### Pattern 3: Admin Layout — Role Gate

**What:** Server component layout that enforces `role === 'admin'` with DB-validated session.
**When to use:** Wraps all `/admin/*` pages; the authoritative access control gate.

```typescript
// src/app/(admin)/layout.tsx
// Source: Next.js App Router docs (forms.md, use-server.md) + Pattern 6 from Phase 1 research [VERIFIED: package source]
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  // auth.api.getSession returns null if session is invalid or expired
  if (!session) redirect("/login");

  // Role check — D-02: 'admin' role = Admin
  if (session.user.role !== "admin") redirect("/pools");

  return <>{children}</>;
}
```

**Why layout instead of middleware for role check:** The layout approach uses a DB-validated session (authoritative). Middleware-level role checking requires enabling `session.cookieCache` (adds configuration complexity; role data is cached and may be up to 5 min stale). For a low-traffic admin panel, the layout DB call is negligible. The middleware continues to handle the authentication fast-path (cookie existence check).

### Pattern 4: Admin Page — Server-Side User List

**What:** Server component that fetches the user list using the admin plugin's API.
**When to use:** Initial render of `/admin/users`; subsequent mutations use Server Actions.

```typescript
// src/app/(admin)/users/page.tsx
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") redirect("/pools");

  // Server-side list call — auth.api.listUsers is the server-side handler
  // Source: node_modules/better-auth/dist/plugins/admin/admin.d.mts [VERIFIED: package source]
  const result = await auth.api.listUsers({
    query: { limit: 100, sortBy: "createdAt", sortDirection: "asc" },
    headers: await headers(),
  });

  const users = result?.users ?? [];

  return (
    <main className="p-6">
      {/* Create user form above table (D-07) */}
      {/* User table: Username | Role | Created | Actions (D-07) */}
    </main>
  );
}
```

### Pattern 5: Server Actions for Admin CRUD

**What:** `"use server"` file that wraps Better Auth admin calls for create/delete/password-reset.
**When to use:** Mutations triggered from client-side form submissions.

```typescript
// src/app/(admin)/users/actions.ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string; // "admin" or "user"

  // D-02: role "user" = Counselor, "admin" = Admin
  // email is synthetic — not used for login
  // username passed via data field so username plugin's hook processes it
  // Source: node_modules/better-auth/dist/plugins/admin/routes.mjs lines 188-207 [VERIFIED]
  const result = await auth.api.createUser({
    body: {
      email: `${username.toLowerCase()}@buddyboard.local`,
      password,
      name: username,
      role,
      data: { username },  // username plugin hook reads this from spread userData
    },
    headers: await headers(),  // pass headers so permission check runs via session
  });

  if (!result?.user) throw new Error("Failed to create user");

  revalidatePath("/admin/users");
}

export async function removeUserAction(userId: string) {
  await requireAdmin();

  // removeUser: calls deleteUserSessions first, then deleteUser
  // Active sessions for the deleted user are immediately invalidated
  // Source: node_modules/better-auth/dist/plugins/admin/routes.mjs lines 760-772 [VERIFIED]
  await auth.api.removeUser({
    body: { userId },
    headers: await headers(),
  });

  revalidatePath("/admin/users");
}

export async function setUserPasswordAction(userId: string, newPassword: string) {
  await requireAdmin();

  // minPasswordLength (8) enforced server-side by Better Auth
  // NOTE: Does NOT invalidate existing sessions — user remains logged in
  // Source: node_modules/better-auth/dist/plugins/admin/routes.mjs lines 809-836 [VERIFIED]
  await auth.api.setUserPassword({
    body: { userId, newPassword },
    headers: await headers(),
  });
}
```

**Server Actions vs API Routes:** Server Actions are the App Router standard for form mutations (per Next.js docs in `use-server.md`). They avoid the need to create separate `api/admin/` route files, integrate with `revalidatePath` for cache invalidation, and work naturally with progressive enhancement. Better Auth's admin endpoints are already at `/api/auth/admin/*` — Server Actions call `auth.api.*` directly without going through HTTP, which is slightly more efficient.

### Pattern 6: Schema Migration Sequence

**What:** Exact command sequence to add admin plugin columns.
**When to use:** Once, before deploying Phase 2 code.

```bash
# Step 1: Regenerate schema.ts with admin plugin columns
# The CLI reads auth.ts (which now includes admin()), and adds:
#   user table: role TEXT, banned BOOLEAN, banReason TEXT, banExpires TIMESTAMP
#   session table: impersonatedBy TEXT
npx @better-auth/cli generate

# Step 2: Generate the SQL migration file (adds columns to existing tables)
npx drizzle-kit generate

# Step 3: Apply migration to Supabase (uses DATABASE_URL_DIRECT from drizzle.config.ts)
npx drizzle-kit migrate

# Step 4: Backfill the existing admin user's role (D-04)
# Option A — direct SQL via Supabase dashboard or psql:
UPDATE "user" SET role = 'admin' WHERE username = 'admin';

# Option B — tsx script:
# import { db } from "./src/db";
# import { user } from "./src/db/schema";
# import { eq } from "drizzle-orm";
# await db.update(user).set({ role: "admin" }).where(eq(user.username, "admin"));
```

### Pattern 7: Role Display Mapping

**What:** Utility to translate raw DB role values to display labels (D-02).
**When to use:** Everywhere the role is rendered in the admin UI.

```typescript
// src/lib/role-display.ts
export function displayRole(role: string | null | undefined): string {
  if (role === "admin") return "Admin";
  return "Counselor"; // covers "user", null, undefined
}
```

**Never render the raw "user" string.** The DB stores `"user"` for counselors; the UI must always show `"Counselor"`.

### Anti-Patterns to Avoid

- **Calling admin plugin endpoints without session headers from a server action:** The permission check in `createUser`, `removeUser`, `setUserPassword` only runs when `session` is truthy. Always pass `headers: await headers()` to `auth.api.*` calls in Server Actions so the permission check fires.
- **Passing a `username@buddyboard.local` that isn't unique:** The email uniqueness check fires on every `createUser` call. Since email = `${username}@buddyboard.local`, username uniqueness also makes email unique — but don't create two users with the same username even if you think the emails differ.
- **Omitting `data: { username }` in createUser:** Without it, the user record gets no `username` field. They can't log in with username-based sign-in. Always include `data: { username }`.
- **Setting `role` in the `data` field instead of the top-level `role` field:** The admin plugin reads `ctx.body.role` (top-level) OR `ctx.body.data.role` but strips `dataRole` from `userData`. Always use the top-level `role` parameter.
- **Relying on setUserPassword to end active sessions:** It doesn't. If a password is reset because a user is suspected of unauthorized access, also call `authClient.admin.revokeUserSessions({ userId })` explicitly.
- **Rendering the admin page as a Client Component with data fetching:** User lists should be fetched in the Server Component. Only the mutation actions (forms) need to be Client Components or Server Actions.

---

## Admin Plugin API Reference (Verified)

All findings in this section are `[VERIFIED: package source]` — confirmed by reading the installed `better-auth@1.6.22` package at `node_modules/better-auth/dist/plugins/admin/`.

### Schema Columns Added by `admin()` Plugin

**To `user` table:**

| Column | DB Type | Default | Purpose |
|--------|---------|---------|---------|
| `role` | `TEXT` | `"user"` (set by plugin init hook) | Access control role; `"admin"` or `"user"` |
| `banned` | `BOOLEAN` | `false` | Whether user is banned (not used in Phase 2) |
| `banReason` | `TEXT` | `null` | Reason for ban |
| `banExpires` | `TIMESTAMP` | `null` | When ban expires |

**To `session` table:**

| Column | DB Type | Default | Purpose |
|--------|---------|---------|---------|
| `impersonatedBy` | `TEXT` | `null` | Impersonation support (not used in Phase 2) |

**Source:** `node_modules/better-auth/dist/plugins/admin/schema.d.mts` [VERIFIED: package source]

### Role Permission Model

The default role system has two roles:

| Role | Permissions |
|------|-------------|
| `"admin"` | create, list, set-role, ban, impersonate, delete, set-password, set-email, get, update users; list, revoke, delete sessions |
| `"user"` | none |

**Source:** `node_modules/better-auth/dist/plugins/admin/access/statement.mjs` [VERIFIED: package source]

The `defaultRole` when creating new users is `"user"` (unless `options.defaultRole` overrides it). The admin plugin's `init()` hook sets newly created users to `defaultRole` automatically.

### Server-Side Bypass for `createUser`

The `createUser` endpoint has a conditional permission check:

```javascript
// From routes.mjs — [VERIFIED: package source]
const session = await getAuthoritativeSessionFromCtx(ctx);
if (!session && (ctx.request || ctx.headers)) throw ctx.error("UNAUTHORIZED");
if (session) {
  if (!hasPermission(...)) throw APIError.from("FORBIDDEN", ...);
}
```

When calling `auth.api.createUser({ body: {...} })` from a server-side script **without** passing `headers`, the session is `null` AND `ctx.request` and `ctx.headers` are both undefined/null — so the unauthorized check does not throw. This is the documented pattern for seed scripts. Always pass `headers: await headers()` from within Server Actions so the permission check actually runs.

### `removeUser` — Session Invalidation

`removeUser` explicitly calls `deleteUserSessions(userId)` before `deleteUser(userId)`. Active sessions are immediately invalidated. The user cannot use an existing session token after deletion.

**Source:** `node_modules/better-auth/dist/plugins/admin/routes.mjs` lines 770-771 [VERIFIED: package source]

### `setUserPassword` — No Session Invalidation

`setUserPassword` only updates the password hash. It does NOT call `deleteUserSessions`. The targeted user remains logged in on all existing devices after a password reset.

For Phase 2 this is acceptable: password reset is an admin-controlled action for onboarding/recovery, not a security breach response. If session revocation is ever needed, call `auth.api.revokeUserSessions({ body: { userId } })` separately.

**Source:** `node_modules/better-auth/dist/plugins/admin/routes.mjs` lines 809-836 [VERIFIED: package source]

### `createUser` — Email Requirement

The `createUser` endpoint requires a valid email (validated with `z.email()`):

```javascript
// From routes.mjs [VERIFIED: package source]
const email = ctx.body.email.toLowerCase();
if (!z.email().safeParse(email).success) throw APIError.from("BAD_REQUEST", BASE_ERROR_CODES.INVALID_EMAIL);
if (await ctx.context.internalAdapter.findUserByEmail(email)) throw APIError.from("BAD_REQUEST", ADMIN_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL);
```

**Solution:** Use `${username.toLowerCase()}@buddyboard.local` as a synthetic email. Since the username column is unique and the email is derived from the username, email uniqueness is automatically preserved.

### `createUser` — Username via `data` Field

The `data` field contents are spread into the internal `createUser` call before the username plugin's database hook processes them:

```javascript
// From routes.mjs [VERIFIED: package source]
const { role: dataRole, ...userData } = ctx.body.data ?? {};
const user = await ctx.context.internalAdapter.createUser({
  ...userData,    // username ends up here
  email,
  name: ctx.body.name,
  role: ...
});
```

The username plugin's `create.before` hook then reads `user.username` from the merged object and normalizes it. Pass `data: { username: "john" }` to set the username field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User creation with hashed password | Custom Drizzle INSERT + bcrypt | `auth.api.createUser()` | Admin plugin handles hashing, account linking, role assignment atomically |
| User deletion with session cleanup | Drizzle DELETE + manual cascade | `auth.api.removeUser()` | Plugin calls `deleteUserSessions` first, then `deleteUser`; explicit cleanup before cascade |
| Password reset | Custom hash + UPDATE | `auth.api.setUserPassword()` | Enforces `minPasswordLength`, handles credential account creation vs update |
| Role-based access control | Custom session middleware with DB call | Admin layout server component + `auth.api.getSession()` | Already-established pattern from Phase 1; always DB-validated |
| Confirmation dialogs | Custom global state management | Local React state in delete button component | Simple boolean state; no need for a dialog library |

**Key insight:** Every Phase 2 user management operation has a corresponding Better Auth admin endpoint. The implementation is configuration + UI, not auth logic.

---

## Common Pitfalls

### Pitfall 1: Missing `headers` in Server Action Admin Calls

**What goes wrong:** `auth.api.createUser({ body: {...} })` (without `headers`) bypasses the permission check. This means even a logged-out request could create a user if it hits the right path.
**Why it happens:** The admin plugin only checks permissions when a session is found via headers. Without headers, `session` is null and the `if (session)` block is skipped.
**How to avoid:** Always pass `headers: await headers()` to every `auth.api.*` admin call inside Server Actions. Add an explicit `requireAdmin()` guard at the start of each action as a defense-in-depth layer.
**Warning signs:** Admin operations succeed even when not logged in during testing.

### Pitfall 2: Plugin Array Ordering and TypeScript Inference

**What goes wrong:** TypeScript may not infer `session.user.role` as a property if the admin plugin isn't correctly registered or if the `Session` type export is stale.
**Why it happens:** Better Auth infers types from the plugin array. If the admin plugin is added but the `Session` type is imported from a cached version of `auth.ts`, the type won't include `role`.
**How to avoid:** After updating `auth.ts` to include `admin()`, restart the TypeScript language server. The `session.user.role` property should autocomplete.
**Warning signs:** TypeScript shows `Property 'role' does not exist on type 'User'` even after adding the plugin.

### Pitfall 3: Schema Migration Before Code Deploy

**What goes wrong:** Deploying Phase 2 code before running the migration causes a runtime error: Better Auth tries to read/write the `role` column which doesn't exist yet.
**Why it happens:** Vercel auto-deploys on push to main; if the migration isn't run against Supabase first, the deployed code will fail on any admin plugin call.
**How to avoid:** Migrate the database BEFORE pushing Phase 2 code to the `main` branch. Sequence: (1) run migration locally against Supabase direct connection, (2) verify migration applied, (3) push code.
**Warning signs:** 500 errors on any auth endpoint after deploying; Supabase logs show "column role does not exist".

### Pitfall 4: Admin Seed User Missing `role = 'admin'` After Migration

**What goes wrong:** The Phase 1 seed admin user has `role = NULL` (since the column didn't exist during Phase 1). After migration, this user can't access admin endpoints because `NULL` role maps to `"user"` permissions.
**Why it happens:** The admin plugin's init hook sets `defaultRole` on NEW user creation. Existing rows are not backfilled.
**How to avoid:** Run the backfill SQL (`UPDATE "user" SET role = 'admin' WHERE username = 'admin'`) immediately after the migration, before testing Phase 2. Verify with `SELECT id, username, role FROM "user"`.
**Warning signs:** Admin navigates to `/admin/users`, gets redirected to `/pools` even after logging in as admin.

### Pitfall 5: `@better-auth/cli generate` Overwrites Custom Schema Additions

**What goes wrong:** Running `npx @better-auth/cli generate` after adding the admin plugin regenerates `src/db/schema.ts`, potentially overwriting any custom additions (like the Drizzle relations at the bottom of the current schema).
**Why it happens:** The CLI generates the minimal schema that Better Auth needs. Custom additions like `userRelations`, `sessionRelations`, `accountRelations` in the current `schema.ts` are not part of the Better Auth schema.
**How to avoid:** After running `@better-auth/cli generate`, verify that the relations block was preserved. If not, re-add it manually. Consider adding a comment above the relations block noting that it must survive CLI regeneration.
**Warning signs:** Drizzle ORM queries that use relations stop working after CLI run.

### Pitfall 6: Duplicate Email When Creating Users

**What goes wrong:** Creating a user with the same username as a deleted user fails because the synthetic email `${username}@buddyboard.local` already exists in the database.
**Why it happens:** `removeUser` hard-deletes the user record. If a new user with the same username is created later, the email uniqueness check may pass (user is deleted) but it may fail if there's a constraint violation in the DB.
**Why it won't happen:** `removeUser` deletes the full user row; the email is freed. Re-creating with the same username should work.
**How to avoid:** Test the create → delete → re-create cycle to confirm the email is properly freed.
**Warning signs:** `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` error when creating a user whose username was previously used.

### Pitfall 7: `(admin)` Route Group Name Collision

**What goes wrong:** If there's a top-level segment named `admin` (e.g., `src/app/admin/`) alongside `(admin)/`, Next.js may route `/admin/*` to the literal `admin` folder, not the route group.
**Why it happens:** Next.js route groups (`(admin)`) are excluded from the URL path. A literal `admin/` folder creates a `/admin` URL segment. The two can conflict.
**How to avoid:** Use only `(admin)/` for admin screens. Do not create a literal `src/app/admin/` directory.
**Warning signs:** Navigation to `/admin/users` hits a 404 or wrong page.

---

## Migration Workflow Details

### What `@better-auth/cli generate` Produces

When `admin()` is added to `plugins`, re-running `npx @better-auth/cli generate` will add these fields to `schema.ts` user table:

```typescript
// Fields added to the user pgTable by the admin plugin
role: text("role"),
banned: boolean("banned").default(false),
banReason: text("ban_reason"),
banExpires: timestamp("ban_expires"),
```

And to the session table:

```typescript
impersonatedBy: text("impersonated_by"),
```

**Source:** `node_modules/better-auth/dist/plugins/admin/schema.d.mts` [VERIFIED: package source]

The CLI merges these with the existing username plugin fields (`username`, `displayUsername`). The resulting `schema.ts` should have all columns. Re-add the Drizzle relations block if it gets dropped.

### Drizzle `generate` Output

After `npx drizzle-kit generate`, the SQL migration will contain:

```sql
ALTER TABLE "user" ADD COLUMN "role" text;
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN "ban_reason" text;
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;
```

These are all nullable by default, so the migration applies cleanly to the existing table without requiring data for existing rows.

---

## Middleware Role Check — Architecture Decision

D-08 says to extend middleware to read user role. This section documents the two approaches and recommends one.

### Approach A: `session.cookieCache` (Middleware-native role check)

Enable encrypted session data in a second cookie:

```typescript
// auth.ts addition
session: {
  expiresIn: 60 * 60 * 5,
  updateAge: 60 * 30,
  cookieCache: {
    enabled: true,      // sets session_data cookie with encrypted user+session blob
    maxAge: 60 * 5,     // cache valid for 5 min (stale role data possible for up to 5 min)
  },
},
```

Then in middleware:

```typescript
// src/middleware.ts with cookieCache
import { getSessionCookie, getCookieCache } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionToken = getSessionCookie(request);
  if (!sessionToken) return NextResponse.redirect(new URL("/login", request.url));

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const cached = await getCookieCache(request, {
      secret: process.env.BETTER_AUTH_SECRET,
    });
    if (!cached || cached.user.role !== "admin") {
      return NextResponse.redirect(new URL("/pools", request.url));
    }
  }

  return NextResponse.next();
}
```

- Pros: Role redirect happens at the middleware layer (before any server component renders)
- Cons: Role data can be stale for up to 5 min; adds complexity; `middleware` function becomes async
- Tradeoff: For a low-traffic internal tool, the stale window is acceptable

### Approach B: Layout-Level Role Gate (Recommended)

Keep middleware unchanged (cookie existence only). Add role check in the `(admin)` layout server component:

```typescript
// src/app/(admin)/layout.tsx
const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
if (session.user.role !== "admin") redirect("/pools");
```

- Pros: Always DB-validated; simpler; no middleware changes needed; established pattern
- Cons: Non-admin user's request reaches the layout before being redirected (one DB read)
- For this project: negligible cost; admin panel used only by one or two people

**Recommendation: Use Approach B (layout-level).** The middleware's existing cookie check already blocks unauthenticated users. The layout check covers authenticated non-admin users. Both layers provide defense-in-depth. Avoids the complexity and staleness risk of cookieCache.

If D-08 is interpreted as strictly requiring a middleware role check, use Approach A. The planner should make the final call.

---

## CI Lint/Type-Check Gate

Mentioned in Deferred Ideas as "planner should include this if straightforward." Included here for planner awareness.

### Proposed GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
```

This is a 1-task addition that runs on every push and PR. Recommend including in Phase 2 — it's 15 minutes of work and prevents TypeScript regressions from shipping.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Passing `data: { username }` in `auth.api.createUser` causes the username plugin hook to set the `username` field on the user record | Pattern 5, createUser email section | Users created via admin cannot log in with username; must verify with a test call |
| A2 | The `(admin)` route group layout's `auth.api.getSession()` correctly reads the role field after migration | Pattern 3 | Role would be `undefined` instead of `"admin"`, blocking admin access |
| A3 | `@better-auth/cli generate` preserves the custom Drizzle relations block at the bottom of `schema.ts` | Migration workflow | Relations block is dropped; Drizzle ORM queries using `with` break |
| A4 | `getCookieCache` in middleware is available in the Next.js Edge Runtime (if Approach A is chosen) | Middleware section | Middleware crashes with a runtime error on `crypto` usage; would require switching to Node.js runtime middleware |

**Note on A1:** This is the highest-risk assumption. The source code shows `userData` (from `data` field) is spread into `internalAdapter.createUser()`, and the username plugin's `create.before` hook reads the `username` key from the merged user object. This should work, but testing with an actual DB call during development is the correct validation.

---

## Open Questions (RESOLVED)

1. **Does `@better-auth/cli generate` preserve the Drizzle relations block?**
   - What we know: The CLI reads `auth.ts` and generates schema for Better Auth tables; it may not know about custom additions
   - What's unclear: Whether the CLI merges with existing content or overwrites
   - RESOLVED: Executor must read the relations block before running the CLI, then re-add it if dropped. Plan 01 Task 2 implements this explicitly (read+restore step).

2. **Does the admin layout need to duplicate the role check that's also in Server Actions?**
   - What we know: The layout can redirect, but Server Actions are also called directly by client components
   - What's unclear: Whether a malicious actor could invoke Server Actions by bypassing the layout
   - RESOLVED: Yes — keep `requireAdmin()` in every Server Action. Layout gate is for UX redirect; Server Action check is for security. Plan 02 Task 2 implements `requireAdmin()` in every action.

---

## Environment Availability

> Skip condition: no new external dependencies for Phase 2.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase PostgreSQL (deployed) | Schema migration | Yes (Phase 1 deployed) | — | — |
| `@better-auth/cli` | Schema regeneration | Yes (installed) | 1.4.21 | — |
| `drizzle-kit` | Migration generation + apply | Yes (installed) | 0.31.10 | — |
| Node.js `tsx` | Backfill script (if used) | Yes (Phase 1 seed script used it) | — | Use Supabase SQL editor directly |

**No missing dependencies.**

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (installed from Phase 1) |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-03 | `createUserAction` rejects calls without admin session | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ Wave 0 |
| AUTH-03 | `createUserAction` rejects password < 8 chars | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ Wave 0 |
| AUTH-03 | Admin users page renders a table with Username/Role/Created/Actions columns | unit (component) | `npm test src/app/(admin)/users/page.test.tsx` | ❌ Wave 0 |
| AUTH-04 | `removeUserAction` rejects calls without admin session | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ Wave 0 |
| AUTH-04 | Delete button shows confirmation dialog before firing action | unit (component) | `npm test` | ❌ Wave 0 |
| AUTH-05 | `setUserPasswordAction` rejects calls without admin session | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ Wave 0 |
| AUTH-05 | `setUserPasswordAction` rejects password < 8 chars | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ Wave 0 |

**Manual tests (not automated):**
- Navigate to `/admin/users` as a counselor account → should redirect to `/pools`
- Navigate to `/admin/users` without authentication → should redirect to `/login`
- Create a user via the admin form → user appears in table
- Newly created user can log in with the assigned password
- Delete a user → user disappears from table; login attempt with their credentials fails
- Reset a user's password → user can log in with new password; old password rejected

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** All unit tests green + manual walkthrough of 3 success criteria before Phase 3

### Wave 0 Gaps

- [ ] `src/app/(admin)/users/actions.test.ts` — unit tests for Server Actions (mock `auth.api.*`)
- [ ] `src/app/(admin)/users/page.test.tsx` — component test for users table rendering (mock server data)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (admin ops require authenticated session) | `auth.api.getSession()` in layout + `requireAdmin()` in actions |
| V3 Session Management | Partial (removeUser terminates target's sessions) | `auth.api.removeUser()` calls `deleteUserSessions` automatically |
| V4 Access Control | Yes — core of this phase | Dual-layer: layout redirect + Server Action guard |
| V5 Input Validation | Yes | `minPasswordLength: 8` enforced by Better Auth server-side; username validated by username plugin |
| V6 Cryptography | Partial | Password hashing delegated to Better Auth (scrypt); admin secret unchanged from Phase 1 |

### Known Threat Patterns for Admin Panel

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Counselor navigates directly to `/admin/users` | Elevation of Privilege | Layout role check + `requireAdmin()` in each action |
| Forged request to Server Action without valid session | Spoofing | `requireAdmin()` calls `auth.api.getSession()` — DB-validated |
| Admin creates user with weak password | Tampering | `minPasswordLength: 8` enforced server-side by Better Auth's `setUserPassword` and `createUser` |
| Admin deletes their own account | Denial of Service | `removeUser` returns `YOU_CANNOT_REMOVE_YOURSELF` error — built into plugin |
| Session remains active after password reset | Persistence | By design for Phase 2; if this becomes a concern, pair `setUserPassword` with `revokeUserSessions` |
| Role bypass by passing non-existent role value | Tampering | Admin plugin validates role against `options.roles`; UI dropdown limits choices; extra server check optional |

---

## Sources

### Primary (HIGH confidence)

- `node_modules/better-auth/dist/plugins/admin/admin.d.mts` — Full admin plugin type signatures, endpoint list [VERIFIED: package source]
- `node_modules/better-auth/dist/plugins/admin/schema.d.mts` — Exact column definitions added to user/session tables [VERIFIED: package source]
- `node_modules/better-auth/dist/plugins/admin/routes.mjs` — Complete route implementations; permission checks, session invalidation behavior, email validation, createUser userData spread [VERIFIED: package source]
- `node_modules/better-auth/dist/plugins/admin/access/statement.mjs` — Default role permissions (admin has all, user has none) [VERIFIED: package source]
- `node_modules/better-auth/dist/plugins/admin/has-permission.mjs` — Permission resolution logic [VERIFIED: package source]
- `node_modules/better-auth/dist/plugins/admin/client.d.mts` — adminClient available methods [VERIFIED: package source]
- `node_modules/better-auth/dist/plugins/username/index.mjs` — Username plugin create.before hook; processes `username` from spread userData [VERIFIED: package source]
- `node_modules/better-auth/dist/context/create-context.mjs` — `minPasswordLength` default = 8, from `emailAndPassword.minPasswordLength` [VERIFIED: package source]
- `node_modules/better-auth/dist/cookies/index.mjs` — `getCookieCache` implementation; `cookieCache.enabled` option [VERIFIED: package source]
- `node_modules/next/dist/docs/01-app/02-guides/forms.md` — Server Actions pattern for Next.js App Router [VERIFIED: package source]
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md` — `"use server"` directive semantics [VERIFIED: package source]
- `npm view better-auth version` → 1.6.22 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- Phase 1 RESEARCH.md patterns — established auth.api.getSession(), middleware patterns, drizzle migration sequence

### Tertiary (LOW confidence)

- A1–A4 in Assumptions Log (need runtime validation)

---

## Metadata

**Confidence breakdown:**
- Admin plugin API (imports, methods, schema): HIGH — all verified from installed package source
- Permission model (admin vs user roles): HIGH — verified from access/statement.mjs
- `removeUser` session invalidation: HIGH — verified from routes.mjs (explicit `deleteUserSessions` call)
- `setUserPassword` no session invalidation: HIGH — verified from routes.mjs (no `deleteUserSessions` call)
- `createUser` email requirement and `data.username` approach: HIGH (source code) / MEDIUM (runtime not tested)
- Middleware role check architecture: MEDIUM — both approaches verified technically; tradeoff recommendation is opinion
- CI GitHub Actions workflow: HIGH — standard pattern, no novel elements

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (Better Auth 1.6.x is current; admin plugin API stable; re-verify if better-auth version is bumped)
