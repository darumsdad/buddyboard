# Phase 6: Buddy Call Screen & Polish - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Counselors can open a dedicated buddy call screen (a giant live count display) from the session board, and all counselor-facing screens are fully usable on iPad, laptop, and iPhone. The buddy call screen lives at a new route and shows the swimmer/pair count prominently with live Realtime updates. Responsive polish is scoped to the session board (header + entry form) — admin screens are desktop-only and excluded.

**Success criteria (from ROADMAP.md):**
1. Counselor can open a buddy call screen showing all active pairs in a high-contrast, large-text, scrollable list with large touch targets suitable for outdoor use
2. App is fully usable on iPad and laptop — no broken layouts, no horizontal scroll, all controls reachable
3. All app features remain accessible on iPhone — layout may be compact but nothing is hidden or broken

</domain>

<decisions>
## Implementation Decisions

### Buddy Call Screen — Access & Structure
- **D-01:** The buddy call screen is a new route at `/pools/[poolId]/buddy-call`. Clean URL, back-button navigation. Phase 4's "View all pairs" link in the session header wires up to this route.
- **D-02:** The page is a Server Component that does an SSR fetch of the current session's pair/swimmer counts directly from the DB on load (same pattern as `pools/[poolId]/page.tsx`). No separate API call for initial data.
- **D-03:** A "Back to board" link in the buddy call screen navigates back to `/pools/[poolId]`.

### Buddy Call Screen — Content & Layout
- **D-04:** The primary content is a **giant count display** — the total swimmer count and pair count, rendered in very large high-contrast text (full-screen emphasis). This is the main thing counselors use: they compare the verbal buddy call total to the number on screen.
- **D-05:** Individual pair list is secondary or absent on this screen. If counselors need to see individual pairs (rare), they navigate back to the session board.
- **D-06:** Pair member display format (if a pair list is included at all): first + last name only (no camper codes). Members separated by " / ". Trios show all 3 members on one row; wrap if needed.
- **D-07:** A compact header shows pool name and the "Back to board" link. The dominant visual is the swimmer/pair count.

### Buddy Call Screen — Live Data
- **D-08:** The buddy call screen uses a live Realtime subscription (same pattern as Phase 5 LiveBoard) — the count updates in real time if pairs change while the screen is open. The page is a client component that accepts SSR snapshot props and manages live state via `useState`.
- **D-09:** The ConnectionBanner (Connected / Reconnecting / Disconnected) from Phase 5 is shown on the buddy call screen — critical for safety so counselors know if the count is stale.

### Responsive Polish — Session Board
- **D-10:** `SessionHeader` stacks vertically on small screens. On `md+` breakpoint (768px+): existing single-row layout (pool name | count | Close/Logout). On mobile: pool name row on top, large swimmer/pair count centered below it, Close/Logout accessible on the right of the top row.
- **D-11:** The `AddPairForm` (pair entry) stacks its `CamperField` inputs vertically on mobile. On `md+`: current side-by-side layout. On mobile: Camper 1 field, then Camper 2 below, then Camper 3 (if visible), then submit button.
- **D-12:** Responsive scope is limited to the session board (`SessionHeader`, `AddPairForm`, and the buddy call route). Admin screens are desktop-only — no responsive work needed there. Login page and pools selection page are already simple enough.

### Claude's Discretion
- Exact text size for the giant count on the buddy call screen — should be very large (text-6xl or larger), high contrast (slate-900 on white), readable outdoors.
- Visual design of the "Back to board" link (chevron-left icon from lucide-react is appropriate).
- Whether a minimal pair list (names only, smaller text) appears below the count — if it fits naturally without crowding the count display, include it; otherwise omit and route counselors back to the board for pair details.
- Touch target sizes for all interactive elements on the buddy call screen: min-h-[44px] minimum per established pattern.
- Whether the buddy call route needs a separate Supabase client hook or can reuse the same `useLiveBoard` pattern from Phase 5.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — BOARD-03, UX-01, UX-02 are the Phase 6 requirements. Read full definitions.
- `.planning/PROJECT.md` — Context section: "The buddy call is a physical safety ritual — the screen must be clear and scannable under outdoor lighting conditions (high contrast, large text)"; Constraints section: "Devices: iPad and laptop are first-class; iPhone is best-effort".
- `.planning/ROADMAP.md` — Phase 6 success criteria (3 items listed above). These are the acceptance tests.

### Phase 4 Decisions That Feed Phase 6
- `.planning/phases/04-sessions-and-buddy-pairs/04-CONTEXT.md` — D-08: Session header has a "View all pairs" link that Phase 6 wires to `/pools/[poolId]/buddy-call`. Session page layout structure.

### Phase 5 Decisions That Feed Phase 6
- `.planning/phases/05-real-time-live-board/05-CONTEXT.md` — D-04 through D-11 (LiveBoard architecture, ConnectionBanner, Realtime subscription pattern). The buddy call screen uses the same Realtime pattern as LiveBoard.
- `.planning/phases/05-real-time-live-board/05-PLAN-05-05.md` (if it exists) — LiveBoard client component implementation. The buddy call screen mirrors this pattern for live counts.

### Current Session Page (primary integration point)
- `src/app/(protected)/pools/[poolId]/page.tsx` — SSR fetch pattern to replicate in the buddy call route.
- `src/app/(protected)/pools/[poolId]/components/SessionHeader.tsx` — Needs responsive adaptation (D-10). Currently: sticky header, flex row with pool name | 4xl count | close/logout.
- `src/app/(protected)/pools/[poolId]/components/AddPairForm.tsx` — Needs responsive adaptation (D-11). Contains CamperField inputs.

### UI Design Contract
- `.planning/phases/05-real-time-live-board/05-UI-SPEC.md` — Full design system: slate palette, Geist Sans font, spacing scale, color tokens, min-h-[44px] touch targets. All Phase 6 UI follows this contract.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SessionHeader` (`src/app/(protected)/pools/[poolId]/components/SessionHeader.tsx`) — Reuse and adapt with responsive Tailwind classes for vertical stacking on mobile.
- `AddPairForm` — Reuse and add responsive stacking for CamperField inputs on mobile.
- `ConnectionBanner` (from Phase 5) — Reuse on buddy call screen for disconnection awareness.
- `LiveBoard` (from Phase 5) — The buddy call screen's live count component mirrors LiveBoard's architecture (SSR props → useState → Realtime subscription).

### Established Patterns
- SSR fetch in Server Component + client boundary for live state — see `pools/[poolId]/page.tsx` and Phase 5 LiveBoard.
- `md:` breakpoint prefix for responsive changes — standard Tailwind responsive pattern used in this codebase.
- `min-h-[44px]` touch targets — all interactive elements on the buddy call screen must meet this minimum.
- Slate palette + no new accent colors — buddy call screen uses slate-900 on white for maximum contrast.

### Integration Points
- New route `src/app/(protected)/pools/[poolId]/buddy-call/page.tsx` — Server Component, auth-gated via the `(protected)` layout.
- `SessionHeader.tsx` receives `sessionId` and `poolId` props — the "View all pairs" link (`/pools/[poolId]/buddy-call`) can be added here.
- Phase 5 LiveBoard Realtime subscription — the buddy call page needs its own subscription or can share the pattern.

</code_context>

<specifics>
## Specific Ideas

- **Buddy call screen mental model:** Counselors blow the whistle, kids pair up and stand at the edge. A counselor counts the pairs verbally ("1, 2, 3... 8 pairs, 16 swimmers"). They look at the screen to see if the numbers match. The screen's job is to show the count clearly. The pair list is only consulted when the counts don't match and someone needs to identify who's missing.
- **Giant count design:** Very large text (text-6xl or text-8xl), centered, slate-900 on white, full viewport height emphasis. Something like "16 swimmers / 8 pairs" in huge high-contrast numbers.
- **Back to board:** Small link in the top-left corner (chevron-left + "Back"). Unobtrusive — doesn't compete with the count display.
- **Responsive header on iPhone:** Pool name + Close/Logout on one row; swimmer/pair count on a second row below (still large, centered). The count doesn't shrink — it just moves below the title row.
- **Form stacking on iPhone:** `flex-col md:flex-row` on the CamperField container. Submit button full-width on mobile.

</specifics>

<deferred>
## Deferred Ideas

- Pair list on buddy call screen with per-pair check-off — v2 requirement (REQUIREMENTS.md v2).
- Print-friendly buddy call sheet — v2.
- Session history / past buddy boards — v2.

</deferred>

---

*Phase: 6-Buddy Call Screen & Polish*
*Context gathered: 2026-06-28*
