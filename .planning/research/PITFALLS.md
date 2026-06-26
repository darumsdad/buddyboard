# Domain Pitfalls: BuddyBoard

**Domain:** Real-time collaborative safety-critical web app (pool safety tracking)
**Researched:** 2026-06-26
**Confidence:** HIGH — findings verified across official sources, OWASP documentation, and multiple independent technical sources

---

## Critical Pitfalls

Mistakes that cause rewrites, safety failures, or complete loss of trust in the system.

---

### Pitfall 1: Silent Disconnection — The App Appears Live But Is Dead

**What goes wrong:**
A counselor's iPad drops WiFi poolside. The WebSocket connection closes. The board continues to display the last-known state with no visual indication that it is stale. New pairs added by other counselors stop appearing. The counselor believes the board is live and current. It is not. During a buddy call, they call against outdated data.

**Why it happens:**
WebSocket close events do not always fire promptly on mobile — the OS may not surface the network loss immediately, and the WebSocket `close` event may lag by 30–90 seconds or never fire at all on some iOS versions. Apps that only listen to `close` miss this window. Apps that show no connection status indicator give the user no signal that anything is wrong.

**Warning signs:**
- No connection status indicator in the UI during development
- Reconnection logic written but never tested with actual network interruption
- `onclose` is the only disconnection detection mechanism (no heartbeat/ping)
- Developers testing only on localhost where drops never occur

**Prevention:**
- Implement a server-sent heartbeat (ping every 15–20 seconds). If the client does not receive a ping within 2x the interval, treat the connection as dead.
- Display a persistent, unmissable banner ("Disconnected — data may be outdated. Reconnecting...") when the heartbeat is missed or the socket closes. Do not use a subtle color change — use a prominent red banner with text.
- On the buddy call screen specifically, show a large warning if connection was lost at any point during the session.
- Test disconnection scenarios explicitly during development (airplane mode, throttled network in DevTools).

**Phase to address:** Real-time sync foundation phase (before any collaborative features ship)

---

### Pitfall 2: Reconnection Without State Rehydration — Missed Events Cause Phantom Data

**What goes wrong:**
A counselor's device disconnects for 45 seconds and reconnects. The WebSocket reconnects successfully. However, during the gap: two pairs were added and one was removed by other counselors. The reconnected client does not fetch these missed events. The board shows the pre-disconnect state. The counselor sees ghost pairs that have already exited, and does not see pairs that are actually in the water.

**Why it happens:**
Most implementations handle the "happy path" — messages flow over an open connection. Reconnection is treated as an afterthought. The reconnecting client receives only events emitted after it rejoined, not events missed during the gap. WebSocket event streams are not durable by default; missed events are lost unless the server explicitly replays them or the client fetches a full snapshot.

**Warning signs:**
- Reconnection logic calls `socket.connect()` and does nothing else
- No sequence numbers or timestamps on events
- No "fetch current state" call after reconnect
- Tests only verify happy-path message delivery

**Prevention:**
- On every reconnect, the client must request a full snapshot of the current pool state from the REST API before trusting the socket stream. This is simpler than event replay and appropriate at BuddyBoard's scale.
- Treat the reconnection event as a "cold start": wipe local state, fetch canonical state from server, then resume listening for socket events.
- Include a visual indicator ("Reconnected — syncing...") while the snapshot fetch completes so counselors know to wait before acting.

**Phase to address:** Real-time sync foundation phase

---

### Pitfall 3: Concurrent Writes Without Conflict Detection — Last Write Silently Wins

**What goes wrong:**
Two counselors at Pool 1 simultaneously attempt to register the same camper pair (a common scenario during a rush of campers entering). Both clients send their add request. The server processes both, creating duplicate pairs. Alternatively, one counselor removes a pair at the exact moment another counselor is viewing them — the remove wins, but the second counselor's screen still shows them for a moment before the event arrives, and if they act on stale state (e.g., click "remove" on an already-removed pair), the server returns an error that is swallowed silently.

**Why it happens:**
REST endpoints that process each request independently without checking current state allow "read-modify-write" race conditions. Duplicate pairs are an especially likely failure for poolside entry where two counselors may register the same kid simultaneously. Error responses from failed mutations that are not surfaced to the user leave the UI in a state that diverges from the server.

**Warning signs:**
- No unique constraint on (pool_session_id, camper_id) in the database
- Client-side "remove" does not confirm server success before updating UI (pure optimistic update)
- API errors from mutations are console.log'd but not shown to the user

**Prevention:**
- Enforce a unique constraint at the database level: one active pair per camper per session. Attempting to add a duplicate must return a clear 409 Conflict, not silently create a second row.
- Surface all mutation errors to the user with a toast or inline error ("This camper is already registered in this session").
- For the remove action specifically, use a confirmed-on-server approach (not pure optimistic): disable the row immediately on click, await server confirmation, then remove it — or re-enable it with an error if the server rejects.
- WebSocket events for add/remove from other counselors must be idempotent on the client: receiving an "add" for a pair already in local state should be a no-op, not a duplicate.

**Phase to address:** Pair management feature phase

---

### Pitfall 4: Optimistic UI on Safety-Critical Actions — The Board Lies

**What goes wrong:**
A counselor taps "Remove pair" on a pair that just exited the pool. The UI immediately removes the row (optimistic update). The network request fails silently (weak WiFi, server error). The pair is now gone from the counselor's screen but still in the database and still visible on every other device. The counselor believes the pair has checked out. They are still in the water. Nobody is tracking them.

**Why it happens:**
Optimistic UI is a standard pattern to improve perceived performance. It is appropriate for low-stakes edits (renaming, reordering) but dangerous for safety-critical state changes. The assumption that the server will confirm the mutation is correct 99% of the time and catastrophically wrong the other 1%.

**Warning signs:**
- "Remove pair" immediately removes the row without waiting for server acknowledgment
- Network errors during pair removal are not communicated to the user
- No rollback behavior for failed mutations is implemented or tested

**Prevention:**
- For "remove pair" specifically: do not remove the row from the UI until the server confirms the deletion (HTTP 200 or WebSocket event confirming removal). Show a brief "Removing..." state on the row. If the server fails, show a clear error and restore the row.
- For "add pair": optimistic add is acceptable because the failure mode (row appears but then disappears with an error) is less dangerous than the alternative failure mode for removal.
- Establish an explicit policy per action: which actions are optimistic, which are confirmed. Document and test both the success and failure paths.

**Phase to address:** Pair management feature phase

---

### Pitfall 5: No Connection Status Visible to Counselors — Unknown Unknowns

**What goes wrong:**
A counselor does not know whether they are connected or disconnected. They cannot tell if the board they see is 5 seconds old or 5 minutes old. In the absence of visible status, they assume "it is working." This is the foundational UX failure that makes all other connection pitfalls catastrophic — the user has no basis for skepticism.

**Why it happens:**
Developers build and test on reliable localhost connections and never experience the failure state. Connection status UI feels like polish, not a core feature. It gets deferred to "later" and often never ships.

**Warning signs:**
- No connection status component exists in the UI
- The design shows the board content but no indicator of sync state
- Connection status is mentioned as a "nice to have" in planning

**Prevention:**
- Connection status is a safety feature in this app, not a cosmetic one. Design it as such from phase one of the real-time sync work.
- Display three states at minimum: Connected (green indicator, subtle), Reconnecting (yellow, with spinner), Disconnected (red banner, prominent, with text explaining what the counselor should do — e.g., "Check WiFi. Data may be outdated.").
- The buddy call screen must show the connection status prominently — this is the screen used during the physical safety ritual.

**Phase to address:** Real-time sync foundation phase

---

### Pitfall 6: Excel Import Silently Drops or Corrupts Campers

**What goes wrong:**
The admin uploads a 250-row roster Excel file. The import appears to succeed ("250 rows imported"). However: 3 campers with accented characters in their names (e.g., "Zoé") had their names corrupted to "Zo?" due to encoding mismatch. 2 campers whose codes were stored as numeric by Excel (leading zeros stripped: "007" became "7") now have invalid codes that do not match the physical tags given to campers. 4 rows with blank required fields were silently skipped. Counselors cannot find these 9 campers by code during poolside entry.

**Why it happens:**
Excel serializes data in ways that are destructive: numeric-looking strings lose leading zeros, dates auto-format to regional formats, UTF-8 encoded names become corrupted when the file is saved as XLSX with a non-UTF encoding. Most import implementations parse what they get without validating what was lost.

**Warning signs:**
- Import endpoint returns a single success count with no detail on skipped/failed rows
- Camper codes are stored as numbers in the database (not strings)
- No post-import validation report is shown to the admin
- Import was only tested with clean ASCII data in development

**Prevention:**
- Store camper codes as strings (VARCHAR), never as integers. Enforce this at the database schema level.
- Parse XLSX files using a library that explicitly handles encoding (e.g., SheetJS/xlsx with `codepage` options). Test with files containing accented characters, Arabic names, and numeric-looking codes.
- After import, show the admin a detailed report: rows successfully imported, rows skipped (with row number and reason — "missing name", "duplicate code", etc.), and rows where values were coerced (e.g., "code normalized from '7' to '007' — please verify").
- Reject the entire import if the column structure does not match the expected format, with a clear error message explaining the expected format.
- Make imports idempotent: importing the same file twice should not create duplicates. Use camper code as the upsert key.

**Phase to address:** Admin/roster management phase

---

### Pitfall 7: Authorization Enforced Only on the Frontend

**What goes wrong:**
The admin panel is hidden from the counselor role in the UI — no admin links are shown, no admin routes are rendered. A counselor who knows the URL navigates directly to `/admin/campers` and can add, edit, or delete campers without restriction. Or a counselor crafts a direct HTTP request to `DELETE /api/campers/42` and deletes a camper mid-session.

**Why it happens:**
Frontend routing guards feel like security. They are not — they are UX. Any determination made only in client-side JavaScript can be bypassed by any user who opens DevTools or sends a raw HTTP request. This is one of the most common and well-documented web security mistakes.

**Warning signs:**
- Admin vs. counselor distinction is enforced with an `if (user.role === 'admin')` check in the React component tree
- API endpoints do not check the authenticated user's role before executing mutations
- Role is stored in a cookie or localStorage value that the client could modify

**Prevention:**
- Every API endpoint that performs an admin action (camper management, user management, pool configuration) must check the authenticated user's role on the server before executing. This check must live in middleware or the route handler — never rely on the client to send the correct role.
- Role must be derived from the server-side session or JWT signature, never from a client-supplied parameter.
- Counselor-facing endpoints (add pair, remove pair, view session) must also be scoped to valid sessions at the correct pool — a counselor at Pool 1 must not be able to remove pairs from Pool 2 via a direct API call.

**Phase to address:** Authentication and authorization phase (must be correct before any other features)

---

### Pitfall 8: Outdoor Sunlight Makes the Buddy Call Screen Unreadable

**What goes wrong:**
During a buddy call — the most safety-critical moment in the workflow — the counselor holds up their iPad in direct sunlight. Standard iPads (300–500 nits) wash out in direct sunlight. Low-contrast UI elements (gray text on white, colored badges) become invisible. Counselors can only read the board in shade. At a real pool, shade is not always available.

**Why it happens:**
Apps are designed and tested indoors on calibrated monitors. Outdoor readability is not considered a design constraint. Light-colored UI themes, thin fonts, and pastel-colored status indicators — all common in modern web design — fail catastrophically in outdoor conditions.

**Warning signs:**
- Design uses gray text on white background for secondary information
- Color is the only differentiator between states (e.g., green pair vs. red pair with no text label)
- The buddy call screen has not been tested outdoors on an actual iPad

**Prevention:**
- The buddy call screen must target the highest possible contrast: near-black text on pure white, or white text on very dark background. WCAG AAA contrast (7:1 ratio) is the minimum target, not AA (4.5:1).
- Do not rely on color alone to convey any state. Use text labels alongside color.
- Use large font sizes — minimum 18px for secondary text, 24px+ for camper names. Under outdoor lighting, even normally legible text becomes hard to read.
- Touch targets must be large (minimum 48x48px per Apple HIG and Material Design guidelines) — counselors operating under stress, potentially with wet hands, cannot accurately tap small targets.
- Test the buddy call screen specifically on an actual iPad outdoors before considering it done.

**Phase to address:** Buddy call / poolside UX phase

---

### Pitfall 9: Pool Session State Is Ambiguous — Open vs. Closed Is Not Enforced

**What goes wrong:**
A counselor at Pool 2 forgets to close the session at the end of the day. The next morning, the new shift counselor opens the app and sees yesterday's buddy pairs still listed as "active." They do not realize these are stale. They start their new session but the old pairs are not clearly marked as belonging to a previous session. During a buddy call, they call against a list that includes children who are not at the pool.

**Why it happens:**
Session state lifecycle is often underspecified during development. "Close session" feels like a simple flag flip, but the downstream consequences — what is visible to whom, what counts as "active" — are not fully traced through the data model. Apps ship with implicit rules that are never made explicit.

**Warning signs:**
- "Closed sessions are not shown in active pool view" is a requirement but has no test covering the edge case of an unclosed session from a previous day
- The session entity exists but "active vs. closed" is stored as a boolean with no timestamp
- There is no automatic session closure or expiry logic

**Prevention:**
- A session must have an explicit status (open, closed) with a `closed_at` timestamp, not just a boolean.
- The "active pool view" query must filter by `closed_at IS NULL` — never by a client-supplied parameter.
- Consider adding a safeguard: if a session has been open for more than N hours (e.g., 12) without any activity, display a prominent warning to the next counselor who opens the pool view asking them to confirm whether to continue the session or close it and start fresh.
- The session close action must require an explicit confirmation ("You are closing Pool 2. All current pairs will be archived. This cannot be undone.") to prevent accidental closure during an active swim.

**Phase to address:** Session management phase

---

### Pitfall 10: Typeahead Search Creates Fast-but-Wrong Pair Registration

**What goes wrong:**
A counselor types "Jac" into the camper search. Three results appear: "Jack Smith," "Jackson Lee," and "Jacqueline Torres." Under poolside pressure (line of kids waiting), the counselor taps the first result without fully reading it. They register "Jack Smith" instead of "Jackson Lee." Jack is now registered as being in the water. He is not. Jackson is in the water with no registered pair.

**Why it happens:**
Typeahead search optimizes for speed. In a calm office, users read results carefully. At a busy poolside with a line of kids, users tap the first result reflexively. This is exacerbated by small touch targets, low-contrast text (see Pitfall 8), and mobile keyboard interactions that auto-advance focus.

**Warning signs:**
- The typeahead shows name-only results with no disambiguating detail (cabin, age group, code)
- There is no confirmation step before the pair is registered
- The first result is auto-highlighted and can be accidentally triggered by a second tap

**Prevention:**
- Show disambiguating information alongside each name in the typeahead: camper code, cabin, or age group. This allows counselors to quickly verify the correct child without reading the full name carefully.
- Prioritize code-based lookup (single unique code field) as the primary registration path over typeahead. Codes are deterministic and unambiguous — pressing "007" and confirming is safer than selecting from a list.
- Add a brief confirmation display before finalizing pair registration: show both campers' full names and codes and require a confirm tap. This adds one interaction but prevents the most dangerous failure mode.
- Do not auto-select or auto-submit the first typeahead result on enter/tap.

**Phase to address:** Pair registration UX phase

---

## Moderate Pitfalls

---

### Pitfall 11: WebSocket Rooms Not Scoped to Pool — Cross-Pool Data Leakage

**What goes wrong:**
All connected clients receive all events. A pair added at Pool 1 is broadcast to clients viewing Pool 2 and Pool 3. The receiving clients ignore the event (because it is for a different pool), but now all clients are processing irrelevant traffic. Worse: if the client-side filter has a bug, Pool 2 counselors see Pool 1 pairs on their board.

**Prevention:**
- Use room/channel scoping from day one. Each pool session gets its own WebSocket room. Clients join only the room for their current pool. Server only broadcasts events to the relevant room. This is a fundamental architectural decision that is extremely expensive to retrofit.

**Phase to address:** Real-time sync architecture phase (foundational)

---

### Pitfall 12: No Audit Trail for Safety-Critical Mutations

**What goes wrong:**
After an incident, there is no record of who added or removed which pair at what time. Was the pair ever registered? Who removed them? When? Without an audit log, these questions cannot be answered and liability cannot be assessed.

**Prevention:**
- Log all pair add/remove events with: counselor user ID, pool session ID, camper IDs, timestamp, and action type. Store these in an immutable event log (append-only). This is distinct from the "session archive" requirement — the archive stores final state; the event log stores every change.
- The `closed_at` timestamp requirement from Pitfall 9 is part of this broader audit culture.

**Phase to address:** Session management / data model phase

---

### Pitfall 13: Excel Import Allows Roster Replacement Without Warning

**What goes wrong:**
An admin re-imports a roster mid-season to add new campers. The import logic treats it as a full replacement, deleting all existing campers and re-inserting from the file. Campers who were added individually after the last import (Pitfall 6) are silently deleted. Any active session referencing those campers now has orphaned pairs.

**Prevention:**
- Default import behavior must be additive (upsert by camper code, never delete). Only allow full replacement as an explicit, separately-confirmed action with a destructive warning ("This will delete all campers not in this file").
- Enforce a foreign key or soft-delete pattern: campers referenced by any session pair cannot be hard-deleted.

**Phase to address:** Admin/roster management phase

---

### Pitfall 14: JWT or Session Token Not Validated on WebSocket Upgrade

**What goes wrong:**
The HTTP API requires a valid auth token on every request. The WebSocket endpoint does not — it was added later and the developer forgot to add middleware. Any unauthenticated client that knows the WebSocket URL can connect and receive all real-time events for any pool.

**Prevention:**
- Require authentication on the WebSocket handshake. Pass the session token as a query parameter or cookie during the initial HTTP upgrade request and validate it on the server before the upgrade completes.
- Test this explicitly: attempt a WebSocket connection with an invalid token and verify the server rejects it with a 401.

**Phase to address:** Authentication and authorization phase

---

## Minor Pitfalls

---

### Pitfall 15: Pool Configuration Hard-Coded in Source Code

**What goes wrong:**
The requirement explicitly states pool count and names must be changeable without a code change. If pool names are defined in a config file committed to the repo, changing them requires a deployment. If they are in environment variables, a camp admin cannot change them without developer access.

**Prevention:**
- Store pool configuration in the database from the start. Provide an admin UI to add, rename, or deactivate pools. This is a small amount of work up front that prevents a guaranteed pain point when the camp changes pool names or adds a fourth pool.

**Phase to address:** Admin configuration phase

---

### Pitfall 16: Typeahead Fires Too Many API Requests

**What goes wrong:**
On a slow connection, each keystroke fires a search request. Responses arrive out of order (network jitter causes "Jac" response to arrive after "Jack" response). The typeahead renders the "Jac" results (older, fewer results) on top of the "Jack" results. The counselor sees stale options.

**Prevention:**
- Debounce typeahead input (300–400ms minimum). Cancel in-flight requests when a newer request is sent (use AbortController). Consider loading the full camper roster into memory on session start (it will be at most a few hundred records) and running typeahead search entirely client-side — this eliminates the latency and out-of-order issue entirely and reduces server load.

**Phase to address:** Pair registration feature phase

---

### Pitfall 17: Multiple Browser Tabs by Same Counselor Create Confusion

**What goes wrong:**
A counselor opens the app in two tabs on the same iPad (common when they accidentally tap a link). One tab is on the buddy board, the other is on the pair registration screen. Both are connected to the WebSocket. Actions in one tab do not update the other tab's local UI state (they share the same session but not the same React state). The counselor sees inconsistent views.

**Prevention:**
- Use the WebSocket event stream as the canonical update mechanism for all tabs. Any mutation confirmed by the server should arrive as a WebSocket event which all tabs handle. Do not update UI state directly from the mutation response — wait for the event. This way all tabs stay in sync automatically.

**Phase to address:** Real-time sync architecture phase

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Real-time sync foundation | Silent disconnection with no UI indicator (Pitfall 1) | Heartbeat + prominent status banner before other features |
| Real-time sync foundation | Reconnection without state rehydration (Pitfall 2) | Full snapshot fetch on every reconnect |
| Real-time sync architecture | Events broadcast to wrong pool (Pitfall 11) | Implement room scoping before any pool-specific features |
| Authentication / authorization | Frontend-only role enforcement (Pitfall 7) | Server-side role checks in middleware, not components |
| Authentication / authorization | WebSocket not auth-gated (Pitfall 14) | Validate token on upgrade handshake |
| Pair registration UX | Typeahead misidentification (Pitfall 10) | Disambiguating details + confirmation step |
| Pair registration UX | Typeahead out-of-order responses (Pitfall 16) | Debounce + AbortController or client-side search |
| Pair management | Optimistic remove on safety-critical action (Pitfall 4) | Confirmed-on-server for remove, not optimistic |
| Pair management | Concurrent add creates duplicates (Pitfall 3) | DB unique constraint + 409 handling |
| Admin / roster management | Excel encoding and silent row drops (Pitfall 6) | Detailed import report, string code storage |
| Admin / roster management | Destructive re-import (Pitfall 13) | Upsert-by-default, explicit warning for full replace |
| Session management | Ambiguous open/closed state (Pitfall 9) | Explicit status + timestamp + stale session warning |
| Session management | No audit trail (Pitfall 12) | Append-only event log from the start |
| Buddy call / poolside UX | Sunlight readability failure (Pitfall 8) | High-contrast design, large touch targets, outdoor test |
| Admin pool config | Hard-coded pool names (Pitfall 15) | DB-stored config with admin UI from day one |

---

## Sources

- [WebSocket Architecture Best Practices — Ably](https://ably.com/topic/websocket-architecture-best-practices)
- [WebSocket Reconnection: State Sync and Recovery Guide — WebSocket.org](https://websocket.org/guides/reconnection/)
- [Robust WebSocket Reconnection Strategies — DEV Community](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)
- [Handling Race Conditions in Real-Time Apps — DEV Community](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8)
- [The Lost Update Problem in Concurrency Control — Baeldung](https://www.baeldung.com/cs/concurrency-control-lost-update-problem)
- [Offline-First Architecture: Designing for Reality — Medium](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79)
- [The Top 6 Excel Data Import Errors — Flatfile](https://flatfile.com/blog/the-top-excel-import-errors-and-how-to-fix-them/)
- [Data Import Errors: Why Your CSV Rows Silently Fail — Dromo](https://dromo.io/blog/common-data-import-errors-and-how-to-fix-them)
- [Understanding RBAC and ABAC Bugs From a Pentester's Lens — Medium](https://medium.com/@Gakusen/understanding-rbac-and-abac-bugs-related-to-them-from-a-pentesters-lens-144b6118f52e)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Testing for Concurrent Sessions — OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/11-Testing_for_Concurrent_Sessions)
- [Optimistic UI: Making Apps Feel Faster — Medium](https://medium.com/@alexglushenkov/optimistic-ui-making-apps-feel-faster-even-when-theyre-not-ea296bc84720)
- [Sunlight Readable Touchscreens — UICO](https://www.uico.com/sunlight-readable-touchscreens-high-brightness)
- [Real-Time Reliability: Client-Server Heartbeats — Medium](https://medium.com/@onakoyak/real-time-reliability-using-client-server-heartbeats-to-ensure-consistent-online-status-in-a-chat-429ae3c2d94a)
- [Prevent Duplicate Records During Spreadsheet Uploads — CSVBox](https://blog.csvbox.io/prevent-duplicate-records-spreadsheet-uploads/)
