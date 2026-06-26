# Architecture Patterns — BuddyBoard

**Domain:** Real-time collaborative pool safety tracking
**Researched:** 2026-06-26
**Confidence:** HIGH (verified against tRPC docs, Next.js docs, PostgreSQL docs)

---

## Component Breakdown

BuddyBoard is a full-stack Next.js application. All server logic lives inside a single
Next.js process — no separate API server, no microservices, no message broker.

| Component | What It Is | Technology |
|-----------|-----------|------------|
| **Web UI** | React pages served by Next.js App Router | Next.js 14+, React, Tailwind CSS |
| **API Layer** | Type-safe procedures for mutations and queries | tRPC (Next.js route handler adapter) |
| **Real-Time Layer** | Server-push event stream to connected clients | tRPC SSE subscriptions |
| **Event Bus** | Broadcasts DB changes across open connections | PostgreSQL LISTEN/NOTIFY |
| **Data Layer** | ORM for all database access | Prisma ORM |
| **Database** | Primary data store | PostgreSQL |
| **Auth** | Username/password login, session cookies | NextAuth.js v5 (Credentials provider) |
| **Middleware** | Route protection, role enforcement | Next.js Middleware |

### Why this composition

Next.js App Router runs as a persistent Node.js process (not serverless), which is
necessary for holding SSE connections open. This rules out Vercel for deployment but
makes Railway, Fly.io, or Render straightforward.

tRPC is chosen over REST or GraphQL because the client and server are both TypeScript
in the same repository. The end-to-end type safety eliminates an entire class of
integration bugs with zero schema boilerplate.

PostgreSQL LISTEN/NOTIFY is chosen over Redis pub/sub because the application is
small (< 50 concurrent users across 3 pools). Introducing Redis would be a
disproportionate dependency. NOTIFY fires only when a database transaction commits,
which means clients never receive a notification for a rolled-back write — a safety
property that Redis pub/sub does not provide for free.

SSE is chosen over WebSockets because mutations flow through tRPC HTTP procedures
(client-to-server), so bidirectional socket connections add complexity with no benefit.
SSE provides server-to-client push with automatic reconnection built in, and it works
with standard Next.js route handlers without patching or a custom server file.

---

## Data Model Sketch

```
User
  id            UUID  PK
  username      TEXT  UNIQUE
  passwordHash  TEXT
  role          ENUM  (ADMIN | COUNSELOR)
  isActive      BOOL  default true
  createdAt     TIMESTAMP

Pool
  id            UUID  PK
  name          TEXT
  displayOrder  INT
  createdAt     TIMESTAMP

Camper
  id            UUID  PK
  firstName     TEXT
  lastName      TEXT
  code          TEXT  UNIQUE  -- short poolside-entry code
  createdAt     TIMESTAMP
  updatedAt     TIMESTAMP

Session
  id            UUID  PK
  poolId        UUID  FK → Pool.id
  startedById   UUID  FK → User.id
  startedAt     TIMESTAMP
  closedAt      TIMESTAMP  nullable  -- null = active session

BuddyPair
  id            UUID  PK
  sessionId     UUID  FK → Session.id
  camper1Id     UUID  FK → Camper.id
  camper2Id     UUID  FK → Camper.id
  addedById     UUID  FK → User.id
  addedAt       TIMESTAMP
  removedById   UUID  FK → User.id  nullable
  removedAt     TIMESTAMP  nullable  -- null = currently in pool
```

### Key constraints

- `Session`: at most one active session per pool at any time. Enforce with a partial
  unique index: `UNIQUE(poolId) WHERE closedAt IS NULL`.
- `BuddyPair`: a camper may appear in at most one active pair per active session.
  Enforce with two partial unique indexes:
  `UNIQUE(sessionId, camper1Id) WHERE removedAt IS NULL`
  `UNIQUE(sessionId, camper2Id) WHERE removedAt IS NULL`
- `BuddyPair` removal is a soft delete (`removedAt` timestamp), not a row deletion.
  This preserves the audit trail required by the "session data is archived" requirement.

### Relationship summary

```
Pool ──< Session ──< BuddyPair >── Camper (×2)
                         │
                        User (addedBy / removedBy)
```

One pool has many sessions over time. One session has many buddy pairs. Each pair
references exactly two campers. Closed sessions remain in the database and are simply
filtered out of the active view.

---

## Real-Time Sync Strategy

### The problem

Multiple counselors at the same pool must see each other's changes (add/remove buddy
pairs) instantly. A counselor at Pool A must not see Pool B events.

### Solution: PostgreSQL LISTEN/NOTIFY → SSE per pool

**Write path** (counselor adds a pair):

1. Client calls `buddyPair.add` tRPC mutation over HTTP POST.
2. Server inserts the BuddyPair row inside a Prisma transaction.
3. On commit, a PostgreSQL trigger fires `pg_notify('pool_<poolId>', payload)`.
4. The persistent pg-listen client in the Node.js process receives the notification.
5. It forwards the payload to all active SSE connections subscribed to that pool.

**Read path** (initial page load + subscription):

1. Client fetches `session.getActive` — returns the current session and all active
   buddy pairs (HTTP query, not subscription).
2. Client opens an SSE connection via `buddyPair.onChange` tRPC subscription, passing
   the poolId and the lastEventId of the most recently received event.
3. Server streams incremental events (ADD / REMOVE) as they arrive.
4. If the SSE connection drops, the browser reconnects automatically. The `lastEventId`
   header lets the server replay any missed events.

### Conflict handling

BuddyBoard does not need Operational Transformation or CRDTs. Operations are
append-only (add pair) or soft-delete (remove pair). The only conflict scenario is
two counselors registering the same camper simultaneously — the partial unique index
on `BuddyPair` makes the second insert fail at the database level. The server returns
an error to the second client; the first client's insert stands. No merge logic required.

**Optimistic updates** are appropriate for the add-pair mutation: the UI can display
the new pair immediately and roll it back if the server returns a duplicate error.
Remove-pair can also be optimistic. Use React Query / tRPC's `useMutation` with
`onMutate` / `onError` callbacks for this pattern.

### Scope of subscriptions

Each SSE subscription is scoped to one pool. The server broadcasts only to connections
subscribed to the pool that generated the event. A counselor switching pools closes
the old subscription and opens a new one.

---

## API Design Approach

**tRPC with the Next.js App Router adapter.** No REST, no GraphQL.

### Rationale

- Single TypeScript codebase: client types are inferred directly from server router
  definitions. No code generation, no schema drift, no manual type maintenance.
- tRPC v11 supports SSE subscriptions natively, which is the real-time transport.
- Mutations and queries use standard HTTP (POST/GET), so they work with Next.js
  caching and the browser fetch API without any special configuration.

### Router structure

```
appRouter
  auth
    login         mutation
    logout        mutation
    me            query

  pools
    list          query
    update        mutation   (admin only)

  sessions
    getActive     query      (by poolId)
    start         mutation
    close         mutation

  campers
    search        query      (by name or code)
    list          query      (admin)
    create        mutation   (admin)
    update        mutation   (admin)
    remove        mutation   (admin)
    bulkImport    mutation   (admin, Excel upload)

  buddyPairs
    listActive    query      (by sessionId)
    add           mutation
    remove        mutation
    onChange      subscription  (by poolId — SSE)

  users
    list          query      (admin)
    create        mutation   (admin)
    resetPassword mutation   (admin)
    deactivate    mutation   (admin)
```

### Procedure placement

All procedures live in `src/server/routers/`. Each router file exports one sub-router.
The root `appRouter` composes them. The Next.js route handler at
`src/app/api/trpc/[trpc]/route.ts` handles all HTTP traffic. The SSE subscription
endpoint lives at `src/app/api/trpc/subscriptions/route.ts` (separate route handler
required for SSE transport in Next.js App Router).

---

## Auth Architecture

### Mechanism

NextAuth.js v5 with the Credentials provider.

- User submits username + password.
- Server fetches the User row, verifies password against `passwordHash` with bcrypt.
- NextAuth creates a signed JWT stored in an HTTP-only cookie (`__Secure-next-auth.session-token`).
- JWT payload carries: `userId`, `username`, `role`.
- Cookie is sent automatically with every request, including SSE connections.

### Role enforcement

Two roles: `ADMIN` and `COUNSELOR`.

**Middleware** (`src/middleware.ts`) runs on every request:
- Unauthenticated requests to any non-public route redirect to `/login`.
- Requests to `/admin/*` routes from non-ADMIN sessions return 403.

**tRPC procedures** re-check the session server-side via a `protectedProcedure` base:
```
publicProcedure    → no auth required (login endpoint only)
protectedProcedure → any authenticated user
adminProcedure     → role === ADMIN enforced in middleware before procedure runs
```

Never rely on client-side role checks alone. The tRPC procedure is the authoritative
enforcement point.

### Session token lifecycle

- Token expiry: 8 hours (a full camp day).
- No refresh token. If a counselor's session expires mid-day, they log in again.
  This is acceptable for a camp context.
- Admin password reset invalidates the user's existing sessions by rotating a
  `sessionVersion` integer on the User row. The JWT callback compares the token's
  embedded version to the DB value; mismatch = force re-login.

### Password storage

bcrypt with cost factor 12. Never store plaintext. Admin sets initial passwords and
resets them via the admin UI; no email flow is involved.

---

## Suggested Build Order

Each layer depends on the ones above it. Build from the bottom up.

```
1. Database schema + migrations (Prisma)
   └── All other layers depend on this

2. Auth (login / logout / session cookie)
   └── Required before any protected UI or API can be built

3. User management (admin CRUD, password reset)
   └── Depends on auth; admins need accounts first

4. Camper roster management (admin CRUD + Excel import)
   └── Counselors can't register pairs without camper records

5. Pool configuration (names, display order — admin only)
   └── Sessions need to reference valid pools

6. Session management (start / close a pool session)
   └── Buddy pairs belong to a session; sessions must exist first

7. Buddy pair CRUD (add / remove — HTTP mutations only)
   └── Core feature; validate with in-memory state first, no real-time yet

8. Real-time subscription layer (SSE + LISTEN/NOTIFY)
   └── Layer on top of working mutations; observable from step 7

9. Buddy board live view (real-time list of active pairs)
   └── Combines sessions + pairs + subscription

10. Buddy call screen (clean scrollable list for roll call)
    └── Read-only projection of step 9 data; pure UI work
```

Do not skip step 7 before step 8. The non-real-time mutation path must work correctly
first. Real-time is an enhancement, not a replacement. This sequencing also makes it
possible to demo and validate the core product (step 7) before the infrastructure
complexity of subscriptions is introduced.

---

## Data Flow Diagram

### Add Buddy Pair (mutation + broadcast)

```
[Counselor iPad]
    │
    │  POST /api/trpc/buddyPairs.add  { sessionId, camper1Code, camper2Code }
    │
    ▼
[Next.js tRPC Handler]
    │
    ├─ validate session belongs to requesting user's pool
    ├─ resolve camper codes → camper IDs
    ├─ INSERT BuddyPair (Prisma transaction)
    │       │
    │       └─ PostgreSQL trigger fires on INSERT
    │               │
    │               └─ pg_notify('pool_<poolId>', { event: 'PAIR_ADDED', pair: {...} })
    │
    ├─ return { success: true, pair: {...} }   ← counselor's device updates optimistically
    │
    ▼
[pg-listen singleton in Node.js process]
    │
    │  receives NOTIFY
    │
    ├─ fan out to all SSE connections subscribed to pool_<poolId>
    │
    ▼
[All other counselors at Pool A]
    SSE event received → React Query cache updated → UI re-renders
```

### Initial Page Load (query + subscribe)

```
[Counselor navigates to Pool A board]
    │
    ├─ GET /api/trpc/sessions.getActive?poolId=A
    │       └─ returns current session + all active BuddyPairs (snapshot)
    │
    ├─ GET /api/trpc/buddyPairs.onChange?poolId=A  (SSE upgrade)
    │       └─ server holds connection open
    │       └─ subsequent NOTIFY events stream as SSE data frames
    │
    └─ UI renders snapshot; live updates apply on top via subscription
```

### Session Close (admin or counselor action)

```
[Counselor closes session]
    │
    ├─ POST /api/trpc/sessions.close { sessionId }
    │       └─ sets Session.closedAt = NOW()
    │       └─ triggers NOTIFY: { event: 'SESSION_CLOSED', sessionId }
    │
    └─ All connected clients for that pool receive SESSION_CLOSED event
            └─ UI navigates away from buddy board (no active session)
```

---

## Architectural Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time transport | SSE (not WebSocket) | Mutations use HTTP; no bidirectional channel needed; simpler Next.js integration |
| Event bus | PostgreSQL LISTEN/NOTIFY (not Redis) | App scale < 50 users; no additional service to operate; transactionally safe |
| API style | tRPC (not REST/GraphQL) | Single TypeScript codebase; zero schema drift; native SSE subscription support |
| Auth | NextAuth.js v5 Credentials | Username/password only (project requirement); no OAuth complexity |
| ORM | Prisma | Type-safe queries that match tRPC's type philosophy; migrations built in |
| Database | PostgreSQL | Required for LISTEN/NOTIFY; strong constraint support for unique indexes |
| Deployment target | Railway / Fly.io / Render | Persistent Node.js process required for SSE; Vercel serverless is excluded |
| Conflict resolution | Database constraints (not OT/CRDT) | Append/delete-only operations; no merge needed; duplicate rejected at DB level |
| Buddy pair deletion | Soft delete (removedAt) | Audit trail for safety records; closed sessions archive naturally |

---

## Sources

- [tRPC Subscriptions](https://trpc.io/docs/server/subscriptions) — SSE vs WebSocket recommendation, tracked() reconnection pattern
- [tRPC + SSE example](https://github.com/trpc/examples-next-sse-chat) — Reference implementation
- [PostgreSQL LISTEN/NOTIFY for real-time without Redis](https://www.pedroalonso.net/blog/postgres-listen-notify-real-time/) — Pattern and scaling limits
- [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture) — Comparison reference (not chosen)
- [Auth.js Role-Based Access Control](https://authjs.dev/guides/role-based-access-control) — Role enforcement patterns
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) — App Router session patterns
- [WebSocket vs SSE pattern breakdown](https://codelit.io/blog/real-time-architecture-websockets) — Transport comparison
- [WebSockets with Next.js App Router constraints](https://github.com/vercel/next.js/discussions/14950) — Serverless limitations
