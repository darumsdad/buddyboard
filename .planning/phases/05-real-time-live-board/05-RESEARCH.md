# Phase 5: Real-time & Live Board - Research

**Researched:** 2026-06-28
**Domain:** Supabase Realtime (postgres_changes) + Next.js App Router client components + Route Handlers
**Confidence:** HIGH (core API verified via official Supabase docs + local Next.js docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Client Update Strategy**
- D-01: On Realtime event, client re-fetches full pair list from Route Handler (`GET /api/sessions/[id]/pairs`). No client-side merge.
- D-02: Route Handler returns JSON with pairs + joined camper data. swimmerCount and pairCount derived client-side from the pair list.
- D-03: Server Action callbacks trigger the same Route Handler re-fetch after success. `revalidatePath` removed from Server Actions.

**Reactivity Architecture**
- D-04: `LiveBoard` "use client" component accepts SSR snapshot as props. `page.tsx` replaces `<SessionBoard>` with `<LiveBoard>`.
- D-05: Supabase Realtime subscription lives in a `useEffect` in `LiveBoard`. Subscribe on mount, unsubscribe on unmount.
- D-06: `LiveBoard` passes a `refreshPairs` callback down to `AddPairForm` and `PairList`.
- D-07: `SessionBoard` becomes a pure presentational component driven by `LiveBoard`'s state.

**Connection Status Indicator**
- D-08: Sticky banner below header, visible only when degraded (Reconnecting or Disconnected).
- D-09: Disconnected banner reads "Disconnected — data may be stale. [Refresh]". Manual refresh triggers Route Handler re-fetch.
- D-10: Reconnecting state shows "Reconnecting..." with a spinner. No Refresh button.
- D-11: Loading skeleton (3 placeholder rows) for re-fetch states (not initial render). Empty-board state is distinct: "No pairs checked in yet."

**Subscription Scope**
- D-12: Supabase Realtime channel subscribes to `postgres_changes` on `pair_member` table, filtered by `session_id=eq.{sessionId}`.
  - **RESEARCH NOTE: D-12 requires amendment — see Critical Finding #1 below.**
- D-13: Realtime must be enabled on pair_member (and pair) tables in Dashboard. One-time manual setup.
- D-14: `@supabase/supabase-js` installed. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars. Project URL: `https://oahkyfeogugoghhhtaoh.supabase.co`.

### Claude's Discretion

- Exact Supabase Realtime channel name format.
- Whether swimmerCount/pairCount are in Route Handler response or derived client-side (derive client-side is fine).
- Skeleton visual style — follow slate palette.
- Reconnecting vs. Disconnected state transition timing.
- Whether to debounce rapid Realtime events before re-fetch.

### Deferred Ideas (OUT OF SCOPE)

- High-contrast buddy call screen — Phase 6.
- iPad/iPhone responsive polish — Phase 6.
- Session history / past buddy boards — v2.
- Bulk remove all pairs — v2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAIR-05 | All buddy pair changes (add, remove) appear in real time on all devices connected to the same pool | Supabase Realtime postgres_changes subscription on pair_member (INSERT) and pair (DELETE) tables covers both events |
| BOARD-01 | Counselor can view a live, scrollable buddy board showing all active pairs | LiveBoard client component with useState and useEffect subscription; SSR snapshot as initial state |
| BOARD-02 | Buddy board displays total swimmer count and pair count | swimmerCount = sum of pair.members.length; pairCount = pairs.length — derived client-side from Route Handler response |
| BOARD-04 | App displays a prominent connection status indicator | Supabase subscribe() callback status values (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED) drive the banner |
| BOARD-05 | Empty buddy board clearly communicates why it is empty | Two distinct states: `status === 'connected' && pairs.length === 0` vs `status === 'disconnected'` |
</phase_requirements>

---

## Summary

Phase 5 adds a Supabase Realtime WebSocket subscription to the existing HTTP-only buddy board. The architecture is already settled: a `LiveBoard` client component receives an SSR snapshot as props, then subscribes to `postgres_changes` events in a `useEffect`. On any event, it re-fetches the full pair list from a new Route Handler (`GET /api/sessions/[id]/pairs`). This "refetch-on-event" strategy (D-01) is simple, correct, and perfectly appropriate at the camp-pool scale of <50 pairs.

**Critical Finding #1 — D-12 must be amended:** The CONTEXT.md decision to subscribe only to `pair_member` for all events relies on cascade DELETE events firing on `pair_member` when a row is deleted from the `pair` table. This is a known Supabase Realtime limitation: cascade-deleted rows do NOT reliably fire `postgres_changes` events. The plan must subscribe to TWO tables: `pair_member` for `INSERT` events (pair additions) and `pair` for `DELETE` events (pair removals). Both tables must be in the `supabase_realtime` publication.

**Critical Finding #2 — Vercel is not a concern for WebSockets:** Supabase Realtime WebSocket connections run browser-to-Supabase directly. They do not pass through Vercel serverless functions. The only Vercel involvement is the Route Handler HTTP call triggered by each Realtime event — a normal short-lived request with no keepalive requirements.

**Primary recommendation:** Subscribe to both `pair` (DELETE) and `pair_member` (INSERT) on a single channel; on any event, call the Route Handler to get fresh state, then update `useState`. Debounce the refetch at 150ms to absorb the 2-3 rapid INSERTs from trio creation.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SSR initial board data | Frontend Server (SSR) | — | page.tsx already fetches pairs; hands snapshot to LiveBoard as props |
| Realtime subscription lifecycle | Browser / Client | — | useEffect in LiveBoard; WS connects browser → Supabase directly |
| Fresh pair data on event | API / Backend | — | Route Handler validates auth, queries DB, returns JSON |
| Connection status tracking | Browser / Client | — | subscribe() callback status drives banner state in LiveBoard |
| Pair add/remove mutations | API / Backend | — | Server Actions unchanged except revalidatePath removed |
| Empty state rendering | Browser / Client | — | LiveBoard drives PairList with live state |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.108.2 | Supabase client with Realtime subscription API | Official Supabase JS client; only package needed for Realtime without Supabase Auth |

### Not Needed

| Excluded | Why Not |
|----------|---------|
| `@supabase/ssr` | Provides `createBrowserClient` for projects using Supabase Auth with SSR. This project uses Better Auth — plain `createClient` from `@supabase/supabase-js` is sufficient. |
| Custom WebSocket code | Supabase Realtime client handles WebSocket, reconnect, heartbeat automatically. |

**Installation:**

```bash
npm install @supabase/supabase-js
```

**Version verification:** `npm view @supabase/supabase-js version` → `2.108.2` (published 2026-06-19). [VERIFIED: npm registry]

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@supabase/supabase-js` | npm | 8+ yrs | ~50M/wk | github.com/supabase/supabase-js | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**postinstall check:** `npm view @supabase/supabase-js scripts.postinstall` returned empty — no postinstall script. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (LiveBoard "use client")
  │
  ├─── mount ──► useEffect
  │                │
  │                ├─── createClient(NEXT_PUBLIC_URL, NEXT_PUBLIC_ANON_KEY)
  │                │
  │                └─── supabase.channel('session:{sessionId}:pairs')
  │                       .on('postgres_changes', pair_member INSERT, cb)
  │                       .on('postgres_changes', pair DELETE, cb)
  │                       .subscribe(statusCallback)
  │                              │
  │              ┌───────────────┘
  │              │ event fires
  │              ▼
  │         refreshPairs()  ◄─── also called by AddPairForm / PairRow on mutation success
  │              │
  │              ▼
  │         fetch('/api/sessions/{sessionId}/pairs')   [GET Route Handler]
  │              │
  │              ▼
  │         Route Handler: auth.api.getSession() → DB query → JSON
  │              │
  │              ▼
  │         setPairs(data.pairs)  →  derived swimmerCount, pairCount
  │              │
  │              ▼
  │         SessionBoard (presentational) renders with live state
  │
  ├─── statusCallback('SUBSCRIBED')  →  setStatus('connected')  →  banner hidden
  ├─── statusCallback('CHANNEL_ERROR' | 'TIMED_OUT')  →  setStatus('disconnected')  →  banner shown
  └─── unmount ──► supabase.removeChannel(channel)

Supabase Postgres
  ├─── pair_member INSERT (addPairAction)  ──►  Realtime broadcasts to all subscribers
  └─── pair DELETE (removePairAction)      ──►  Realtime broadcasts to all subscribers
```

### Recommended Project Structure

New files for Phase 5:

```
src/app/
├── api/
│   └── sessions/
│       └── [sessionId]/
│           └── pairs/
│               └── route.ts          # GET Route Handler — returns fresh pair list
├── (protected)/
│   └── pools/
│       └── [poolId]/
│           ├── page.tsx              # MODIFIED: replace <SessionBoard> with <LiveBoard>
│           └── components/
│               ├── LiveBoard.tsx     # NEW: "use client" — subscription + state
│               ├── ConnectionBanner.tsx  # NEW: Reconnecting/Disconnected banner
│               ├── PairSkeleton.tsx  # NEW: loading skeleton (3 placeholder rows)
│               ├── SessionBoard.tsx  # MODIFIED: becomes presentational (or unchanged if LiveBoard wraps it directly)
│               ├── AddPairForm.tsx   # MODIFIED: accept onSuccess callback, remove revalidatePath reliance
│               └── PairRow.tsx       # MODIFIED: accept onRemoved callback
└── lib/
    └── supabase-browser.ts           # NEW: singleton createClient for browser
```

### Pattern 1: Supabase Browser Client (Singleton)

**What:** Create the Supabase client once; reuse across components.
**When to use:** Any client component needing Realtime or Supabase queries.

```typescript
// src/lib/supabase-browser.ts
// Source: https://supabase.com/docs/reference/javascript/initializing [CITED: supabase.com/docs/reference/javascript/initializing]
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

No auth options needed — this project uses Better Auth, not Supabase Auth. The anon key is sufficient for Realtime subscriptions. [VERIFIED: supabase.com/docs/reference/javascript/initializing]

### Pattern 2: postgres_changes Subscription with Dual Table Coverage

**What:** Subscribe to pair_member (INSERT) AND pair (DELETE) in one channel.
**When to use:** Required because cascade-deleted pair_member rows do NOT fire Realtime events. [MEDIUM confidence — cascade delete limitation confirmed via GitHub issue #6739 but official docs do not document the exact behavior]

```typescript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes [CITED: supabase.com/docs/guides/realtime/postgres-changes]
useEffect(() => {
  const channel = supabase
    .channel(`session:${sessionId}:pairs`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'pair_member',
        filter: `session_id=eq.${sessionId}`,
      },
      () => debouncedRefresh()
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'pair',
        // pair table has no session_id column — no filter; re-fetch is cheap
      },
      () => debouncedRefresh()
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') setConnectionStatus('connected')
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionStatus('disconnected')
      if (status === 'CLOSED') setConnectionStatus('disconnected')
      if (err) console.error('Realtime error:', err)
    })

  return () => {
    supabase.removeChannel(channel)  // Critical: prevents channel leak [VERIFIED: supabase.com]
  }
}, [sessionId])
```

**Note on `pair` DELETE filter:** The `pair` table has no `session_id` column (see schema.ts line 158). Filtering is not possible for pair DELETEs at the Realtime subscription level. However, since re-fetch is cheap and sessionId-scoped at the Route Handler level, this is acceptable. A false-positive DELETE event (from another session's pair being removed) triggers a re-fetch that simply returns the correct current state.

### Pattern 3: Route Handler with Better Auth

**What:** GET Route Handler that validates the session cookie before returning pair data.
**When to use:** Any API route that needs auth and returns data to a client component.

```typescript
// src/app/api/sessions/[sessionId]/pairs/route.ts
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md [CITED: local Next.js docs]
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/db'
// ... schema imports

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params  // params is a Promise in Next.js 16

  const authSession = await auth.api.getSession({ headers: await headers() })
  if (!authSession) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pairs = await getPairsForSession(sessionId)  // reuse existing helper logic
  return Response.json({ pairs })
}
```

`headers()` from 'next/headers' works identically in Route Handlers as in Server Components and Server Actions — it provides the incoming request headers including the session cookie. [VERIFIED: local Next.js docs node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md]

`params` must be awaited (it is a Promise in Next.js 16) — same rule as in page.tsx. [VERIFIED: local Next.js docs]

### Pattern 4: LiveBoard SSR Hydration + Realtime

**What:** Client component receives SSR snapshot as initial state; subscription keeps it live.
**When to use:** The seam pattern for any SSR page that needs live updates.

```typescript
// src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase-browser'

type LiveBoardProps = {
  initialPairs: Pair[]
  sessionId: string
  poolId: string
  poolName: string
}

export function LiveBoard({ initialPairs, sessionId, poolId, poolName }: LiveBoardProps) {
  const [pairs, setPairs] = useState(initialPairs)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshPairs = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/pairs`)
      if (res.ok) {
        const data = await res.json()
        setPairs(data.pairs)
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [sessionId])

  // Debounced refresh: absorbs burst of INSERT events from trio creation
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(refreshPairs, 150)
  }, [refreshPairs])

  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionId}:pairs`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pair_member', filter: `session_id=eq.${sessionId}` }, debouncedRefresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pair' }, debouncedRefresh)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected')
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionStatus('disconnected')
        if (status === 'CLOSED') setConnectionStatus('disconnected')
        if (err) console.error('[Realtime]', err)
      })

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, debouncedRefresh])

  const swimmerCount = pairs.reduce((sum, p) => sum + p.members.length, 0)
  const pairCount = pairs.length

  // ... render SessionBoard with live state, pass refreshPairs to children
}
```

### Pattern 5: AddPairForm Callback Migration

**What:** Replace `revalidatePath`-driven update with `onSuccess` callback.
**When to use:** Any mutating component under LiveBoard.

Current `AddPairForm` calls `addPairAction` which calls `revalidatePath`. Phase 5 removes the `revalidatePath` call from `addPairAction` and passes `onSuccess: () => void` (which calls `refreshPairs`) into `AddPairForm` as a prop.

```typescript
// AddPairForm: add prop
type AddPairFormProps = {
  sessionId: string
  poolId: string
  onSuccess: () => void   // NEW
}

// In handleSubmit, on result.success:
if (result.success) {
  onSuccess()  // replaces revalidatePath behavior
  // ... clear fields
}
```

`PairRow` gets the same treatment for `removePairAction`.

### Anti-Patterns to Avoid

- **`unsubscribe()` instead of `removeChannel()`:** `unsubscribe()` does not fully clean up the channel. Use `supabase.removeChannel(channel)` in the useEffect cleanup. Leaked channels cause `TooManyChannels` errors in production. [VERIFIED: supabase.com/docs/guides/troubleshooting/realtime-too-many-channels-error]
- **Creating the channel inside a non-stable callback:** The `channel()` call must live inside `useEffect` so the cleanup function receives the same channel reference. Never create a channel outside `useEffect` in a component.
- **Putting the subscription in a Server Component:** Supabase Realtime requires browser WebSocket APIs. It only works in `"use client"` components.
- **Using `createBrowserClient` from `@supabase/ssr`:** Only needed when using Supabase Auth with SSR cookie refresh. This project uses Better Auth — `createClient` from `@supabase/supabase-js` is the correct and simpler choice.
- **Subscribing only to `pair_member` for DELETE events:** Cascade deletes from the `pair` table do not fire `pair_member` DELETE events in Supabase Realtime (GitHub issue #6739). Pair removals must be detected via a `pair` DELETE subscription.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket connection management | Custom WS client with reconnect logic | Supabase Realtime client | Auto-reconnect, heartbeat (25s), exponential backoff all built in |
| Heartbeat / keepalive | `setInterval(() => ws.send('ping'))` | Supabase Realtime client | 25-second heartbeat is automatic; manual heartbeat creates duplicate signals |
| Event deduplication | Complex sequence tracking | Simple debounce (150ms) | At camp-pool scale, a 150ms debounce absorbs all realistic event bursts |
| Client-side state merge | Applying INSERT/DELETE patches to local array | Route Handler re-fetch | Merge logic accumulates bugs; re-fetch is always consistent with DB state |

**Key insight:** The "re-fetch on event" strategy (D-01) deliberately sacrifices minimal bandwidth efficiency for maximum correctness simplicity. At <50 pairs and <10 concurrent users, a Route Handler call on each event is fast, cheap, and eliminates entire classes of state-sync bugs.

---

## Common Pitfalls

### Pitfall 1: Cascade Delete Silence (CRITICAL)

**What goes wrong:** Subscribe only to `pair_member` for `*` events (including DELETE). Remove a pair by deleting from the `pair` table. The `pair_member` rows are deleted by cascade. No DELETE event fires on `pair_member`. The board doesn't update.

**Why it happens:** PostgreSQL `ON DELETE CASCADE` is handled internally by the database engine without going through the logical replication change tracking that Supabase Realtime uses. Only direct DML on the table fires a change event. [MEDIUM — confirmed via GitHub issue #6739; not documented officially]

**How to avoid:** Subscribe to `pair` table DELETE events in addition to `pair_member` INSERT events. Add both tables to the `supabase_realtime` publication in the Dashboard.

**Warning signs:** Board updates on add but not on remove during testing.

### Pitfall 2: Channel Leak in React Strict Mode (Development)

**What goes wrong:** In development (Strict Mode), React mounts, unmounts, and remounts every component. If cleanup doesn't run `supabase.removeChannel()`, a new channel is created on the second mount while the first remains. Each navigation creates another leaked channel. In production this manifests as `ChannelRateLimitReached` errors for long-running sessions.

**Why it happens:** React Strict Mode intentionally double-invokes effects in development. Without cleanup, each mount creates a new WebSocket subscription without closing the previous one. [VERIFIED: supabase.com/docs/guides/troubleshooting/realtime-too-many-channels-error]

**How to avoid:** Always return `() => { supabase.removeChannel(channel) }` from the `useEffect`. The `channel` reference must be captured in the same `useEffect` closure.

**Warning signs:** Browser dev tools WebSocket tab showing multiple open connections to `wss://oahkyfeogugoghhhtaoh.supabase.co`.

### Pitfall 3: Event Burst from Trio Creation

**What goes wrong:** Adding a trio (3 campers) fires 3 rapid `pair_member` INSERT events. Without debouncing, LiveBoard calls the Route Handler 3 times in ~10ms. On slow connections this can cause 3 overlapping fetches with stale data overwriting fresh data.

**Why it happens:** The `addPairAction` inserts all `pair_member` rows in a single transaction, but Realtime fires one event per row change.

**How to avoid:** Debounce the `refreshPairs` call at 150ms. All 3 events land within ~5ms; the debounce collapses them into one fetch. [ASSUMED — timing estimate based on typical Postgres replication latency; exact burst timing untested]

**Warning signs:** Console showing 3 near-simultaneous fetch calls to `/api/sessions/[id]/pairs` when adding a trio.

### Pitfall 4: Route Handler `params` Not Awaited

**What goes wrong:** `const { sessionId } = params` throws a runtime error because `params` is a `Promise<{ sessionId: string }>` in Next.js 16.

**Why it happens:** Next.js 16 changed `params` (and `searchParams`) to be Promises in Route Handlers and pages. [VERIFIED: local Next.js docs node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md]

**How to avoid:** Always `const { sessionId } = await params` in Route Handlers.

**Warning signs:** Runtime error: "Cannot destructure property 'sessionId' of 'params'".

### Pitfall 5: Pair Table Missing from Publication

**What goes wrong:** Only `pair_member` is added to `supabase_realtime` publication. `pair` DELETE events never fire. Board never updates on pair removal.

**Why it happens:** D-13 in CONTEXT.md mentions "pair_member (and pair table for cascade awareness)" — both are required. The plan must document both tables as manual setup steps.

**How to avoid:** Add both tables to the publication:
```sql
alter publication supabase_realtime add table pair_member;
alter publication supabase_realtime add table pair;
```
Or toggle both on in Dashboard → Database → Replication → supabase_realtime.

**Warning signs:** Adds work in real time, removes do not. This will be obvious in first-pass testing.

### Pitfall 6: TIMED_OUT Status with Node.js < v22

**What goes wrong:** Supabase subscribe() callback fires `TIMED_OUT` immediately or intermittently.

**Why it happens:** Incompatibility between the `realtime-js` library bundled in `supabase-js` and Node.js runtimes predating v22. [CITED: supabase.com/docs/guides/troubleshooting/realtime-connections-timed_out-status]

**How to avoid:** This project runs Node v24.13.0 (verified locally). Vercel Hobby/Pro defaults to Node 22+ for App Router projects. No action needed.

**Warning signs:** Not expected given Node v24.

---

## Code Examples

### Complete postgres_changes subscription (verified pattern)

```typescript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes [CITED: supabase.com/docs/guides/realtime/postgres-changes]
const channel = supabase
  .channel('table-filter-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',         // 'INSERT' | 'UPDATE' | 'DELETE' | '*'
      schema: 'public',
      table: 'pair_member',
      filter: `session_id=eq.${sessionId}`,  // eq, neq, lt, lte, gt, gte, in
    },
    (payload) => console.log(payload)
  )
  .subscribe((status, err) => {
    // status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'
    if (status === 'SUBSCRIBED') { /* connected */ }
    if (err) console.error(err)
  })

// Cleanup (useEffect return)
return () => { supabase.removeChannel(channel) }
```

### Route Handler skeleton (Next.js 16 App Router)

```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md [CITED: local Next.js 16.2.9 docs]
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params  // MUST await in Next.js 16
  const authSession = await auth.api.getSession({ headers: await headers() })
  if (!authSession) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // ... query and return
}
```

### Enabling Realtime via SQL (alternative to Dashboard UI)

```sql
-- Run in Supabase Dashboard → SQL Editor
-- Source: https://supabase.com/docs/guides/realtime/postgres-changes [CITED: supabase.com/docs/guides/realtime/postgres-changes]
alter publication supabase_realtime add table pair_member;
alter publication supabase_realtime add table pair;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unsubscribe()` for cleanup | `supabase.removeChannel(channel)` | ~2023 | `removeChannel` fully tears down the channel; `unsubscribe` only pauses it |
| `createClient` for SSR | `@supabase/ssr` `createBrowserClient` | ~2023 | Only needed when using Supabase Auth; irrelevant for Better Auth projects |
| Sync `params` access | `await params` (Promise) | Next.js 15/16 | Breaking change; destructuring `params` without await throws at runtime |
| Sync `headers()` | `await headers()` | Next.js 15/16 | Same pattern; consistent across Server Components, Actions, Route Handlers |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cascade-deleted `pair_member` rows do NOT fire Realtime events | Pitfall 1, Subscription Pattern | If cascade deletes DO fire, subscribing to `pair` DELETE is redundant but harmless |
| A2 | Trio INSERT events arrive in a ~5ms burst (within 150ms debounce window) | Pitfall 3 | If burst is slower (>150ms), some inserts trigger separate fetches — result is still correct, just slightly more fetches |
| A3 | Supabase Realtime `pair` DELETE events fire correctly for direct deletes (not cascade) | Critical Finding #1 | Foundational to the dual-table subscription strategy; if pair DELETEs also don't fire, alternative approach needed |

---

## Open Questions

1. **Does subscribing to `pair` DELETE without a session_id filter cause false-positive refetches from other sessions?**
   - What we know: `pair` table has no `session_id` column, so filtering at subscription level is impossible. The Route Handler re-fetch is session-scoped and will return the correct data regardless.
   - What's unclear: If many concurrent sessions are active (unlikely at camp scale), every pair DELETE from any session triggers a refetch on all connected clients.
   - Recommendation: Accept this at camp scale (<10 concurrent sessions). If it becomes an issue post-launch, consider adding `session_id` to the `pair` table as a denormalized column to enable subscription-level filtering.

2. **Should `revalidatePath` be completely removed from ALL Server Actions?**
   - What we know: D-03 says remove from `addPairAction` and `removePairAction`. `closeSessionAction` calls `revalidatePath('/pools')` which is for the pool listing, not the live board.
   - Recommendation: Remove `revalidatePath` from `addPairAction`, `addPairMemberAction`, and `removePairAction`. Retain it in `closeSessionAction` since session close navigates away from the live board.

3. **Is Supabase Row Level Security (RLS) required for the anon key to access pair_member and pair tables?**
   - What we know: STATE.md records "Supabase RLS: skip for v1, handle auth at Next.js middleware layer." The Route Handler validates auth via Better Auth before returning data.
   - What's unclear: The Supabase Realtime subscription uses the anon key. If RLS is disabled and the anon key has read access, subscriptions work. If RLS is enabled with restrictive policies, subscriptions may silently return no events.
   - Recommendation: Since RLS is skipped for v1, no action needed. The subscription will receive all events as expected. Document this in the plan for future reference.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Route Handler, subscription compat | ✓ | v24.13.0 | — |
| `@supabase/supabase-js` | Realtime subscription | ✗ (not yet installed) | — | Install in Wave 0 |
| `NEXT_PUBLIC_SUPABASE_URL` | createClient | ✗ (not yet set) | — | Manual setup step before Wave 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | createClient | ✗ (not yet set) | — | Manual setup step before Wave 2 |
| Supabase Dashboard access | pair + pair_member publication | ✓ (assumed — project URL known) | — | SQL fallback: `alter publication supabase_realtime add table ...` |

**Missing dependencies with no fallback:** none (all have install/setup steps)

**Missing dependencies with fallback:**
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — can be found at Supabase Dashboard → Project Settings → API. Must be added to `.env.local` AND Vercel environment variables before the LiveBoard subscription can function.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + React Testing Library 16.3.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAIR-05 | pairs appear/disappear in real time | manual-only | — manual: open two browser tabs, add pair in one, verify other updates | N/A |
| BOARD-01 | LiveBoard renders SSR snapshot immediately | unit | `npm test -- src/.../LiveBoard.test.tsx` | ❌ Wave 0 |
| BOARD-02 | swimmerCount and pairCount derived correctly | unit | `npm test -- src/.../LiveBoard.test.tsx` | ❌ Wave 0 |
| BOARD-04 | ConnectionBanner shows/hides by status | unit | `npm test -- src/.../ConnectionBanner.test.tsx` | ❌ Wave 0 |
| BOARD-05 | Empty state vs disconnected state distinct | unit | `npm test -- src/.../LiveBoard.test.tsx` | ❌ Wave 0 |

**Note on PAIR-05:** Real-time multi-device behavior cannot be meaningfully unit tested — two live WebSocket connections are required. Verification is a manual step: open two browser tabs/devices, confirm propagation. Mark as manual-only in the plan.

**Note on LiveBoard unit testing:** The Supabase client must be mocked. The subscription callback can be invoked manually in tests to simulate events without an actual WebSocket connection.

### Sampling Rate

- **Per task commit:** `npm test` — unit tests only
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green + manual multi-tab verification before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/(protected)/pools/[poolId]/components/LiveBoard.test.tsx` — covers BOARD-01, BOARD-02, BOARD-05
- [ ] `src/app/(protected)/pools/[poolId]/components/ConnectionBanner.test.tsx` — covers BOARD-04
- [ ] Supabase mock utility — `src/test/mocks/supabase.ts` — mocks `createClient` for unit tests

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Route Handler auth via `auth.api.getSession()` (Better Auth) |
| V3 Session Management | no | Better Auth handles session; no Supabase session involved |
| V4 Access Control | yes | Route Handler must verify auth before returning pair data |
| V5 Input Validation | yes | `sessionId` from URL params must be validated (non-empty, known to exist) |
| V6 Cryptography | no | Supabase anon key is public by design; no secrets in client |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated Route Handler access | Elevation of Privilege | `auth.api.getSession()` check at top of Route Handler; return 401 if no session |
| `sessionId` path parameter manipulation | Tampering | Route Handler queries DB with `sessionId` — if session doesn't exist or doesn't belong to an active pool, return empty pairs (not an error, but harmless) |
| Supabase anon key exposure | Information Disclosure | `NEXT_PUBLIC_*` vars are intentionally public; anon key only enables reading pair data, not admin operations |

**RLS note:** RLS is skipped for v1 (per STATE.md). The anon key with no RLS means any client that knows the subscription filter could receive pair data. This is an accepted risk for v1 — auth enforcement lives at the Next.js layer via Better Auth.

---

## Sources

### Primary (HIGH confidence)

- [Supabase Realtime postgres-changes guide](https://supabase.com/docs/guides/realtime/postgres-changes) — filter syntax, event types, publication setup
- [Supabase JS initializing reference](https://supabase.com/docs/reference/javascript/initializing) — createClient API
- Local Next.js 16.2.9 docs (`node_modules/next/dist/docs/`) — Route Handler params/headers API
- slopcheck v0.6.1 — @supabase/supabase-js package legitimacy

### Secondary (MEDIUM confidence)

- [Supabase Realtime too-many-channels troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-too-many-channels-error) — removeChannel importance, channel leak patterns
- [Supabase Realtime heartbeat guide](https://supabase.com/docs/guides/troubleshooting/realtime-heartbeat-messages) — 25-second heartbeat default
- [Supabase TIMED_OUT troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-connections-timed_out-status) — Node.js version compatibility
- WebSearch: Vercel serverless WebSocket behavior — confirmed WS connections are browser-to-Supabase, not through Vercel
- WebSearch: React 18 Strict Mode double-mount with Supabase (multiple community discussions confirming issue + removeChannel fix)

### Tertiary (MEDIUM-LOW confidence)

- [GitHub issue #6739 supabase/supabase](https://github.com/supabase/supabase/issues/6739) — cascade delete not triggering Realtime events (bug report, closed; resolution unclear; behavior confirmed by community) [ASSUMED as persistent limitation]

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — @supabase/supabase-js version verified via npm registry, slopcheck OK, official docs confirm createClient for Realtime
- Architecture: HIGH — patterns match official Supabase + Next.js 16 docs; Route Handler pattern mirrors existing page.tsx patterns exactly
- Cascade delete limitation: MEDIUM — confirmed via community/GitHub, not officially documented as a limitation; plan should treat it as confirmed
- Pitfalls: HIGH for React/Next.js pitfalls (verified against local docs); MEDIUM for cascade delete timing behavior

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (Supabase Realtime API is stable; Next.js 16 patterns locked for this project)
