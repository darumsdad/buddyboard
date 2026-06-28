# Roadmap: BuddyBoard

## Overview

BuddyBoard ships in six phases that follow the hard dependency chain in the stack: the database and auth foundation comes first, then admin data setup (users, campers, pools), then the core counselor workflow (sessions and buddy pairs over HTTP), then the real-time layer that makes multi-device collaboration safe, and finally the buddy call screen and responsive polish that make the app fit for poolside use. Each phase delivers a working, verifiable capability before the next phase begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Project scaffolding, Supabase schema, Drizzle migrations, Better Auth setup, and login flow (completed 2026-06-28)
- [x] **Phase 2: Admin User Management** - Admin can create, remove, and reset passwords for counselor accounts (completed 2026-06-28)
- [ ] **Phase 2.1: User Name Fields** *(INSERTED)* - Admin can store and see first/last name on each user account (schema migration + form + table column)
- [x] **Phase 2.2: Admin Nav & UI Polish** *(INSERTED)* - Role-based post-login redirect, bidirectional admin/buddy-board nav links (admin-only on buddy board), round icon buttons in user table actions (completed 2026-06-28)
- [x] **Phase 3: Admin Data Setup** - Admin can configure pools and load the full camper roster (Excel import + CRUD) (completed 2026-06-28)
- [ ] **Phase 4: Sessions & Buddy Pairs** - Counselors can run a complete pool session and manage buddy pairs over HTTP
- [ ] **Phase 5: Real-time & Live Board** - All devices at a pool see live buddy board updates with connection status
- [ ] **Phase 6: Buddy Call Screen & Polish** - High-contrast buddy call screen and responsive pass for iPad, laptop, and iPhone

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Developer can deploy the app and counselors can log in securely
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. Navigating to the app URL shows a login page — not a 404 or error
  2. Counselor can enter a username and password and reach the protected app
  3. Closing the browser and reopening restores the authenticated session without requiring a new login
  4. Navigating to a protected route while unauthenticated redirects to the login page
**Plans**: 4 plans

Plans:
- [x] 01-01-scaffold-PLAN.md — Next.js scaffold, packages, Better Auth wiring, schema generation (Wave 1)
- [x] 01-02-db-PLAN.md — Supabase creation, DB migration, admin seed (Wave 2, blocking human action)
- [x] 01-03-ui-PLAN.md — Login page, pools placeholder, middleware (Wave 2, parallel)
- [x] 01-04-deploy-PLAN.md — Vercel deployment and end-to-end verification (Wave 3)

**UI hint**: yes

### Phase 2: Admin User Management
**Goal**: Admin can manage the full roster of counselor accounts without developer involvement
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Admin can create a new account with a username, password, and role (admin or counselor)
  2. Admin can remove a user account; the removed user can no longer log in
  3. Admin can set a new password for any user; no email flow is involved
**Plans**: 3 plans

Plans:
- [x] 02-01-auth-plugin-PLAN.md — Better Auth admin plugin wiring, schema migration, DB push, seed admin backfill (Wave 1)
- [x] 02-02-admin-layout-PLAN.md — Admin route group, role-enforcing layout, server actions with requireAdmin guard, basic server-rendered users page (Wave 2)
- [x] 02-03-users-page-PLAN.md — Interactive UI components (UserTable, CreateUserModal, DeleteConfirmDialog, ResetPasswordForm), component tests, page wiring (Wave 3)

**Wave dependencies:** Wave 2 *(blocked on Wave 1 completion)* | Wave 3 *(blocked on Wave 2 completion)*

**Cross-cutting constraints:**
- `npx drizzle-kit push` must complete before any admin UI code ships (schema drives types)
- `requireAdmin()` enforced in every Server Action — layout gate handles UX redirect, actions handle security
- `displayRole()` is the single source of truth — raw `"user"` string is never rendered in the UI

**UI hint**: yes

### Phase 2.1: User Name Fields *(INSERTED)*
**Goal**: Admin can store a counselor's real first and last name on their account and see it in the user management table
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: AUTH-03 (extension — adds firstName/lastName to the create user flow)
**Success Criteria** (what must be TRUE):
  1. Admin can enter first name and last name when creating a new user account (both required)
  2. The User Management table shows a Name column (first + last) for every user
  3. The seed admin account has a name after migration and backfill run
**Plans**: TBD
**UI hint**: yes

### Phase 2.2: Admin Nav & UI Polish *(INSERTED)*
**Goal**: Role-based post-login redirect, bidirectional navigation between admin and buddy board screens, and round icon buttons in the user management table
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: (extension of AUTH UX — no new REQ-IDs)
**Success Criteria** (what must be TRUE):
  1. Admin who logs in lands on `/admin/users`; counselor who logs in lands on `/pools`
  2. Admin screen has a "View Buddy Board" link top-right that navigates to `/pools`
  3. Pools screen has an "Admin" link top-right that is visible only to admins and navigates to `/admin/users`
  4. UserTable actions column shows round icon buttons (key + trash) with title tooltips instead of text links
**Plans**: 2 plans

Plans:
- [x] 02.2-01-PLAN.md — Role-based redirect + nav links (Wave 1)
- [x] 02.2-02-PLAN.md — lucide-react install + round icon buttons (Wave 1, has slopcheck checkpoint)
**UI hint**: yes

### Phase 3: Admin Data Setup
**Goal**: Admin can configure pools and load the complete camper roster before the swim season starts
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, POOL-01, POOL-02
**Success Criteria** (what must be TRUE):
  1. Admin can upload an Excel spreadsheet and see all campers imported with codes stored and displayed as strings (leading zeros preserved)
  2. Admin can add, edit name or code, and remove individual campers from the roster
  3. Admin can search and filter the camper list by name or code and see results update immediately
  4. Admin can add, rename, and remove pools from the admin screen without touching any code or config files
  5. On a fresh install, three pools exist in the system by default
**Plans**: 4 plans

Plans:
- [x] 03-01-foundation-PLAN.md — Schema additions (camper + pool tables), drizzle-kit push [BLOCKING], next.config.ts bodySizeLimit, AdminSidebar + layout modification (Wave 1)
- [x] 03-02-pools-PLAN.md — Pool Server Actions (create/rename/remove + requireAdmin), action tests, seed-pools script, pools page + PoolList + AddPoolForm + EditPoolModal (Wave 2)
- [x] 03-03-camper-crud-PLAN.md — Camper Server Actions (add/edit/remove/clearAll + requireAdmin), action tests, campers page + CamperTable + AddCamperModal + EditCamperModal + delete dialogs + page test (Wave 2, parallel with 03-02)
- [x] 03-04-search-import-PLAN.md — importCampersAction (SheetJS, all-or-nothing transaction), SearchBar, PaginationControls, ImportModal, campers page search+pagination wiring, sample template (Wave 3)

**Wave dependencies:** Wave 2 *(Plans 03-02 and 03-03 run in parallel, both blocked on Wave 1 / 03-01)* | Wave 3 *(03-04 blocked on 03-03)*

**Cross-cutting constraints:**
- `npx drizzle-kit push` in Plan 03-01 must complete before any Wave 2 code that queries camper or pool tables
- `requireAdmin()` enforced in every Server Action — copied verbatim from Phase 2 pattern
- camper.code must remain a text column throughout — never cast to number in any layer
- xlsx `raw: false` option mandatory in importCampersAction to prevent leading-zero loss
- searchParams in CampersPage must be awaited (Promise in Next.js 16)

**UI hint**: yes

### Phase 4: Sessions & Buddy Pairs
**Goal**: Counselors can run a complete pool session — open it, register pairs, and close it safely — with all data persisted over HTTP
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, PAIR-01, PAIR-02, PAIR-03, PAIR-04
**Success Criteria** (what must be TRUE):
  1. Counselor can start a new session by selecting a pool from the configured list
  2. Counselor can register a buddy pair by entering two camper codes or by typing a name with live typeahead suggestions
  3. The system rejects an attempt to add a camper who is already in an active pair in the same session — enforced at the database level
  4. Counselor can remove a buddy pair; the pair disappears from the screen only after the server confirms the deletion
  5. Closing a session with active pairs requires an explicit confirmation; closed sessions no longer appear in the active pool view, and all pair data is retained in the archive
**Plans**: 5 plans

Plans:
- [x] 04-01-PLAN.md — Schema additions (poolSession + pair + pairMember tables, relations), drizzle-kit push [BLOCKING] (Wave 1)
- [ ] 04-02-PLAN.md — Server Actions (requireAuth, searchCampersAction, addPairAction, addPairMemberAction, removePairAction, closeSessionAction), unit test files (Wave 2)
- [ ] 04-03-PLAN.md — Leaf UI components: JoinSessionModal, CloseSessionDialog, TrioPicker, CamperField, PairRow (Wave 3)
- [ ] 04-04-PLAN.md — Composite components: LogoutButton, AddPairForm, PairList, SessionHeader, SessionBoard (Wave 4)
- [ ] 04-05-PLAN.md — Page wiring: pools/page.tsx (DB-driven + logout), pools/[poolId]/page.tsx (get-or-create session, full board), end-to-end verification (Wave 5)

**Wave dependencies:** Wave 2 *(blocked on Wave 1 / 04-01 push)* | Wave 3 *(blocked on Wave 2 / 04-02 actions)* | Wave 4 *(blocked on Wave 3 / 04-03 leaf components)* | Wave 5 *(blocked on Wave 4 / 04-04 composite components)*

**Cross-cutting constraints:**
- `npx drizzle-kit push` in Plan 04-01 must complete before any Wave 2+ code that references poolSession, pair, or pairMember tables
- Table name MUST be `poolSession` (Drizzle) / `pool_session` (DB) — the `session` table is owned by Better Auth and must not be modified
- `requireAuth()` (not requireAdmin) in every Server Action — any authenticated counselor can manage pairs
- `redirect()` in closeSessionAction must be called OUTSIDE any try/catch block (Next.js 16 behavior)
- `params` and `searchParams` must be awaited before property access (Next.js 16 — both are Promises)
- PAIR-04 enforced at DB level via `uniqueIndex("unique_camper_per_session").on(camperId, sessionId)` on pair_member
- D-01 enforced at DB level via partial unique index on pool_session WHERE status = 'active'
- Trios use INSERT into pairMember (not UPDATE) to preserve Supabase Realtime INSERT event compatibility for Phase 5

**UI hint**: yes

### Phase 5: Real-time & Live Board
**Goal**: Every counselor at every pool sees an accurate, live buddy board — changes from any device appear instantly on all others
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: PAIR-05, BOARD-01, BOARD-02, BOARD-04, BOARD-05
**Success Criteria** (what must be TRUE):
  1. A buddy pair added by one counselor appears on all other devices connected to the same pool within seconds, without a page refresh
  2. A buddy pair removed by one counselor disappears from all other devices connected to the same pool within seconds
  3. The buddy board shows a live swimmer count and pair count (e.g. "12 swimmers — 6 pairs")
  4. A prominent banner shows "Connected", "Reconnecting", or "Disconnected — data may be stale" reflecting the actual WebSocket state
  5. An empty board clearly distinguishes "No pairs checked in" from "Not connected" or "Loading"
**Plans**: TBD
**UI hint**: yes

### Phase 6: Buddy Call Screen & Polish
**Goal**: Counselors can run a buddy call on any target device, with a screen optimized for outdoor use
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: BOARD-03, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Counselor can open a buddy call screen showing all active pairs in a high-contrast, large-text, scrollable list with large touch targets suitable for outdoor use
  2. App is fully usable on iPad and laptop — no broken layouts, no horizontal scroll, all controls reachable
  3. All app features remain accessible on iPhone — layout may be compact but nothing is hidden or broken
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 4/4 | Complete   | 2026-06-28 |
| 2. Admin User Management | 3/3 | Complete   | 2026-06-28 |
| 2.1. User Name Fields | 0/? | Not started | - |
| 2.2. Admin Nav & UI Polish | 0/2 | Not started | - |
| 3. Admin Data Setup | 4/4 | Complete   | 2026-06-28 |
| 4. Sessions & Buddy Pairs | 1/5 | In Progress|  |
| 5. Real-time & Live Board | 0/? | Not started | - |
| 6. Buddy Call Screen & Polish | 0/? | Not started | - |
