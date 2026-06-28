---
phase: 4
slug: sessions-and-buddy-pairs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-28
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 + React Testing Library 16.3.2 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/app/(protected)/pools` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/(protected)/pools`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| SESS-01 | `getOrCreateActiveSession` creates a session if none exists | unit | `npx vitest run src/app/(protected)/pools/\[poolId\]/actions.test.ts` | ❌ Wave 0 | ⬜ pending |
| SESS-02 | `closeSessionAction` returns pair count so CloseSessionDialog can prompt | unit | same | ❌ Wave 0 | ⬜ pending |
| SESS-03 | `closeSessionAction` sets status='closed', does not delete pair/pairMember rows | unit | same | ❌ Wave 0 | ⬜ pending |
| SESS-04 | `/pools` page renders all pool names as navigation links (no session data displayed) | unit | `npx vitest run src/app/(protected)/pools/page.test.tsx` | ❌ Wave 0 | ⬜ pending |
| PAIR-01 | `searchCampersAction` returns exact code match first, excludes already-paired campers | unit | `npx vitest run src/app/(protected)/pools/\[poolId\]/actions.test.ts` | ❌ Wave 0 | ⬜ pending |
| PAIR-02 | `searchCampersAction` returns name fuzzy matches (ilike), excludes paired campers | unit | same | ❌ Wave 0 | ⬜ pending |
| PAIR-03 | `removePairAction` calls db.delete and revalidatePath | unit | same | ❌ Wave 0 | ⬜ pending |
| PAIR-04 | `addPairAction` returns `{ success: false, error: "PAIR-04" }` on unique constraint violation | unit | same | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(protected)/pools/[poolId]/actions.test.ts` — stubs for SESS-01, SESS-02, SESS-03, PAIR-01, PAIR-02, PAIR-03, PAIR-04
- [ ] `src/app/(protected)/pools/page.test.tsx` — stubs for SESS-04 (pool list renders, no session data)
- Mock pattern for `@/db` Drizzle instance (established in Phase 3): `vi.mock('@/db', () => ({ db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() } }))`
- Mock pattern for `@/lib/auth` (established in Phase 3): `vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn() } } }))`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Navigating to `/pools/[poolId]` auto-creates a session and shows the board | SESS-01 | Requires browser + live DB | Navigate to `/pools/[poolId]` with no active session; verify session board loads |
| Second counselor sees join prompt when session already exists | SESS-01, D-03 | Requires two browser sessions | Open same pool URL in a second tab/browser after a session exists; verify "Session in progress — join?" modal |
| Close session with active pairs shows confirmation dialog | SESS-02 | Requires browser interaction | Add a pair, click "Close session"; verify "X pairs still in the water" dialog |
| Closed session does not appear in pool selection view | SESS-04 | Requires live DB + browser | Close a session; verify pool list navigates to a fresh session (old session invisible) |
| Camper with leading-zero code resolves correctly in CamperField | PAIR-01 | Requires real camper data | Enter a code like "042"; verify camper chip appears without numeric coercion |
| PAIR-04 inline error appears on the correct CamperField | PAIR-04 | Requires browser + live DB + duplicate camper attempt | Add a pair with camper A + camper B; try to add camper A again; verify inline error on the offending field |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING file references
- [ ] No watch-mode flags in test commands
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
