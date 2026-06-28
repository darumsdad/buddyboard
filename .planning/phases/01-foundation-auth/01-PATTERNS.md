# Phase 1: Foundation & Auth - Pattern Map

**Mapped:** 2026-06-27
**Files analyzed:** 15 (all new — greenfield project)
**Analogs found:** 0 / 15 — no existing application code

> **Greenfield note:** There is no `src/` directory, no `package.json`, and no existing components. Every file in this table is being created from scratch. The "analog" column is replaced by "Pattern Source" — the exact section of RESEARCH.md (or UI-SPEC.md) that provides the implementation template. The planner MUST read those source sections before writing plan actions.

---

## File Classification

| New File | Role | Data Flow | Pattern Source | Source Quality |
|----------|------|-----------|----------------|----------------|
| `src/lib/auth.ts` | config/service | request-response | RESEARCH.md Pattern 1 + Code Examples §"Complete Auth Setup (server)" | HIGH — full code template |
| `src/lib/auth-client.ts` | config/service | request-response | RESEARCH.md Pattern 3 | HIGH — full code template |
| `src/app/api/auth/[...all]/route.ts` | route (API handler) | request-response | RESEARCH.md Pattern 2 | HIGH — full code template |
| `src/middleware.ts` | middleware | request-response | RESEARCH.md Pattern 4 | HIGH — full code template |
| `src/db/index.ts` | config/service | CRUD | RESEARCH.md Pattern 5 | HIGH — full code template |
| `src/db/schema.ts` | model | CRUD | RESEARCH.md §"Schema Generation Command Sequence" (CLI-generated) | HIGH — generated, not hand-written |
| `drizzle.config.ts` | config | CRUD | RESEARCH.md Pattern 7 | HIGH — full code template |
| `src/app/(auth)/login/page.tsx` | component (Client) | request-response | RESEARCH.md Code Examples §"Login Form Action" + UI-SPEC.md §"Screen 1: Login Page" | HIGH — both behavior and full UI spec |
| `src/app/(protected)/pools/page.tsx` | component (Server) | request-response | RESEARCH.md Pattern 6 + UI-SPEC.md §"Screen 2: Pool Selection" | HIGH — both behavior and full UI spec |
| `src/app/layout.tsx` | component (Server) | request-response | create-next-app default; add `font-sans` + basic `<html>/<body>` | MEDIUM — scaffold default |
| `src/app/page.tsx` | component (Server) | request-response | RESEARCH.md §Architecture Diagram (root redirects to /login or /pools) | MEDIUM — one-line redirect |
| `scripts/seed-admin.ts` | utility (script) | CRUD | RESEARCH.md Code Examples §"Seeding the First Admin User" | MEDIUM — marked [ASSUMED] in research |
| `.env.example` | config | — | RESEARCH.md §"Environment Variables" + Anti-Patterns §"Single DATABASE_URL" | HIGH — env var names explicit in research |
| `vitest.config.ts` | config (test) | — | RESEARCH.md §"Validation Architecture" §"Wave 0 Gaps" | MEDIUM — install listed, config not shown |
| `src/app/(auth)/login/login.test.tsx` | test | — | RESEARCH.md §"Validation Architecture" §"Phase Requirements → Test Map" | LOW — test file not yet specified beyond "basic render test" |

---

## Pattern Assignments

### `src/lib/auth.ts` (config/service, request-response)

**Pattern source:** RESEARCH.md — Pattern 1 (lines 211–245) AND Code Examples "Complete Auth Setup (server)" (lines 458–489)

Use the Code Examples version — it is slightly more complete (includes `export type Session`).

**Full implementation template** (RESEARCH.md lines 459–489):
```typescript
// src/lib/auth.ts
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

**Critical constraints:**
- `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` use `!` (non-null assertion) — both are required at runtime; app should fail fast if missing.
- `username()` plugin MUST appear in both this file and `src/lib/auth-client.ts` or TypeScript will error at login (RESEARCH.md Pitfall 2).
- `expiresIn: 60 * 60 * 5` + `updateAge: 60 * 30` implements D-05 sliding window (RESEARCH.md Pitfall 7).

---

### `src/lib/auth-client.ts` (config/service, request-response)

**Pattern source:** RESEARCH.md — Pattern 3 (lines 263–276)

**Full implementation template** (RESEARCH.md lines 269–276):
```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [usernameClient()],
});
```

**Critical constraints:**
- `usernameClient()` must mirror the server's `username()` plugin (RESEARCH.md Pitfall 2).
- Uses `NEXT_PUBLIC_APP_URL` (client-visible env var) — different from server's `BETTER_AUTH_URL`.
- Never import this file in server components or middleware — client-only.

---

### `src/app/api/auth/[...all]/route.ts` (route/API handler, request-response)

**Pattern source:** RESEARCH.md — Pattern 2 (lines 249–259)

**Full implementation template** (RESEARCH.md lines 255–259):
```typescript
// src/app/api/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

**Critical constraints:**
- File MUST be at exactly `src/app/api/auth/[...all]/route.ts` — the `[...all]` catch-all is what allows Better Auth to handle every sub-route under `/api/auth/`.
- Use `toNextJsHandler` (App Router), NOT `toNodeHandler` (Pages Router only) — RESEARCH.md §"Deprecated/outdated".
- Middleware matcher MUST exclude `api/auth` to avoid redirect loop (RESEARCH.md Pitfall 6).

---

### `src/middleware.ts` (middleware, request-response)

**Pattern source:** RESEARCH.md — Pattern 4 (lines 280–303)

**Full implementation template** (RESEARCH.md lines 289–302):
```typescript
// src/middleware.ts
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

**Critical constraints:**
- `getSessionCookie()` is optimistic (cookie existence only, not DB validation). Per-page `auth.api.getSession()` is required for secure validation — RESEARCH.md §Security note after Pattern 4.
- The matcher pattern must exclude `login`, `api/auth`, and Next.js internals to prevent infinite redirect loops (RESEARCH.md Pitfall 6).
- Import source is `better-auth/cookies` — verify this import path exists in v1.6.22 (RESEARCH.md Assumption A5).

---

### `src/db/index.ts` (config/service, CRUD)

**Pattern source:** RESEARCH.md — Pattern 5 (lines 309–322)

**Full implementation template** (RESEARCH.md lines 315–322):
```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Transaction mode pooler (port 6543) — required for Vercel serverless
// prepare: false is required for Supabase Transaction mode
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
```

**Critical constraints:**
- `{ prepare: false }` is REQUIRED when `DATABASE_URL` points to Supabase Transaction pooler (port 6543). Omitting it causes runtime crashes on Vercel (RESEARCH.md Pitfall 1).
- `DATABASE_URL` must be the Transaction pooler URL (port 6543), NOT the direct connection URL (RESEARCH.md Anti-Patterns §"Single DATABASE_URL").

---

### `src/db/schema.ts` (model, CRUD)

**Pattern source:** RESEARCH.md — Schema Generation Command Sequence (lines 534–543)

**Do NOT hand-write this file.** Generate it with the CLI:
```bash
# Step 1: Generate Better Auth tables (writes to src/db/schema.ts)
npx @better-auth/cli generate

# Step 2: Generate SQL migration file
npx drizzle-kit generate

# Step 3: Apply to Supabase (uses DATABASE_URL_DIRECT in drizzle.config.ts)
npx drizzle-kit migrate
```

**Critical constraints:**
- Run ONLY after `drizzle.config.ts` and `.env.local` are in place (Supabase connection strings required).
- Output will include: `user`, `session`, `account`, `verification` tables plus a `username` column on the `user` table (from username plugin).
- The generated export names (`schema.user`, `schema.session`, `schema.account`, `schema.verification`) must match what `src/lib/auth.ts` imports — RESEARCH.md Pattern 1.
- Open Question from RESEARCH.md: exact column name for username field may not be `username` — inspect CLI output before referencing it anywhere (RESEARCH.md Open Question 2).

---

### `drizzle.config.ts` (config, CRUD)

**Pattern source:** RESEARCH.md — Pattern 7 (lines 353–369)

**Full implementation template** (RESEARCH.md lines 357–369):
```typescript
// drizzle.config.ts
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

**Critical constraints:**
- Uses `DATABASE_URL_DIRECT` (direct connection, port 5432) — NOT `DATABASE_URL` (Transaction pooler). This is the second env var required (RESEARCH.md Anti-Patterns §"Single DATABASE_URL").

---

### `src/app/(auth)/login/page.tsx` (component/Client, request-response)

**Pattern sources:**
- **Behavior:** RESEARCH.md Code Examples "Login Form Action" (lines 494–530)
- **UI:** UI-SPEC.md §"Screen 1: Login Page" (full Tailwind class specification)

**Behavior template** (RESEARCH.md lines 496–530):
```typescript
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
    // ... UI per UI-SPEC.md
  );
}
```

**UI specification** (from UI-SPEC.md §"Screen 1"):
```
Page: bg-white h-screen flex items-center justify-center
  └── Card: bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm
        ├── Heading "BuddyBoard": text-3xl font-semibold text-slate-900 text-center mb-8
        ├── Form: flex flex-col gap-4
        │     ├── Label "Username": text-base font-semibold text-slate-900
        │     ├── Input (username): type="text" name="username" required autocomplete="username"
        │     │     min-h-[44px] w-full border border-slate-300 rounded-md px-3
        │     │     text-base text-slate-900 placeholder:text-slate-500
        │     │     focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
        │     ├── Label "Password": text-base font-semibold text-slate-900
        │     ├── Input (password): type="password" name="password" required autocomplete="current-password"
        │     │     (same classes as username input)
        │     ├── Error <p> (conditional): "Invalid username or password"
        │     │     text-base text-red-600 role="alert"
        │     └── Button "Log in": type="submit"
        │           min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white
        │           text-base font-semibold rounded-md transition-colors duration-150
        │           disabled:opacity-50 disabled:cursor-not-allowed
```

**Critical constraints:**
- Must be a Client Component (`"use client"`) — uses `useState`, `useRouter`, and calls `authClient` methods.
- NEVER pass `dontRemember: true` to `authClient.signIn.username()` — D-07 requires always-persist sessions (RESEARCH.md Anti-Patterns).
- Error message must be exactly "Invalid username or password" regardless of which credential is wrong (D-10).
- Add a loading/disabled state on the submit button while the auth request is in flight (UI-SPEC.md §Interaction states).
- Both fields use `required` and browser-native validation — no custom inline validation messages needed for MVP.

---

### `src/app/(protected)/pools/page.tsx` (component/Server, request-response)

**Pattern sources:**
- **Behavior:** RESEARCH.md Pattern 6 (lines 327–349)
- **UI:** UI-SPEC.md §"Screen 2: Pool Selection"

**Behavior template** (RESEARCH.md lines 333–349):
```typescript
// src/app/(protected)/pools/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PoolsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    // ... UI per UI-SPEC.md
  );
}
```

**UI specification** (from UI-SPEC.md §"Screen 2"):
```
Page: bg-white min-h-screen flex items-center justify-center
  └── Container: bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm
        ├── Heading "Select a Pool": text-xl font-semibold text-slate-900 text-center mb-6
        └── Pool list: flex flex-col gap-3
              ├── Button "Main Pool"
              ├── Button "Lap Pool"
              └── Button "Kiddie Pool"
                    Each: min-h-[44px] w-full bg-blue-600 hover:bg-blue-700
                          text-white text-base font-semibold rounded-md
                          transition-colors duration-150
```

**Critical constraints:**
- Must be a Server Component (no `"use client"`) — calls `auth.api.getSession()` on the server.
- `auth.api.getSession()` provides DB-validated session check (not just cookie existence) — this is the security layer, not just middleware (RESEARCH.md §Security note).
- Pool buttons do NOT navigate anywhere in Phase 1 — they are placeholder click targets. Phase 4 replaces with real logic (UI-SPEC.md §Placeholder note).
- Pool names are hardcoded: "Main Pool", "Lap Pool", "Kiddie Pool" (REQUIREMENTS.md POOL-02 / UI-SPEC.md Copywriting Contract).

---

### `src/app/layout.tsx` (component/Server, request-response)

**Pattern source:** `create-next-app` default output.

**Implementation guidance:**
- Use the default scaffold output from `create-next-app`.
- Keep the `<html lang="en">` and `<body>` wrapper.
- Apply Tailwind's `font-sans` class to `<body>` (`className="font-sans"`).
- No custom providers needed in Phase 1 — Better Auth does not require a client-side `SessionProvider`.
- Import global CSS (`import "./globals.css"`) for Tailwind directives.

---

### `src/app/page.tsx` (component/Server, request-response)

**Pattern source:** RESEARCH.md §Architecture Diagram (root page redirects).

**Implementation guidance:**
```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
```

The root URL (`/`) should redirect to `/login`. Middleware will then redirect authenticated users to `/pools` — or leave it as-is (logged-out users see login, logged-in users pass middleware and the server component validates session). Either approach works for Phase 1 MVP.

---

### `scripts/seed-admin.ts` (utility/script, CRUD)

**Pattern source:** RESEARCH.md Code Examples "Seeding the First Admin User" (lines 549–562)

**Implementation template** (RESEARCH.md lines 552–562):
```typescript
// scripts/seed-admin.ts  (run once via: npx tsx scripts/seed-admin.ts)
// [ASSUMED] — verify against Better Auth v1.6.22 docs before running
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

**Critical constraints:**
- This is a one-time CLI script — run with `npx tsx scripts/seed-admin.ts` after migration is applied.
- RESEARCH.md marks this [ASSUMED] (Assumption A3) — if `signUpEmail` does not accept `username`, try `auth.api.signUpUsername()` or check v1.6.22 docs.
- Change the default password before handing off to the camp. This is dev-only seed data.
- Add `tsx` as a dev dependency if not already present: `npm install -D tsx`.

---

### `.env.example` (config)

**Pattern source:** RESEARCH.md — multiple sections (Standard Stack, Patterns 1, 3, 5, 7, Pitfalls 3 and 4)

**Required env vars:**
```bash
# .env.example — copy to .env.local and fill in values

# Better Auth
BETTER_AUTH_URL=https://your-app.vercel.app     # Your Vercel production URL (no trailing slash)
BETTER_AUTH_SECRET=                              # Min 32 chars: openssl rand -base64 32

# Database — Two URLs required (RESEARCH.md Anti-Pattern: Single DATABASE_URL)
DATABASE_URL=postgresql://...@...pooler.supabase.com:6543/postgres  # Transaction pooler (app)
DATABASE_URL_DIRECT=postgresql://...@...supabase.com:5432/postgres   # Direct connection (migrations)

# Client-visible
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  # Same as BETTER_AUTH_URL but NEXT_PUBLIC_ prefix
```

**Critical constraints:**
- `.env.local` is gitignored by `create-next-app` by default — verify `.gitignore` before committing.
- `BETTER_AUTH_SECRET` must be min 32 chars high-entropy (RESEARCH.md Pitfall 4).
- Two separate `DATABASE_URL*` vars are required — app uses Transaction pooler (port 6543, `prepare:false`); migrations use direct connection (port 5432) (RESEARCH.md Pitfall 1 + Anti-Patterns).

---

### `vitest.config.ts` (config/test)

**Pattern source:** RESEARCH.md §"Validation Architecture" §"Wave 0 Gaps" (lines 638–665)

**Dev dependencies to install:**
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Implementation guidance:** Standard Vitest + jsdom config for Next.js App Router. No full template provided in RESEARCH.md — use the standard Vitest documentation pattern for React projects with jsdom environment.

---

### `src/app/(auth)/login/login.test.tsx` (test)

**Pattern source:** RESEARCH.md §"Phase Requirements → Test Map" (lines 648–653)

**Test coverage target** (from RESEARCH.md):
- AUTH-01: Login page renders username + password fields (unit/component test)

**Implementation guidance:** Basic render test using `@testing-library/react`. Verify the form has a username input, password input, and submit button. No behavior testing (that requires a mock auth client) — render-only for Phase 1.

---

## Shared Patterns

### HTTP-only Cookie Session (applies to all auth-related files)

**Source:** RESEARCH.md D-06 + §"Session Management" (ASVS V3)
**Apply to:** `src/lib/auth.ts`, `src/middleware.ts`, `src/app/(auth)/login/page.tsx`

Better Auth sets HTTP-only cookies automatically. No code needed to configure this — it is the default. The shared constraint is: **never read the session token from client-side JavaScript** and **never store it in localStorage**. The only client-accessible auth state is via `authClient.useSession()` if needed — the token itself is inaccessible to JS.

### `@/` Path Alias (applies to all TypeScript files)

**Source:** RESEARCH.md Pattern 1 import: `import { db } from "@/db"`
**Apply to:** All files under `src/`

`create-next-app` with TypeScript configures `@/` as an alias for `src/` in `tsconfig.json` by default. All internal imports should use `@/` not relative paths (e.g., `@/lib/auth` not `../../lib/auth`).

### Dual-Layer Auth Check (middleware + server component)

**Source:** RESEARCH.md §"Security note" after Pattern 4
**Apply to:** `src/middleware.ts` + `src/app/(protected)/pools/page.tsx` (and all future protected pages)

| Layer | File | Method | Check Type |
|-------|------|--------|------------|
| Fast redirect | `src/middleware.ts` | `getSessionCookie()` | Cookie existence only (optimistic) |
| Secure validation | Every protected server component | `auth.api.getSession()` | DB-validated session |

Both layers are required. Middleware alone is not secure. Server component check alone causes full round-trips for redirects on every unauthenticated request.

### Always-Persist Sessions (applies to login call site)

**Source:** RESEARCH.md D-07 + Anti-Patterns
**Apply to:** `src/app/(auth)/login/page.tsx`

Never pass `dontRemember: true` to `authClient.signIn.username()`. Better Auth persistent cookies are the default — no additional code needed. The constraint is a negative: do not add code that breaks this default.

### Generic Error Messages (applies to login page)

**Source:** RESEARCH.md D-10
**Apply to:** `src/app/(auth)/login/page.tsx`

The error string must always be exactly `"Invalid username or password"` regardless of which credential is wrong. Do not vary the message based on the error type returned by Better Auth.

---

## No Analog Found

All 15 files have no existing codebase analog (greenfield). The table below summarizes which files have strong RESEARCH.md templates vs. files that require additional judgment:

| File | Template Quality | Gap |
|------|-----------------|-----|
| `src/lib/auth.ts` | Full template | None |
| `src/lib/auth-client.ts` | Full template | None |
| `src/app/api/auth/[...all]/route.ts` | Full template | None |
| `src/middleware.ts` | Full template | None |
| `src/db/index.ts` | Full template | None |
| `drizzle.config.ts` | Full template | None |
| `src/app/(auth)/login/page.tsx` | Full behavior + full UI spec | Combine behavior (RESEARCH.md) + UI (UI-SPEC.md) |
| `src/app/(protected)/pools/page.tsx` | Full behavior + full UI spec | Combine behavior (RESEARCH.md) + UI (UI-SPEC.md) |
| `src/db/schema.ts` | CLI-generated | Must run `@better-auth/cli generate` — planner should note this is a generate step, not a write step |
| `scripts/seed-admin.ts` | Template marked [ASSUMED] | Verify `auth.api.signUpEmail` accepts `username` in v1.6.22 (RESEARCH.md Assumption A3) |
| `src/app/layout.tsx` | create-next-app default | Minimal modification only |
| `src/app/page.tsx` | Single redirect — trivial | No template needed |
| `.env.example` | Env var names explicit in research | Assemble from multiple RESEARCH.md sections |
| `vitest.config.ts` | Install command only | Use standard Vitest/React config pattern |
| `src/app/(auth)/login/login.test.tsx` | Coverage target only | Basic render test — no template in RESEARCH.md |

---

## Metadata

**Analog search scope:** N/A — greenfield project, no `src/` directory exists
**Files scanned:** 3 (01-CONTEXT.md, 01-RESEARCH.md, 01-UI-SPEC.md)
**Pattern extraction date:** 2026-06-27
**Research validity:** 2026-07-27 (per RESEARCH.md §Metadata)
