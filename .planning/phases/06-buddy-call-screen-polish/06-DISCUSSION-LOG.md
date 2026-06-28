# Phase 6: Buddy Call Screen & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 6-buddy-call-screen-polish
**Areas discussed:** Buddy call screen access, Buddy call content & layout, Live vs. snapshot data, Responsive scope & priority

---

## Buddy Call Screen Access

| Option | Description | Selected |
|--------|-------------|----------|
| New route /pools/[poolId]/buddy-call | Clean URL, back-button returns to session board. Needs SSR data fetch. Shareable. | ✓ |
| Full-screen modal overlay on session board | No new route. Reuses existing Realtime subscription. Can't share URL. | |
| You decide | Claude picks best approach. | |

**User's choice:** New route `//pools/[poolId]/buddy-call`
**Notes:** No additional notes.

---

### Follow-up: How should the buddy call route fetch data?

| Option | Description | Selected |
|--------|-------------|----------|
| Server Component SSR fetch | page.tsx fetches pairs directly from DB on load. Same pattern as session board. | ✓ |
| Reuse Phase 5 Route Handler | Client component calls GET /api/sessions/[id]/pairs. Adds loading state but reuses infrastructure. | |
| You decide | Claude picks based on codebase patterns. | |

**User's choice:** Server Component SSR fetch
**Notes:** No additional notes.

---

### Follow-up: Back navigation on buddy call screen

| Option | Description | Selected |
|--------|-------------|----------|
| Back to board link | Text link or back button navigating to /pools/[poolId]. | ✓ |
| No explicit back — use browser back button | No UI chrome. Keeps screen uncluttered. | |

**User's choice:** Back to board link
**Notes:** No additional notes.

---

## Buddy Call Content & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Names only, large text | Drop codes. First + last name per member. Easier to read aloud. | ✓ (via free text) |
| Code + names | Consistent with session board. | |
| Numbered list + names only | Row gets a number. Easy to track count visually. | |

**User's choice:** Names only, large text — first + last name for each member. 2 members per row; trios show all 3 on one row (wrap if needed).
**Notes:** User asked about trios. Claude clarified: all 3 on one row, wrap if needed. Trios are rare.

---

### Follow-up: Show swimmer/pair count?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show count at top | Keeps hero info visible. Small header with count + pool name. | ✓ |
| No, pairs list only | Maximum screen real estate for pairs. | |

**User's choice:** Yes, show count at top.
**Notes:** No additional notes.

---

### Follow-up: What is the buddy call screen primarily?

Arose from user clarification: "all the counselors will do is compare the total buddy count to the total buddy count on the screen — in the rare event they need to go to the list — then they can navigate to another screen to view the pairs."

| Option | Description | Selected |
|--------|-------------|----------|
| Giant count display (primary), pairs list absent or secondary | The hero is the number. Rare pair detail goes to a different view. | ✓ |
| Both: large count + scrollable pairs list | Count prominent at top, pairs list fills rest. | |
| Scrollable pairs list only, count in header | List is primary content. | |

**User's choice:** Giant count display — primary job is showing total swimmers/pairs in large format.
**Notes:** This reframes the screen significantly. The buddy call is a counting ceremony. The list is only consulted when totals don't match.

---

## Live vs. Snapshot Data

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, live data — reuse Phase 5 Realtime subscription | Count stays accurate mid-call. Slightly more complex. | ✓ |
| Snapshot at open time | Fetched once, no live updates. Simpler. | |
| You decide | Claude picks based on safety vs. simplicity. | |

**User's choice:** Live data with Realtime subscription.
**Notes:** No additional notes.

---

### Follow-up: Show ConnectionBanner?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show it | Consistent with session board. Counselors know if count is stale. Critical for safety. | ✓ |
| No, keep screen clean | Banner is noise during ceremony. | |

**User's choice:** Yes, show ConnectionBanner.
**Notes:** Safety concern — disconnection means count could be stale.

---

## Responsive Scope & Priority

### SessionHeader adaptation

| Option | Description | Selected |
|--------|-------------|----------|
| Stack vertically on small screens | md+: current single-row layout. Mobile: pool name row top, count below. | ✓ |
| Shrink count text on small screens | Responsive text-2xl mobile / text-4xl md+. Single row at all sizes. | |
| You decide | Claude picks responsive adaptation. | |

**User's choice:** Stack vertically on small screens.
**Notes:** Count stays large — just moves below the title row.

---

### AddPairForm adaptation

| Option | Description | Selected |
|--------|-------------|----------|
| Stack fields vertically on mobile | flex-col md:flex-row on CamperField container. | ✓ |
| Keep side-by-side, shrink inputs | Both fields stay in one row on all sizes. | |

**User's choice:** Stack fields vertically on mobile.
**Notes:** No additional notes.

---

### Scope of responsive pass

| Option | Description | Selected |
|--------|-------------|----------|
| Just the session board (header + entry form) | Admin screens are desktop-only. Login and pools page are simple enough. | ✓ |
| Include login page and pools page too | Light responsive pass on all counselor-facing screens. | |
| You decide | Claude identifies and fixes whatever is broken. | |

**User's choice:** Just the session board.
**Notes:** Admin screens are desktop-only — no responsive work needed there.

---

## Claude's Discretion

- Exact text size for the giant count on the buddy call screen (text-6xl or text-8xl suggested)
- Visual design of the "Back to board" link (chevron-left icon from lucide-react)
- Whether a minimal pair list appears below the count (if it fits without crowding; otherwise omit)
- Whether the buddy call route needs a separate Supabase client hook or reuses the LiveBoard pattern

## Deferred Ideas

- Pair list with per-pair check-off tracking — v2 requirement (REQUIREMENTS.md v2)
- Print-friendly buddy call sheet — v2
- Session history / past buddy boards — v2
