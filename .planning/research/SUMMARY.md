# BuddyBoard — Research Summary

## Recommended Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Next.js 15 (App Router) | Full-stack TypeScript, SSR, file-based routing; dominant 2025 choice |
| Styling | Tailwind CSS v4 | Utility-first, fast iteration, excellent responsive support |
| Database | Supabase (PostgreSQL) | Built-in Realtime, auth primitives, generous free tier |
| Real-time | Supabase `postgres_changes` subscriptions | Browser connects directly to Supabase — no WebSocket server needed on the host |
| Auth | Better Auth + `username()` plugin | Lucia deprecated Jan 2025; NextAuth discourages password flows; Better Auth's admin plugin matches the use case exactly |
| ORM | Drizzle ORM | Lightweight (~57KB), TypeScript-native, excellent Supabase/PostgreSQL support |
| API layer | tRPC v11 | End-to-end type safety, no schema maintenance, native SSE subscription support |
| Excel import | SheetJS (xlsx) | Simpler API, broader format support, 4× more widely used than ExcelJS; sufficient for roster scale |
| Hosting | Vercel (recommended) or Hostinger VPS | Supabase Realtime runs browser→Supabase directly, so Next.js host never handles WebSockets — Vercel's serverless limitation does not apply. Either host works; Vercel is simpler to deploy and has a free tier. Hostinger VPS also works if the camp prefers to consolidate hosting. |
| Source control | GitHub | Camp preference; enables CI/CD via GitHub Actions |

## Table Stakes Features

Features users will expect in v1 — including gaps found in research vs. the original spec:

### Covered by spec ✓
- Pool session start with pool selector
- Buddy pair registration via camper code or name typeahead
- Real-time buddy board (all devices at the same pool see live updates)
- Buddy call screen (scrollable ordered list)
- Remove pair when kids leave
- Admin: camper roster management (Excel upload + manual CRUD)
- Admin: user management (add/remove counselors, reset passwords)
- Username/password auth, admin resets passwords
- Session history retained on close

### Gaps found in research — must add to v1
- **Connection status indicator** — "Connected / Reconnecting / Disconnected — data may be stale" banner. In a safety app, a stale board that looks live is worse than one that's obviously down. This must ship with the first real-time feature.
- **Head count display** — "12 swimmers, 6 pairs" on the buddy board and buddy call screen. Derived value (`pairs × 2`) but conspicuous if absent; standard in all physical buddy board procedures.
- **Duplicate camper detection (server-enforced)** — DB-level unique constraint on `(session_id, camper_id) WHERE removed_at IS NULL`. Client-side checks are insufficient with concurrent counselors.
- **Empty state vs. disconnected state disambiguation** — a blank board must clearly communicate *why* it is blank (no pairs vs. not connected).
- **Session close guard** — confirm before closing a session with active pairs (prevent accidental mid-session termination).
- **Keyboard-first entry UX** — Tab between code fields, Enter to submit; must be explicitly designed, not assumed.

### Anti-features (explicitly out of scope for v1)
- Buddy call check-off / confirmation tracking
- Pool transfer (kids re-register fresh at new pool)
- Email-based password reset
- OAuth / third-party login
- RFID / wearable integration
- Parent-facing features
- Swimming zone / depth tracking

## Architecture Overview

```
Browser (iPad/Laptop/iPhone)
    │
    ├── Next.js App (Vercel or Hostinger VPS)
    │       ├── tRPC Route Handlers (mutations: add pair, remove pair, etc.)
    │       ├── Better Auth (session cookies, role enforcement)
    │       └── Drizzle ORM → Supabase PostgreSQL
    │
    └── Supabase Realtime (direct browser→Supabase WebSocket)
            └── postgres_changes on buddy_pairs filtered by pool_id
                → all counselor devices at the same pool receive live updates
```

**Key data entities:** User, Pool, CampSession, Camper (code admin-assigned), BuddyPair

**Real-time flow:** Counselor adds pair via tRPC mutation → Drizzle inserts row → Supabase Realtime fires `postgres_changes` event → all subscribed clients update their local state.

**Conflict resolution:** Partial unique index on `(session_id, camper_id) WHERE removed_at IS NULL` — second concurrent insert fails at DB; no CRDT or OT needed.

**Auth:** Better Auth manages sessions via cookies. Role (`admin` | `counselor`) stored on User. Every API mutation re-checks role server-side — React route guards are UX only.

## Critical Pitfalls to Avoid

1. **Silent disconnection** — iOS can lag 30–90s before firing close events. Server must send a heartbeat ping every 15–20s; client shows a prominent red banner if missed. Ship this before any other real-time feature.

2. **Reconnect without state rehydration** — On reconnect, fetch a full snapshot from the REST API before trusting the subscription stream. Never try to replay missed events.

3. **Optimistic remove** — Removing a pair must wait for server confirmation. A pair disappearing from the screen while the child is still in the water is a direct safety failure. Optimistic *add* is acceptable; optimistic *remove* is not.

4. **Frontend-only auth enforcement** — Every admin mutation must re-check the user's role at the API layer. React route guards are not security.

5. **Excel camper codes as numbers** — Excel auto-converts codes to numbers, corrupting leading zeros. Always read the code column as a string (`{ type: 'string' }` in SheetJS). Store as `TEXT` in PostgreSQL, never `INTEGER`.

## Build Order

1. **Supabase project + Drizzle schema + migrations** — everything depends on this
2. **Better Auth setup** — gates all other features
3. **Admin: user management** — counselors need accounts before anything else
4. **Admin: camper roster** (Excel import + CRUD) — campers must exist before buddy pairs
5. **Admin: pool configuration** — pools must exist before sessions
6. **Counselor: session management** (start/close session)
7. **Counselor: buddy pair CRUD over HTTP** — validate non-real-time path first
8. **Real-time layer** (Supabase Realtime subscriptions + connection status indicator) — add once CRUD is proven
9. **Buddy call screen** — pure frontend polish on proven data
10. **Responsive pass** — iPhone best-effort after primary flows are solid

## Open Questions

| Question | Impact | Recommendation |
|----------|--------|----------------|
| Vercel vs Hostinger VPS for hosting | Deployment pipeline | Vercel is simpler; Hostinger works if camp wants to consolidate. Decide before Phase 1. |
| Supabase Row Level Security (RLS) | Security depth | Adds defense-in-depth but complicates Drizzle queries. Recommended: handle auth in Next.js middleware for v1, revisit RLS post-launch. |
| Supabase free tier: 200 concurrent Realtime connections | Scalability | Sufficient for camp scale; Pro plan ($25/mo) removes cap if needed. |
| Camper code format | Import UX | Admin-assigned (confirmed). Document expected format in Excel template. |
| Ordering of pairs on buddy call screen | UX | Alphabetical by first camper's last name is standard; confirm with camp staff. |
