# Phase 5: Real-time & Live Board - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 5-Real-time & Live Board
**Areas discussed:** Client update strategy, Reactivity architecture, Connection status indicator, Subscription scope

---

## Client Update Strategy

### Q1: How should the client update the pair list on a Realtime event?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-fetch from server | Call Route Handler GET /api/sessions/[id]/pairs on each event. Always consistent, no merge logic. | ✓ |
| Apply event payload directly | Parse INSERT/DELETE payload and surgically update client state. Faster but complex; payload may lack joined camper data. | |
| You decide | Leave to Claude's discretion. | |

**User's choice:** Re-fetch from server

### Q2: Re-fetch via what mechanism?

| Option | Description | Selected |
|--------|-------------|----------|
| Route Handler (GET /api/sessions/[id]/pairs) | Dedicated API route running the JOIN query, returns JSON. Works natively with fetch() in client components. | ✓ |
| Server Action with revalidatePath | Trigger revalidatePath for a full re-render. Awkward for reads — server actions designed for mutations. | |
| You decide | Leave to Claude's discretion. | |

**User's choice:** Route Handler

### Q3: How does a counselor's own mutation update their local view?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-fetch after Server Action completes | Same Route Handler re-fetch triggered after Server Action success. Consistent behavior, single code path. | ✓ |
| Optimistic UI for own, Realtime for others | Show pair immediately before server confirms, let Realtime reconcile. More responsive but complex. | |

**User's choice:** Re-fetch after Server Action completes

---

## Reactivity Architecture

### Q1: How should SessionBoard become reactive?

| Option | Description | Selected |
|--------|-------------|----------|
| New LiveBoard client wrapper | "use client" LiveBoard accepts SSR snapshot as props, manages live state internally. SessionBoard stays as-is. | ✓ |
| Convert SessionBoard to client component | Add "use client" to SessionBoard itself. Simpler file count but mixes SSR and subscription logic. | |
| You decide | Leave to Claude's discretion. | |

**User's choice:** New LiveBoard client wrapper

### Q2: Where does the Supabase Realtime subscription live?

| Option | Description | Selected |
|--------|-------------|----------|
| useEffect in LiveBoard | Subscribe on mount, unsubscribe on unmount. Standard React pattern. | ✓ |
| Custom useLiveBoard hook | Extract to useLiveBoard(sessionId). More testable but extra file for a single use case. | |

**User's choice:** useEffect in LiveBoard

### Q3: How does LiveBoard wire into existing Server Action mutations?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove revalidatePath, pass refreshPairs callback | LiveBoard passes refreshPairs() to AddPairForm and PairList. Server actions call it after success. | ✓ |
| Keep revalidatePath, let Realtime catch it | Double update path — revalidatePath + Realtime both fire per mutation. More work than needed. | |

**User's choice:** Remove revalidatePath, pass refresh callback

---

## Connection Status Indicator

### Q1: Where does the connection status indicator live?

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky banner below header | Full-width strip, only visible when degraded. No visual noise when connected. Unmissable when visible. | ✓ |
| Inline in SessionHeader | Small pill/dot next to pool name. Always visible but may be missed under outdoor glare. | |
| You decide | Leave to Claude's discretion. | |

**User's choice:** Sticky banner below header (only shown when degraded)

### Q2: What should the Disconnected banner say and do?

| Option | Description | Selected |
|--------|-------------|----------|
| Text + manual refresh option | "⚠️ Disconnected — data may be stale. [Refresh]". Manual re-fetch escape hatch. | ✓ |
| Text only, auto-reconnect silently | "Disconnected — data may be stale" with no user action. Simpler but no escape hatch if auto-reconnect stalls. | |

**User's choice:** Text + manual refresh option

### Q3: Loading feedback for initial data?

| Option | Description | Selected |
|--------|-------------|----------|
| Loading skeleton for pair list | 3 placeholder pair rows while initial fetch is in-flight. Distinguishes loading from empty (BOARD-05). | ✓ |
| Nothing (use SSR snapshot) | page.tsx already fetches initial pairs server-side — no client-side loading gap on first render. | |

**User's choice:** Loading skeleton
**Notes:** Since LiveBoard receives the SSR snapshot as props, there's no initial render loading gap. Skeleton applies to re-fetch states (post-reconnect) and helps distinguish "loading" from "genuinely empty" (BOARD-05).

---

## Subscription Scope

### Q1: What does the Supabase Realtime channel subscribe to?

| Option | Description | Selected |
|--------|-------------|----------|
| pair_member table, filtered by session_id | One subscription covers all pair changes — INSERT = added, DELETE cascade = removed. | ✓ |
| Both pair + pair_member tables | Two subscriptions, more granular events, more complex merge logic. | |
| Server-side broadcast channel | Server Actions emit to named channel. Avoids table exposure but risks missing a broadcast. | |

**User's choice:** pair_member table filtered by session_id

### Q2: Who enables Realtime on the table?

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Dashboard (manual, one-time) | Admin enables under Database → Replication. Documented in PLAN.md as required human step. | ✓ |
| SQL migration | ALTER PUBLICATION supabase_realtime ADD TABLE pair_member via drizzle-kit push. More reproducible but raw SQL outside Drizzle. | |

**User's choice:** Supabase Dashboard (manual, one-time)

### Q3: How are NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY obtained?

| Option | Description | Selected |
|--------|-------------|----------|
| From Supabase Dashboard | Project URL + anon key from Dashboard → Project Settings → API. Documented in PLAN.md. | ✓ |
| Derive from DATABASE_URL | Project ID visible in DATABASE_URL, but anon key still manual. Saves a little clicking. | |

**User's choice:** From Supabase Dashboard

---

## Claude's Discretion

- Exact Supabase Realtime channel name format
- Whether Route Handler derives swimmerCount/pairCount from pair list or returns them from DB
- Skeleton placeholder visual style (slate palette)
- Reconnecting vs. Disconnected state transition timing
- Whether to debounce rapid Realtime events before triggering re-fetch

## Deferred Ideas

- High-contrast buddy call screen — Phase 6
- iPad/iPhone responsive polish — Phase 6
- Session history / past buddy boards — v2
- Bulk remove all pairs — v2
