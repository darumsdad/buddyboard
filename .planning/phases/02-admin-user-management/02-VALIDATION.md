---
phase: 2
slug: admin-user-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-28
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x (installed in Phase 1) |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5–10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green + manual walkthrough of 3 success criteria
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| schema-migration | — | 1 | AUTH-03/04/05 | — | role/banned columns exist in DB | manual | `psql -c "\d user"` | — | ⬜ pending |
| admin-plugin-wire | — | 1 | AUTH-03 | T-elevation | admin ops require `role='admin'` session | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ W0 | ⬜ pending |
| create-user-action | — | 2 | AUTH-03 | T-password-weak | rejects password < 8 chars + no-session | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ W0 | ⬜ pending |
| remove-user-action | — | 2 | AUTH-04 | T-elevation | rejects call without admin session | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ W0 | ⬜ pending |
| set-password-action | — | 2 | AUTH-05 | T-password-weak | rejects password < 8 chars + no-session | unit | `npm test src/app/(admin)/users/actions.test.ts` | ❌ W0 | ⬜ pending |
| admin-layout-gate | — | 2 | AUTH-03/04/05 | T-elevation | non-admin redirects to /pools | unit | `npm test src/app/(admin)/users/page.test.tsx` | ❌ W0 | ⬜ pending |
| users-table-ui | — | 2 | AUTH-03 | — | renders Username/Role/Created/Actions columns | unit (component) | `npm test src/app/(admin)/users/page.test.tsx` | ❌ W0 | ⬜ pending |
| delete-confirm-dialog | — | 2 | AUTH-04 | — | confirmation dialog fires before action | unit (component) | `npm test` | ❌ W0 | ⬜ pending |
| middleware-admin-route | — | 1 | AUTH-03/04/05 | T-elevation | unauthenticated /admin/* → /login | manual | load /admin/users without cookie | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(admin)/users/actions.test.ts` — unit tests for Server Actions: createUser rejects no-session, rejects password < 8; removeUser rejects no-session; setUserPassword rejects no-session, rejects password < 8
- [ ] `src/app/(admin)/users/page.test.tsx` — component test: users table renders Username/Role/Created/Actions columns; delete button shows confirmation dialog

*Existing vitest infrastructure from Phase 1 covers the framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Navigate to `/admin/users` as counselor → redirect to `/pools` | AUTH-03/04/05 | Requires real session with role | Log in as counselor, navigate directly to /admin/users |
| Navigate to `/admin/users` unauthenticated → redirect to `/login` | AUTH-03/04/05 | Requires browser state | Clear cookies, navigate to /admin/users |
| Create a user → user appears in table + can log in | AUTH-03 | End-to-end flow requires live DB | Fill create form, verify row appears, log in as new user |
| Delete a user → login attempt with their credentials fails | AUTH-04 | Session invalidation requires live auth | Delete user from table, attempt login with old credentials |
| Reset a user's password → old password rejected, new password accepted | AUTH-05 | Real auth flow | Reset password via form, verify old password fails, new password succeeds |
| Admin deletes self → operation rejected | AUTH-04 (edge) | Plugin error path | Attempt to delete the currently logged-in admin account |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
