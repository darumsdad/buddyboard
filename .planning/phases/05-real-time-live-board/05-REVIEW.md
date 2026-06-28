---
phase: 05-real-time-live-board
reviewed: 2026-06-28T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/app/(protected)/pools/[poolId]/actions.test.ts
  - src/app/(protected)/pools/[poolId]/actions.ts
  - src/app/(protected)/pools/[poolId]/components/AddPairForm.test.tsx
  - src/app/(protected)/pools/[poolId]/components/AddPairForm.tsx
  - src/app/(protected)/pools/[poolId]/components/ConnectionBanner.test.tsx
  - src/app/(protected)/pools/[poolId]/components/ConnectionBanner.tsx
  - src/app/(protected)/pools/[poolId]/components/LiveBoard.test.tsx
  - src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx
  - src/app/(protected)/pools/[poolId]/components/PairList.tsx
  - src/app/(protected)/pools/[poolId]/components/PairRow.test.tsx
  - src/app/(protected)/pools/[poolId]/components/PairRow.tsx
  - src/app/(protected)/pools/[poolId]/components/PairSkeleton.tsx
  - src/app/(protected)/pools/[poolId]/components/SessionBoard.tsx
  - src/app/(protected)/pools/[poolId]/page.tsx
  - src/app/api/sessions/[sessionId]/pairs/route.test.ts
  - src/app/api/sessions/[sessionId]/pairs/route.ts
  - src/lib/supabase-browser.ts
  - src/test/mocks/supabase.ts
findings:
  critical: 4
  warning: 5
  info: 3
  total: 12
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-06-28
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This phase introduces real-time live board functionality: a Supabase Realtime channel subscription, a debounced refresh callback, a connection banner, and the full pair-management server-action layer. The SSR-then-Realtime architecture is sound. However four issues must be fixed before this code ships:

1. The Supabase internal-API hack (`stateChangeCallbacks`) crashes in the existing test suite because the mock does not provide `supabase.realtime`, and the same code path will crash in any environment where the Supabase client has not fully initialised its WebSocket.
2. The race-condition recovery path in `page.tsx` can produce an `undefined` session object, crashing the page with a TypeError.
3. All server actions and the GET route handler enforce authentication but not resource-level authorization. Any logged-in user can delete, add to, or close any pair or session by supplying its ID.
4. The live-board test mock is inconsistent with the actual `LiveBoard` code, meaning the test exercises a code path that differs from what runs in production.

---

## Critical Issues

### CR-01: Supabase internal `stateChangeCallbacks` hack crashes in tests and risks production crash

**File:** `src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx:72-83`

**Issue:** The disconnect-detection `useEffect` directly mutates an undocumented internal property of the Supabase realtime client:

```ts
const callbacks = (supabase.realtime as any).stateChangeCallbacks as {
  open: (() => void)[];
  close: (() => void)[];
};
callbacks.close.push(handleOffline);
callbacks.open.push(handleOnline);
```

`supabase.realtime` is not part of the public `@supabase/supabase-js` API surface. In `LiveBoard.test.tsx` the mock object is `{ channel, removeChannel }` — `supabase.realtime` is `undefined` at runtime — so `(undefined as any).stateChangeCallbacks` throws `TypeError: Cannot read properties of undefined (reading 'stateChangeCallbacks')`. The `as any` cast hides this from the compiler. Any Supabase patch that renames or restructures this internal field breaks production silently.

**Fix:** Use the documented `channel.subscribe` status callback (already wired at line 103) for SUBSCRIBED/CHANNEL_ERROR/TIMED_OUT, and use `window.offline`/`online` events only (already present at lines 63-68). Remove the entire `stateChangeCallbacks` mutation block (lines 72-83). The subscription callback already sets `connectionStatus` to `"connected"` on SUBSCRIBED and `"disconnected"` on CHANNEL_ERROR/TIMED_OUT, so the only behaviour lost is detecting WebSocket closure separately from subscription errors — which is redundant with the existing offline listener.

```ts
// Remove these lines entirely (72-83):
// const callbacks = (supabase.realtime as any).stateChangeCallbacks ...
// callbacks.close.push(handleOffline);
// callbacks.open.push(handleOnline);
// ... and the corresponding cleanup filter lines
```

The test mock also needs no changes once the hack is removed.

---

### CR-02: `page.tsx` race-condition recovery path returns `undefined` session, crashes on `.id`

**File:** `src/app/(protected)/pools/[poolId]/page.tsx:52-59`

**Issue:** The third branch of `getOrCreateActiveSession` is reached when the `onConflictDoNothing` insert returns nothing (another concurrent request won). It issues a second SELECT expecting to find that session:

```ts
const afterRace = await db
  .select()
  .from(poolSession)
  .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
  .limit(1);

return { session: afterRace[0], wasJustCreated: false };
```

If `afterRace` is empty (the concurrent session was closed or deleted in the gap between the failed INSERT and this SELECT), `afterRace[0]` is `undefined`. The caller at line 130 then evaluates `session.id`, throwing `TypeError: Cannot read properties of undefined (reading 'id')`. The page crashes with a 500 instead of a graceful redirect.

**Fix:**

```ts
if (afterRace.length === 0) {
  // Extremely rare: concurrent session vanished. Redirect rather than crash.
  redirect("/pools");
}
return { session: afterRace[0], wasJustCreated: false };
```

---

### CR-03: Server actions enforce authentication but not resource-level authorization

**File:** `src/app/(protected)/pools/[poolId]/actions.ts:119-153`

**Issue:** `removePairAction`, `addPairAction`, `addPairMemberAction`, and `closeSessionAction` all call `requireAuth()` (which only verifies the user is logged in) then immediately operate on the resource identified by the caller-supplied ID with no ownership check. Examples:

- `removePairAction(pairId, poolId)` deletes the row `WHERE pair.id = pairId` — any authenticated user who knows a pair's UUID can delete it.
- `closeSessionAction(sessionId, poolId)` closes any active session by ID — any authenticated user can end another team's session.
- `addPairMemberAction` can append a camper to any pair in any session.

The schema confirms there is no `pool.ownerId` column, so ownership must be checked relationally (e.g., `pair → poolSession → pool`). As an internal staff tool this may be intentional, but it represents a meaningful privilege-escalation path when multiple organizations or event sessions share the same deployment.

**Fix (minimum):** For `removePairAction`, verify the pair's session belongs to the pool the caller claims:

```ts
export async function removePairAction(pairId: string, poolId: string): Promise<void> {
  await requireAuth();
  // Verify the pair is actually in this pool before deleting
  const rows = await db
    .select({ id: pair.id })
    .from(pair)
    .innerJoin(poolSession, eq(pair.sessionId, poolSession.id))
    .where(and(eq(pair.id, pairId), eq(poolSession.poolId, poolId)))
    .limit(1);
  if (rows.length === 0) return; // pair doesn't exist in this pool — silently no-op
  await db.delete(pair).where(eq(pair.id, pairId));
}
```

Apply the same pattern to `closeSessionAction` (verify `sessionId` belongs to `poolId`) and `addPairAction` / `addPairMemberAction` (verify `sessionId` belongs to `poolId`).

---

### CR-04: Route handler returns any session's pairs to any authenticated user

**File:** `src/app/api/sessions/[sessionId]/pairs/route.ts:8-62`

**Issue:** The GET handler authenticates the caller but performs no check that the requested `sessionId` belongs to a pool the caller has access to. Any authenticated user who guesses or obtains a session UUID can retrieve the full pair list (names, bunks, codes) of another session. Given that `sessionId` comes from the URL parameter (caller-controlled), this is a broken object-level authorization (BOLA) vulnerability.

**Fix:** Add a scoping join that restricts the query to sessions whose pool exists (and optionally belongs to the caller's organization if multi-tenancy is added later):

```ts
// Minimum fix: confirm the session exists before returning its pairs
const sessionCheck = await db
  .select({ id: poolSession.id })
  .from(poolSession)
  .where(eq(poolSession.id, sessionId))
  .limit(1);

if (sessionCheck.length === 0) {
  return Response.json({ error: "Not found" }, { status: 404 });
}
```

For a true multi-tenant fix, also join to `pool` and verify the caller's org membership.

---

## Warnings

### WR-01: `refreshPairs` silently swallows non-ok HTTP responses

**File:** `src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx:38-49`

**Issue:** When `fetch` succeeds but the server returns a non-2xx status (e.g., 401 after session expiry, 500 during a DB hiccup), `res.ok` is `false` and the branch does nothing:

```ts
const res = await fetch(`/api/sessions/${sessionId}/pairs`);
if (res.ok) {
  const data = await res.json();
  setPairs(data.pairs);
}
// Non-ok path: isRefreshing resets to false, no state change, no user feedback
```

The board silently continues showing stale data, with no indication to the user that the refresh failed. The connection banner stays in its last-known state.

**Fix:** Update the connection status on non-ok responses:

```ts
const res = await fetch(`/api/sessions/${sessionId}/pairs`);
if (res.ok) {
  const data = await res.json();
  setPairs(data.pairs);
} else {
  setConnectionStatus("disconnected");
}
```

---

### WR-02: `handleSubmit` not guarded on `isPending`, allowing double-submission via Enter key

**File:** `src/app/(protected)/pools/[poolId]/components/AddPairForm.tsx:31-61`

**Issue:** The early guard is `if (!camper1 || !camper2) return;`. It does not check `isPending`. In several browsers, pressing Enter on a text input submits the enclosing form even when the submit button carries `disabled`. The `startTransition` callback queues async work, but a second `Enter` triggers a second call to `addPairAction` with the same camper IDs while the first is still in flight. The DB unique constraint (`PAIR-04`) will catch the duplicate, but the user then sees an erroneous "already in an active pair" error for a pair they just successfully added.

**Fix:**

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (isPending || !camper1 || !camper2) return;  // add isPending guard
  ...
}
```

---

### WR-03: LIKE wildcards in user-supplied search query expose unintended rows

**File:** `src/app/(protected)/pools/[poolId]/actions.ts:79-81`

**Issue:** The fuzzy search builds the LIKE pattern by JavaScript string concatenation before Drizzle parameterizes it:

```ts
ilike(camper.firstName, `%${q}%`),
```

Drizzle's parameterization prevents SQL injection, but `%` and `_` characters within `q` themselves act as SQL LIKE metacharacters. A counselor who types `%` as their search query receives every camper who is not yet paired in this session — potentially hundreds of records with names, bunks, and codes. A query of `_` matches any single-character first name.

**Fix:** Escape LIKE metacharacters before embedding:

```ts
const escaped = q.replace(/[%_\\]/g, "\\$&");
ilike(camper.firstName, `%${escaped}%`),
ilike(camper.lastName, `%${escaped}%`),
ilike(camper.code, `%${escaped}%`),
```

Note: the exact escape character depends on the DB configuration; PostgreSQL defaults to `\`. Alternatively use Drizzle's `sql` template with `ESCAPE '\'` appended.

---

### WR-04: Debounce timer not cancelled on component unmount

**File:** `src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx:52-56` / `87-115`

**Issue:** `refreshTimer.current` stores a `setTimeout` handle set inside `debouncedRefresh`. The channel `useEffect` cleanup (line 112-114) calls `supabase.removeChannel(channel)` but does not cancel a pending timer. If the component unmounts within 150 ms of a Realtime event, the timer fires after unmount, calling `refreshPairs` which initiates a `fetch` and calls `setIsRefreshing(true)` on an unmounted component.

**Fix:** Return a teardown that clears the timer, either in the channel `useEffect` cleanup or as a dedicated `useEffect`:

```ts
// In the channel useEffect cleanup:
return () => {
  if (refreshTimer.current) clearTimeout(refreshTimer.current);
  supabase.removeChannel(channel);
};
```

---

### WR-05: Missing env-var validation in Supabase browser singleton

**File:** `src/lib/supabase-browser.ts:4-7`

**Issue:** Both env vars are accessed with non-null assertions (`!`):

```ts
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

If either variable is absent (misconfigured deploy, test environment without a `.env.local`), `createClient` receives `undefined` and throws or silently creates a non-functional client. The `!` hides this from TypeScript.

**Fix:**

```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Info

### IN-01: `PairRow` accepts `sessionId` prop but never uses it

**File:** `src/app/(protected)/pools/[poolId]/components/PairRow.tsx:25`

**Issue:** The `Props` type declares `sessionId: string` (line 21), and `PairList` passes it (line 44 of PairList.tsx), but the function destructuring omits it entirely:

```ts
export function PairRow({ pair, poolId, onRemoved }: Props) {
```

The prop is silently accepted and discarded. Callers bear the maintenance cost of providing it for no effect.

**Fix:** Either remove `sessionId` from the `Props` type and stop passing it from `PairList`, or destructure and use it (e.g., for a future per-session confirmation dialog).

---

### IN-02: Pair-grouping logic duplicated verbatim between `page.tsx` and `route.ts`

**Files:** `src/app/(protected)/pools/[poolId]/page.tsx:65-98`, `src/app/api/sessions/[sessionId]/pairs/route.ts:19-59`

**Issue:** The `Map`-based pair-grouping algorithm is copy-pasted between `getPairsForSession` in `page.tsx` and the GET route handler in `route.ts`. The in-code comment on line 32 of `route.ts` even notes it mirrors `getPairsForSession`. A bug fix or behaviour change in one will not automatically propagate to the other.

**Fix:** Extract to a shared utility, e.g. `src/lib/pairs.ts`:

```ts
export function groupPairRows(rows: PairRow[]): Pair[] {
  const pairMap = new Map<string, Pair>();
  for (const row of rows) {
    const entry = pairMap.get(row.pairId) ?? { id: row.pairId, members: [] };
    entry.members.push({ ... });
    pairMap.set(row.pairId, entry);
  }
  return Array.from(pairMap.values());
}
```

---

### IN-03: Dead test variables in `actions.test.ts`

**File:** `src/app/(protected)/pools/[poolId]/actions.test.ts:86-91`

**Issue:** `alreadyPairedFrom` and `exactFrom` are constructed as `vi.fn()` stubs with return-value chains (lines 86-91), but neither variable is ever referenced again. The actual mock return values are set via `selectChain.from.mockReturnValueOnce` at lines 94-100. The two variables are dead code that add noise without affecting the test.

**Fix:** Remove lines 86-91:

```ts
// Delete:
const alreadyPairedFrom = vi.fn().mockReturnValue({ ... });
const exactFrom = vi.fn().mockReturnValue({ ... });
```

---

_Reviewed: 2026-06-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
