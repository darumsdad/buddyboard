---
phase: 01-foundation-auth
plan: 03
type: execute
wave: 2
depends_on:
  - 01-01-scaffold
files_modified:
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/login/login.test.tsx
  - src/app/(protected)/pools/page.tsx
  - src/app/page.tsx
  - src/middleware.ts
autonomous: true
requirements:
  - AUTH-01
  - AUTH-02
must_haves:
  truths:
    - "Login page at /login renders BuddyBoard heading, username input, password input, and Log in button"
    - "Login form calls authClient.signIn.username() and redirects to /pools on success"
    - "Login errors always show 'Invalid username or password' (never field-specific messages)"
    - "Unauthenticated requests to /pools redirect to /login"
    - "The /pools page validates session via auth.api.getSession() before rendering (DB-validated, not just cookie check)"
    - "Root path / redirects to /login"
    - "npx vitest run passes (login page render test is green)"
  artifacts:
    - path: "src/app/(auth)/login/page.tsx"
      provides: "Login form — BuddyBoard heading, username/password fields, error state, submit handler"
      contains: "authClient.signIn.username"
    - path: "src/app/(auth)/login/login.test.tsx"
      provides: "Automated render test for login form fields"
      contains: "BuddyBoard"
    - path: "src/app/(protected)/pools/page.tsx"
      provides: "Protected pool selection placeholder — server-side session validation + 3 pool buttons"
      contains: "auth.api.getSession"
    - path: "src/middleware.ts"
      provides: "Fast optimistic redirect for unauthenticated requests"
      contains: "getSessionCookie"
  key_links:
    - from: "src/app/(auth)/login/page.tsx"
      to: "/api/auth/sign-in/username"
      via: "authClient.signIn.username({ username, password })"
      pattern: "signIn\\.username"
    - from: "src/middleware.ts"
      to: "src/app/(auth)/login/page.tsx"
      via: "NextResponse.redirect to /login when no session cookie"
      pattern: "redirect.*login"
    - from: "src/app/(protected)/pools/page.tsx"
      to: "src/lib/auth.ts"
      via: "auth.api.getSession({ headers: await headers() })"
      pattern: "auth\\.api\\.getSession"
---

## Phase Goal

**As a** counselor, **I want to** navigate to the app URL and log in with my username and password, **so that** I can access the pool management screens with a session that persists across browser restarts.

<objective>
This plan builds the two user-visible screens (Login and Pool Selection) and the route protection middleware. At the end of this plan, the entire auth UI layer is complete and all four phase success criteria can be verified against a local dev server connected to the seeded Supabase database.

This plan can run in parallel with 01-PLAN-db (Wave 2) because it only writes code files — no database connection is required to build or test the UI components.

Purpose: Without the UI and middleware, there is no way for a counselor to authenticate, and no protection for the /pools route. This plan delivers both the auth user experience and the security enforcement layer.

Output: Login page per UI-SPEC (D-09, D-10, D-11), pools placeholder page with server-side session validation, middleware that redirects unauthenticated users to /login, and a passing render test for the login form.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-foundation-auth/01-CONTEXT.md
@.planning/phases/01-foundation-auth/01-RESEARCH.md
@.planning/phases/01-foundation-auth/01-UI-SPEC.md
@.planning/phases/01-foundation-auth/01-01-SUMMARY.md
</context>

<interfaces>
<!-- Key interfaces from Plan 01 that this plan consumes -->

From src/lib/auth-client.ts (created in Plan 01):
  export const authClient = createAuthClient({...})
  authClient.signIn.username({ username: string, password: string }) => Promise<{ error? }>
  Note: Returns { error: null } on success, { error: { message: string } } on failure.
  Per D-07 (always-persist), do NOT pass dontRemember: true — sessions always survive browser restarts.

From src/lib/auth.ts (created in Plan 01):
  export const auth = betterAuth({...})
  auth.api.getSession({ headers: Headers }) => Promise<Session | null>
  Returns null if no valid session exists. Used in server components for DB-validated session check.

Middleware pattern (from RESEARCH.md Pattern 4):
  import { getSessionCookie } from "better-auth/cookies"
  getSessionCookie(request) returns the session cookie value or null.
  SECURITY NOTE: This is an optimistic check — it only checks cookie existence, not DB validity.
  Per RESEARCH.md: always pair with auth.api.getSession() in server components for sensitive routes.
  Middleware matcher MUST exclude: login, api/auth, _next/static, _next/image, favicon.ico

UI-SPEC reference values (from 01-UI-SPEC.md):
  Login page layout: bg-white h-screen flex items-center justify-center
  Card: bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm
  Heading: "BuddyBoard" text-3xl font-semibold text-slate-900 text-center mb-8
  Form: flex flex-col gap-4
  Input classes: min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
  Submit button: type="submit" min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150
  Error: role="alert" text-base text-red-600 (conditionally rendered, not always in DOM)
  Pool page layout: bg-white min-h-screen flex items-center justify-center
  Pool buttons: min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Login page with failing test first</name>
  <files>src/app/(auth)/login/login.test.tsx, src/app/(auth)/login/page.tsx</files>
  <read_first>
    Read src/lib/auth-client.ts (confirm the exact export name `authClient` and method `authClient.signIn.username`). Read .planning/phases/01-foundation-auth/01-UI-SPEC.md (the Component Contract section for Screen 1 — every Tailwind class, exact copy, and interaction state is specified there). Read vitest.config.ts (confirm the test environment is jsdom and globals are true).
  </read_first>
  <behavior>
    - Test 1: Renders a heading with text "BuddyBoard"
    - Test 2: Renders an input with name="username" and type="text"
    - Test 3: Renders an input with name="password" and type="password"
    - Test 4: Renders a submit button with text "Log in"
    - Test 5: Does NOT show an error message on initial render (error paragraph is absent or hidden)
    - Test 6: Renders the error paragraph with role="alert" containing "Invalid username or password" when the component is put into error state (simulate by re-rendering with mocked error)
  </behavior>
  <action>
    RED phase — write the test first:

    Create `src/app/(auth)/login/login.test.tsx`. Add `"use client"` imports and mock `@/lib/auth-client` at the top of the test file using `vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { username: vi.fn() } } }))`. Also mock `next/navigation` router: `vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))`.

    Write tests using `@testing-library/react` `render` and queries. Import the LoginPage component (it does not exist yet — this causes the initial test run to fail as expected in TDD).

    Test 1: `render(<LoginPage />)` and `expect(screen.getByRole("heading", { name: /BuddyBoard/i })).toBeInTheDocument()`
    Test 2: `expect(screen.getByRole("textbox", { name: /username/i })).toBeInTheDocument()` — or query by `name` attribute
    Test 3: `expect(document.querySelector('input[name="password"]')).toBeTruthy()`
    Test 4: `expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()`
    Test 5: `expect(screen.queryByRole("alert")).not.toBeInTheDocument()`

    Run `npx vitest run src/app/\\(auth\\)/login` — it MUST fail (component does not exist). Confirm failure before proceeding.

    GREEN phase — implement the component:

    Create `src/app/(auth)/login/page.tsx`. Add `"use client"` as the very first line (no blank lines before it). Import `useState` from `react`. Import `authClient` from `@/lib/auth-client`. Import `useRouter` from `next/navigation`.

    Implement the default export function `LoginPage`. State: `error` (string | null, initialized to null) and `loading` (boolean, initialized to false).

    Implement `handleSubmit(e: React.FormEvent<HTMLFormElement>)`:
    - `e.preventDefault()`
    - Set `loading: true`, `error: null`
    - Call `authClient.signIn.username({ username: formData.get("username"), password: formData.get("password") })`
    - On error: set `error: "Invalid username or password"` — ALWAYS this exact string, never any dynamic message from the auth error object (per D-10)
    - On success: `router.push("/pools")`
    - In finally: set `loading: false`
    - Per D-07: do NOT pass `dontRemember: true` — sessions always persist

    Layout per UI-SPEC Component Contract for Screen 1 (exact Tailwind classes from the <interfaces> block above). Key accessibility requirements from UI-SPEC:
    - username input: `autocomplete="username"`, label with `htmlFor` matching input `id`
    - password input: `autocomplete="current-password"`, label with `htmlFor` matching input `id`
    - submit button: `disabled={loading}` with classes `disabled:opacity-50 disabled:cursor-not-allowed`
    - error paragraph: `role="alert"`, only rendered when `error` is non-null (conditional render, NOT hidden via CSS)

    Run `npx vitest run src/app/\\(auth\\)/login` — all tests MUST pass.
  </action>
  <verify>
    <automated>npx vitest run</automated>
  </verify>
  <done>
    - src/app/(auth)/login/login.test.tsx exists and contains at least 5 test cases
    - src/app/(auth)/login/page.tsx starts with `"use client"` as its first line
    - src/app/(auth)/login/page.tsx contains `authClient.signIn.username(`
    - src/app/(auth)/login/page.tsx contains `"Invalid username or password"` as a string literal (per D-10 — never dynamic)
    - src/app/(auth)/login/page.tsx contains `router.push("/pools")`
    - src/app/(auth)/login/page.tsx contains `role="alert"` on the error paragraph
    - src/app/(auth)/login/page.tsx does NOT contain `dontRemember: true` anywhere (per D-07)
    - src/app/(auth)/login/page.tsx contains `autocomplete="username"` and `autocomplete="current-password"` on the respective inputs
    - src/app/(auth)/login/page.tsx contains `text-3xl font-semibold` on the BuddyBoard heading
    - src/app/(auth)/login/page.tsx contains `bg-blue-600` on the submit button
    - `npx vitest run` exits with code 0 (all tests pass)
  </done>
</task>

<task type="auto">
  <name>Task 2: Pool selection placeholder, root redirect, and middleware</name>
  <files>src/app/(protected)/pools/page.tsx, src/app/page.tsx, src/middleware.ts</files>
  <read_first>
    Read src/lib/auth.ts (confirm the `auth` export name and the `auth.api.getSession` signature). Read .planning/phases/01-foundation-auth/01-UI-SPEC.md (Screen 2 Component Contract for exact Tailwind classes on the pool selection page). Read src/app/layout.tsx (to understand the root layout structure before modifying src/app/page.tsx).
  </read_first>
  <action>
    Create `src/app/(protected)/pools/page.tsx`. This is a SERVER component — do NOT add `"use client"`. Import `headers` from `next/headers`. Import `redirect` from `next/navigation`. Import `auth` from `@/lib/auth`.

    Implement the default export async function `PoolsPage`. Call `const session = await auth.api.getSession({ headers: await headers() })`. If session is null or falsy, call `redirect("/login")`. This server-side DB-validated check is the second layer of protection (middleware is the first, optimistic layer).

    Render the pool selection UI per UI-SPEC Screen 2: container with `bg-white min-h-screen flex items-center justify-center`, inner container with `bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm`, heading "Select a Pool" with `text-xl font-semibold text-slate-900 text-center mb-6`, pool list `flex flex-col gap-3`.

    Render three pool buttons: "Main Pool", "Lap Pool", "Kiddie Pool". Each button uses: `min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150`. These buttons do not navigate anywhere in Phase 1 — they are placeholders with no `onClick`. Phase 4 will replace this page with real session-start logic.

    Update `src/app/page.tsx`. Replace all content from the default create-next-app placeholder with a single import of `redirect` from `next/navigation` and a default export function that calls `redirect("/login")`. This ensures the root path always redirects to login. Keep it as a server component (no "use client"). The redirect target is /login because the middleware will forward to /pools if the user is already authenticated.

    Create `src/middleware.ts`. Import `NextRequest` and `NextResponse` from `next/server`. Import `getSessionCookie` from `better-auth/cookies`. Implement the exported `middleware` function: call `getSessionCookie(request)`. If the result is null or falsy, return `NextResponse.redirect(new URL("/login", request.url))`. Otherwise, return `NextResponse.next()`.

    Export the `config` object with a `matcher` pattern that excludes all routes that must remain accessible without authentication:
    `"/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"` — this exact pattern prevents the middleware from blocking auth API routes, which would cause an infinite redirect loop (per RESEARCH.md Pitfall 6).

    SECURITY NOTE: The middleware `getSessionCookie()` check is optimistic — it only checks for cookie presence, not DB validity. The `auth.api.getSession()` call in `src/app/(protected)/pools/page.tsx` is the authoritative DB-validated check. Both layers are required (per RESEARCH.md Security Domain and Pattern 4 note).
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
    - src/app/(protected)/pools/page.tsx does NOT contain `"use client"` (server component)
    - src/app/(protected)/pools/page.tsx contains `auth.api.getSession({ headers: await headers() })`
    - src/app/(protected)/pools/page.tsx contains `redirect("/login")`
    - src/app/(protected)/pools/page.tsx renders buttons with text "Main Pool", "Lap Pool", and "Kiddie Pool"
    - src/app/(protected)/pools/page.tsx contains `bg-blue-600` on the pool buttons
    - src/app/page.tsx contains `redirect("/login")`
    - src/middleware.ts exports `function middleware`
    - src/middleware.ts imports `getSessionCookie` from `better-auth/cookies`
    - src/middleware.ts contains `redirect` to `/login` when no session cookie
    - src/middleware.ts config matcher contains `api/auth` in the exclusion pattern
    - src/middleware.ts config matcher contains `login` in the exclusion pattern
    - `npx tsc --noEmit` exits with code 0
    - `npx vitest run` exits with code 0 (existing tests still pass)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → POST /api/auth/sign-in/username | Untrusted username + password from login form enters Better Auth |
| Middleware → /pools | Cookie from browser cookie jar used for fast redirect decision |
| /pools server component → Supabase | DB-validated session lookup on every /pools page render |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Spoofing | Session token storage | mitigate | Better Auth sets HTTP-only cookie by default (D-06). Login page uses `authClient.signIn.username()` — the cookie is set by the server response header, never handled in JavaScript. No `document.cookie` or localStorage access for tokens. |
| T-03-02 | Information Disclosure | Login error messages | mitigate | Error message is hardcoded as `"Invalid username or password"` string literal in page.tsx (D-10). The `error` object from `authClient.signIn.username()` is never displayed to the user — only the hardcoded generic message. This prevents username enumeration. |
| T-03-03 | Spoofing | Middleware cookie check only | mitigate | Dual-layer defense: middleware uses `getSessionCookie()` (fast, cookie existence only) for redirect performance. Protected server components use `auth.api.getSession()` (DB-validated). Neither layer alone is sufficient — both are required. |
| T-03-04 | Tampering | CSRF on /api/auth/* POST routes | accept | Better Auth has built-in CSRF protection via SameSite cookie attribute and signed tokens. The login form sends credentials to Better Auth's own route handler — no custom CSRF token needed. |
| T-03-05 | Denial of Service | Infinite redirect loop (middleware catches auth routes) | mitigate | Middleware matcher explicitly excludes `api/auth` and `login`. Pattern tested: `/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)`. Acceptance criterion verifies both exclusions are present in the pattern. |
| T-03-06 | Spoofing | dontRemember: true in signIn call | mitigate | Per D-07, sessions always persist. Acceptance criterion explicitly verifies `dontRemember: true` does NOT appear in login page code. Sessions use persistent cookies (maxAge from expiresIn), not session-only cookies. |
| T-03-SC | Tampering | npm install supply chain | mitigate | No new npm packages installed in this plan. Only Next.js, Better Auth, and Drizzle packages already installed in Plan 01 are used here. |
</threat_model>

<verification>
After both tasks complete, verify with a live dev server (requires .env.local from Plan 02):

1. `npx vitest run` — must exit 0 (all tests pass)
2. `npx tsc --noEmit` — must exit 0 (no TypeScript errors)
3. Start dev server: `npm run dev`
4. Navigate to http://localhost:3000 — must redirect to http://localhost:3000/login
5. Navigate to http://localhost:3000/pools — must redirect to http://localhost:3000/login
6. Submit login form with username "admin" and password "BuddyBoard2024!" — must redirect to /pools and show pool selection screen
7. Navigate to http://localhost:3000/pools after login — must show "Select a Pool" with three pool buttons
8. Open DevTools → Application → Cookies — must show a cookie from Better Auth that is HttpOnly (lock icon in DevTools)
9. Close all browser tabs, reopen, navigate to http://localhost:3000/pools — must show pool selection screen WITHOUT requiring re-login (per AUTH-02 + D-07)
</verification>

<success_criteria>
All four phase success criteria from ROADMAP.md are verified locally:
1. Navigating to the app URL shows a login page — not a 404 or error
2. Counselor can enter username and password and reach /pools
3. Closing browser and reopening restores the authenticated session without re-login
4. Navigating to /pools while unauthenticated redirects to /login
</success_criteria>

<output>
Create `.planning/phases/01-foundation-auth/01-03-SUMMARY.md` when done.
</output>
