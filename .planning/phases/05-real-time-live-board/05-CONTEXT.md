# Phase 5: Real-time & Live Board - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Every counselor at every pool sees an accurate, live buddy board — buddy pair add/remove changes from any device appear on all connected devices within seconds, without a page refresh. The board shows a live swimmer and pair count, a connection status indicator, and a clear empty state. No new pair-entry or session lifecycle features — Phase 4 owns those.

**Success criteria (from ROADMAP.md):**
1. A buddy pair added by one counselor appears on all other devices connected to the same pool within seconds, without a page refresh
2. A buddy pair removed by one counselor disappears from all other devices within seconds
3. The buddy board shows a live swimmer count and pair count (e.g. "12 swimmers — 6 pairs")
4. A prominent banner shows "Connected", "Reconnecting", or "Disconnected — data may be stale"
5. An empty board clearly distinguishes "No pairs checked in" from "Not connected" or "Loading"

</domain>

<decisions>
## Implementation Decisions

### Client Update Strategy
- **D-01:** When a Supabase Realtime event fires, the client re-fetches the full pair list from a Route Handler (`GET /api/sessions/[id]/pairs`). Always consistent with DB state. No client-side merge logic. Appropriate at camp-pool scale (typically <50 pairs per session).
- **D-02:** The Route Handler returns JSON including joined camper data (firstName, lastName, bunk) and current swimmerCount + pairCount — everything needed to re-render the board.
- **D-03:** When a counselor performs their own mutation (addPair, removePair), the Server Action callback triggers the same Route Handler re-fetch after success. `revalidatePath` is removed from Server Actions — client state is the source of truth for pair data.

### Reactivity Architecture
- **D-04:** A new `LiveBoard` client component (`"use client"`) is introduced. It accepts the SSR snapshot (`initialPairs`, `initialSwimmerCount`, `initialPairCount`, `sessionId`, `poolId`, `poolName`) as props from `page.tsx` and manages live state via `useState`. `page.tsx` replaces `<SessionBoard>` with `<LiveBoard>`.
- **D-05:** The Supabase Realtime subscription lives inside a `useEffect` in `LiveBoard` — subscribe on mount, unsubscribe on unmount. On Realtime event: call the Route Handler to get fresh data, update state.
- **D-06:** `LiveBoard` passes a `refreshPairs` callback down to `AddPairForm` and `PairList`. These components call it after a Server Action succeeds instead of relying on `revalidatePath`.
- **D-07:** `SessionBoard` remains a server component (or becomes a pure presentational client component driven by `LiveBoard`'s state). No subscription logic lives in `SessionBoard`.

### Connection Status Indicator
- **D-08:** A sticky banner below the header shows connection state — **visible only when degraded** (Reconnecting or Disconnected). In the Connected state the banner is hidden entirely, no visual noise.
- **D-09:** The Disconnected banner reads: "⚠️ Disconnected — data may be stale. [Refresh]". Tapping "Refresh" triggers a manual re-fetch of the pair list via the Route Handler. Supabase Realtime also attempts auto-reconnect in the background.
- **D-10:** Reconnecting state shows a non-alarming message: "Reconnecting…" with a subtle spinner. No Refresh button (auto-reconnect is in progress).
- **D-11:** A loading skeleton (3 placeholder pair rows) is shown while the initial client-side state is being established. Note: since `LiveBoard` receives an SSR snapshot as props, the skeleton applies to re-fetch states (e.g. post-reconnect full refresh), not the initial render. The empty board state (BOARD-05) is a distinct UI: "No pairs checked in yet" — shown only when connected and the pair list is genuinely empty.

### Subscription Scope
- **D-12:** The Supabase Realtime channel subscribes to **`postgres_changes` on the `pair_member` table**, filtered by `session_id=eq.{sessionId}`. `pair_member` rows are the atomic unit — INSERT covers new pair member added (new pair creation or trio expansion), DELETE (via cascade from pair row delete) covers pair removal. One subscription covers all pair changes.
- **D-13:** Realtime must be enabled on the `pair_member` table (and `pair` table for cascade awareness) in the Supabase Dashboard under Database → Replication → `supabase_realtime` publication. This is a **one-time manual setup step** — document in PLAN.md as a required human action before the subscription functions.
- **D-14:** The Supabase JS client (`@supabase/supabase-js`) must be installed. The client needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — obtain from Supabase Dashboard → Project Settings → API. The project URL is `https://oahkyfeogugoghhhtaoh.supabase.co`. These env vars must be added to `.env.local` and to Vercel environment variables. Document in PLAN.md as a required setup step.

### Claude's Discretion
- Exact Supabase Realtime channel name format (e.g. `session:${sessionId}:pairs` or similar).
- Whether the Route Handler also returns `swimmerCount` + `pairCount` in the same response or if those are derived client-side from the pair list (derive client-side is fine — swimmerCount = sum of member counts, pairCount = pair list length).
- Skeleton placeholder visual style — follow the slate palette from existing components.
- Exact Reconnecting vs. Disconnected state transition timing (Supabase Realtime channel status events drive this).
- Whether to debounce rapid successive Realtime events before triggering re-fetch (guard against event bursts during trio expansion).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — PAIR-05 and BOARD-01 through BOARD-05 are the Phase 5 requirements. Read full definitions.
- `.planning/PROJECT.md` — Constraints section: "Real-time: Multi-device collaboration requires WebSocket or equivalent — polling is not acceptable"; "Devices: iPad and laptop are first-class".
- `.planning/ROADMAP.md` — Phase 5 success criteria (5 items listed above). These are the acceptance tests.

### Phase 4 Decisions That Feed Phase 5
- `.planning/phases/04-sessions-and-buddy-pairs/04-CONTEXT.md` — D-02 (Phase 4 is HTTP-only; Phase 5 adds WebSocket on top), D-08/D-09 (SessionBoard layout and hero swimmer/pair count element), integration note: "Supabase Realtime will watch the `pair` table for changes".

### Existing Session Page (primary target for this phase)
- `src/app/(protected)/pools/[poolId]/page.tsx` — Server Component that fetches initial pairs/counts and renders SessionBoard. Phase 5 replaces `<SessionBoard>` with `<LiveBoard>` here.
- `src/app/(protected)/pools/[poolId]/components/SessionBoard.tsx` — Current static board component. Receives pairs/swimmerCount/pairCount as props. Phase 5 wraps or replaces with LiveBoard.
- `src/app/(protected)/pools/[poolId]/components/SessionHeader.tsx` — Displays pool name + swimmer/pair counts. Phase 5 makes these counts reactive.
- `src/app/(protected)/pools/[poolId]/actions.ts` — Current Server Actions (addPair, removePair). Phase 5 removes `revalidatePath` calls and replaces with client callback pattern.

### Schema (for Realtime subscription targeting)
- `src/db/schema.ts` — `pair` table (line 158), `pair_member` table (line 166) — the subscription targets. Note the `uniqueIndex("unique_camper_per_session")` constraint on pair_member (PAIR-04 enforcement).

### Established UI Patterns
- `src/app/(auth)/login/page.tsx` — Tailwind palette: slate base, blue-600 primary, `min-h-[44px]` touch targets.
- `src/app/(admin)/admin/users/components/` — Loading state patterns from Phase 2 components.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SessionBoard` (`src/app/(protected)/pools/[poolId]/components/SessionBoard.tsx`) — Reuse as a presentational component; `LiveBoard` passes it live state as props.
- `SessionHeader` (`src/app/(protected)/pools/[poolId]/components/SessionHeader.tsx`) — Receives `swimmerCount` + `pairCount` as props; Phase 5 LiveBoard feeds it live counts.
- `PairList` + `PairRow` — Receive `pairs` prop; LiveBoard drives them with live state.
- `AddPairForm` — Will receive a `onSuccess` / `refreshPairs` callback instead of relying on `revalidatePath`.

### Established Patterns
- Server Actions with `requireAuth()` guard — Phase 5 Server Actions (if any) follow the same pattern.
- Tailwind slate palette + blue-600 primary — all new UI (banner, skeleton, status indicator) follows this.
- `min-h-[44px]` touch targets — Refresh button on the Disconnected banner must meet this minimum.

### Integration Points
- `page.tsx` is the seam: it does the SSR fetch, then hands off to `LiveBoard` as a client boundary. No RSC-to-client prop drilling needed beyond the initial snapshot.
- The `pair_member.session_id` column is the Realtime subscription filter key — already denormalized (Phase 4 decision) for exactly this purpose.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are new env vars; `@supabase/supabase-js` is a new package install.

</code_context>

<specifics>
## Specific Ideas

- **SSR + Realtime hydration pattern:** `page.tsx` (Server Component) fetches initial pairs and passes them to `<LiveBoard initialPairs={...} initialSwimmerCount={...} ...>`. LiveBoard hydrates from this snapshot instantly (no loading gap on first render), then the `useEffect` subscription kicks in to keep it live going forward. No client-side loading state on initial mount.
- **Reconnect manual refresh:** The "[Refresh]" link in the Disconnected banner triggers the same `refreshPairs()` callback used by mutations — consistent internal API.
- **BOARD-05 empty state clarity:** Two distinct empty-board UIs: (1) `status === "connected" && pairs.length === 0` → "No pairs checked in yet." (2) `status === "disconnected"` → show the Disconnected banner; pair list shows last-known stale data (not cleared). Never show a blank board with no context.
- **Supabase Realtime setup note:** The `pair_member` table must be added to the `supabase_realtime` publication in the Supabase Dashboard. This is a one-time manual step that unlocks postgres_changes events. Without it, the subscription silently receives no events.

</specifics>

<deferred>
## Deferred Ideas

- High-contrast buddy call screen — Phase 6.
- iPad/iPhone responsive polish — Phase 6.
- Session history / past buddy boards — v2 (out of scope per REQUIREMENTS.md).
- Bulk remove all pairs (end-of-session clear) — v2.

</deferred>

---

*Phase: 5-Real-time & Live Board*
*Context gathered: 2026-06-28*
