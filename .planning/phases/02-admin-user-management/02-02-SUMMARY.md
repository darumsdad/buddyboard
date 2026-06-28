---
phase: "02-admin-user-management"
plan: "02"
subsystem: "admin-layout"
tags: ["server-components", "server-actions", "role-gate", "tdd", "vitest"]
dependency_graph:
  requires:
    - "02-01: admin() plugin registered, role column in schema, seed admin role='admin'"
  provides:
    - "displayRole() pure function — single source of truth for role display"
    - "AdminLayout server component — DB-validated role gate for all /admin/* routes"
    - "requireAdmin() guard in server actions — second layer of role enforcement"
    - "createUserAction, removeUserAction, setUserPasswordAction — user CRUD server actions"
    - "UsersPage server component — server-rendered user list at /admin/users"
  affects:
    - "src/lib/role-display.ts"
    - "src/app/(admin)/layout.tsx"
    - "src/app/(admin)/users/actions.ts"
    - "src/app/(admin)/users/actions.test.ts"
    - "src/app/(admin)/users/page.tsx"
tech_stack:
  added: []
  patterns:
    - "Route group (admin) with role-enforcing layout server component"
    - "requireAdmin() guard pattern in server actions (defense-in-depth)"
    - "TDD: test file written before implementation, RED confirmed before GREEN"
    - "Synthetic email @buddyboard.local for username-based auth"
    - "displayRole() imported everywhere — raw DB role string never rendered"
key_files:
  created:
    - "src/lib/role-display.ts"
    - "src/app/(admin)/layout.tsx"
    - "src/app/(admin)/users/actions.test.ts"
    - "src/app/(admin)/users/actions.ts"
    - "src/app/(admin)/users/page.tsx"
  modified: []
decisions:
  - "D-08 override confirmed: layout-level role check via (admin)/layout.tsx replaces originally specified middleware.ts extension (user-approved 2026-06-28)"
  - "defense-in-depth: page.tsx includes its own role check even though layout already gates access (RESEARCH.md Q2 resolution)"
  - "TypeScript cast for username field: Better Auth UserWithRole type omits username plugin field; cast with (user as any).username ?? user.name at render site"
  - "role typed as 'user' | 'admin' in createUserAction to satisfy Better Auth createUser overloads"
metrics:
  duration: "~3 minutes (168 seconds)"
  completed: "2026-06-28"
  tasks_completed: 2
  files_changed: 5
---

# Phase 02 Plan 02: Admin Layout Summary

**One-liner:** Admin route group with DB-validated role gate in layout, requireAdmin()-guarded server actions (TDD, 6 tests), and server-rendered user list at /admin/users using displayRole() throughout.

## What Was Built

Plan 02 established the admin route group and all server-side security layers before interactive UI is added in Plan 03.

**Task 1 — role-display utility and admin layout:**
- `src/lib/role-display.ts`: Pure `displayRole(role)` function — returns "Admin" for `"admin"`, "Counselor" for everything else (D-02 single source of truth)
- `src/app/(admin)/layout.tsx`: Async server component calling `auth.api.getSession()` — redirects unauthenticated users to `/login`, non-admin users to `/pools`. No visual chrome (D-06). Middleware unchanged (D-08 Approach B).

**Task 2 (TDD) — server actions and users page:**
- `src/app/(admin)/users/actions.test.ts` (RED): 6 unit tests for `requireAdmin()` guard — confirmed ALL fail before implementation
- `src/app/(admin)/users/actions.ts` (GREEN): `"use server"` file with internal `requireAdmin()` and three exported actions: `createUserAction`, `removeUserAction`, `setUserPasswordAction`. Every `auth.api.*` call passes `headers: await headers()` (T-02-05 mitigation). `createUserAction` uses `${username.toLowerCase()}@buddyboard.local` synthetic email and passes `data: { username }`. `revalidatePath("/admin/users")` called on create and remove.
- `src/app/(admin)/users/page.tsx`: Async server component with defense-in-depth role check, `auth.api.listUsers` call, and full table rendering per UI-SPEC Components 1-3. `displayRole()` used for every role cell — raw `"user"` string never rendered. Disabled "Create user" button placeholder (interactive components arrive in Plan 03).

## Verification Results

- `npx vitest run "src/app/(admin)/users/actions.test.ts"`: 6/6 tests pass
- `npx tsc --noEmit`: exits 0
- `npm test`: 12/12 tests pass (6 existing login + 6 new action tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type mismatch on createUser role parameter**
- **Found during:** Task 2 GREEN (TypeScript verification)
- **Issue:** Better Auth's `createUser` overloads require `role` typed as `"user" | "admin"`, not `string`. The plan described extracting `role` as `formData.get("role") as string`.
- **Fix:** Changed type assertion to `formData.get("role") as "user" | "admin"` to satisfy the overload.
- **Files modified:** `src/app/(admin)/users/actions.ts`
- **Commit:** a0208fb

**2. [Rule 1 - Bug] Better Auth UserWithRole type omits username plugin field**
- **Found during:** Task 2 GREEN (TypeScript verification)
- **Issue:** `auth.api.listUsers` returns `UserWithRole[]` which doesn't include `username` from the Better Auth username plugin. Accessing `user.username` caused TS2339.
- **Fix:** Used `(user as any).username ?? user.name` with ESLint suppression comment. The field exists at runtime (username plugin populates it); the type gap is a Better Auth limitation.
- **Files modified:** `src/app/(admin)/users/page.tsx`
- **Commit:** a0208fb

## Known Stubs

- `users/page.tsx`: "Create user" button is rendered `disabled` with `opacity-50 cursor-not-allowed` — interactive modal arrives in Plan 03.
- `users/page.tsx`: Actions column renders `"—"` — Reset password and Delete user interactive components arrive in Plan 03.

These stubs are intentional per the plan's scope: "no interactive components yet." Plan 03 will wire the interactive components.

## Threat Flags

None — no new network endpoints or trust boundaries beyond what the admin plugin already defines. Role gate (T-02-03) and requireAdmin() guard (T-02-04, T-02-05) are both implemented as specified in the threat register.

## TDD Gate Compliance

- RED gate: `src/app/(admin)/users/actions.test.ts` committed with all 6 tests failing (module not found) — commit 3336f3c
- GREEN gate: `src/app/(admin)/users/actions.ts` committed, all 6 tests passing — commit a0208fb

## Self-Check: PASSED

- [x] `src/lib/role-display.ts` exists and exports `displayRole`
- [x] `src/app/(admin)/layout.tsx` exists — async, no "use client", contains `redirect("/login")` and `session.user.role !== "admin"` check
- [x] `src/app/(admin)/users/actions.ts` exists — first line "use server", exports createUserAction, removeUserAction, setUserPasswordAction
- [x] `src/app/(admin)/users/actions.test.ts` exists — 6 tests, all pass
- [x] `src/app/(admin)/users/page.tsx` exists — imports displayRole, renders h1 "User Management", table with Username/Role/Created/Actions headers
- [x] Commit 3336f3c exists (Task 1)
- [x] Commit a0208fb exists (Task 2)
- [x] `npm test` passes (12/12)
- [x] `npx tsc --noEmit` passes
- [x] `src/middleware.ts` unchanged (D-08 Approach B confirmed)
