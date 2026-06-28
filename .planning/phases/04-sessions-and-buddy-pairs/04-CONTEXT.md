# Phase 4: Sessions & Buddy Pairs - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Counselors can select a pool, run a shared session, register buddy pairs (by SwimCode or name typeahead), add a third camper to form a trio, remove pairs, and close the session safely. All data persisted over HTTP — no real-time in this phase (Phase 5). The counselor-facing buddy board is introduced here; the high-contrast buddy call screen is Phase 6.

**Success criteria (from ROADMAP.md):**
1. Counselor can start a new session by selecting a pool from the configured list
2. Counselor can register a buddy pair by entering two camper codes or by typing a name with live typeahead suggestions
3. The system rejects an attempt to add a camper who is already in an active pair in the same session — enforced at the database level
4. Counselor can remove a buddy pair; the pair disappears from the screen only after the server confirms the deletion
5. Closing a session with active pairs requires an explicit confirmation; closed sessions no longer appear in the active pool view, and all pair data is retained in the archive

</domain>

<decisions>
## Implementation Decisions

### Session Model
- **D-01:** One shared session per pool at a time. All counselors at Pool A work on the same session. Clicking a pool navigates to `/pools/[poolId]`; the server auto-joins the existing active session or creates one instantly if none exists.
- **D-02:** Phase 4 is HTTP-only — no real-time sync between counselors. Counselor B sees Counselor A's pairs only after a page refresh. Phase 5 adds WebSocket sync on top of this foundation.
- **D-03:** When a counselor navigates to `/pools/[poolId]` and an active session already exists, they see a "Session in progress — join?" prompt before landing on the board. Communicates shared state explicitly.

### Pair Entry UX
- **D-04:** Pair entry uses two fields (Camper 1 and Camper 2), submitted together. Both fields accept code or name in the same input — if input matches a SwimCode exactly, resolve immediately; if it looks like a name, show typeahead dropdown (format: "Noah Schwartz · Bunk 4" per D-11 from Phase 3). No mode toggle.
- **D-05:** The "Add pair" button is disabled until both campers are resolved. A resolved camper shows as a chip/tag in the field. After successful submission, both fields clear and focus returns to Camper 1 for fast repeated entry.
- **D-06:** Trios — a third camper can join an existing pair via a "+1" button on the pair row. Clicking it opens a single camper picker (code or name typeahead). Maximum group size is 3 (pairs and trios only). The +1 button disappears once a group has 3 members.
- **D-07:** PAIR-04 (duplicate camper prevention) is enforced at the database level. A camper already in an active pair in this session cannot be added to another pair. The UI surfaces the server error inline.

### Session Page Layout
- **D-08:** Single-page layout for the session screen at `/pools/[poolId]`:
  - **Header (sticky):** Pool name | Total swimmers + total pairs/trios count (prominently displayed — this is the primary thing counselors read during a buddy call) | "Close session" button | "View all pairs" link (navigates to the detail list, which Phase 6 will build into the buddy call screen)
  - **Entry form:** Camper 1 field + Camper 2 field + "Add pair" button
  - **Pair list (below form):** Compact rows — one row per pair/trio. Each row: Camper names + bunk (all members). Remove button (right side). +1 button (right side, hidden once trio). Scrollable.
- **D-09:** The swimmer/pair count in the header is the hero element — large text, high contrast. It updates immediately after each add/remove (HTTP response drives the update). Phase 5 makes it real-time; Phase 4 it reflects the state after each mutation.
- **D-10:** URL structure: `/pools` for pool selection, `/pools/[poolId]` for the active session. Pool IDs come from the `pool` table seeded in Phase 3.

### Session Lifecycle
- **D-11:** Clicking a pool on `/pools` navigates to `/pools/[poolId]`. If no active session exists, one is created automatically. If one exists, show the "Session in progress — join?" prompt before displaying the board.
- **D-12:** "Close session" button is always visible in the header. If active pairs exist, clicking it shows a confirmation dialog: "X pairs still in the water — close session anyway?" Confirming archives the session (SESS-03) and redirects to `/pools`. If no pairs exist, closes immediately with no prompt.
- **D-13:** Closed sessions are not shown in the active view (SESS-04) and cannot be reopened. Data is retained in the archive (never deleted).

### Folded Todos
- **Add logout button (from `.planning/todos/pending/2026-06-28-add-logout-button.md`):** The session screen is the primary counselor screen — this is where a logout button is most needed. Also applies to the admin panel (already noted). Implement `authClient.signOut()` + redirect to `/login`. Add to the session header (top-right) and the admin nav.

### Claude's Discretion
- Typeahead debounce timing (300ms is standard, matching Phase 3's search debounce).
- Chip/tag visual style for resolved campers in the entry fields — follow slate/blue-600 palette.
- "Session in progress" join prompt design (modal vs. inline banner).
- Exact row layout for pair display (spacing, font sizes, icon buttons for remove/+1).
- Loading/submitting states on the Add pair form.
- Error display for PAIR-04 violations (inline below the field that caused the conflict).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — SESS-01 through SESS-04 and PAIR-01 through PAIR-04 are the Phase 4 requirements. Read full definitions there.
- `.planning/PROJECT.md` — Core Value statement, Constraints section (real-time is a hard req; poolside on iPads), Out of Scope section.
- `.planning/ROADMAP.md` — Phase 4 success criteria (5 items). These are the acceptance tests.

### Phase 3 Decisions That Feed Phase 4
- `.planning/phases/03-admin-data-setup/03-CONTEXT.md` — D-11 (camper display format: "[Preferred Name] [Last Name] · [Bunk]"), D-10 (server-side paginated search pattern for typeahead), integration points (pool and camper tables).

### Existing Counselor Screen
- `src/app/(protected)/pools/page.tsx` — Current placeholder pool selection screen. Phase 4 replaces the hardcoded pool buttons with DB-driven pool list and adds the `/pools/[poolId]` session route.

### Existing Admin Implementation (patterns to follow)
- `src/app/(admin)/admin/users/actions.ts` — Server Action pattern with `requireAdmin()` guard. Phase 4 uses the same pattern with a `requireAuth()` guard (counselors, not just admins).
- `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` — Reuse for the "close session with active pairs" confirmation dialog.
- `src/db/schema.ts` — Current Drizzle schema. Phase 4 adds `session` and `pair` tables.

### Established UI Patterns
- `src/app/(auth)/login/page.tsx` — Tailwind pattern: slate palette, blue-600 primary, `min-h-[44px]` touch targets, `rounded-md`, `border-slate-300`.
- `src/app/(admin)/admin/users/components/` — Modal, confirm dialog, and action button patterns from Phase 2.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DeleteConfirmDialog` (`src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx`) — Reuse for the "close session with active pairs" confirmation. Same confirm/cancel pattern.
- `requireAdmin()` in `actions.ts` — Template for a `requireAuth()` guard that Phase 4 server actions use (counselors don't need admin, just a valid session).
- Existing `auth.api.getSession()` call pattern — Phase 4 session page uses this to get the current user (needed to attribute pair additions to a counselor if that's tracked).

### Established Patterns
- Route group `(protected)` with auth-only layout — `/pools/[poolId]` slots in here without additional auth plumbing.
- Drizzle schema + `npx drizzle-kit push` — Same migration workflow for adding `session` and `pair` tables.
- Server Actions with revalidatePath — pair add/remove/close all follow this pattern.

### Integration Points
- `pool` table (from Phase 3) feeds the pool selection list on `/pools` and the `poolId` foreign key on the `session` table.
- `camper` table (from Phase 3) feeds the typeahead search and validates camper codes on pair entry. The `code` column remains a string type.
- The `session` and `pair` tables created here feed Phase 5's real-time subscription layer (Supabase Realtime will watch the `pair` table for changes).

</code_context>

<specifics>
## Specific Ideas

- **Buddy call mental model:** The primary use case is: counselors count off pairs verbally and verify the total matches the number on screen. The swimmer/pair count in the header is the hero — large, prominent, high contrast. The individual pair list is secondary (used only when counts don't match). Phase 6 builds the full high-contrast buddy call screen.
- **Trios:** A "+1" button on each pair row (disappears once trio). Clicking opens a single camper picker. Max group size 3.
- **Join session prompt:** When a second counselor opens `/pools/[poolId]` where a session is already active, they see "Session in progress — join?" before seeing the board.
- **After close:** Redirect to `/pools`. Counselor can start a fresh session for the same pool by clicking it again.
- **Logout button:** Add to the session header (top-right) and the admin nav — calls `authClient.signOut()` then redirects to `/login`. This is the todo folded from `.planning/todos/pending/2026-06-28-add-logout-button.md`.

</specifics>

<deferred>
## Deferred Ideas

- Real-time pair updates across devices — Phase 5.
- High-contrast buddy call screen — Phase 6.
- Swimmer count / pair count as a live WebSocket feed — Phase 5.
- Session history / past boards — v2 (out of scope per REQUIREMENTS.md).
- Bulk remove all pairs — v2.

</deferred>

---

*Phase: 4-Sessions and Buddy Pairs*
*Context gathered: 2026-06-28*
