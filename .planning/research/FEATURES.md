# Feature Landscape: BuddyBoard

**Domain:** Real-time pool safety check-in / buddy pair tracking for summer camp
**Researched:** 2026-06-26
**Sources:** ACA aquatics safety guidelines, Westchester County Buddy Board procedures, event check-in industry research, camp management software ecosystem, WebSocket UX pattern literature

---

## Table Stakes

Features users of check-in and roster systems expect as baseline. Their absence makes the product feel broken or untrustworthy.

| Feature | Why Expected | Complexity | Spec Status |
|---------|--------------|------------|-------------|
| Real-time pair display across all devices at same pool | Multi-device collaboration is the whole point; stale boards are dangerous | Med | In spec |
| Camper lookup by unique code (fast single-field) | Physical buddy tag systems run on this; counselors expect it | Low | In spec |
| Camper name typeahead (first/last) | Fallback when code unknown; standard in every check-in system | Low-Med | In spec |
| Remove a pair when kids exit | Core lifecycle — register in, remove out | Low | In spec |
| Buddy call screen — large text, scrollable, ordered | Used in outdoor sun on iPad; clarity is a safety requirement | Low | In spec |
| Pool session start/end | Standard session lifecycle; counselors expect a clear "I am now managing Pool 2" | Low | In spec |
| **Connection status indicator** | If WebSocket silently fails, board shows stale data. Counselors must know real-time updates are live. Silent failure is a safety risk. | Low | **MISSING** |
| **Total camper count in water** | Physical buddy boards always show a total head count. Verbal buddy calls begin with "we have N swimmers." Absence of a live count is jarring. | Low | **MISSING** |
| **Duplicate camper detection** | If Counselor A registers Camper X and Counselor B also tries to register Camper X, the system must warn. Physical tags prevent this naturally. | Med | **MISSING** |
| **Empty-state disambiguation** | Board showing zero pairs must clearly distinguish "nobody is in the water" from "system is loading/disconnected." Safety critical — these have opposite meanings. | Low | **MISSING** |
| Fast pair entry — keyboard flow | Code entry → auto-advance to second camper → submit with Enter. No mouse. Poolside entry must be two-hand fast. | Low | **MISSING (UX detail)** |
| Admin roster CRUD (add/edit/remove camper) | Standard for any pre-loaded roster system | Med | In spec |
| Excel roster upload | Camp admin reality — rosters live in spreadsheets | Med | In spec |
| User account management (add/remove/reset password) | Two-role system requires this | Low | In spec |
| Session data archived, not deleted | Safety records; audit trail; same pattern as all camp safety software | Low | In spec |

### Expanded Notes on Missing Table Stakes

**Connection status indicator (HIGH priority gap)**

WebSocket connections can fail silently — the browser reports the connection as open while no messages are being received. This is a documented failure mode (see WebSocket literature). In a general app this is annoying; in a pool safety system showing who is in the water, a stale board is a liability. The indicator must show:
- Connected / receiving live updates (green / steady)
- Reconnecting (amber / pulsing)
- Disconnected — data may be stale (red / prominent warning)

Implementation is low complexity (a banner or status chip driven by WebSocket lifecycle events) but its absence is a major safety gap.

**Total camper count in water**

Every physical buddy board and every ACA-referenced aquatics procedure begins buddy calls with a head count: "We have 12 swimmers, 6 pairs." Counselors running a buddy call from BuddyBoard will instinctively look for this number. It is trivially derived from `pairs.length * 2` and should appear prominently on both the live board and the buddy call screen.

**Duplicate camper detection**

Physical buddy tag boards prevent duplicate registration because a tag is a physical object — it cannot be in two places at once. A digital system loses this constraint. If two counselors simultaneously register the same camper (common at shift handoffs or when a counselor doesn't see a pair already on the board), one registration silently wins or both persist, creating a phantom pair. The system should reject a second registration of a camper already in an active pair and show a clear error: "Alex T. is already registered with Jordan M."

**Empty-state disambiguation**

Camp directors on ACA forums note that false "missing camper" alarms frequently occur during pool evacuations when tags were not properly reconciled. A blank board in BuddyBoard should never look the same as a loading board or a disconnected board. Three states need distinct visuals:
1. No active pairs (pool is empty — all good)
2. Loading / reconnecting (do not trust this view yet)
3. Disconnected (data may be stale — treat with caution)

---

## Differentiators

Features that exceed baseline expectations. Not required, but they distinguish BuddyBoard from a hastily built spreadsheet.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Time-in display per pair | Shows how long each pair has been in the water. Physical tags have this implicitly (arrival time is visible). Useful for rotation management, spotting pairs that have been in too long. | Low | Requires storing `enteredAt` timestamp per pair; display only |
| Admin multi-pool dashboard | Single view of live counts across all 3 pools. Admin doesn't have to navigate per-pool to see camp-wide status. | Med | Useful for waterfront director, not per-pool counselors |
| Session close guard | If counselor tries to end a session while pairs are still registered, show a confirmation: "8 campers still in water. Close anyway?" Prevents accidental mid-session termination. | Low | High safety value for low cost |
| Pair registration confirmation toast | Brief confirmation ("Pair registered: Alex T. + Jordan M.") so counselors know the action was processed, especially when network latency is present. | Low | Standard UX for mutation feedback |
| Camper "not in roster" fast path | Allow registering an out-of-roster camper with a name-only entry (walk-in, visitor). Marks pair as unverified. Avoids counselor workflow breakage on edge cases. | Med | Needs clear visual distinction from roster campers |
| Print/export buddy call list | If internet goes down poolside, counselor can print or screenshot the current board. Browser print CSS is sufficient; a "Print" button formats the buddy call list cleanly. | Low | Offline fallback for safety-critical ops |
| Session history / audit log | Closed sessions with timestamps and pair records. Camp safety plans often require documentation. Already archived per spec; a read-only admin view costs little. | Low-Med | Data already in DB; UI is the only cost |
| Keyboard shortcut: start buddy call | Single key or button press to jump from the live board to buddy call screen. Counselors will run this constantly. | Low | Pure UX; high counselor value |
| Pool capacity warning | If a pool has a configured max occupancy, show a warning when approaching or exceeding it. Configurable by admin. | Med | Requires per-pool config field |

---

## Anti-Features

Explicitly not worth building for v1 — either scope creep, wrong abstraction, or better handled outside the app.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Buddy call check-off (mark pairs as confirmed during roll call) | Spec explicitly defers this. Adds state management complexity. v1 value of BuddyBoard is the visible list, not confirmed-vs-pending tracking. | Read the board visually; add in v2 if counselors request it |
| Buddy pair transfer between pools | Kids re-register at new pool. Transfer logic creates cross-pool pair state that is hard to reconcile and error-prone. | Remove pair at old pool, register fresh at new pool |
| OAuth / SSO login | Unnecessary complexity for a closed staff system with ~20 accounts | Username + password with admin-controlled reset |
| Email-based password reset | Admin-controlled reset is sufficient and removes dependency on email infrastructure | Admin resets passwords directly |
| Parent-facing notifications or views | Completely different product surface. Camp parents are not the user. | Not applicable |
| Medical / allergy integration | Camp medical management is a separate system (CampDoc, CampMinder). BuddyBoard has one job. | Use dedicated camp health software |
| GPS geofencing for check-in | Pools are fixed locations; geofencing adds no value and introduces device permission complexity | Physical presence at poolside is the check-in |
| Wearable / RFID integration | High hardware cost and operational complexity (issuing, collecting, tracking devices). Camp forum research shows this creates daily overhead that erases safety gains. | Manual code entry is fast enough; physical codes are battle-tested |
| Swim ability / zone tracking | Assigning campers to beginner/intermediate/advanced zones is a separate waterfront operation. Out of BuddyBoard's accountability scope. | Track in lifeguard operational docs |
| Scheduling / rotation planning | Shift scheduling is a camp-level problem. BuddyBoard tracks who is in the water right now, not who is scheduled to swim. | Camp-level scheduling software |
| Native iOS / Android app | Responsive web on iPad covers the primary use case. App Store deployment adds maintenance overhead a camp cannot sustain. | Progressive Web App techniques (offline caching) if needed |
| Camper photo IDs on board | Adds storage, upload workflow, and privacy considerations. Names + codes are sufficient for counselor identification. | Verbal name confirmation during buddy call |

---

## Feature Complexity Notes

| Feature | Estimated Complexity | Primary Complexity Driver |
|---------|---------------------|--------------------------|
| WebSocket real-time sync | Medium-High | Reconnection logic, stale detection, race conditions when two counselors register simultaneously |
| Connection status indicator | Low | Driven by WebSocket lifecycle events already in scope |
| Camper typeahead search | Low-Medium | Debounce + server-side name search; manageable with small roster (~200-500 campers typical) |
| Duplicate camper detection | Medium | Must be enforced server-side (not just client-side) due to concurrent counselors; requires atomic check-and-insert |
| Excel roster upload | Medium | Column validation, error reporting for malformed rows, handling re-uploads without duplicating campers |
| Session archiving | Low | A status flag on the session record; no data migration required |
| Buddy call screen outdoor readability | Low-Medium | High contrast theme, large font, no implementation complexity — design effort, not engineering |
| Pool config (names, count) | Low | DB-backed config table; admin UI to edit pool names |
| Time-in display | Low | Store `enteredAt` on pair creation; display elapsed time client-side |
| Admin multi-pool dashboard | Medium | Requires subscribing to all pools' real-time channels simultaneously |

---

## Feature Dependencies

```
Auth system
  └─ Counselor session start
       └─ Pool selection
            └─ Buddy pair registration
                 ├─ Camper roster (pre-loaded by admin)
                 ├─ Duplicate camper check (server-enforced)
                 └─ Real-time broadcast to pool channel
                      └─ Live board display (all devices at pool)
                           └─ Buddy call screen
                           └─ Total count in water
                           └─ Connection status indicator

Admin auth
  └─ Roster management (Excel upload + CRUD)
       └─ Camper lookup (typeahead + code)
  └─ User account management
  └─ Session history view (closed sessions)
  └─ Multi-pool dashboard (all pools live)

Session close
  └─ Session close guard (pairs still active?)
  └─ Session archived (not deleted)
       └─ Session history view
```

**Critical path for MVP:** Auth → Pool session → Camper lookup (code + typeahead) → Pair registration (with duplicate check) → Real-time broadcast → Live board → Buddy call screen → Remove pair → Connection status indicator.

Everything on the critical path must work before any differentiator is considered.

---

## What the Spec Might Have Missed

Summarized for roadmap planning:

1. **Connection status indicator** — Low effort, high safety value. Must ship in v1 alongside real-time features. A real-time safety system with no connectivity feedback is negligent UX.

2. **Total camper count** — One line of derived data, but counselors performing buddy calls will look for it immediately. Ship alongside the buddy call screen.

3. **Duplicate camper detection** — Physical buddy tags prevent this implicitly. Digital systems do not. Two concurrent counselors can register the same camper without a server-enforced unique constraint. This is a correctness/safety requirement, not an enhancement.

4. **Empty-state / loading-state disambiguation** — Zero pairs in water vs. system not loaded must look different. The safety implication of misreading an empty board is serious.

5. **Session close guard** — Closing a session with live pairs should require confirmation. Low cost, prevents accidental data loss during a live swim session.

6. **Keyboard-first entry flow** — The spec describes lookup methods but not the input UX. Counselors enter pairs under time pressure at poolside. Tab-advance and Enter-submit are not automatic in browser forms without intentional design.

7. **Pair registration feedback** — With real-time multi-device systems and potential network latency, counselors need confirmation that their pair registration was received and broadcast. A brief toast is sufficient.
