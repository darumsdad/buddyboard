---
phase: 01-foundation-auth
reviewed: 2026-06-28T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/db/index.ts
  - src/db/schema.ts
  - src/lib/auth.ts
  - src/lib/auth-client.ts
  - src/app/api/auth/[...all]/route.ts
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/login/login.test.tsx
  - src/app/(protected)/pools/page.tsx
  - src/app/page.tsx
  - src/middleware.ts
  - drizzle.config.ts
  - scripts/seed-admin.ts
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-28
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

This phase establishes the auth foundation: Drizzle + Supabase, Better Auth with the username plugin, a login page, route middleware, and a pools placeholder. The scaffolding and wiring are clean. TypeScript compiles, tests pass, and no real secrets are committed. One critical issue stands out: a default password is committed to source control in the seed script, creating a permanent credential disclosure in git history. Three warnings follow, covering a silent error path in the login handler, an unvalidated client-side base URL, and a middleware exclusion pattern that is broader than intended and will silently drop future routes.

---

## Critical Issues

### CR-01: Default admin password committed to source control

**File:** `scripts/seed-admin.ts:17`
**Issue:** The literal string `"BuddyBoard2024!"` is hardcoded as the admin password. Once committed, it is permanent in git history regardless of future changes. Any developer who clones the repo — now or years from now — knows the bootstrap credential. If the admin account is ever seeded without changing the password first (easy to do in staging, CI, or a rushed deployment), that account is compromised with a publicly known credential. The comment-based warning does not change the risk: the password is in the repository forever.

**Fix:** Accept the password from an environment variable or a CLI argument, with no fallback default. The script should fail loudly if the variable is absent.

```typescript
// scripts/seed-admin.ts

const seedPassword = process.env.SEED_ADMIN_PASSWORD;
if (!seedPassword) {
  console.error(
    "Error: SEED_ADMIN_PASSWORD environment variable is required.\n" +
    "  Usage: SEED_ADMIN_PASSWORD='...' npx tsx scripts/seed-admin.ts",
  );
  process.exit(1);
}

// then use seedPassword in the signUpEmail call instead of the literal
body: {
  email: "admin@camp.local",
  password: seedPassword,
  name: "Admin",
  username: "admin",
},
```

Document the required variable in `.env.example` and update the seed instructions in `01-02-SUMMARY.md`.

---

## Warnings

### WR-01: Login handler has no `catch` — network errors produce no user-visible feedback

**File:** `src/app/(auth)/login/page.tsx:19-31`
**Issue:** `handleSubmit` uses `try…finally` with no `catch`. If `authClient.signIn.username()` throws (network error, timeout, CORS failure, JSON parse error), the exception propagates as an unhandled promise rejection. The `finally` block correctly resets `loading`, so the button re-enables — but `setError` is never called, and the user receives no indication that anything failed. React does not install error boundaries around async event handlers, so the thrown error goes to the browser console only.

```typescript
// The current structure:
try {
  const { error: signInError } = await authClient.signIn.username({ ... });
  if (signInError) {
    setError("Invalid username or password");
  } else {
    router.push("/pools");
  }
} finally {
  setLoading(false);
}
```

**Fix:** Add a `catch` block that surfaces a generic message and does not re-throw:

```typescript
try {
  const { error: signInError } = await authClient.signIn.username({
    username: formData.get("username") as string,
    password: formData.get("password") as string,
  });

  if (signInError) {
    setError("Invalid username or password");
  } else {
    router.push("/pools");
  }
} catch {
  setError("Unable to connect. Please try again.");
} finally {
  setLoading(false);
}
```

---

### WR-02: Auth client `baseURL` can be `undefined` at runtime

**File:** `src/lib/auth-client.ts:6`
**Issue:** `process.env.NEXT_PUBLIC_APP_URL` is passed directly without a fallback or validation:

```typescript
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,  // possibly undefined
  plugins: [usernameClient()],
});
```

The TypeScript type for `baseURL` in Better Auth's client accepts `string | undefined`. When `undefined` is passed, Better Auth falls back to `window.location.origin` in the browser. For a pure client-side component this may work, but it is environment-dependent: a missing `NEXT_PUBLIC_APP_URL` in a deployment or CI environment would cause sign-in requests to hit the wrong origin with no build-time warning. This is particularly fragile because the SUMMARY already documents a `.env.local` typo (`http://localhost:300`) that caused auth failures.

**Fix:** Provide a validated fallback or assert the value is present:

```typescript
const appURL = process.env.NEXT_PUBLIC_APP_URL;
if (!appURL && typeof window === "undefined") {
  // Only throw server-side; client-side can fall back to window.location.origin
  throw new Error("NEXT_PUBLIC_APP_URL is not set");
}

export const authClient = createAuthClient({
  baseURL: appURL,
  plugins: [usernameClient()],
});
```

Alternatively, document in `.env.example` that this variable must be set and add a build-time check in `next.config.ts`.

---

### WR-03: Middleware exclusion pattern is prefix-based, not path-segment-bounded

**File:** `src/middleware.ts:14`
**Issue:** The negative lookahead in the matcher uses bare string prefixes:

```
"/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"
```

Tested against anchored full-path matching (simulating Next.js behavior), any pathname whose segment after the leading `/` begins with one of these strings is excluded — not just the exact paths. Concretely:

- `/loginsomething` → **excluded** from middleware (unintended)
- `/api/authentication` → **excluded** from middleware (unintended)

Any future route beginning with `login` (e.g., `/login-reset`, `/login-help`) or `api/auth` (e.g., `/api/authorise`) will silently bypass middleware protection with no error, no warning, and no test failure to catch it. Because this is a matcher config evaluated at build time, the failure mode is invisible until a user accesses an unprotected route.

**Fix:** Anchor exclusions to exact path segments or use trailing `/` to tighten the boundary:

```typescript
export const config = {
  matcher: [
    "/((?!login$|login/|api/auth/|_next/static/|_next/image/|favicon\\.ico$).*)",
  ],
};
```

Or, more explicitly, use Next.js's recommended negative-match array syntax to enumerate protected route groups rather than a single negative-lookahead regex.

---

## Info

### IN-01: Email sign-in endpoint is active but not exposed in the UI

**File:** `src/lib/auth.ts:19`
**Issue:** `emailAndPassword: { enabled: true }` is set alongside the `username()` plugin. Better Auth registers both sign-in endpoints: `/api/auth/sign-in/username` (used by the UI) and `/api/auth/sign-in/email`. The admin account has a known email address (`admin@camp.local`). With the default password exposed in source (CR-01), this endpoint offers a second attack vector. Even after CR-01 is fixed, the email endpoint expands the attack surface without providing user benefit (the UI only offers username login).

**Fix:** If email-based login is not a product requirement (PROJECT.md lists username/password as the intended auth method), disable it explicitly:

```typescript
emailAndPassword: { enabled: false },
```

Note: Better Auth's `username` plugin may internally require `emailAndPassword` to be enabled as a base. If disabling it breaks the username plugin, document the dependency and accept the endpoint — but verify that Better Auth does not enumerate registered emails via the sign-in error response.

---

### IN-02: `username` column is nullable in the database schema

**File:** `src/db/schema.ts:15`
**Issue:** The `username` field has `.unique()` but not `.notNull()`:

```typescript
username: text("username").unique(),
```

This column is the primary login credential for all users, but the database permits inserting a row with `username = NULL`. PostgreSQL's UNIQUE constraint allows multiple `NULL` values (nulls are not considered equal), so multiple no-username users can coexist. Better Auth's application layer enforces the field via the plugin, but there is no database-level guarantee. This schema was generated by `@better-auth/cli`, so changing it requires a migration.

**Fix:** Add `.notNull()` and generate a new migration:

```typescript
username: text("username").unique().notNull(),
```

If Better Auth's CLI regeneration would revert this, add the constraint manually in a migration file and track the deviation.

---

### IN-03: Non-null assertions on critical env vars suppress useful runtime errors

**Files:** `src/db/index.ts:7`, `src/lib/auth.ts:8-9`, `drizzle.config.ts:9`
**Issue:** Four env vars are asserted non-null with `!` without any prior validation:

```typescript
postgres(process.env.DATABASE_URL!, ...)
betterAuth({ baseURL: process.env.BETTER_AUTH_URL!, secret: process.env.BETTER_AUTH_SECRET!, ... })
defineConfig({ dbCredentials: { url: process.env.DATABASE_URL_DIRECT! } })
```

When an env var is missing, `process.env.X` returns `undefined` at runtime. TypeScript's `!` assertion erases the undefined type but does not emit a check — the undefined value propagates into the callee (e.g., `postgres(undefined)`), which throws a confusing internal error. A missing `BETTER_AUTH_SECRET` should fail with "BETTER_AUTH_SECRET is not set", not an opaque library crash.

**Fix:** Add a module-level guard in `src/db/index.ts` and `src/lib/auth.ts` that throws a clear error on startup:

```typescript
// src/db/index.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required but not set");
}
const client = postgres(process.env.DATABASE_URL, { prepare: false });
```

This is especially important in `auth.ts` where a missing `BETTER_AUTH_SECRET` causes all sessions to be unsigned with an empty key — a silent security failure, not a startup crash.

---

### IN-04: `session.expiresIn` comment incorrectly describes "idle window"

**File:** `src/lib/auth.ts:22`
**Issue:**

```typescript
session: {
  expiresIn: 60 * 60 * 5, // 5-hour idle window (D-05)
  updateAge: 60 * 30,      // Reset clock every 30 min of activity
},
```

`expiresIn` is the session lifetime from the last issue (or the last `updateAge` refresh) — not an idle timeout. The "idle" semantics come from the combination: `updateAge` refreshes the session on each request if the session is older than 30 minutes, extending it another 5 hours. The comment "5-hour idle window" is approximately correct in effect but misleading as a description of the parameter. A future developer editing this value may misunderstand the actual behavior.

**Fix:** Update the comment to be precise:

```typescript
session: {
  expiresIn: 60 * 60 * 5,  // Session lifetime: 5 hours from last refresh (D-05)
  updateAge: 60 * 30,       // Refresh session every 30 min of activity, extending the 5-hour window
},
```

---

_Reviewed: 2026-06-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
