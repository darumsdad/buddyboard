---
phase: "02-admin-user-management"
plan: "03"
type: execute
wave: 3
depends_on:
  - "02-02"
files_modified:
  - src/app/(admin)/users/components/UserTable.tsx
  - src/app/(admin)/users/components/CreateUserModal.tsx
  - src/app/(admin)/users/components/DeleteConfirmDialog.tsx
  - src/app/(admin)/users/components/ResetPasswordForm.tsx
  - src/app/(admin)/users/page.tsx
  - src/app/(admin)/users/page.test.tsx
autonomous: false
requirements:
  - AUTH-03
  - AUTH-04
  - AUTH-05

must_haves:
  truths:
    - "Admin can create a new user by opening the Create user modal and submitting the form"
    - "Admin can delete a user by clicking Delete user and confirming the dialog"
    - "Admin can reset a user's password via the inline form that appears below each row"
    - "Role column always displays 'Counselor' or 'Admin' — never raw DB values 'user' or 'admin'"
    - "All interactive elements have min-h-[44px] touch targets"
    - "Error messages appear inline below fields with role='alert'"
    - "Create modal closes on success; deleted row disappears; reset form collapses on success"
  artifacts:
    - path: "src/app/(admin)/users/components/UserTable.tsx"
      provides: "Client component rendering user rows with per-row action buttons"
    - path: "src/app/(admin)/users/components/CreateUserModal.tsx"
      provides: "Client component: Create user trigger button + modal overlay with form"
    - path: "src/app/(admin)/users/components/DeleteConfirmDialog.tsx"
      provides: "Client component: Delete user trigger button + confirmation overlay"
    - path: "src/app/(admin)/users/components/ResetPasswordForm.tsx"
      provides: "Client component: Reset password trigger button + inline form below row"
    - path: "src/app/(admin)/users/page.tsx"
      provides: "Updated server component wiring all client components"
    - path: "src/app/(admin)/users/page.test.tsx"
      provides: "Component tests for the users page and interactive components"
  key_links:
    - from: "src/app/(admin)/users/components/CreateUserModal.tsx"
      to: "src/app/(admin)/users/actions.ts"
      via: "import createUserAction; call on form submit"
      pattern: "createUserAction"
    - from: "src/app/(admin)/users/components/DeleteConfirmDialog.tsx"
      to: "src/app/(admin)/users/actions.ts"
      via: "import removeUserAction; call on confirm click"
      pattern: "removeUserAction"
    - from: "src/app/(admin)/users/components/ResetPasswordForm.tsx"
      to: "src/app/(admin)/users/actions.ts"
      via: "import setUserPasswordAction; call on form submit"
      pattern: "setUserPasswordAction"
    - from: "src/app/(admin)/users/page.tsx"
      to: "src/app/(admin)/users/components/UserTable.tsx"
      via: "import UserTable; pass users prop"
      pattern: "UserTable"
    - from: "src/app/(admin)/users/page.tsx"
      to: "src/app/(admin)/users/components/CreateUserModal.tsx"
      via: "import CreateUserModal; render in header row"
      pattern: "CreateUserModal"
---

<objective>
Build the four interactive client components (UserTable, CreateUserModal, DeleteConfirmDialog, ResetPasswordForm), write component tests, and wire everything into the users page — replacing the static placeholder from Plan 02 with the complete interactive admin UI.

Purpose: This plan delivers all three ROADMAP success criteria for Phase 2 end-to-end: admin can create, remove, and reset passwords for user accounts.
Output: Four client components + page.test.tsx + updated page.tsx that uses the components.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/02-admin-user-management/02-CONTEXT.md
@.planning/phases/02-admin-user-management/02-UI-SPEC.md
@.planning/phases/02-admin-user-management/02-PATTERNS.md

<interfaces>
<!-- Key contracts the executor needs. All from Plan 02 artifacts. -->

From src/app/(admin)/users/actions.ts:
  export async function createUserAction(formData: FormData): Promise<void>
    // formData fields: username (text), password (text), role ("admin" | "user")
  export async function removeUserAction(userId: string): Promise<void>
  export async function setUserPasswordAction(userId: string, newPassword: string): Promise<void>

From src/lib/role-display.ts:
  export function displayRole(role: string | null | undefined): string
  // "admin" → "Admin", everything else → "Counselor"

User shape returned by auth.api.listUsers (Better Auth admin plugin):
  { id: string; username: string | null; name: string; role: string | null; createdAt: Date; email: string }

From src/app/(auth)/login/page.tsx — Tailwind classes to replicate exactly:
  Input:  "min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
  Primary button: "min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
  Error: {error && <p role="alert" className="text-base text-red-600">{error}</p>}
  Form shell: const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
    async function handleSubmit(e) { e.preventDefault(); setLoading(true); setError(null); try { ... } finally { setLoading(false); } }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: UserTable, DeleteConfirmDialog, and ResetPasswordForm client components</name>
  <files>
    src/app/(admin)/users/components/UserTable.tsx,
    src/app/(admin)/users/components/DeleteConfirmDialog.tsx,
    src/app/(admin)/users/components/ResetPasswordForm.tsx
  </files>
  <read_first>
    - .planning/phases/02-admin-user-management/02-UI-SPEC.md — Component 3 (table structure and cell classes), Component 4 (row action button styles and copy), Component 5 (inline password reset form layout and classes), Component 7 (delete confirmation dialog overlay, card, button classes), Copywriting Contract (exact button/error text), Interaction States
    - .planning/phases/02-admin-user-management/02-PATTERNS.md — UserTable.tsx section (props type, table shape, displayRole usage), DeleteConfirmDialog.tsx section (boolean state, overlay, button patterns), ResetPasswordForm.tsx section (password input autoComplete, minLength)
    - src/app/(auth)/login/page.tsx — primary source for input class, button class, error display, form submit shell patterns; replicate exactly
    - src/app/(admin)/users/actions.ts — import removeUserAction and setUserPasswordAction from this file (path: "../actions" relative to components/)
    - src/lib/role-display.ts — import displayRole (path: "@/lib/role-display")
  </read_first>
  <action>
    Create src/app/(admin)/users/components/UserTable.tsx:
    "use client" directive at top.
    Props type: { users: Array<{ id: string; username: string | null; name: string; role: string | null; createdAt: Date }> }
    Import: displayRole from "@/lib/role-display", DeleteConfirmDialog and ResetPasswordForm from sibling files.
    Table container (UI-SPEC Component 3): <div className="bg-white border border-slate-200 rounded-md overflow-hidden mt-8">
    <table className="w-full">
    thead <tr className="bg-slate-50"> with four <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">: "Username", "Role", "Created", "Actions"
    tbody className="divide-y divide-slate-200"
    Each data row: map over users, key={user.id}
      <td className="text-base text-slate-900 px-4 py-3">:
        Username cell: user.username ?? user.name
        Role cell: {displayRole(user.role)} — never render raw "user" string directly (D-02)
        Created cell: {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        Actions cell: <div className="flex items-center gap-2"><ResetPasswordForm userId={user.id} /> <DeleteConfirmDialog userId={user.id} username={user.username ?? user.name} /></div>
    Empty state (users.length === 0): <p className="text-base text-slate-500 px-4 py-8 text-center">No users yet. Create the first account to allow staff to log in.</p> (UI-SPEC copywriting)

    Create src/app/(admin)/users/components/DeleteConfirmDialog.tsx:
    "use client" directive at top.
    Props: { userId: string; username: string }
    State: open (boolean), loading (boolean), error (string | null)
    Trigger button (UI-SPEC Component 4 — destructive secondary action):
      <button onClick={() => setOpen(true)} className="min-h-[44px] text-base text-red-600 underline-offset-2 hover:underline">Delete user</button>
    When open — overlay: <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"> (UI-SPEC Component 7)
    Modal card: <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm">
    Title: <h2 className="text-xl font-semibold text-slate-900">Remove {username}?</h2>
    Body: <p className="text-base text-slate-700 mt-2">They will lose access immediately. This cannot be undone.</p>
    Error: {error && <p role="alert" className="text-base text-red-600 mt-2">{error}</p>}
    Button row: <div className="flex gap-3 mt-6">
      Cancel "Keep user": <button onClick={() => { setOpen(false); setError(null); }} className="min-h-[44px] flex-1 border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50">Keep user</button>
      Confirm "Remove user": <button onClick={handleDelete} disabled={loading} className="min-h-[44px] flex-1 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50">Remove user</button>
    handleDelete: setLoading(true); try { await removeUserAction(userId); setOpen(false); } catch { setError("Could not remove user. Please try again."); } finally { setLoading(false); }
    (UI-SPEC copywriting for all button text and error messages — match exactly)

    Create src/app/(admin)/users/components/ResetPasswordForm.tsx:
    "use client" directive at top.
    Props: { userId: string }
    State: open (boolean), loading (boolean), error (string | null)
    Trigger button (UI-SPEC Component 4 — secondary text action):
      <button onClick={() => setOpen(!open)} className="min-h-[44px] text-base text-slate-600 underline-offset-2 hover:underline">Reset password</button>
    When open — inline form below the row (UI-SPEC Component 5):
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
      Password input: same class as login page input + type="password" + id/name="newPassword" + placeholder="New password (min. 8 characters)" + minLength={8} + autoComplete="new-password"
      {error && <p role="alert" className="text-base text-red-600 mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        "Discard": <button type="button" onClick={() => { setOpen(false); setError(null); }} className="min-h-[44px] px-4 text-base text-slate-600 hover:text-slate-900">Discard</button>
        "Save password": <button type="submit" disabled={loading} className="min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">Save password</button>
    handleSubmit: extract newPassword from form; if newPassword.length < 8 setError("Password must be at least 8 characters.") and return; setLoading(true); try { await setUserPasswordAction(userId, newPassword); setOpen(false); setError(null); } catch { setError("Could not reset password. Please try again."); } finally { setLoading(false); }
    (Match all UI-SPEC copywriting exactly — see Copywriting Contract)
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>npm test</automated>
  </verify>
  <acceptance_criteria>
    - UserTable.tsx, DeleteConfirmDialog.tsx, ResetPasswordForm.tsx all have "use client" at top
    - UserTable renders th elements with text "Username", "Role", "Created", "Actions"
    - UserTable calls displayRole(user.role) for the Role cell — no raw "user" string rendered
    - UserTable renders DeleteConfirmDialog and ResetPasswordForm per row
    - DeleteConfirmDialog trigger button text is "Delete user"
    - DeleteConfirmDialog overlay title is "Remove {username}?" pattern
    - DeleteConfirmDialog confirm button text is "Remove user" (UI-SPEC)
    - DeleteConfirmDialog cancel button text is "Keep user" (UI-SPEC)
    - ResetPasswordForm trigger button text is "Reset password"
    - ResetPasswordForm submit button text is "Save password"
    - ResetPasswordForm password input has minLength={8} and autoComplete="new-password"
    - All error paragraphs have role="alert"
    - All interactive elements (buttons, inputs) have min-h-[44px] in their className
    - `npx tsc --noEmit` exits 0
    - `npm test` passes (existing tests unaffected)
  </acceptance_criteria>
  <done>Three interactive client components exist with correct Tailwind tokens from UI-SPEC; role values never rendered raw; all touch targets meet 44px minimum</done>
</task>

<task type="auto">
  <name>Task 2: CreateUserModal, component tests, and wire page.tsx</name>
  <files>
    src/app/(admin)/users/components/CreateUserModal.tsx,
    src/app/(admin)/users/page.test.tsx,
    src/app/(admin)/users/page.tsx
  </files>
  <read_first>
    - .planning/phases/02-admin-user-management/02-UI-SPEC.md — Component 2 (page header specs with Create user button position), Component 6 (create user modal card, fields, select options, submit button, dismiss link), Copywriting Contract (all modal text), Interaction States (modal close on success, error display)
    - .planning/phases/02-admin-user-management/02-PATTERNS.md — CreateUserModal.tsx section (analog to login form, state pattern, authClient.admin.createUser vs server action), page.tsx section (how to wire components)
    - src/app/(auth)/login/page.tsx — replicate the form field pattern (label + input + error), submit button, and form submit shell exactly; this is the source of truth for Tailwind classes
    - src/app/(auth)/login/login.test.tsx — replicate the vi.mock and assertion pattern for page.test.tsx
    - src/app/(admin)/users/page.tsx — current state (basic placeholder from Plan 02); read before updating
    - src/app/(admin)/users/components/UserTable.tsx — just created; import in page.tsx update
  </read_first>
  <action>
    Create src/app/(admin)/users/components/CreateUserModal.tsx:
    "use client" directive at top.
    State: open (boolean), loading (boolean), error (string | null).
    The component renders its own trigger button AND the modal overlay — it is self-contained.
    Trigger button (UI-SPEC Component 2 — primary CTA in page header):
      <button onClick={() => setOpen(true)} className="min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150">Create user</button>
    When open — overlay: <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"> (UI-SPEC Component 6)
    Modal card: <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm"> (matches login card exactly)
    Title: <h2 className="text-3xl font-semibold text-slate-900 text-center mb-8">Create user</h2>
    Form with onSubmit={handleSubmit} className="flex flex-col gap-4":
      Field 1 — Username:
        <label htmlFor="username" className="text-base font-semibold text-slate-900">Username</label>
        <input id="username" name="username" type="text" required placeholder="Enter a username" className={...same as login input...} />
      Field 2 — Password:
        <label htmlFor="password" className="text-base font-semibold text-slate-900">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Enter a password (min. 8 characters)" className={...same as login input...} />
      Field 3 — Role (UI-SPEC Component 6, D-02: option value is DB value, display label is friendly name):
        <label htmlFor="role" className="text-base font-semibold text-slate-900">Role</label>
        <select id="role" name="role" defaultValue="user" className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white">
          <option value="user">Counselor</option>
          <option value="admin">Admin</option>
        </select>
      Error: {error && <p role="alert" className="text-base text-red-600">{error}</p>}
      Submit: <button type="submit" disabled={loading} className={...same as login primary button, but not full-width: add w-full...}>Create user</button>
      Dismiss: <button type="button" onClick={() => { setOpen(false); setError(null); }} className="text-base text-slate-600 hover:text-slate-900 text-center mt-2 block mx-auto">Close</button>
    handleSubmit: e.preventDefault(); setLoading(true); setError(null);
      try {
        await createUserAction(new FormData(e.currentTarget));
        setOpen(false);
        (e.currentTarget as HTMLFormElement).reset();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("already")) setError("That username is already taken. Choose a different one.");
        else if (msg.includes("password") || msg.includes("8")) setError("Password must be at least 8 characters.");
        else setError("Could not create user. Please try again.");
      } finally { setLoading(false); }
    (All error and button copy must match UI-SPEC Copywriting Contract exactly)

    Create src/app/(admin)/users/page.test.tsx:
    Import render, screen, fireEvent from "@testing-library/react"; describe, it, vi, beforeEach, expect from "vitest".
    Mock CreateUserModal: vi.mock("./components/CreateUserModal", () => ({ CreateUserModal: () => <button>Create user</button> }))
    Mock UserTable to render a basic table structure:
      vi.mock("./components/UserTable", () => ({ UserTable: ({ users }: { users: unknown[] }) => (
        <table><thead><tr><th>Username</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>{users.length === 0 && <tr><td>No users yet</td></tr>}</tbody></table>
      )}))
    Mock next/headers, next/navigation, @/lib/auth:
      vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))
      vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
      vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn().mockResolvedValue({ user: { role: "admin" } }), listUsers: vi.fn().mockResolvedValue({ users: [] }) } } }))
    Tests (render the async UsersPage via await and wrap in act, or use the component render with mocked deps):
      - renders h1 with text "User Management"
      - renders a button with text "Create user"
      - renders th "Username"
      - renders th "Role"
      - renders th "Created"
      - renders th "Actions"
      - renders empty state text when users list is empty

    Note: UsersPage is an async server component. To test it in jsdom/vitest, call the component function directly and await the result: `const jsx = await UsersPage(); render(jsx);`. This is the pragmatic approach for async server component testing without experimental React APIs.

    Update src/app/(admin)/users/page.tsx:
    Read the current file first. Remove the inline HTML table and the disabled placeholder Create button. Import CreateUserModal from "./components/CreateUserModal" and UserTable from "./components/UserTable". Update the render output:
      Page header row: <div className="flex justify-between items-center"><h1 className="text-3xl font-semibold text-slate-900">User Management</h1><CreateUserModal /></div>
      Below header: <UserTable users={users} />
    All other logic (session check, auth.api.listUsers call, outer wrapper classes) stays exactly as in Plan 02 — only the rendered JSX for the header button and table changes.
  </action>
  <verify>
    <automated>npm test</automated>
    <automated>npx tsc --noEmit</automated>
    <human-check>
      Log in as the seed admin account, navigate to /admin/users, and perform these steps:
      1. Confirm "User Management" h1 and blue "Create user" button are the dominant visual elements on page load.
      2. Click "Create user" — modal appears with Username, Password, Role fields and a "Create user" submit button and "Close" dismiss link.
      3. Create account: username=testcounselor, password=password123, role=Counselor (default). Modal closes; new row appears in table with Role column showing "Counselor" (not "user").
      4. Click "Reset password" on testcounselor row — inline form appears below the row with password input and "Save password" / "Discard" buttons.
      5. Enter "newpass456" and click "Save password" — form collapses; no error shown.
      6. Click "Delete user" on testcounselor row — overlay dialog appears titled "Remove testcounselor?" with body text "They will lose access immediately. This cannot be undone." and buttons "Keep user" / "Remove user".
      7. Click "Remove user" — row disappears from table.
      8. Attempt login as testcounselor with any password — "Invalid username or password" error confirms account is deleted.
      9. Log out. Log in as a counselor account. Navigate to /admin/users — confirm redirect to /pools.
    </human-check>
  </verify>
  <acceptance_criteria>
    - `npm test` passes — all 13 automated tests green (6 action tests + 7 page tests)
    - `npx tsc --noEmit` exits 0
    - CreateUserModal.tsx "use client"; trigger button labeled "Create user"; renders modal overlay when open
    - Role select in modal has option value="user" with display text "Counselor" and option value="admin" with display text "Admin" (D-02)
    - page.tsx imports CreateUserModal and UserTable (inline HTML table removed)
    - page.tsx renders h1 "User Management" + CreateUserModal in a flex justify-between header row
    - All error messages have role="alert"
    - Human walkthrough steps 1-9 all pass
  </acceptance_criteria>
  <done>AUTH-03 (create), AUTH-04 (delete), AUTH-05 (reset password) all met end-to-end; human walkthrough verified; 13 automated tests passing</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser form → createUserAction | Role value submitted from client select; admin plugin validates server-side |
| Browser → removeUserAction | userId from client; requireAdmin() revalidates on every call |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-06 | Tampering | CreateUserModal role select → createUserAction | mitigate | UI dropdown limits role to "user" / "admin"; admin plugin validates role against its allowed-roles list on every createUser call server-side |
| T-02-07 | Denial of Service | DeleteConfirmDialog → removeUserAction (self-delete) | accept | Better Auth admin plugin returns YOU_CANNOT_REMOVE_YOURSELF error; UI catch block shows "Could not remove user. Please try again." — no self-deletion possible, no crash |
| T-02-08 | Tampering | Confirmation dialog bypass (direct server action call) | accept | requireAdmin() in removeUserAction is the authoritative security check; client-side confirmation dialog is UX only; server rejects unauthorized calls regardless of dialog state |
| T-02-SC | Tampering | npm installs | accept | No new packages installed in this plan |
</threat_model>

<verification>
After both tasks complete:
- `npm test` passes — 6 action tests + 7 page tests + existing login tests all green
- `npx tsc --noEmit` exits 0
- /admin/users renders UserTable with CreateUserModal trigger button in the header
- Create user: modal → form submit → createUserAction → table refresh via revalidatePath
- Delete user: confirm dialog → removeUserAction → row disappears
- Reset password: inline form → setUserPasswordAction → form collapses
- Human walkthrough (9 steps) completed successfully
</verification>

<success_criteria>
- AUTH-03: Admin creates new user with username, password, role — confirmed by walkthrough step 3
- AUTH-04: Admin removes user; removed user cannot log in — confirmed by walkthrough steps 6-8
- AUTH-05: Admin resets any user's password — confirmed by walkthrough step 4-5
- 13 automated tests pass (6 action + 7 page)
- TypeScript compiles without errors
- Role column shows "Counselor" and "Admin" — raw strings "user" and "admin" never rendered in UI
</success_criteria>

<output>
Create `.planning/phases/02-admin-user-management/02-03-SUMMARY.md` when done
</output>
