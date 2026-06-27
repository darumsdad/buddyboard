# BuddyBoard — v1 Requirements

## v1 Requirements

### Authentication (AUTH)

- [ ] **AUTH-01**: User can log in with username and password
- [ ] **AUTH-02**: Authenticated session persists across browser restarts (remember me)
- [ ] **AUTH-03**: Admin can add a new user account (username + password + role)
- [ ] **AUTH-04**: Admin can remove a user account
- [ ] **AUTH-05**: Admin can reset any user's password from the admin screen (no email flow)

### Camper Roster (CAMP)

- [ ] **CAMP-01**: Admin can upload an Excel spreadsheet to bulk-import campers (name + admin-assigned code)
- [ ] **CAMP-02**: Camper codes are stored and treated as strings (preserves leading zeros)
- [ ] **CAMP-03**: Admin can add an individual camper manually (name + code)
- [ ] **CAMP-04**: Admin can edit a camper's name or code
- [ ] **CAMP-05**: Admin can remove a camper from the roster
- [ ] **CAMP-06**: Admin can search and filter the camper list by name or code

### Pool Configuration (POOL)

- [ ] **POOL-01**: Admin can add, rename, and remove pools without a code change
- [ ] **POOL-02**: System ships with 3 pools configured by default

### Sessions (SESS)

- [ ] **SESS-01**: Counselor can start a new pool session by selecting a pool from the configured list
- [ ] **SESS-02**: System prompts for confirmation before closing a session that has active pairs
- [ ] **SESS-03**: Session data (buddy pairs, timestamps) is archived when a session is closed — not deleted
- [ ] **SESS-04**: Closed sessions are not shown in the active pool view

### Buddy Pairs (PAIR)

- [ ] **PAIR-01**: Counselor can register a buddy pair by entering two camper codes
- [ ] **PAIR-02**: Counselor can register a buddy pair by typing a name with live typeahead search (first/last name)
- [ ] **PAIR-03**: Counselor can remove a buddy pair; removal is confirmed by server before the UI updates
- [ ] **PAIR-04**: System prevents the same camper from appearing in two active pairs simultaneously (enforced at the database level)
- [ ] **PAIR-05**: All buddy pair changes (add, remove) appear in real time on all devices connected to the same pool

### Buddy Board (BOARD)

- [ ] **BOARD-01**: Counselor can view a live, scrollable buddy board showing all active pairs for their pool
- [ ] **BOARD-02**: Buddy board displays total swimmer count and pair count (e.g. "12 swimmers — 6 pairs")
- [ ] **BOARD-03**: Counselor can open a buddy call screen — a clean, high-contrast, scrollable list of all pairs optimized for outdoor use (large text, high contrast, large touch targets)
- [ ] **BOARD-04**: App displays a prominent connection status indicator ("Connected / Reconnecting / Disconnected — data may be stale")
- [ ] **BOARD-05**: Empty buddy board clearly communicates why it is empty (no pairs checked in vs. not connected / loading)

### Devices (UX)

- [ ] **UX-01**: App is fully usable on iPad and laptop (primary experience)
- [ ] **UX-02**: App is best-effort responsive on iPhone — all features accessible, layout may be compact

---

## v2 Requirements (Deferred)

- Buddy call check-off / confirmation tracking per pair
- Email-based password reset
- Viewing or searching session history / past buddy boards
- Bulk remove all pairs (end-of-session clear)
- Counselor-facing notifications (e.g. alert when a pair has been in the pool unusually long)
- Print-friendly buddy call sheet

---

## Out of Scope

- **OAuth / third-party login** — unnecessary complexity for camp staff
- **Pool transfer** — kids re-register fresh at the new pool; no pair migration between pools
- **RFID / wearable / NFC integration** — out of scope for v1
- **Parent-facing features** — no parent portal or notifications
- **Native mobile app** — responsive web covers the iPhone use case
- **Swimming zone / depth tracking** — physical safety infrastructure, not this app's concern
- **Automated session scheduling** — counselors open and close sessions manually

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| CAMP-01 | Phase 3 | Pending |
| CAMP-02 | Phase 3 | Pending |
| CAMP-03 | Phase 3 | Pending |
| CAMP-04 | Phase 3 | Pending |
| CAMP-05 | Phase 3 | Pending |
| CAMP-06 | Phase 3 | Pending |
| POOL-01 | Phase 3 | Pending |
| POOL-02 | Phase 3 | Pending |
| SESS-01 | Phase 4 | Pending |
| SESS-02 | Phase 4 | Pending |
| SESS-03 | Phase 4 | Pending |
| SESS-04 | Phase 4 | Pending |
| PAIR-01 | Phase 4 | Pending |
| PAIR-02 | Phase 4 | Pending |
| PAIR-03 | Phase 4 | Pending |
| PAIR-04 | Phase 4 | Pending |
| PAIR-05 | Phase 5 | Pending |
| BOARD-01 | Phase 5 | Pending |
| BOARD-02 | Phase 5 | Pending |
| BOARD-03 | Phase 6 | Pending |
| BOARD-04 | Phase 5 | Pending |
| BOARD-05 | Phase 5 | Pending |
| UX-01 | Phase 6 | Pending |
| UX-02 | Phase 6 | Pending |

---

## Requirement Quality Notes

All requirements are written as observable user capabilities ("Counselor can X", "Admin can Y") and are testable independently. Codes stored as strings (CAMP-02) and server-enforced duplicate detection (PAIR-04) are explicitly called out because they are non-obvious implementation constraints with safety implications.
