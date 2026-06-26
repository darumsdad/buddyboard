# BuddyBoard

## What This Is

BuddyBoard is a real-time pool safety tracking web app for a summer camp. Pool counselors register camper "buddy pairs" as kids enter the pool, then use the live buddy board to verify every pair is safe during buddy calls. Multiple counselors across multiple devices can work simultaneously at the same pool, with all changes appearing instantly on every screen.

## Core Value

Every counselor at every pool can always see — in real time — exactly which camper pairs are currently in the water, so no child goes unaccounted for.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Counselor can log in with username and password
- [ ] Admin can add and remove user accounts
- [ ] Admin can reset any user's password
- [ ] Counselor can start a pool session by selecting from a configurable pool list (default: 3 pools)
- [ ] Counselor can register a buddy pair by entering two camper names (via code or typeahead)
- [ ] Camper lookup by unique code (fast single-field entry)
- [ ] Camper lookup by name with typeahead (first/last name search)
- [ ] Buddy pairs from all counselors at the same pool appear on every device in real time
- [ ] Counselor can view the buddy board — ordered, scrollable list of all current pairs in a pool
- [ ] Counselor can run a buddy call screen — clean scrollable list of pairs for verbal roll call
- [ ] Counselor can remove a buddy pair when kids leave the pool
- [ ] Admin can upload a camper roster via Excel spreadsheet (specified format)
- [ ] Admin can add, edit, and remove individual campers and their codes
- [ ] Session data is archived when a session is closed (not deleted)
- [ ] Closed sessions are not shown in the active pool view
- [ ] App is usable on iPad and laptop (primary); iPhone is best-effort responsive

### Out of Scope

- OAuth / third-party login (Google, GitHub, etc.) — unnecessary complexity for camp staff
- Email-based password reset — admin-controlled reset is simpler and sufficient
- Check-off / confirmation tracking during buddy call — v1 is visual reference only
- Transferring buddy pairs between pools — kids re-register at the new pool fresh
- Native mobile app — responsive web covers the iPhone use case well enough

## Context

- Camp has three pools by default; the pool list must be configurable without a code change
- Multiple counselors work simultaneously at the same pool (2–3 per pool is typical)
- Real-time collaboration is a hard requirement — late or stale data is a safety risk
- Campers are pre-loaded by admin; each camper has a unique code for fast poolside entry
- The buddy call is a physical safety ritual — the screen must be clear and scannable under outdoor lighting conditions (high contrast, large text)
- Admin tasks (camper management, user management) are done on desktop; counselor tasks happen poolside on iPads and laptops

## Constraints

- **Real-time**: Multi-device collaboration requires WebSocket or equivalent — polling is not acceptable
- **Auth**: Email-based password reset explicitly excluded; admin resets passwords manually
- **Devices**: iPad and laptop are first-class; iPhone is best-effort (no separate native app)
- **Pool config**: Pool count and names must be manageable without touching code
- **Hosting**: Hostinger (camp already has a subscription) — stack must be deployable there; VPS plan needed for WebSocket support
- **Database**: Cloud database acceptable — Supabase preferred (PostgreSQL + built-in real-time subscriptions + auth)
- **Source control**: GitHub

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Admin resets passwords (no email flow) | Simpler, fewer moving parts, camp admins are hands-on | — Pending |
| Buddy pairs do not transfer between pools | Kids re-register at new pool; keeps each pool's board independent and simple | — Pending |
| Session history retained on close | Data is already in DB; no reason to delete; may be useful for safety records | — Pending |
| Host on Hostinger | Camp already pays for it; VPS plan required for WebSocket support | — Pending |
| Supabase for database | Cloud DB with built-in Realtime subscriptions solves multi-device sync without custom WebSocket infrastructure | — Pending |
| Source control on GitHub | Camp preference; enables CI/CD pipelines | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-26 after initialization*
