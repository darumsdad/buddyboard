---
phase: "02-admin-user-management"
plan: "02"
type: execute
wave: 2
depends_on:
  - "02-01"
files_modified:
  - src/lib/role-display.ts
  - src/app/(admin)/layout.tsx
  - src/app/(admin)/users/actions.ts
  - src/app/(admin)/users/actions.test.ts
  - src/app/(admin)/users/page.tsx
autonomous: true
requirements:
  - AUTH-03
  - AUTH-04
  - AUTH-05

must_haves:
  truths:
    - "Authenticated non-admin user navigating to /admin/* is redirected to /pools"
    - "Unauthenticated user navigating to /admin/* is redirected to /login (middleware handles this)"
    - "Admin user navigating to /admin/users sees a server-rendered user list"
    - "createUserAction throws Unauthorized when called without a valid admin session"
    - "removeUserAction throws Unauthorized when called without a valid admin session"
    - "setUserPasswordAction throws Unauthorized when called without a valid admin session"
    - "DB role value 'user' is never rendered — always displayed as 'Counselor' via displayRole()"
  artifacts:
    - path: "src/lib/role-display.ts"
      provides: "displayRole() pure function"
      exports: ["displayRole"]
    - path: "src/app/(admin)/layout.tsx"
      provides: "Admin route group layout with DB-validated role gate"
      contains: "session.user.role !== \"admin\""
    - path: "src/app/(admin)/users/actions.ts"
      provides: "Server actions for user management"
      exports: ["createUserAction", "removeUserAction", "setUserPasswordAction"]
    - path: "src/app/(admin)/users/actions.test.ts"
      provides: "Unit tests verifying requireAdmin guard on all three actions"
    - path: "src/app/(admin)/users/page.tsx"
      provides: "Server component rendering the user list at /admin/users"
      contains: "auth.api.listUsers"
  key_links:
    - from: "src/app/(admin)/layout.tsx"
      to: "src/lib/auth.ts"
      via: "auth.api.getSession({ headers: await headers() })"
      pattern: "auth\\.api\\.getSession"
    - from: "src/app/(admin)/users/actions.ts"
      to: "src/lib/auth.ts"
      via: "requireAdmin() calls auth.api.getSession"
      pattern: "requireAdmin"
    - from: "src/app/(admin)/users/page.tsx"
      to: "src/lib/role-display.ts"
      via: "displayRole(user.role)"
      pattern: "displayRole"
---

<objective>
Create the admin route group with a role-enforcing layout server component, a role display utility, server actions for user CRUD protected by requireAdmin(), and a basic server-rendered users page that proves the full auth → role → data pipeline works end-to-end.

Purpose: After this plan, an admin navigating to /admin/users sees the user list rendered server-side. A non-admin is redirected to /pools. The dual-layer role gate (layout + server actions) is in place and tested before interactive UI is built.
Output: role-display.ts, (admin)/layout.tsx, users/actions.ts (with requireAdmin guard), users/actions.test.ts (6 unit tests), users/page.tsx (server-rendered table, no interactive components yet).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/02-admin-user-management/02-CONTEXT.md
@.planning/phases/02-admin-user-management/02-RESEARCH.md
@.planning/phases/02-admin-user-management/02-PATTERNS.md
@.planning/phases/02-admin-user-management/02-UI-SPEC.md

<interfaces>
<!-- Key types and patterns the executor needs. -->

From src/lib/auth.ts (after Plan 01):
auth.ts exports `auth` with admin() plugin registered.
`session.user.role` is typed as string | null after admin plugin — check against "admin" literal.

From src/app/(protected)/pools/page.tsx (session guard analog):
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

requireAdmin() pattern (RESEARCH.md Pattern 5):
  async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
    return session;
  }

createUser call shape (RESEARCH.md Pattern 5):
  await auth.api.createUser({
    body: {
      email: `${username.toLowerCase()}@buddyboard.local`,
      password,
      name: username,
      role,            // top-level field, NOT inside data
      data: { username }, // username plugin reads this from spread userData
    },
    headers: await headers(),  // REQUIRED — omitting bypasses permission check (Pitfall 1)
  });

Vitest mock pattern (from src/app/(auth)/login/login.test.tsx):
  vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { username: vi.fn() } } }));
  beforeEach(() => { vi.clearAllMocks(); });
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: role-display utility and admin layout server component</name>
  <files>src/lib/role-display.ts, src/app/(admin)/layout.tsx</files>
  <read_first>
    - src/app/(protected)/pools/page.tsx — session guard analog; replicate the auth.api.getSession + redirect pattern
    - .planning/phases/02-admin-user-management/02-RESEARCH.md — Pattern 3 (AdminLayout code), Approach B rationale (layout-level role check, middleware unchanged)
    - .planning/phases/02-admin-user-management/02-PATTERNS.md — layout.tsx section (complete AdminLayout code) and middleware.ts section (confirms no middleware change needed)
    - src/middleware.ts — confirm current matcher already covers /admin/* paths; do NOT modify this file (Approach B: middleware stays cookie-only, layout does the role check)
  </read_first>
  <action>
    Create src/lib/role-display.ts:
    Export a single function `displayRole(role: string | null | undefined): string`.
    Returns "Admin" when role === "admin". Returns "Counselor" for every other value ("user", null, undefined, anything else).
    This is the single source of truth for role display (D-02). Import and use it everywhere a role is rendered — never render the raw DB string.

    Create src/app/(admin)/layout.tsx:
    Async server component named AdminLayout. No "use client" directive.
    Imports: headers from "next/headers", redirect from "next/navigation", auth from "@/lib/auth".
    Props: { children: React.ReactNode }.
    Logic:
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) redirect("/login");
      if (session.user.role !== "admin") redirect("/pools");
      return <>{children}</>;
    No visual chrome — no nav, no sidebar, no html/body tags (D-06: nav deferred to Phase 3; root layout provides html/body).
    Do NOT enable cookieCache or touch middleware.ts — the layout's DB-validated session check is sufficient (RESEARCH.md Approach B).

    D-08 override (user-approved 2026-06-28): Layout-level role check via (admin)/layout.tsx replaces the originally specified middleware.ts extension. Rationale: server component does DB-validated role check; admin plugin validates every API call independently. middleware.ts remains unchanged.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - src/lib/role-display.ts exists and exports a function named `displayRole`
    - displayRole("admin") returns exactly "Admin"
    - displayRole("user") returns exactly "Counselor"
    - displayRole(null) returns exactly "Counselor"
    - displayRole(undefined) returns exactly "Counselor"
    - src/app/(admin)/layout.tsx is an async function with no "use client"
    - layout.tsx contains `redirect("/login")` for null session
    - layout.tsx contains `session.user.role !== "admin"` check with `redirect("/pools")`
    - layout.tsx returns `{children}` (no wrapping html/body elements)
    - `npx tsc --noEmit` exits 0
    - src/middleware.ts is unchanged (D-08 override: user-approved 2026-06-28 — Approach B layout-level enforcement; see action note)
  </acceptance_criteria>
  <done>Non-admin authenticated users redirected to /pools; unauthenticated to /login; displayRole utility in place</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: server actions (TDD) and basic server-rendered users page</name>
  <files>
    src/app/(admin)/users/actions.test.ts,
    src/app/(admin)/users/actions.ts,
    src/app/(admin)/users/page.tsx
  </files>
  <read_first>
    - .planning/phases/02-admin-user-management/02-RESEARCH.md — Pattern 4 (UsersPage server component), Pattern 5 (server actions with requireAdmin), Pitfall 1 (missing headers bypasses permission), Anti-patterns section
    - .planning/phases/02-admin-user-management/02-PATTERNS.md — actions.ts section (requireAdmin + three action implementations), actions.test.ts section (vi.mock pattern for @/lib/auth, next/headers, next/cache)
    - .planning/phases/02-admin-user-management/02-UI-SPEC.md — Component 1 (page shell), Component 2 (page header with h1 + Create user button), Component 3 (users table structure and column specs)
    - src/app/(auth)/login/login.test.tsx — vitest mock and assertion patterns to replicate
    - src/lib/role-display.ts — just created in Task 1; import displayRole in page.tsx
  </read_first>
  <behavior>
    Tests for actions.test.ts (write these first — RED phase):
    - createUserAction rejects (throws) when auth.api.getSession returns null
    - createUserAction rejects when session.user.role is "user" (non-admin)
    - removeUserAction rejects when auth.api.getSession returns null
    - setUserPasswordAction rejects when auth.api.getSession returns null
    - createUserAction calls auth.api.createUser when session has role "admin"
    - createUserAction calls revalidatePath("/admin/users") on success
  </behavior>
  <action>
    RED phase — Create src/app/(admin)/users/actions.test.ts:
    Mock three modules at the top:
      vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn(), createUser: vi.fn(), removeUser: vi.fn(), setUserPassword: vi.fn() } } }));
      vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
      vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
    Import actions using a dynamic import inside each test (or static import — either works, but dynamic avoids module init issues before the file exists).
    Write 6 tests from the behavior block. For "rejects when session is null": mock getSession to return null, call the action, expect it to throw or reject. For "rejects when role is user": mock getSession to return { user: { role: "user" } }, expect throw. For "calls createUser": mock getSession to return { user: { role: "admin" } }, mock createUser to return { user: { id: "1" } }, call createUserAction with a FormData containing username="test", password="password123", role="user", assert createUser was called and revalidatePath was called with "/admin/users".
    Run: npx vitest run "src/app/(admin)/users/actions.test.ts" — all tests must FAIL (actions.ts does not exist yet).

    GREEN phase — Create src/app/(admin)/users/actions.ts:
    First line: "use server"
    Imports: headers from "next/headers", revalidatePath from "next/cache", auth from "@/lib/auth"
    Internal requireAdmin() function (not exported):
      Calls auth.api.getSession({ headers: await headers() })
      Throws Error("Unauthorized") if session is null OR session.user.role !== "admin"
      Returns session on success
    Export createUserAction(formData: FormData):
      Calls requireAdmin()
      Extracts: username = formData.get("username") as string, password = formData.get("password") as string, role = formData.get("role") as string
      Calls auth.api.createUser({ body: { email: `${username.toLowerCase()}@buddyboard.local`, password, name: username, role, data: { username } }, headers: await headers() })
      Throws Error("Failed to create user") if result?.user is falsy
      Calls revalidatePath("/admin/users")
    Export removeUserAction(userId: string):
      Calls requireAdmin()
      Calls auth.api.removeUser({ body: { userId }, headers: await headers() })
      Calls revalidatePath("/admin/users")
    Export setUserPasswordAction(userId: string, newPassword: string):
      Calls requireAdmin()
      Calls auth.api.setUserPassword({ body: { userId, newPassword }, headers: await headers() })
      (No revalidatePath — password reset does not change the user list)
    Run: npx vitest run "src/app/(admin)/users/actions.test.ts" — all 6 tests must PASS.

    Create src/app/(admin)/users/page.tsx:
    Async server component (no "use client").
    Imports: headers from "next/headers", redirect from "next/navigation", auth from "@/lib/auth", displayRole from "@/lib/role-display".
    Session check (defense-in-depth — layout already guards, but per RESEARCH.md open question Q2, keep both):
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session || session.user.role !== "admin") redirect("/pools");
    Fetch user list:
      const result = await auth.api.listUsers({ query: { limit: 100, sortBy: "createdAt", sortDirection: "asc" }, headers: await headers() });
      const users = result?.users ?? [];
    Render per UI-SPEC Components 1-3:
      Outer wrapper: <main className="bg-white min-h-screen"><div className="max-w-4xl mx-auto p-6">
      Page header row: <div className="flex justify-between items-center">
        h1: <h1 className="text-3xl font-semibold text-slate-900">User Management</h1>
        Create button placeholder (disabled — interactive component arrives in Plan 03):
          <button disabled className="min-h-[44px] px-4 bg-blue-600 text-white text-base font-semibold rounded-md opacity-50 cursor-not-allowed">Create user</button>
      Table container: <div className="bg-white border border-slate-200 rounded-md overflow-hidden mt-8">
      Table: <table className="w-full">
        thead: <tr className="bg-slate-50"> with <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left"> for: Username, Role, Created, Actions
        tbody className="divide-y divide-slate-200"
        Each row <td className="text-base text-slate-900 px-4 py-3">:
          Username: user.username ?? user.name
          Role: displayRole(user.role)   ← import and use; never render raw "user"
          Created: new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          Actions: plain text "—" (interactive actions arrive in Plan 03)
      Empty state (when users.length === 0): <p className="text-base text-slate-500 px-4 py-8 text-center">No users yet</p>
  </action>
  <verify>
    <automated>npx vitest run "src/app/(admin)/users/actions.test.ts"</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>npm test</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run "src/app/(admin)/users/actions.test.ts"` exits 0 with all 6 tests passing
    - actions.ts first line is "use server"
    - actions.ts exports createUserAction, removeUserAction, setUserPasswordAction
    - Every auth.api.* call in actions.ts passes `headers: await headers()` (Pitfall 1 prevention)
    - createUserAction uses email `${username.toLowerCase()}@buddyboard.local` and passes `data: { username }` (A1 from RESEARCH.md Assumptions)
    - createUserAction calls revalidatePath("/admin/users") on success
    - page.tsx imports and calls displayRole — no raw "user" string rendered
    - page.tsx renders h1 with text "User Management"
    - page.tsx renders th cells with text "Username", "Role", "Created", "Actions"
    - `npx tsc --noEmit` exits 0
    - `npm test` passes (full suite including 6 new tests)
  </acceptance_criteria>
  <done>All 6 requireAdmin unit tests pass; /admin/users renders a server-side user list; role gate and server actions are in place</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → /admin/* routes | Any authenticated request reaches the layout; role check happens server-side in layout |
| Client code → Server Action | Server actions are directly callable from any client context; session must be re-validated on every invocation |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-02-03 | Elevation of Privilege | src/app/(admin)/layout.tsx | High | mitigate | Layout calls auth.api.getSession() (DB-validated, not cache) and redirects non-admin to /pools; requireAdmin() in every server action is a second layer (D-08 dual-layer approach) |
| T-02-04 | Spoofing | src/app/(admin)/users/actions.ts | High | mitigate | requireAdmin() calls auth.api.getSession({ headers: await headers() }) on every invocation — fresh DB check, not cookie-cached; forged/replayed requests get rejected |
| T-02-05 | Tampering | createUserAction — missing headers | High | mitigate | Always pass `headers: await headers()` to auth.api.createUser; without it the admin plugin's permission check is skipped (RESEARCH.md Pitfall 1); requireAdmin() provides defense-in-depth |
| T-02-SC | Tampering | npm installs | Low | accept | No new packages installed in this plan |
</threat_model>

<verification>
After both tasks complete:
- `npm test` passes with 6 new action unit tests green
- `npx tsc --noEmit` exits 0
- src/app/(admin)/layout.tsx has role check redirecting non-admin to /pools
- src/lib/role-display.ts exports displayRole
- src/app/(admin)/users/actions.ts exports createUserAction, removeUserAction, setUserPasswordAction
- src/app/(admin)/users/page.tsx renders h1 "User Management" and table with correct column headers
- displayRole() used in page.tsx — raw "user" string never rendered
</verification>

<success_criteria>
- 6 requireAdmin unit tests in actions.test.ts all pass
- /admin/users accessible only to role="admin" (layout + action guards both active)
- displayRole("user") === "Counselor" everywhere in the UI
- Server-rendered user list visible at /admin/users for a valid admin session
- TypeScript compiles without errors
- All existing tests remain passing
</success_criteria>

<output>
Create `.planning/phases/02-admin-user-management/02-02-SUMMARY.md` when done
</output>
