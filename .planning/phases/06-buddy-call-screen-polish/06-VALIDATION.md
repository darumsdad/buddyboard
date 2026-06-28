---
phase: 6
slug: buddy-call-screen-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-28
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run "src/app/\(protected\)/pools/\[poolId\]/buddy-call/"` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run "src/app/(protected)/pools/[poolId]/buddy-call/"`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| extract-pairs-helper | 01 | 1 | BOARD-03 | — | N/A — no auth logic | unit | `npx vitest run` | ✅ existing | ⬜ pending |
| buddy-call-server | 01 | 1 | BOARD-03 | T-06-01 | poolId validated against DB; redirect if not found | manual | Check redirect behavior in browser | ❌ W0 | ⬜ pending |
| buddy-call-client | 01 | 2 | BOARD-03 | T-06-02 | ConnectionBanner shown on disconnect | unit | `npx vitest run "src/app/(protected)/pools/[poolId]/buddy-call/BuddyCallClient.test.tsx"` | ❌ W0 | ⬜ pending |
| session-header-responsive | 02 | 1 | UX-01, UX-02 | — | N/A — CSS layout | manual | DevTools: 375px / 768px / 1024px viewport resize | ❌ manual-only | ⬜ pending |
| add-pair-form-responsive | 02 | 1 | UX-01, UX-02 | — | N/A — CSS layout | manual | DevTools: submit button full-width at 375px | ❌ manual-only | ⬜ pending |
| view-all-pairs-link | 02 | 1 | BOARD-03 | — | N/A | unit | `npx vitest run` (snapshot or render test) | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(protected)/pools/[poolId]/buddy-call/BuddyCallClient.test.tsx` — stubs for BOARD-03:
  - count display (swimmerCount, pairCount prominently rendered)
  - pair names formatted as "First Last / First Last"
  - ConnectionBanner shown when status is "disconnected"
  - empty state: 0 swimmers / 0 pairs with empty initialPairs

*Existing vitest.config.ts covers all test files under `src/` — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `SessionHeader` count stacks below pool name on narrow viewport (< 768px) | UX-01, UX-02 | jsdom does not implement CSS media queries; `window.matchMedia` unavailable without polyfill | Open DevTools, set viewport to 375px (iPhone), verify count appears on its own row below pool name |
| `SessionHeader` single-row layout preserved on md+ (≥ 768px) | UX-01 | jsdom does not implement CSS media queries | Set viewport to 768px+, verify pool name + count + controls are all on one row |
| No horizontal scroll on `/pools/[poolId]` on iPhone viewport | UX-02 | Cannot detect scroll overflow programmatically in jsdom | Set viewport to 375px, pan horizontally — page must not scroll |
| AddPairForm submit button spans full width on mobile | UX-02 | jsdom does not implement CSS media queries | Set viewport to 375px, verify submit button spans full width |
| Buddy call screen count readable at arm's length | BOARD-03 | Cannot test font size perception automatically | Navigate to `/pools/[poolId]/buddy-call`, verify text-8xl count is dominant and readable |
| ConnectionBanner visible on buddy call screen when disconnected | BOARD-03 (live safety) | Requires real WebSocket disconnect | Open DevTools Network, go offline, verify amber/red banner appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
