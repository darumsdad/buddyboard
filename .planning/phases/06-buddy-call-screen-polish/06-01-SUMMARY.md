---
phase: 06-buddy-call-screen-polish
plan: "01"
subsystem: buddy-call-screen
tags: [realtime, supabase, server-component, tdd, pairs, buddy-call]
dependency_graph:
  requires:
    - "05-real-time-live-board (LiveBoard Realtime pattern, ConnectionBanner, supabase-browser)"
    - "04-sessions-and-buddy-pairs (pair/pair_member schema, sessions)"
  provides:
    - "src/lib/pairs.ts — shared getPairsForSession helper consumed by pools page, pairs API route, and buddy-call page"
    - "src/app/(protected)/pools/[poolId]/buddy-call — new route with giant live count display"
  affects:
    - "src/app/(protected)/pools/[poolId]/page.tsx (imports from @/lib/pairs instead of local function)"
    - "src/app/api/sessions/[sessionId]/pairs/route.ts (replaces inline grouping with shared helper)"
tech_stack:
  added: []
  patterns:
    - "Shared DB query helper in src/lib/ (pairs.ts extraction pattern)"
    - "TDD RED/GREEN for client component (BuddyCallClient.test.tsx → BuddyCallClient.tsx)"
    - "Read-only SSR Server Component with poolId validation + session guard + redirect (buddy-call/page.tsx)"
    - "Standalone Realtime subscription on distinct channel (buddy-call:{sessionId}:pairs)"
key_files:
  created:
    - "src/lib/pairs.ts"
    - "src/app/(protected)/pools/[poolId]/buddy-call/page.tsx"
    - "src/app/(protected)/pools/[poolId]/buddy-call/BuddyCallClient.tsx"
    - "src/app/(protected)/pools/[poolId]/buddy-call/BuddyCallClient.test.tsx"
  modified:
    - "src/app/(protected)/pools/[poolId]/page.tsx (removed local getPairsForSession, added import)"
    - "src/app/api/sessions/[sessionId]/pairs/route.ts (replaced inline grouping with shared helper)"
decisions:
  - "TDD test assertion for empty state uses getAllByText('0') because both swimmerCount and pairCount render '0' — two separate output elements (Rule 1 inline fix during GREEN phase)"
  - "BuddyCallClient uses standalone Realtime channel buddy-call:{sessionId}:pairs distinct from LiveBoard (session:{sessionId}:pairs) per RESEARCH.md Pitfall 1"
  - "buddy-call/page.tsx redirects to /pools/{poolId} when no active session (RESEARCH.md Q3 resolution — avoids BuddyCallClient receiving empty sessionId)"
  - "Auth check omitted from buddy-call/page.tsx (A1) — middleware.ts covers all (protected) routes; page is read-only"
metrics:
  duration_minutes: 20
  completed_date: "2026-06-28"
  tasks_completed: 3
  files_changed: 6
requirements_satisfied: [BOARD-03]
---

# Phase 06 Plan 01: Buddy Call Screen — Shared Helper + Live Count Display Summary

**One-liner:** Extracted `getPairsForSession` into `src/lib/pairs.ts`, then built `buddy-call/page.tsx` (SSR, read-only) + `BuddyCallClient.tsx` (live giant count via distinct Supabase Realtime channel), all TDD-proven.

## What Was Built

### Task 1 — Extract getPairsForSession (feat commit 3fba3b0)

Moved the inline `getPairsForSession` query from `pools/[poolId]/page.tsx` into `src/lib/pairs.ts` exporting `Pair`, `PairMember` types and the async function. Updated `page.tsx` to import from the shared lib. Replaced the duplicate inline grouping logic in `src/app/api/sessions/[sessionId]/pairs/route.ts` with a single `getPairsForSession` call. The return shape is unchanged; downstream LiveBoard and BuddyCallClient are unaffected.

### Task 2 — BuddyCallClient TDD (commits e17fd9b + f3fd252)

**RED:** Wrote `BuddyCallClient.test.tsx` with 6 tests covering swimmer/pair count display, trio count, pair name format ("Ana Ruiz / Ben Cruz"), empty state (no pair list `<ul>`), and disconnected banner on `window.dispatchEvent(new Event("offline"))`. Tests failed with "Cannot resolve import" (component didn't exist yet).

**GREEN:** Created `BuddyCallClient.tsx` ("use client") with:
- Props: `{ initialPairs: Pair[], sessionId, poolId, poolName }`
- `useState<Pair[]>(initialPairs)` + `connectionStatus` state
- `refreshPairs` callback (fetch `/api/sessions/${sessionId}/pairs` → setPairs)
- 150ms debounce via `useRef` (mirrors LiveBoard)
- `window.addEventListener("offline"/"online")` disconnect detection
- Supabase channel `buddy-call:${sessionId}:pairs` (distinct from LiveBoard's `session:${sessionId}:pairs`)
- Dual-table `.on` (INSERT pair_member filtered by session_id, DELETE pair unfiltered)
- `.subscribe` status mapping (SUBSCRIBED→connected, CHANNEL_ERROR/TIMED_OUT/CLOSED→disconnected)
- Cleanup via `supabase.removeChannel(channel)` (not channel.unsubscribe — prevents TooManyChannels)
- Giant count block: `<output aria-live="polite" aria-atomic="true">` with `tabular-nums`, swimmer sublabel, pair count at `text-4xl md:text-6xl`
- Pair list `<ul aria-label="Active pairs">` rendered only when `pairs.length > 0`, members joined by " / "
- Compact sticky header with `<a href>` back link (ChevronLeft), pool name, and spacer div

All 6 tests pass after inline fix to Test 4 assertion (see Deviations).

### Task 3 — buddy-call/page.tsx (feat commit 5520b97)

Created `buddy-call/page.tsx` as async Server Component:
1. `const { poolId } = await params` (Next.js 16 Promise params)
2. Pool lookup against DB → `redirect("/pools")` if unknown (T-06-01 threat mitigate)
3. Read-only `SELECT ... WHERE poolId=X AND status='active'` → `redirect(\`/pools/${poolId}\`)` if no session (Pitfall 2 avoided — no getOrCreateActiveSession)
4. `getPairsForSession(session.id)` for SSR snapshot
5. Renders `<BuddyCallClient initialPairs={pairs} sessionId={session.id} poolId={poolId} poolName={poolRecord[0].name} />`

No auth check in page — middleware.ts covers all (protected) routes (A1 decision).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test 4 empty state assertion needed getAllByText**
- **Found during:** Task 2 GREEN phase first run
- **Issue:** `screen.getByText("0")` threw "Found multiple elements with the text: 0" because both swimmerCount and pairCount render "0" via separate `<output>` elements
- **Fix:** Changed `getByText("0")` to `getAllByText("0")` with `toHaveLength(2)` assertion
- **Files modified:** `BuddyCallClient.test.tsx`
- **Commit:** f3fd252 (included in GREEN commit)

## Known Stubs

None — all data is wired from DB (SSR) and Realtime subscription.

## Threat Flags

No new security-relevant surface introduced beyond what the plan's threat model covers.

## TDD Gate Compliance

- RED gate commit: e17fd9b (test(06-01): add failing tests...)
- GREEN gate commit: f3fd252 (feat(06-01): implement BuddyCallClient...)
- Both gates present in git log.

## Self-Check

### Files exist
- FOUND: src/lib/pairs.ts
- FOUND: src/app/(protected)/pools/[poolId]/buddy-call/page.tsx
- FOUND: src/app/(protected)/pools/[poolId]/buddy-call/BuddyCallClient.tsx
- FOUND: src/app/(protected)/pools/[poolId]/buddy-call/BuddyCallClient.test.tsx

### Commits exist
- 3fba3b0 — Task 1 (extract getPairsForSession)
- e17fd9b — Task 2 RED (failing tests)
- f3fd252 — Task 2 GREEN (BuddyCallClient implementation)
- 5520b97 — Task 3 (buddy-call/page.tsx)

### Test results
- BuddyCallClient test suite: 6/6 passed
- Full suite: 9 passed (14) vs baseline 8 passed (13) — new tests are the delta
- Pre-existing 5 failed test files unchanged (admin tests fail due to DB ECONNREFUSED, pools page test — out of scope per deviation rules)

## Self-Check: PASSED
