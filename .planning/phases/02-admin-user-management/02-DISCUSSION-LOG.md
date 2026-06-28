# Phase 2: Admin User Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 2-Admin User Management
**Areas discussed:** Role system & Better Auth admin plugin, Admin route placement & layout, Admin access control, Password reset UX

---

## Role system & Better Auth admin plugin

| Option | Description | Selected |
|--------|-------------|----------|
| Better Auth admin plugin | Add the admin plugin to auth.ts, run a migration to add role + banReason columns, use authClient.admin.* on the client. | ✓ |
| Custom role column + custom API routes | Add a role TEXT column via Drizzle migration, write /api/admin/* routes or Server Actions. | |
| You decide | Leave to planner/researcher. | |

**User's choice:** Better Auth admin plugin

---

| Option | Description | Selected |
|--------|-------------|----------|
| Map counselor → 'user' | Use Better Auth's built-in 'user' role for counselors; display 'Counselor' in UI. | ✓ |
| Configure 'counselor' as a custom role | Use Better Auth's role customization to use 'counselor' as a valid role value. | |
| You decide | Leave to planner/researcher. | |

**User's choice:** Map counselor → 'user' (store 'user' in DB, display 'Counselor' in UI)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete | Use admin.removeUser — permanent, cascades to sessions/accounts. | ✓ |
| Soft ban (deactivate) | Use admin.banUser — marks as banned, prevents login, record stays in DB. | |
| You decide | Leave to planner. | |

**User's choice:** Hard delete

---

## Admin route placement & layout

| Option | Description | Selected |
|--------|-------------|----------|
| /admin/users under (admin) route group | New route group, clean separation, extensible for Phase 3 admin screens. | ✓ |
| /pools page gets admin tab/section | Add admin section to existing pools placeholder. | |
| You decide | Leave to planner. | |

**User's choice:** /admin/users under a new (admin) route group

---

| Option | Description | Selected |
|--------|-------------|----------|
| Table with inline actions | Username \| Role \| Created \| Actions columns. Standard admin pattern. | ✓ |
| Cards/list with action buttons | Each user as a card with info + action buttons. | |
| You decide | Leave to planner. | |

**User's choice:** Table with inline actions

---

| Option | Description | Selected |
|--------|-------------|----------|
| Direct URL for now | Admin navigates to /admin/users directly; Phase 3 introduces nav. | ✓ |
| Add admin link to pools page | Small 'Admin' link on the pools placeholder. | |
| You decide | Leave to planner. | |

**User's choice:** Direct URL for now

---

## Admin access control

| Option | Description | Selected |
|--------|-------------|----------|
| Middleware role check | Extend middleware.ts to read role from session; redirect non-admins away from /admin/*. | ✓ |
| Server-side check per admin page | Each admin page checks session server-side and returns 403/redirect if not admin. | |
| You decide | Leave to planner. | |

**User's choice:** Middleware role check

---

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /pools | Send non-admins to the counselor home. | ✓ |
| Show a 403 / unauthorized page | Render explicit 'Access denied' page. | |
| Redirect to /login | Send back to login (confusing since already authenticated). | |

**User's choice:** Redirect to /pools

---

## Password reset UX

| Option | Description | Selected |
|--------|-------------|----------|
| Admin types a new password directly | Inline form or modal; admin enters new password and submits. | ✓ |
| System generates a random temporary password | Admin clicks 'Reset', sees one-time-display random password to share. | |

**User's choice:** Admin types a new password directly

---

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm delete; reset is direct | Delete shows confirmation dialog; password reset has no confirmation. | ✓ |
| Confirm both delete and reset | Both require confirmation. | |
| No confirmation for either | Actions are immediate. | |

**User's choice:** Confirm delete only; password reset is direct

---

| Option | Description | Selected |
|--------|-------------|----------|
| 8+ characters minimum | Standard minimum, enforced server-side by Better Auth. | ✓ |
| No minimum (accept anything) | Simplest implementation. | |
| You decide | Leave to planner. | |

**User's choice:** 8+ characters minimum

---

## Claude's Discretion

- Exact UI styling for table, create form, and delete confirmation dialog (follow login page Tailwind patterns)
- Whether create-user form appears inline, in a modal, or as a sub-route
- Error messaging for duplicate username or password too short

## Deferred Ideas

- Admin sidebar / navigation between admin screens — defer to Phase 3
- CI lint/type-check GitHub Actions gate — noted for Phase 2+ in Phase 1 context
- Forced password change on first login — not required for v1
