# Roadmap: BuddyBoard

## Overview

BuddyBoard ships in six phases that follow the hard dependency chain in the stack: the database and auth foundation comes first, then admin data setup (users, campers, pools), then the core counselor workflow (sessions and buddy pairs over HTTP), then the real-time layer that makes multi-device collaboration safe, and finally the buddy call screen and responsive polish that make the app fit for poolside use. Each phase delivers a working, verifiable capability before the next phase begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - Project scaffolding, Supabase schema, Drizzle migrations, Better Auth setup, and login flow
- [ ] **Phase 2: Admin User Management** - Admin can create, remove, and reset passwords for counselor accounts
- [ ] **Phase 3: Admin Data Setup** - Admin can configure pools and load the full camper roster (Excel import + CRUD)
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
- [ ] 01-01-scaffold-PLAN.md — Next.js scaffold, packages, Better Auth wiring, schema generation (Wave 1)
- [ ] 01-02-db-PLAN.md — Supabase creation, DB migration, admin seed (Wave 2, blocking human action)
- [ ] 01-03-ui-PLAN.md — Login page, pools placeholder, middleware (Wave 2, parallel)
- [ ] 01-04-deploy-PLAN.md — Vercel deployment and end-to-end verification (Wave 3)

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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
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
| 1. Foundation & Auth | 0/? | Not started | - |
| 2. Admin User Management | 0/? | Not started | - |
| 3. Admin Data Setup | 0/? | Not started | - |
| 4. Sessions & Buddy Pairs | 0/? | Not started | - |
| 5. Real-time & Live Board | 0/? | Not started | - |
| 6. Buddy Call Screen & Polish | 0/? | Not started | - |
