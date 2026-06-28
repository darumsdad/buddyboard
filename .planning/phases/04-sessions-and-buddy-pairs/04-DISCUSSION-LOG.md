# Phase 4: Sessions & Buddy Pairs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 4-sessions-and-buddy-pairs
**Areas discussed:** Session model, Pair entry UX, Session page layout, Session lifecycle

---

## Session model

| Option | Description | Selected |
|--------|-------------|----------|
| One per pool (shared) | One active session per pool; all counselors share it | ✓ |
| One per counselor | Each counselor starts their own independent session | |

**User's choice:** One per pool (shared)
**Notes:** HTTP-only in Phase 4 — counselors don't see each other's pairs in real time until Phase 5. Manual refresh only.

| Option | Description | Selected |
|--------|-------------|----------|
| No real-time, manual refresh only | Phase 4 is HTTP; B sees A's pairs only after refresh | ✓ |
| Auto-poll every N seconds | Approximate real-time via polling in Phase 4 | |

**User's choice:** Manual refresh only

---

## Pair entry UX

| Option | Description | Selected |
|--------|-------------|----------|
| Two fields, submit together | Both campers entered before submit | ✓ |
| Sequential (pick one, then other) | Wizard-style, two steps | |
| Single field, code-only | No name typeahead | |

**User's choice:** Two fields, submit together

| Option | Description | Selected |
|--------|-------------|----------|
| Type name OR code in same field | One field per camper handles both | ✓ |
| Separate code field + name search | Two distinct modes | |

**User's choice:** Same field accepts code or name

**Minimum to register a pair:**
**User's choice (free-text):** "one more requirement - odd numbers.. the normal use case is pairs - we should have a button that allows a third camper to join the pair if that camper has no buddy (poor kid :))"
**Notes:** User introduced trios. Initially implemented as a "+1" button on each pair row (post-hoc modal); later revised — user wanted the trio to be entered upfront, not as an afterthought hunt through the pair list.

**Revised decision (2026-06-28):** "I dont like that - can we make that add icon (+) next to camper 2 and then that will open a new box and then you add all 3 at that time - this way you don't have to hunt and find a pair to edit - i.e. the triple gets added initially - the third is not an afterthought"

| Option | Description | Selected |
|--------|-------------|----------|
| +1 button on each pair row | Opens single camper picker; max 3 members | (initial impl, superseded) |
| + button next to Camper 2 in the entry form | Reveals optional Camper 3 field; all 3 submitted together | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Max 3 (pairs and trios only) | No +1 button after trio formed | ✓ |
| Unlimited group size | Always allow more | |

| Option | Description | Selected |
|--------|-------------|----------|
| Both fields clear, focus to Camper 1 | Fast repeated entry | ✓ |
| Form stays filled for review | Confirmation beat | |

---

## Session page layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single page: form on top, list below | Everything visible at once | ✓ (with modification) |
| Two tabs: Add pair / Board | Separate tabs | |
| Separate pages | Full navigation | |

**User's choice:** Option 1, but explicitly requested total camper count + total pairs/trios count to also be shown prominently.

| Option | Description | Selected |
|--------|-------------|----------|
| Compact rows — one row per pair/trio | Dense, scannable at scale | ✓ |
| Two-column grid of compact cards | Middle ground | |

**Notes (free-text clarification):** "a buddy call is all buddies in the pool count off and we ensure the number of buddy pairs match the number of buddy pairs on the website - only if (god forbid) the number don't match would we scroll over every pair - so as long as the total number is prominent and there is an easy way to navigate to a details screen to see all the buddies in a list - that is fine."
**Decision:** Swimmer/pair count in sticky header is the hero element. Pair list is secondary. A "View all pairs" link navigates to a detail view (Phase 6 builds the high-contrast buddy call screen there).

| Option | Description | Selected |
|--------|-------------|----------|
| /pools/[poolId] | Per-pool URL, shareable between counselors | ✓ |
| /session/[sessionId] | Per-session URL, less intuitive | |

---

## Session lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-join or auto-create | Click pool → instant session, no prompt | ✓ |
| Explicit 'Start session' confirmation | Prompt before creating | |

| Option | Description | Selected |
|--------|-------------|----------|
| They see the same session — no prompt | Silent join | |
| 'Session in progress — join?' prompt | Explicit join step | ✓ |

**User's choice:** Explicit "Session in progress — join?" prompt when a session already exists.

| Option | Description | Selected |
|--------|-------------|----------|
| 'Close session' button always visible | Confirmation only if active pairs | ✓ |
| Button only appears when no pairs | Must clear pairs first | |

| Option | Description | Selected |
|--------|-------------|----------|
| Back to /pools after close | Clean reset | ✓ |
| Stay on pool page, show 'No active session' | Faster to restart | |

---

## Claude's Discretion

- Typeahead debounce timing (300ms)
- Chip/tag style for resolved campers in entry fields
- "Session in progress" join prompt design (modal vs. inline banner)
- Exact row layout and icon buttons for pair rows
- Loading/submitting states on entry form
- Error display for PAIR-04 duplicate violations

## Deferred Ideas

- Real-time pair updates across devices → Phase 5
- High-contrast buddy call screen → Phase 6
- Live swimmer count via WebSocket → Phase 5
- Session history / past boards → v2
- Bulk remove all pairs → v2
