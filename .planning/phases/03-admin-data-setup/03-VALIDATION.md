---
phase: 3
slug: admin-data-setup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-28
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 + React Testing Library |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-xx-01 | schema | 1 | CAMP-01, POOL-01 | T-3-01 | schema mutations gated by requireAdmin | unit | `npm test -- actions.test` | ❌ W0 | ⬜ pending |
| 03-xx-02 | campers | 2 | CAMP-01 | T-3-02 | importCampersAction rejects non-admin | unit | `npm test -- actions.test` | ❌ W0 | ⬜ pending |
| 03-xx-03 | campers | 2 | CAMP-01 | T-3-02 | importCampersAction returns row-level errors | unit | `npm test -- actions.test` | ❌ W0 | ⬜ pending |
| 03-xx-04 | campers | 2 | CAMP-02 | T-3-03 | code "042" stored as string "042" | unit | `npm test -- actions.test` | ❌ W0 | ⬜ pending |
| 03-xx-05 | campers | 2 | CAMP-03 | T-3-01 | addCamperAction rejects non-admin | unit | `npm test -- actions.test` | ❌ W0 | ⬜ pending |
| 03-xx-06 | campers | 2 | CAMP-04 | T-3-01 | editCamperAction updates name/code | unit | `npm test -- actions.test` | ❌ W0 | ⬜ pending |
| 03-xx-07 | campers | 2 | CAMP-05 | T-3-01 | removeCamperAction deletes camper | unit | `npm test -- actions.test` | ❌ W0 | ⬜ pending |
| 03-xx-08 | campers | 2 | CAMP-06 | — | CampersPage renders search results from searchParams | unit | `npm test -- page.test` | ❌ W0 | ⬜ pending |
| 03-xx-09 | pools | 2 | POOL-01 | T-3-01 | pool actions reject non-admin | unit | `npm test -- pools/actions.test` | ❌ W0 | ⬜ pending |
| 03-xx-10 | pools | 2 | POOL-02 | — | seed-pools inserts 3 pools when table empty | manual | `npx tsx scripts/seed-pools.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(admin)/admin/campers/actions.test.ts` — stubs for CAMP-01 through CAMP-05 (requireAdmin, import, add, edit, delete, clearAll)
- [ ] `src/app/(admin)/admin/campers/page.test.tsx` — stubs for CAMP-06 (search renders)
- [ ] `src/app/(admin)/admin/pools/actions.test.ts` — stubs for POOL-01 (create, rename, remove)
- [ ] Mock pattern for `@/db` Drizzle instance: `vi.mock('@/db', () => ({ db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() } }))`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Default 3 pools exist on fresh install | POOL-02 | Requires running seed script against a real DB | Run `npx tsx scripts/seed-pools.ts`; verify 3 pools appear in `/admin/pools` |
| Excel file with leading-zero codes imports correctly | CAMP-02 | Requires a real .xlsx file with text-formatted cells | Upload `public/sample-roster.xlsx`; verify codes display with leading zeros |
| Search updates immediately on keystroke | CAMP-06 | Debounce timing and URL update requires browser | Type in search box; verify URL updates and results change after ~300ms |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
