# Phase 1: Foundation & Auth - Research

**Researched:** 2026-06-27
**Domain:** Next.js App Router + Better Auth + Drizzle ORM + Supabase (PostgreSQL) + Vercel
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Next.js with App Router — full-stack React, file-based routing, API routes built in.
- **D-02:** Strict TypeScript (`strict: true` in tsconfig) + ESLint + Prettier.
- **D-03:** Tailwind CSS for styling — utility-first, iPad-first responsive design.
- **D-04:** Drizzle schema and migrations live in `src/db/` inside the Next.js app — single package.json, no monorepo.
- **D-05:** Session duration: 5-hour idle timeout. Clock resets on each user action. Session expires only after 5 hours of inactivity.
- **D-06:** Session token stored in HTTP-only cookie — Better Auth's default. No localStorage.
- **D-07:** Always-persist sessions (no "Remember me" checkbox). Sessions always survive browser restarts up to the idle limit.
- **D-08:** Pool session close does NOT affect auth sessions.
- **D-09:** Login page: "BuddyBoard" heading + username/password form + Login button. Minimal.
- **D-10:** Login errors: generic message only — "Invalid username or password".
- **D-11:** After login, redirect to pool selection screen (placeholder list of pool names).
- **D-12:** Deploy to Vercel.
- **D-13:** GitHub repo connected to Vercel. Every push to `main` auto-deploys. PR branches get preview URLs.
- **D-14:** No CI test gate in Phase 1.
- **D-15:** Hostinger remains available for migration later — no app code changes needed.

### Claude's Discretion

- Error display style and field validation UX on the login form.
- Exact Drizzle schema column names and types for the users table — follow Better Auth's recommended schema.
- Next.js project structure conventions (where to put middleware, route groups for auth vs. public).

### Deferred Ideas (OUT OF SCOPE)

- "Log everyone out when a pool session closes"
- CI lint/type-check gate (Phase 2+)
- Camp branding on login page
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in with username and password | Better Auth username plugin + emailAndPassword enables username-based sign-in; auth client `signIn.username()` method documented |
| AUTH-02 | Authenticated session persists across browser restarts (remember me) | Better Auth uses persistent cookies (explicit `maxAge` from `expiresIn`), not session-only cookies; D-07 means no `dontRemember` flag ever set |
</phase_requirements>

---

## Summary

Phase 1 creates the entire application foundation: a Next.js 16 App Router project, connected to Supabase PostgreSQL via Drizzle ORM, with Better Auth handling username/password authentication, deployed to Vercel. No existing code exists — this phase establishes every pattern subsequent phases follow.

The primary technical challenge is correctly wiring four systems together in the right order: Supabase project → Drizzle schema → Better Auth (using the Drizzle adapter) → Next.js middleware → Vercel deployment. Each layer depends on the previous one being configured correctly.

Better Auth's username plugin extends the base `emailAndPassword` authenticator with username support. The plugin must be registered on both the server auth instance and the client auth client. For the 5-hour idle timeout, Better Auth's `session.expiresIn` + `session.updateAge` combination creates a sliding window — every request within `updateAge` granularity resets the 5-hour clock. Sessions use persistent cookies (not session-only) by default, satisfying D-07 (persists across browser restarts) automatically.

**Primary recommendation:** Scaffold with `create-next-app`, configure Drizzle + Better Auth against Supabase (using Transaction pooler for the app, direct connection for migrations), then layer in middleware protection and the login page. Deploy to Vercel before adding any features to prove the pipeline works end-to-end.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Username/password authentication | API / Backend (`src/lib/auth.ts`) | Browser (auth client for form submission) | Auth logic must run server-side; credentials never sent to client |
| Session validation (route protection) | Frontend Server (Next.js middleware) | API / Backend (per-page server component validation) | Middleware for fast redirect, server components for secure validation |
| Session storage | API / Backend (database via Better Auth) | Browser (HTTP-only cookie holding token) | Token in cookie, session data in DB — standard secure pattern |
| Login UI | Browser / Client | Frontend Server (SSR page) | Static login form, no server-side data needed for rendering |
| Database schema + migrations | Database / Storage (`src/db/`) | — | Drizzle schema is the source of truth for all tables |
| Deployment pipeline | CDN / Static + Frontend Server | — | Vercel handles both static assets and SSR/API routes |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.9 | Full-stack React framework, App Router, API routes | Official Vercel framework; native fit for this stack [VERIFIED: npm registry] |
| `react` / `react-dom` | (bundled with next) | UI rendering | Required by Next.js [VERIFIED: npm registry] |
| `better-auth` | 1.6.22 | Authentication library (username/password, sessions, cookies) | Chosen in D-05/D-06; modern, Drizzle-native [VERIFIED: npm registry] |
| `@better-auth/drizzle-adapter` | 1.6.22 (in sync with better-auth) | Connects Better Auth to Drizzle ORM | Official Better Auth adapter package [VERIFIED: npm registry] |
| `drizzle-orm` | 0.45.2 | TypeScript ORM for PostgreSQL schema + queries | Chosen in D-04; type-safe, schema-as-code [VERIFIED: npm registry] |
| `postgres` | 3.4.9 | PostgreSQL driver (node-postgres alternative, native ES module) | Recommended by Drizzle docs for serverless; no `prepare:false` complexity [VERIFIED: npm registry] |
| `tailwindcss` | (bundled with create-next-app) | Utility-first CSS | Chosen in D-03 [VERIFIED: npm registry] |
| `typescript` | (bundled with create-next-app) | Type safety | Chosen in D-02 [VERIFIED: npm registry] |

### Dev / CLI

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-kit` | 0.31.10 | Schema generation CLI + migrations | Every schema change; also generates schema from Better Auth config [VERIFIED: npm registry] |
| `@better-auth/cli` | 1.4.21 | Generates Drizzle schema tables required by Better Auth | Run once after auth config to get schema.ts output [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `postgres` driver | `pg` (node-postgres) | `pg` v8.22.0 exists but `postgres` is preferred for serverless; both work with Drizzle |
| Drizzle `push` | Drizzle `migrate` (file-based) | `push` is faster for greenfield dev but `migrate` is required for production schema history; use `migrate` from day one |
| `getSessionCookie()` middleware | Full `auth.api.getSession()` in middleware | Cookie check is fast but doesn't validate; full validation requires Node runtime in middleware (Next.js 15.2+) or per-page server component checks |

**Installation:**
```bash
# App dependencies
npm install better-auth @better-auth/drizzle-adapter drizzle-orm postgres

# Dev dependencies
npm install -D drizzle-kit @better-auth/cli
```

---

## Package Legitimacy Audit

> This phase installs external npm packages. Slopcheck was run but checked PyPI (Python) registry, not npm — it is not applicable for JavaScript packages. All packages below were verified directly against the npm registry via `npm view`.

| Package | Registry | Age | Source Repo | npm verified | Disposition |
|---------|----------|-----|-------------|-------------|-------------|
| `better-auth` | npm | ~2 yrs (Apr 2024) | github.com/better-auth/better-auth | v1.6.22 [VERIFIED: npm registry] | Approved |
| `@better-auth/drizzle-adapter` | npm | ~6 mo (Jan 2026) | github.com/better-auth/better-auth (monorepo) | v1.6.22 [VERIFIED: npm registry] | Approved |
| `@better-auth/cli` | npm | (same monorepo) | github.com/better-auth/better-auth | v1.4.21 [VERIFIED: npm registry] | Approved |
| `drizzle-orm` | npm | ~5 yrs (Sep 2021) | github.com/drizzle-team/drizzle-orm | v0.45.2 [VERIFIED: npm registry] | Approved |
| `drizzle-kit` | npm | (same monorepo as drizzle-orm) | github.com/drizzle-team/drizzle-orm | v0.31.10 [VERIFIED: npm registry] | Approved |
| `postgres` | npm | Established | github.com/porsager/postgres | v3.4.9 [VERIFIED: npm registry] | Approved |
| `next` | npm | ~13 yrs (Jul 2011) | github.com/vercel/next.js | v16.2.9 [VERIFIED: npm registry] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

**Postinstall check:** `npm view better-auth scripts.postinstall` and `npm view @better-auth/drizzle-adapter scripts.postinstall` returned empty (no postinstall scripts). Clean. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (iPad/laptop)
  │
  │  GET /login (unauthenticated)
  ▼
Next.js Middleware (src/middleware.ts)
  │  getSessionCookie() — optimistic check
  │  ├─ no cookie → redirect to /login
  │  └─ cookie present → pass through
  ▼
Next.js App Router (src/app/)
  │
  ├─ /login → LoginPage (Server Component)
  │     │  user submits form
  │     ▼
  │   POST /api/auth/sign-in/username
  │     │  (Better Auth route handler)
  │     ▼
  │   Better Auth → Drizzle → Supabase PostgreSQL
  │     │  validates credentials, creates session row
  │     │  sets HTTP-only cookie (session_token)
  │     └─ redirect to /pools
  │
  └─ /pools → PoolSelectionPage (Server Component)
        │  auth.api.getSession(headers) — DB-validated
        │  ├─ no valid session → redirect to /login
        │  └─ valid session → render placeholder pool list
        ▼
      Supabase PostgreSQL (via Drizzle Transaction Pooler)
        └─ sessions table, users table, accounts table
```

### Recommended Project Structure

```
buddyboard/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx        # Login form page
│   │   ├── (protected)/
│   │   │   └── pools/
│   │   │       └── page.tsx        # Placeholder pool selection
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...all]/
│   │   │           └── route.ts    # Better Auth handler
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Redirect to /login or /pools
│   ├── db/
│   │   ├── index.ts                # Drizzle db instance
│   │   └── schema.ts               # Generated schema (users, sessions, accounts, verification)
│   ├── lib/
│   │   ├── auth.ts                 # Server-side betterAuth() instance
│   │   └── auth-client.ts          # Client-side createAuthClient()
│   └── middleware.ts               # Route protection
├── drizzle/                        # Migration files (generated by drizzle-kit)
├── drizzle.config.ts               # Drizzle Kit config
├── .env.local                      # Local secrets (gitignored)
└── .env.example                    # Documented env var names (committed)
```

### Pattern 1: Better Auth Server Configuration

**What:** The central `betterAuth()` instance with username plugin and Drizzle adapter.
**When to use:** Created once, exported, used everywhere server-side.

```typescript
// src/lib/auth.ts
// Source: https://better-auth.com/docs/adapters/drizzle + https://better-auth.com/docs/plugins/username
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { username } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true },
  plugins: [username()],
  session: {
    expiresIn: 60 * 60 * 5,  // 5 hours (D-05: idle timeout window)
    updateAge: 60 * 30,       // Refresh session every 30 min of activity
                              // Net effect: expires 5h after last activity
                              // (with up to 30min granularity — acceptable for D-05)
  },
});
```

### Pattern 2: Better Auth API Route Handler

**What:** Mounts Better Auth at `/api/auth/[...all]` to handle all auth endpoints.
**When to use:** Required once; Better Auth handles all routes under this prefix.

```typescript
// src/app/api/auth/[...all]/route.ts
// Source: https://better-auth.com/docs/integrations/next
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

### Pattern 3: Client-Side Auth Client

**What:** Browser-side auth client with username plugin mirroring the server config.
**When to use:** In login form components that call sign-in/sign-out.

```typescript
// src/lib/auth-client.ts
// Source: https://better-auth.com/docs/plugins/username
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [usernameClient()],
});
```

### Pattern 4: Middleware Route Protection

**What:** Cookie-based optimistic redirect in `src/middleware.ts`.
**When to use:** For all routes except `/login` and `/api/auth/*`.

```typescript
// src/middleware.ts
// Source: https://better-auth.com/docs/integrations/next (getSessionCookie approach)
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const session = getSessionCookie(request);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

**Security note:** `getSessionCookie()` only checks for cookie existence, not validity. Always validate sessions via `auth.api.getSession()` in server components for any sensitive operations. This dual-layer approach (middleware for fast redirect, server component for validation) is the recommended pattern for Next.js 13–15.x.

### Pattern 5: Drizzle Database Connection

**What:** PostgreSQL connection using the `postgres` driver with Transaction mode pooler.
**When to use:** The single db instance used by both the app and Better Auth.

```typescript
// src/db/index.ts
// Source: https://orm.drizzle.team/docs/get-started/supabase-new
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Transaction mode pooler (port 6543) — required for Vercel serverless
// prepare: false is required for Supabase Transaction mode
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
```

### Pattern 6: Server Component Session Check (per-page validation)

**What:** DB-validated session check in protected server components.
**When to use:** Any server component rendering sensitive content.

```typescript
// src/app/(protected)/pools/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PoolsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <main>
      <h1>Select a Pool</h1>
      {/* Placeholder — Phase 4 replaces with real session logic */}
      {["Main Pool", "Lap Pool", "Kiddie Pool"].map((pool) => (
        <button key={pool}>{pool}</button>
      ))}
    </main>
  );
}
```

### Pattern 7: Drizzle Config (two connection strings)

```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/migrations
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Use DIRECT connection (port 5432) for migrations — Transaction mode
    // doesn't support all migration features
    url: process.env.DATABASE_URL_DIRECT!,
  },
});
```

### Anti-Patterns to Avoid

- **Using `prepare: false` on the wrong driver:** Only needed when using `postgres` (or `pg`) with Supabase Transaction mode pooler (port 6543). If using Session mode or direct connection, `prepare: true` (default) is correct.
- **Skipping `usernameClient()` on the client:** If the server has the `username` plugin but the client doesn't include `usernameClient()`, `authClient.signIn.username()` will not exist and TypeScript will error.
- **Relying on middleware cookie check alone:** `getSessionCookie()` does not validate the session against the database. Any protected page rendering real data must also call `auth.api.getSession()`.
- **Single DATABASE_URL for both app and migrations:** Migrations need Session/direct mode; the app needs Transaction pooler mode. Use two env vars (`DATABASE_URL` for app, `DATABASE_URL_DIRECT` for drizzle-kit).
- **Setting `dontRemember: true` in signIn calls:** D-07 requires always-persist sessions. Never pass `dontRemember: true` to `authClient.signIn.username()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt/argon2 logic | `better-auth` (uses scrypt by default) | Timing attacks, salt generation, key stretching — significant attack surface |
| Session token generation | Random string + cookie setter | `better-auth` session management | Secure randomness, cookie signing, expiry refresh, rotation |
| CSRF protection | Custom token | `better-auth` (built-in) | SameSite cookie + signed tokens already handled |
| DB schema for auth tables | Hand-write users/sessions/accounts tables | `npx @better-auth/cli generate` | Better Auth's schema must match its expected column names exactly |
| Route middleware auth logic | Custom JWT parse + DB lookup in middleware | `getSessionCookie()` + per-page `auth.api.getSession()` | Edge Runtime limitations make full DB calls in middleware unreliable |
| Database connection pooling | Custom pool manager | Supabase Supavisor (built-in) | Supabase handles connection limits; app just connects to the pooler URL |

**Key insight:** Better Auth handles the hard parts of auth (token signing, secure cookies, session refresh, password hashing). The work in this phase is configuration and wiring, not implementation.

---

## Common Pitfalls

### Pitfall 1: Transaction Mode + Prepared Statements

**What goes wrong:** App crashes with `prepared statements are not supported` errors in production on Vercel.
**Why it happens:** Supabase Transaction pooler (port 6543) doesn't support prepared statements. The `postgres` driver uses them by default.
**How to avoid:** Set `{ prepare: false }` in the postgres client constructor when `DATABASE_URL` points to the Transaction pooler.
**Warning signs:** Works locally (using direct connection) but fails on Vercel deploy.

### Pitfall 2: Username Plugin Missing from Client

**What goes wrong:** `authClient.signIn.username is not a function` TypeScript error.
**Why it happens:** Server has `plugins: [username()]` but client `createAuthClient()` is missing `plugins: [usernameClient()]`.
**How to avoid:** Both server (`src/lib/auth.ts`) and client (`src/lib/auth-client.ts`) must declare the plugin.
**Warning signs:** TypeScript won't error at first if you cast or use `any`; runtime failure at login.

### Pitfall 3: BETTER_AUTH_URL Missing in Production

**What goes wrong:** Auth callbacks fail with "Invalid URL" or CORS errors in production/preview deployments.
**Why it happens:** Better Auth uses `BETTER_AUTH_URL` to construct redirect URLs. Without it in production, it may fall back to `localhost`.
**How to avoid:** Set `BETTER_AUTH_URL` to your Vercel production URL in Vercel's Environment Variables. For preview deployments, use the dynamic `baseURL` object form with `allowedHosts: ["*.vercel.app"]`.
**Warning signs:** Login succeeds locally but fails on Vercel. Cookie is set but session is invalid.

### Pitfall 4: BETTER_AUTH_SECRET Too Short

**What goes wrong:** Session cookies can't be signed/verified; auth fails silently or throws a cryptic error.
**Why it happens:** `BETTER_AUTH_SECRET` must be at least 32 characters of high entropy.
**How to avoid:** Generate with `openssl rand -base64 32` and store in Vercel environment variables.
**Warning signs:** Works in dev (where you may have a short test secret) but auth is broken in prod.

### Pitfall 5: Schema Generation Sequence

**What goes wrong:** Drizzle migration fails or Better Auth can't find its tables at runtime.
**Why it happens:** The schema generation order matters: Better Auth CLI generates the auth tables, then drizzle-kit generates and runs the migration.
**How to avoid:** Follow the exact sequence:
  1. `npx @better-auth/cli generate` → writes to `src/db/schema.ts`
  2. `npx drizzle-kit generate` → creates SQL in `drizzle/`
  3. `npx drizzle-kit migrate` → applies to Supabase (using `DATABASE_URL_DIRECT`)
**Warning signs:** Missing table errors at runtime; "relation does not exist" PostgreSQL errors.

### Pitfall 6: Next.js 16 Middleware Behavior

**What goes wrong:** Middleware matcher accidentally blocks the auth API routes, causing infinite redirect loops.
**Why it happens:** If `api/auth` is not excluded from the middleware matcher, unauthenticated requests to Better Auth endpoints redirect to `/login`, which itself tries to call Better Auth, creating a loop.
**How to avoid:** Always exclude `api/auth` from the middleware matcher pattern:
  ```
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"]
  ```
**Warning signs:** Login page returns a 302 redirect to itself; browser shows "too many redirects".

### Pitfall 7: Session Idle Timeout Granularity

**What goes wrong:** Sessions don't feel like they have a sliding window — a user active for 3 hours can still get logged out if they haven't triggered a session refresh within `updateAge`.
**Why it happens:** Better Auth only refreshes session expiry when `updateAge` seconds have passed since last refresh. With a large `updateAge` (e.g., 4 hours), a user active at T=0 and T=3h30m might hit expiry at T=5h even though they were just active.
**How to avoid:** Set `updateAge` low relative to `expiresIn`. Recommended: `expiresIn: 60*60*5` (5h), `updateAge: 60*30` (30 min). This means the session clock resets every 30 minutes of activity, giving a true sliding ~5h idle window.
**Warning signs:** Users complain of unexpected logouts after being "logged in but inactive for a while".

---

## Code Examples

### Complete Auth Setup (server)

```typescript
// src/lib/auth.ts
// Source: https://better-auth.com/docs/adapters/drizzle + https://better-auth.com/docs/plugins/username
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { username } from "better-auth/plugins";
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
  emailAndPassword: { enabled: true },
  plugins: [username()],
  session: {
    expiresIn: 60 * 60 * 5,  // 5-hour idle window (D-05)
    updateAge: 60 * 30,       // Reset clock every 30 min of activity
  },
});

export type Session = typeof auth.$Infer.Session;
```

### Login Form Action (Client Component)

```typescript
// src/app/(auth)/login/page.tsx (simplified)
"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.username({
      username: form.get("username") as string,
      password: form.get("password") as string,
    });
    if (error) {
      setError("Invalid username or password"); // D-10: always generic
    } else {
      router.push("/pools");
    }
  }

  return (
    <main>
      <h1>BuddyBoard</h1>
      <form onSubmit={handleSubmit}>
        <input name="username" type="text" required />
        <input name="password" type="password" required />
        <button type="submit">Login</button>
        {error && <p>{error}</p>}
      </form>
    </main>
  );
}
```

### Schema Generation Command Sequence

```bash
# Step 1: Generate Better Auth tables (writes to src/db/schema.ts)
npx @better-auth/cli generate

# Step 2: Generate SQL migration file
npx drizzle-kit generate

# Step 3: Apply to Supabase (uses DATABASE_URL_DIRECT in drizzle.config.ts)
npx drizzle-kit migrate
```

### Seeding the First Admin User

Better Auth does not auto-create users. The first counselor/admin must be created manually after the schema is applied. In Phase 1, seed via a one-time script:

```typescript
// scripts/seed-admin.ts  (run once via: npx tsx scripts/seed-admin.ts)
// Source: [ASSUMED] — standard Better Auth pattern, verify against v1.6 docs
import { auth } from "../src/lib/auth";

await auth.api.signUpEmail({
  body: {
    email: "admin@camp.local",  // required by emailAndPassword
    password: "changeme123",
    name: "Admin",
    username: "admin",          // from username plugin
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth / Auth.js | Better Auth (chosen in D-05) | ~2024 | Better Auth has native Drizzle adapter, no credential provider workarounds needed |
| `pg` driver for Drizzle | `postgres` driver | Drizzle ORM v0.30+ recommendation | `postgres` is cleaner for ESM/serverless; `pg` still works |
| `drizzle-kit push` (dev only) | `drizzle-kit generate` + `migrate` (production) | Always recommended for prod | `push` is destructive; `migrate` maintains history |
| Pages Router API routes (`pages/api/`) | App Router Route Handlers (`app/api/`) | Next.js 13+ | App Router is the current standard; no `pages/` directory needed |
| Webpack (default bundler) | Turbopack (default in Next.js 16) | Next.js 15+ | Turbopack is now the default; no config needed |

**Deprecated/outdated:**
- `@auth/drizzle-adapter` (from Auth.js/NextAuth): Different library, different API. Do not confuse with `@better-auth/drizzle-adapter`.
- `toNodeHandler` from `better-auth/next-js`: Only used for Pages Router. App Router uses `toNextJsHandler`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Better Auth persistent cookies (non-session cookies) survive browser restarts by default | Session config, Pattern 1 | D-07 requirement unmet; would require additional cookie config |
| A2 | `authClient.signIn.username()` does not set `dontRemember: true` by default | Pattern 3 | Sessions would expire on browser close, breaking D-07 |
| A3 | Seed script using `auth.api.signUpEmail` with `username` field from the username plugin works in v1.6.22 | Code Examples | First user can't be created; need alternate seed approach |
| A4 | `updateAge: 60 * 30` (30 min) creates an effective sliding window matching D-05 intent | Pattern 1, Pitfall 7 | Idle timeout granularity might not match user expectations |
| A5 | `getSessionCookie()` is available from `better-auth/cookies` in v1.6.22 | Pattern 4 | Middleware import fails; need alternate cookie check approach |

---

## Open Questions

1. **Does `updateAge: 0` create a true per-request sliding window?**
   - What we know: `updateAge` controls refresh frequency in seconds; 0 may mean "always refresh" or may not be a valid value
   - What's unclear: Whether 0 is honored, or if it defaults to some minimum
   - Recommendation: Use `updateAge: 60 * 5` (5 min) as a safe minimum for MVP; test in dev and adjust. True per-request refresh would require `updateAge: 0` to be validated.

2. **Better Auth v1.6 schema column names with username plugin**
   - What we know: `npx @better-auth/cli generate` produces the correct schema; user table gets a `username` column from the plugin
   - What's unclear: Exact column name used for the username field (could be `username` or `display_name` or similar)
   - Recommendation: Run `npx @better-auth/cli generate` and inspect the output before writing schema by hand.

3. **Vercel preview deployment URLs and BETTER_AUTH_URL**
   - What we know: Preview deployments get random subdomains like `buddyboard-abc123.vercel.app`
   - What's unclear: Whether `allowedHosts: ["*.vercel.app"]` in the `baseURL` object config is sufficient, or if each preview needs its own env var
   - Recommendation: Use `BETTER_AUTH_URL` for production only; for previews, configure dynamic `baseURL` with `allowedHosts`. Test with first preview deployment.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime, npm scripts | Yes | v24.13.0 (exceeds v20.9 min) | — |
| npm | Package installation | Yes | v11.6.2 | — |
| Git | GitHub → Vercel CI/CD (D-13) | Yes | 2.45.1 | — |
| Supabase project | Database, auth storage | Not yet created | — | Must be created before schema migration |
| Vercel account + project | Deployment (D-12) | Not yet configured | — | Must connect GitHub repo to Vercel |

**Missing dependencies with no fallback:**
- Supabase project: Must be created at supabase.com; connection strings required before `drizzle-kit migrate` can run
- Vercel account: Must be created and GitHub repo connected before CI/CD pipeline works

**Missing dependencies with fallback:**
- None identified; all tool-level dependencies are present locally

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (recommended for Next.js App Router) |
| Config file | `vitest.config.ts` — does not yet exist (Wave 0 gap) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |

> Note: D-14 says no CI test gate in Phase 1. Testing infrastructure should still be installed and a basic smoke test should pass locally to confirm the walking skeleton works. E2E tests (Playwright) are recommended for Phase 2+ when auth flow is stable.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `authClient.signIn.username()` returns session on valid credentials | integration | manual / seed + curl | ❌ Wave 0 |
| AUTH-01 | Login page renders username + password fields | unit (component) | `npx vitest run src/app/(auth)/login` | ❌ Wave 0 |
| AUTH-01 | Unauthenticated request to `/pools` redirects to `/login` | smoke (manual) | Load `/pools` in browser without cookie | manual verification |
| AUTH-02 | Session cookie has `Max-Age` (not session-only) | unit (cookie inspection) | Inspect cookie after login in DevTools | manual verification |
| AUTH-02 | Session persists after browser close + reopen | E2E (manual) | Playwright or manual browser restart test | ❌ deferred to Phase 2 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** All unit tests green + manual walkthrough of 4 success criteria before Phase 2

### Wave 0 Gaps

- [ ] `vitest.config.ts` — Vitest config for Next.js App Router (needs `@vitejs/plugin-react` or equivalent)
- [ ] `src/app/(auth)/login/login.test.tsx` — Basic render test for login form (covers AUTH-01 partially)
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Better Auth `emailAndPassword` + `username` plugin; scrypt password hashing by default |
| V3 Session Management | Yes | Better Auth session with `expiresIn: 5h`, HTTP-only + Secure cookies |
| V4 Access Control | Yes | Next.js middleware (optimistic) + per-page `auth.api.getSession()` (validated) |
| V5 Input Validation | Yes | TypeScript strict mode; login form — validate non-empty inputs before submission |
| V6 Cryptography | Partial | `BETTER_AUTH_SECRET` (min 32 chars) used to sign cookies; do NOT hand-roll |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session token in localStorage or client cookie | Spoofing | Better Auth uses HTTP-only cookies by default (D-06) — never store token client-side |
| Generic vs specific error messages | Information Disclosure | D-10: always return "Invalid username or password" regardless of which field is wrong |
| CSRF on `/api/auth/*` POST routes | Tampering | Better Auth has built-in CSRF protection via SameSite cookie + signed tokens |
| Brute-force login attempts | Denial of Service | [ASSUMED] Better Auth may have rate limiting in v1.6; verify docs. For MVP, accept risk — camp context limits attack surface |
| Middleware bypass (cookie forgery) | Spoofing | Defense-in-depth: middleware (fast) + server component `auth.api.getSession()` (DB-validated) |
| Weak BETTER_AUTH_SECRET | Spoofing | Enforce 32+ chars, generated with `openssl rand -base64 32`; never commit to git |

---

## Sources

### Primary (HIGH confidence)

- `npm view better-auth version` — v1.6.22 [VERIFIED: npm registry]
- `npm view drizzle-orm version` — v0.45.2 [VERIFIED: npm registry]
- `npm view @better-auth/drizzle-adapter version` — v1.6.22 [VERIFIED: npm registry]
- `npm view next version` — v16.2.9 [VERIFIED: npm registry]
- https://better-auth.com/docs/adapters/drizzle — Drizzle adapter configuration, schema generation workflow
- https://better-auth.com/docs/authentication/email-password — emailAndPassword config, username plugin reference
- https://better-auth.com/docs/plugins/username — Username plugin setup, signIn.username() client method
- https://better-auth.com/docs/concepts/session-management — expiresIn, updateAge, cookieCache options
- https://better-auth.com/docs/reference/options — baseURL, session, advanced.cookies config
- https://better-auth.com/docs/integrations/next — toNextJsHandler, getSessionCookie, auth.api.getSession()
- https://orm.drizzle.team/docs/get-started/supabase-new — postgres driver setup, prepare:false for Transaction mode
- https://orm.drizzle.team/docs/migrations — drizzle-kit push vs migrate tradeoffs
- https://nextjs.org/docs/app/getting-started/installation — create-next-app defaults, project structure, v16.2.9

### Secondary (MEDIUM confidence)

- https://supabase.com/docs/guides/database/connecting-to-postgres — Transaction vs Session vs Direct connection modes [CITED: docs.supabase.com]
- Better Auth Next.js middleware pattern using getSessionCookie — multiple search results confirming same pattern; note that cookie check does not validate against DB

### Tertiary (LOW confidence)

- A1–A5 in Assumptions Log — not directly confirmed in fetched documentation

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all packages verified via `npm view`; official docs consulted for each
- Architecture: HIGH — confirmed via Better Auth, Drizzle, and Next.js official documentation
- Session Idle Timeout (D-05): MEDIUM — `expiresIn` + `updateAge` mechanism confirmed; exact behavior of `updateAge: 0` and granularity edge cases are ASSUMED
- Supabase Connection Modes: HIGH — official Supabase docs confirm Transaction vs Session mode distinction
- Pitfalls: HIGH — most confirmed via official docs or GitHub issues from the Better Auth repo

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (Better Auth releases frequently; re-verify session and schema generation commands if delayed)
