# Phase 2: Admin User Management - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 14
**Analogs found:** 12 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/auth.ts` | config | request-response | `src/lib/auth.ts` (self — current state) | exact |
| `src/lib/auth-client.ts` | config | request-response | `src/lib/auth-client.ts` (self — current state) | exact |
| `src/db/schema.ts` | model | CRUD | `src/db/schema.ts` (self — current state) | exact |
| `src/middleware.ts` | middleware | request-response | `src/middleware.ts` (self — current state) | exact |
| `src/app/(admin)/layout.tsx` | layout | request-response | `src/app/(protected)/pools/page.tsx` | role-match (server component + session guard) |
| `src/app/(admin)/users/page.tsx` | component | request-response | `src/app/(protected)/pools/page.tsx` | exact (server component with session + redirect) |
| `src/app/(admin)/users/actions.ts` | service | CRUD | none | no analog |
| `src/app/(admin)/users/components/UserTable.tsx` | component | CRUD | `src/app/(auth)/login/page.tsx` | partial (Tailwind patterns only) |
| `src/app/(admin)/users/components/CreateUserModal.tsx` | component | CRUD | `src/app/(auth)/login/page.tsx` | role-match (client component, form, error state, authClient) |
| `src/app/(admin)/users/components/DeleteConfirmDialog.tsx` | component | request-response | `src/app/(auth)/login/page.tsx` | partial (client component with boolean state, loading) |
| `src/app/(admin)/users/components/ResetPasswordForm.tsx` | component | request-response | `src/app/(auth)/login/page.tsx` | role-match (client form, password input, error state) |
| `src/lib/role-display.ts` | utility | transform | none | no analog |
| `src/app/(admin)/users/actions.test.ts` | test | — | `src/app/(auth)/login/login.test.tsx` | role-match (vitest, vi.mock pattern) |
| `src/app/(admin)/users/page.test.tsx` | test | — | `src/app/(auth)/login/login.test.tsx` | role-match (vitest, vi.mock pattern) |

---

## Pattern Assignments

### `src/lib/auth.ts` (config, request-response)

**Analog:** `src/lib/auth.ts` (current file, being extended)

**Current file** (lines 1–27 — full file):
```typescript
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
    expiresIn: 60 * 60 * 5,
    updateAge: 60 * 30,
  },
});

export type Session = typeof auth.$Infer.Session;
```

**Change required — add `admin` import and plugin, add `minPasswordLength`:**
- Line 3: extend import to `import { username, admin } from "better-auth/plugins";`
- Line 19: change to `emailAndPassword: { enabled: true, minPasswordLength: 8 },`
- Line 20: change to `plugins: [username(), admin()],`

**No other changes.** The drizzle adapter schema map will grow after `@better-auth/cli generate` regenerates `schema.ts`.

---

### `src/lib/auth-client.ts` (config, request-response)

**Analog:** `src/lib/auth-client.ts` (current file, being extended)

**Current file** (lines 1–8 — full file):
```typescript
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// usernameClient() is REQUIRED — without it, authClient.signIn.username is not a function
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [usernameClient()],
});
```

**Change required:**
- Add `import { adminClient } from "better-auth/client/plugins";`
- Add `adminClient()` to the plugins array: `plugins: [usernameClient(), adminClient()]`

---

### `src/db/schema.ts` (model, CRUD)

**Analog:** `src/db/schema.ts` (current file, being extended by CLI)

**Relations block** (lines 78–95) — this block MUST be preserved after `@better-auth/cli generate` reruns. Copy it back manually if the CLI drops it:
```typescript
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
```

**Columns the CLI will add to `user` table** (from RESEARCH.md — verified from package source):
```typescript
role: text("role"),
banned: boolean("banned").default(false),
banReason: text("ban_reason"),
banExpires: timestamp("ban_expires"),
```

**Column the CLI will add to `session` table:**
```typescript
impersonatedBy: text("impersonated_by"),
```

**Existing column pattern to follow** (line 4–17) — pgTable, text/boolean/timestamp types, `.unique()` and `.notNull()` usage:
```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
});
```

---

### `src/middleware.ts` (middleware, request-response)

**Analog:** `src/middleware.ts` (current file)

**Current file** (lines 1–16 — full file):
```typescript
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

**Change required (D-08 / RESEARCH.md Approach B):** Per RESEARCH.md recommendation, the middleware itself does NOT need a role check — the `(admin)` layout handles the role gate with a DB-validated session. The middleware matcher already covers `/admin/*` paths because `/admin` is not excluded from the matcher pattern. No code change is strictly required to the middleware for the role check.

However, the middleware currently redirects any unauthenticated request to `/login`. Unauthenticated `/admin/*` requests are already covered by the existing matcher. **No middleware change is needed for Phase 2** unless the planner overrides to Approach A (cookieCache middleware-level role check). Document this as a no-op with the rationale.

---

### `src/app/(admin)/layout.tsx` (layout, request-response)

**Analog:** `src/app/(protected)/pools/page.tsx`

The pools page is the closest existing analog — it is a server component that calls `auth.api.getSession()` and redirects unauthenticated users. The admin layout extends this with a second redirect for non-admin roles.

**Session + redirect pattern from analog** (pools/page.tsx lines 1–7):
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PoolsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
```

**Admin layout extends this with role check** (RESEARCH.md Pattern 3):
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/pools");
  return <>{children}</>;
}
```

**Note:** No `<html>` or `<body>` tags — this is a nested layout that wraps admin children only. The root layout in `src/app/layout.tsx` (lines 21–33) provides the html/body shell:
```typescript
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

---

### `src/app/(admin)/users/page.tsx` (component, request-response)

**Analog:** `src/app/(protected)/pools/page.tsx`

**Full analog** (lines 1–28):
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PoolsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 text-center mb-6">
          Select a Pool
        </h1>
        ...
      </div>
    </div>
  );
}
```

**UsersPage extends this** by adding an `auth.api.listUsers` call after the session check, then renders `<CreateUserModal>` and `<UserTable>` client components. The layout already performs the role gate, but per RESEARCH.md Pattern 4 + open question Q2, include a second role check here as defense-in-depth:
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserTable } from "./components/UserTable";
import { CreateUserModal } from "./components/CreateUserModal";

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") redirect("/pools");

  const result = await auth.api.listUsers({
    query: { limit: 100, sortBy: "createdAt", sortDirection: "asc" },
    headers: await headers(),
  });
  const users = result?.users ?? [];

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <CreateUserModal />
      </div>
      <UserTable users={users} />
    </main>
  );
}
```

**Tailwind shell pattern** from pools/page.tsx: `bg-white min-h-screen`, `bg-slate-50 rounded-lg p-8 shadow-sm`, `text-xl font-semibold text-slate-900`.

---

### `src/app/(admin)/users/actions.ts` (service, CRUD)

**Analog:** None — no Server Actions file exists in the codebase yet.

**Use RESEARCH.md Pattern 5 directly.** Key patterns to copy:

**`"use server"` directive + imports:**
```typescript
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
```

**`requireAdmin()` guard — apply at the top of every action:**
```typescript
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}
```

**`createUserAction` — synthetic email, data.username, revalidatePath:**
```typescript
export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  const result = await auth.api.createUser({
    body: {
      email: `${username.toLowerCase()}@buddyboard.local`,
      password,
      name: username,
      role,
      data: { username },
    },
    headers: await headers(),
  });

  if (!result?.user) throw new Error("Failed to create user");
  revalidatePath("/admin/users");
}
```

**`removeUserAction` and `setUserPasswordAction`:** follow same shape — `await requireAdmin()`, then `auth.api.removeUser` / `auth.api.setUserPassword` with `headers: await headers()`, then `revalidatePath("/admin/users")`.

---

### `src/app/(admin)/users/components/CreateUserModal.tsx` (component, CRUD)

**Analog:** `src/app/(auth)/login/page.tsx`

This is the closest analog: client component, `useState` for loading/error, form with text and password inputs, authClient call, error display below form, primary submit button.

**Client component shell** (login/page.tsx lines 1–5):
```typescript
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
```

**State pattern** (lines 9–10):
```typescript
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
```

**Form submit pattern** (lines 12–33) — `e.preventDefault()`, `setLoading(true)`, try/finally with `setLoading(false)`:
```typescript
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  setError(null);
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
}
```

**CreateUserModal replaces `authClient.signIn.username` with `authClient.admin.createUser`** and adds a role `<select>` field. The form also collects `role` (dropdown: "admin" / "user" with display labels "Admin" / "Counselor").

**Input class pattern** (line 56):
```
className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
```

**Error display pattern** (lines 76–78):
```typescript
{error && (
  <p role="alert" className="text-base text-red-600">
    {error}
  </p>
)}
```

**Primary button pattern** (lines 81–87):
```typescript
<button
  type="submit"
  disabled={loading}
  className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Log in
</button>
```

**Modal wrapper:** Use local `useState<boolean>` to show/hide the modal overlay. No external dialog library (per RESEARCH.md Don't Hand-Roll table).

---

### `src/app/(admin)/users/components/UserTable.tsx` (component, CRUD)

**Analog:** `src/app/(auth)/login/page.tsx` (Tailwind patterns only — no table analog exists)

**Tailwind palette to apply** from login/page.tsx:
- Container: `bg-white`, `bg-slate-50 rounded-lg shadow-sm`
- Text: `text-slate-900`, `text-slate-500`
- Border: `border border-slate-300 rounded-md`
- Actions: `bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md`
- Touch targets: `min-h-[44px]`

**Table shape** (D-07): columns = Username | Role | Created | Actions. Each row's Actions cell contains a "Reset password" trigger (expands `<ResetPasswordForm>`) and a "Delete" button (opens `<DeleteConfirmDialog>`).

**Role display:** Import `displayRole` from `@/lib/role-display` — never render raw `"user"` string.

**Props type pattern** — follow `pools/page.tsx`'s simple destructuring style:
```typescript
type User = {
  id: string;
  username: string | null;
  role: string | null;
  createdAt: Date;
};

export function UserTable({ users }: { users: User[] }) { ... }
```

---

### `src/app/(admin)/users/components/DeleteConfirmDialog.tsx` (component, request-response)

**Analog:** `src/app/(auth)/login/page.tsx`

**Client component with boolean state** — same pattern as login's `loading` state:
```typescript
"use client";
import { useState } from "react";

export function DeleteConfirmDialog({ userId, username, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  ...
}
```

**Confirmation copy** (D-10): `"Remove [username]? They will lose access immediately."`

**Button patterns from login/page.tsx** — destructive action uses same `min-h-[44px] rounded-md` but red background instead of blue:
- Cancel: `bg-slate-100 hover:bg-slate-200 text-slate-900`
- Confirm delete: `bg-red-600 hover:bg-red-700 text-white`

**Error display:** Same `role="alert"` + `text-red-600` pattern as login page (line 76–78).

---

### `src/app/(admin)/users/components/ResetPasswordForm.tsx` (component, request-response)

**Analog:** `src/app/(auth)/login/page.tsx`

**Password input pattern** (login/page.tsx lines 59–74) — copy directly, swap `autoComplete="current-password"` to `autoComplete="new-password"`:
```typescript
<input
  id="password"
  name="password"
  type="password"
  required
  autoComplete="current-password"
  placeholder="Enter your password"
  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
/>
```

**Form submit pattern:** Same try/finally as login — call `authClient.admin.setUserPassword({ userId, newPassword })` (or call the Server Action `setUserPasswordAction`). No confirmation step (D-10).

**Validation note (D-11):** Minimum 8 characters. Enforce server-side via Better Auth. Add client-side `minLength={8}` attribute to the password input as UX hint.

---

### `src/lib/role-display.ts` (utility, transform)

**Analog:** None.

**Simple pure function — no analog needed.** From RESEARCH.md Pattern 7:
```typescript
export function displayRole(role: string | null | undefined): string {
  if (role === "admin") return "Admin";
  return "Counselor"; // covers "user", null, undefined
}
```

---

### `src/app/(admin)/users/actions.test.ts` (test, CRUD)

**Analog:** `src/app/(auth)/login/login.test.tsx`

**Test file structure** (login.test.tsx lines 1–16):
```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import LoginPage from "./page";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      username: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  ...
```

**actions.test.ts adapts this pattern:** mock `@/lib/auth` instead of `@/lib/auth-client`; mock `next/headers` and `next/cache`; test `requireAdmin()` guard throws on missing/non-admin session; test password length validation.

**Mock pattern for Server Actions** (no analog — derive from login mock):
```typescript
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      createUser: vi.fn(),
      removeUser: vi.fn(),
      setUserPassword: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
```

**Error assertion pattern** (login.test.tsx lines 56–72) — `mockResolvedValueOnce`, `waitFor`, `expect(alert).toHaveTextContent(...)`.

---

### `src/app/(admin)/users/page.test.tsx` (test, request-response)

**Analog:** `src/app/(auth)/login/login.test.tsx`

**Component render test pattern** (login.test.tsx lines 22–28):
```typescript
it("renders a heading with text BuddyBoard", () => {
  render(<LoginPage />);
  expect(
    screen.getByRole("heading", { name: /BuddyBoard/i }),
  ).toBeInTheDocument();
});
```

**page.test.tsx adapts this:** mock `auth.api.getSession` + `auth.api.listUsers`, render `<UsersPage />`, assert table columns (Username, Role, Created, Actions) are present. Since `UsersPage` is an async server component, use the `renderAsync` or `await` pattern for server components (check `vitest.config.ts` for existing setup).

---

## Shared Patterns

### Session Guard
**Source:** `src/app/(protected)/pools/page.tsx` lines 1–7
**Apply to:** `(admin)/layout.tsx`, `(admin)/users/page.tsx`
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
```

### Role Guard Extension
**Source:** RESEARCH.md Pattern 3 (no codebase analog yet)
**Apply to:** `(admin)/layout.tsx`, `(admin)/users/page.tsx`, every function in `actions.ts`
```typescript
if (session.user.role !== "admin") redirect("/pools");
// OR in Server Actions:
if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
```

### Tailwind Input Field
**Source:** `src/app/(auth)/login/page.tsx` line 56
**Apply to:** `CreateUserModal.tsx`, `ResetPasswordForm.tsx`
```
className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
```

### Tailwind Primary Button
**Source:** `src/app/(auth)/login/page.tsx` lines 82–85
**Apply to:** `CreateUserModal.tsx`, `ResetPasswordForm.tsx`
```
className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
```

### Error Display
**Source:** `src/app/(auth)/login/page.tsx` lines 76–78
**Apply to:** `CreateUserModal.tsx`, `DeleteConfirmDialog.tsx`, `ResetPasswordForm.tsx`
```typescript
{error && (
  <p role="alert" className="text-base text-red-600">
    {error}
  </p>
)}
```

### Form Submit Shell (Client Component)
**Source:** `src/app/(auth)/login/page.tsx` lines 9–33
**Apply to:** `CreateUserModal.tsx`, `ResetPasswordForm.tsx`
```typescript
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  setError(null);
  try {
    // ... call authClient.admin.*
  } finally {
    setLoading(false);
  }
}
```

### Vitest Mock Pattern
**Source:** `src/app/(auth)/login/login.test.tsx` lines 5–11
**Apply to:** `actions.test.ts`, `page.test.tsx`
```typescript
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { username: vi.fn() } },
}));
beforeEach(() => { vi.clearAllMocks(); });
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/(admin)/users/actions.ts` | service | CRUD | No Server Actions (`"use server"`) file exists in the codebase yet. Use RESEARCH.md Pattern 5 directly. |
| `src/lib/role-display.ts` | utility | transform | No utility files exist yet. Simple pure function — copy from RESEARCH.md Pattern 7. |

---

## Metadata

**Analog search scope:** `src/app/**`, `src/lib/**`, `src/db/**`, `src/middleware.ts`
**Files scanned:** 9 source files (all TypeScript files in `src/`)
**Pattern extraction date:** 2026-06-28
