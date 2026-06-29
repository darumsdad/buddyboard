# BuddyBoard

## What This Is

BuddyBoard is a real-time pool safety tracking web app for Camp Regesh. Pool counselors register camper "buddy pairs" as kids enter the water, then use the live buddy board to verify every pair during buddy calls. Multiple counselors across multiple devices work simultaneously at the same pool, with all changes appearing instantly on every screen. Admins manage the counselor roster, import the full camper list from Excel, and configure pools — all through the app, no code changes required.

## Core Value

Every counselor at every pool can always see — in real time — exactly which camper pairs are currently in the water, so no child goes unaccounted for.

## Current State (v1.0 — shipped 2026-06-28)

- **Stack:** Next.js 15 App Router, Supabase (PostgreSQL + Realtime), Drizzle ORM, Better Auth, Tailwind CSS, deployed on Vercel
- **Database:** Supabase cloud (poolSession / pair / pairMember / camper / pool tables + Better Auth tables)
- **Real-time:** Supabase Realtime dual-table subscription on pair (DELETE) + pair_member (INSERT)
- **Auth:** Better Auth with admin plugin; username + password; session cookies; admin resets passwords manually
- **Devices:** iPad and laptop first-class; iPhone best-effort responsive

## Requirements

### Validated

- ✓ Counselor can log in with username and password — v1.0
- ✓ Authenticated session persists across browser restarts — v1.0
- ✓ Admin can add/remove user accounts and reset passwords — v1.0
- ✓ Admin can store first/last name on each counselor account — v1.0
- ✓ Admin can import camper roster via Excel (codes stored as strings, leading zeros preserved) — v1.0
- ✓ Admin can add, edit, remove individual campers and search/filter the roster — v1.0
- ✓ Admin can configure pools (add/rename/remove) without a code change; 3 default pools — v1.0
- ✓ Counselor can start a session, register buddy pairs by code or typeahead, remove pairs — v1.0
- ✓ System prevents the same camper in two pairs simultaneously (DB-enforced) — v1.0
- ✓ Session data archived on close; closed sessions hidden from active view — v1.0
- ✓ All pair changes appear in real time on all connected devices — v1.0
- ✓ Live buddy board with swimmer/pair counts and connection status banner — v1.0
- ✓ Buddy call screen: high-contrast, large-text, scrollable list optimized for outdoor use — v1.0
- ✓ App fully usable on iPad and laptop; best-effort responsive on iPhone — v1.0

### Active (v1.1 candidates)

- [ ] Fix pre-existing test suite failures (admin action tests fail in test env — DB ECONNREFUSED)
- [ ] Supabase Row Level Security — currently skipped; auth enforced at Next.js middleware layer only
- [ ] Add subdomain deployment at campregeshonline.com (e.g. buddyboard.campregeshonline.com)

### Out of Scope

- OAuth / third-party login (Google, GitHub, etc.) — unnecessary complexity for camp staff
- Email-based password reset — admin-controlled reset is simpler and sufficient for v1
- Check-off / confirmation tracking during buddy call — v1 is visual reference only (deferred to v2)
- Transferring buddy pairs between pools — kids re-register at the new pool fresh
- Native mobile app — responsive web covers the iPhone use case well enough
- Bulk remove all pairs — manual close-session flow is sufficient for v1
- Session history viewing / searching — data is retained in DB, UI deferred to v2

## Context

- Camp has three pools by default; pool list is configurable without code changes
- Multiple counselors work simultaneously at the same pool (2–3 per pool is typical)
- Real-time collaboration is a hard requirement — late or stale data is a safety risk
- Campers are pre-loaded by admin; each camper has a unique code for fast poolside entry
- The buddy call is a physical safety ritual — screen must be clear and scannable under outdoor lighting
- Admin tasks done on desktop; counselor tasks happen poolside on iPads and laptops
- Camp domain: campregeshonline.com — subdomain deployment planned for v1.1

## Constraints

- **Real-time**: Supabase Realtime WebSocket — polling is not acceptable
- **Auth**: No email-based reset; admin resets passwords manually
- **Devices**: iPad and laptop first-class; iPhone best-effort
- **Pool config**: Pool count and names manageable without code changes
- **Hosting**: Vercel (switched from initial Hostinger plan; Vercel matched Next.js stack naturally)
- **Database**: Supabase (PostgreSQL + built-in Realtime)
- **Source control**: GitHub

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Admin resets passwords (no email flow) | Simpler, fewer moving parts, camp admins are hands-on | ✓ Good — no issues in v1 |
| Buddy pairs do not transfer between pools | Kids re-register at new pool; keeps each pool's board independent | ✓ Good |
| Session history retained on close | Data already in DB; no reason to delete; useful for safety records | ✓ Good |
| Host on Vercel (switched from Hostinger) | Hostinger lacked WebSocket support on existing plan; Vercel matched stack | ✓ Good |
| Supabase for database + Realtime | Cloud DB with built-in subscriptions solves multi-device sync without custom infra | ✓ Good — critical enabler |
| Subscribe to both pair (DELETE) + pair_member (INSERT) | Cascade-deleted pair_member rows don't fire Realtime events | ✓ Good — Critical finding from research |
| removeChannel() not channel.unsubscribe() | Prevents TooManyChannels error on remount | ✓ Good |
| revalidatePath removed from pair mutations | Realtime handles refresh; revalidatePath caused double-refresh | ✓ Good |
| Camper codes always text, never cast to number | Preserves leading zeros (e.g. "007") throughout the stack | ✓ Good — safety constraint |
| poolSession not session (table name) | Better Auth owns the session table; naming conflict avoidance | ✓ Good |
| Skip Supabase RLS for v1 | Auth enforced at Next.js middleware layer; RLS adds complexity for minimal v1 gain | ⚠️ Revisit — add in v1.1 |
| Better Auth admin plugin for user management | No custom auth logic needed; plugin handles create/delete/reset | ✓ Good |

## Evolution

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-28 after v1.0 milestone*
