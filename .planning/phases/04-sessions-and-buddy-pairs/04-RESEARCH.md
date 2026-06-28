# Phase 4: Sessions & Buddy Pairs - Research

**Researched:** 2026-06-28
**Domain:** Next.js 16 App Router — Server Actions, Drizzle ORM, PostgreSQL partial unique indexes, counselor session lifecycle
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** One shared session per pool at a time. All counselors at Pool A work on the same session. Clicking a pool navigates to `/pools/[poolId]`; the server auto-joins or creates a session instantly.
- **D-02:** HTTP-only — no real-time sync. Phase 5 adds WebSocket on top.
- **D-03:** If an active session already exists when a counselor navigates to `/pools/[poolId]`, show a "Session in progress — join?" prompt before displaying the board.
- **D-04:** Pair entry: two fields (Camper 1, Camper 2). Both accept code or name. Exact code → resolve immediately; name-like → typeahead dropdown. No mode toggle.
- **D-05:** "Add pair" button disabled until both campers resolved. After success: both fields clear, focus returns to Camper 1.
- **D-06:** Trios via "+1" button on a pair row. Single camper picker (code or name). Max group size 3. +1 button hidden once trio.
- **D-07:** PAIR-04 enforced at DB level. UI surfaces server error inline.
- **D-08:** Single-page layout at `/pools/[poolId]`: sticky header, entry form, scrollable pair list.
- **D-09:** Swimmer/pair count is the hero element — 36px, semibold, high contrast. Updates after each mutation.
- **D-10:** URLs: `/pools` for pool selection, `/pools/[poolId]` for active session.
- **D-11:** Auto-create session if none exists. Show join prompt if session already existed.
- **D-12:** "Close session" always visible. Confirmation dialog if active pairs exist; immediate close if empty.
- **D-13:** Closed sessions not shown in active view, cannot be reopened, data retained forever.
- **Folded todo:** Logout button in session header (and admin nav) — `authClient.signOut()` + redirect.

### Claude's Discretion

- Typeahead debounce timing (300ms established).
- Chip/tag visual style (slate/blue-600 palette documented in UI-SPEC).
- Join prompt design (modal per UI-SPEC).
- Exact pair row layout.
- Loading/submitting states on Add pair form.
- Error display for PAIR-04 violations.

### Deferred Ideas (OUT OF SCOPE)

- Real-time pair updates across devices — Phase 5.
- High-contrast buddy call screen — Phase 6.
- Swimmer count / pair count as live WebSocket feed — Phase 5.
- Session history / past boards — v2.
- Bulk remove all pairs — v2.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SESS-01 | Counselor can start a new pool session by selecting a pool from the configured list | Pool list from `pool` table (Phase 3); `poolSession` table creation in Page Server Component via get-or-create pattern |
| SESS-02 | System prompts for confirmation before closing a session that has active pairs | Close session Server Action queries pairMember count first; confirmation handled in Close Session Dialog client component |
| SESS-03 | Session data (buddy pairs, timestamps) is archived when closed — not deleted | `status` column on `poolSession` flips to `'closed'`; no DELETE; all pairMember rows remain |
| SESS-04 | Closed sessions are not shown in the active pool view | Pool selection page queries `WHERE status = 'active'`; closed sessions invisible to counselors |
| PAIR-01 | Counselor can register a buddy pair by entering two camper codes | Exact code lookup in `searchCampersAction`; resolves camper immediately if code matches |
| PAIR-02 | Counselor can register a buddy pair by typing a name with live typeahead | `searchCampersAction` called from useTransition in CamperField client component; 300ms debounce |
| PAIR-03 | Counselor can remove a buddy pair; removal confirmed by server before UI updates | `removePairAction` Server Action deletes pairMember rows then pair row; `revalidatePath` triggers Server Component re-render |
| PAIR-04 | System prevents same camper in two active pairs simultaneously — enforced at DB level | Unique constraint on `pairMember(camper_id, session_id)`; application also checks in transaction before insert |

</phase_requirements>

---

## Summary

Phase 4 builds the counselor-facing core of BuddyBoard: navigate to a pool, run a swim session, register buddy pairs (by code or name typeahead), add trios, remove pairs, and close the session with archive. All over HTTP; Phase 5 adds real-time.

The critical schema challenge is that `session` is already the name of Better Auth's auth session table. Phase 4 must use a different name — `poolSession` (DB table: `pool_session`) — for the swim session concept. The pair data model uses three tables: `poolSession`, `pair`, and `pairMember` (junction table). The junction table approach gives true DB-level enforcement of PAIR-04 via a unique constraint on `(camper_id, session_id)`.

The typeahead pattern diverges from Phase 3's URL-navigation search. The counselor-facing typeahead calls a Server Action directly from a `useTransition` hook (no page navigation), excludes already-paired campers via a `notInArray` subquery, and returns lightweight results (max 10, no pagination). Both `notInArray` and partial unique indexes are confirmed available in the installed versions of drizzle-orm (0.45.2) and Drizzle-compatible PostgreSQL.

**Primary recommendation:** Three-table schema (`poolSession` + `pair` + `pairMember`) with a partial unique index protecting one active session per pool and a unique constraint protecting PAIR-04. All mutations via Server Actions following the Phase 3 pattern with a `requireAuth()` guard.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pool session lifecycle (create, close) | API / Backend (Server Action) | — | Session state is authoritative on the server; client only triggers mutations |
| Active session query | Frontend Server (SSR) | — | Page Server Component fetches session on every request; no client state needed |
| Join prompt display | Browser / Client | — | Pure UI state — whether the user has dismissed the prompt; no server round-trip needed |
| Pair CRUD (add, remove) | API / Backend (Server Action) | — | Mutations require auth check and DB write; client triggers via form action |
| Typeahead search | API / Backend (Server Action) | Browser / Client | Server executes query with auth; client manages debounce, display, and chip resolution |
| Swimmer/pair count display | Frontend Server (SSR) | — | Count derived from pairMember rows fetched during page render; updates on revalidation |
| Trio add (+1) | API / Backend (Server Action) | Browser / Client | Same as pair add — server insert into pairMember; client shows Trio Picker modal |
| Logout | Browser / Client | — | `authClient.signOut()` is a Better Auth client method; redirect after sign-out |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 (installed) | Schema definitions, queries, partial indexes | Already in use; `notInArray`, `uniqueIndex().where()` confirmed available |
| next | 16.2.9 (installed) | App Router, Server Components, Server Actions | Established across all phases |
| better-auth | 1.6.22 (installed) | Auth session retrieval via `auth.api.getSession()` | Established pattern; `requireAuth()` uses same call |
| react | 19.2.4 (installed) | `useTransition`, `useActionState`, `useState` for typeahead and modals | Already pinned |
| lucide-react | 1.21.0 (installed) | `UserPlus`, `Trash2`, `LogOut` icons per UI-SPEC | Already installed |
| tailwindcss | 4.x (installed) | All styling — follows slate/blue-600 palette from UI-SPEC | Established across all phases |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| postgres (pg driver) | 3.4.9 (installed) | Drizzle connection; no direct use in Phase 4 | Transparent — Drizzle uses it internally |
| vitest | 4.1.9 (installed) | Unit tests for Server Actions | Follow Phase 3 test pattern |
| @testing-library/react | 16.3.2 (installed) | Component render tests | Page-level smoke tests |

**No new packages required for Phase 4.** [VERIFIED: codebase package.json]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Action for typeahead | Route Handler `/api/campers/search` | Route Handler avoids Server Action overhead but requires a separate file, manual auth check, and fetch() in client. Server Action is simpler and consistent with all Phase 2–3 mutations. |
| `pairMember` junction table | 3-column pair table (`camper1Id`, `camper2Id`, `camper3Id`) | 3-column model cannot express a UNIQUE constraint across all three columns simultaneously — DB-level PAIR-04 enforcement becomes impossible without a trigger. Junction table is required. |
| Partial unique index for "one active session per pool" | Application-level transaction check | Both are needed. Partial index is the DB-level safety net; transaction check is the application-level response. |

**Installation:** No new installs needed.

---

## Package Legitimacy Audit

> Phase 4 installs no new packages. All dependencies are already present in the lockfile.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Counselor Browser
      │
      │  GET /pools/[poolId]
      ▼
┌─────────────────────────────────┐
│  Page Server Component          │
│  1. getPoolById(poolId)         │
│  2. getOrCreateActiveSession()  │──────► PostgreSQL
│     → returns { session,        │◄────── pool_session, pair, pair_member
│         wasJustCreated }        │
│  3. getPairsForSession()        │
│  renders: JoinPromptModal (if   │
│           !wasJustCreated)      │
│         + SessionBoard          │
└─────────────────────────────────┘
      │
      │  SSR HTML + React islands
      ▼
Counselor Browser (hydrated)
      │
      ├── CamperField (Client Component)
      │   └── useTransition → searchCampersAction() ──► DB: camper WHERE name/code LIKE ?
      │                                                        AND id NOT IN (paired campers)
      │
      ├── AddPairForm (Client Component)
      │   └── Server Action: addPairAction()
      │       transaction: insert pair + pairMember × 2
      │       UNIQUE(camper_id, session_id) catches PAIR-04
      │       revalidatePath('/pools/[poolId]') → re-render ─► Page Server Component
      │
      ├── RemovePair (Client Component, row button)
      │   └── Server Action: removePairAction()
      │       delete pairMember WHERE pairId = ?
      │       delete pair WHERE id = ?
      │       revalidatePath('/pools/[poolId]') → re-render
      │
      └── CloseSessionDialog (Client Component)
          └── Server Action: closeSessionAction()
              UPDATE pool_session SET status='closed'
              revalidatePath('/pools')
              redirect('/pools')
```

### Recommended Project Structure

```
src/
├── app/
│   └── (protected)/
│       └── pools/
│           ├── page.tsx              # Updated: DB-driven pool list + Log out button
│           └── [poolId]/
│               ├── page.tsx          # Server Component: getOrCreate session, fetch pairs
│               ├── actions.ts        # addPairAction, removePairAction, closeSessionAction, searchCampersAction
│               └── components/
│                   ├── SessionBoard.tsx       # Composes header + form + pair list
│                   ├── SessionHeader.tsx      # Hero count, pool name, Close/Logout buttons
│                   ├── AddPairForm.tsx        # Two CamperFields + Add pair button
│                   ├── CamperField.tsx        # Input + typeahead dropdown + chip resolution
│                   ├── PairList.tsx           # Scrollable list of PairRow
│                   ├── PairRow.tsx            # One row: names, +1 button, Remove button
│                   ├── TrioPicker.tsx         # Modal: single CamperField to add trio member
│                   ├── JoinSessionModal.tsx   # "Session in progress — join?" prompt
│                   └── CloseSessionDialog.tsx # Confirmation dialog (adapted from DeleteConfirmDialog)
└── db/
    └── schema.ts                     # Add poolSession, pair, pairMember tables
```

### Pattern 1: `requireAuth()` Guard

Phase 4 uses the same guard pattern as Phase 2/3 but without a role check — any authenticated user can manage pairs.

```typescript
// Source: src/app/(admin)/admin/users/actions.ts (adapted)
// Location: src/app/(protected)/pools/[poolId]/actions.ts

"use server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session; // session.user.id available for attribution
}
```

[VERIFIED: codebase — src/app/(admin)/admin/users/actions.ts and src/app/(admin)/admin/campers/actions.ts]

### Pattern 2: Get-or-Create Pool Session (Server Component)

The Page Server Component calls this helper during render. It returns a flag indicating whether the session existed before this request — used to decide whether to show the join prompt.

```typescript
// Source: Drizzle ORM — verified via node_modules/drizzle-orm/sql/expressions/conditions.d.ts
// Location: src/app/(protected)/pools/[poolId]/page.tsx or a lib helper

import { db } from "@/db";
import { poolSession } from "@/db/schema";
import { and, eq } from "drizzle-orm";

async function getOrCreateActiveSession(poolId: string, openedById: string) {
  // 1. Check for existing active session
  const existing = await db
    .select()
    .from(poolSession)
    .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
    .limit(1);

  if (existing.length > 0) {
    return { session: existing[0], wasJustCreated: false };
  }

  // 2. Create new session (partial unique index protects against race)
  const [created] = await db
    .insert(poolSession)
    .values({
      id: crypto.randomUUID(),
      poolId,
      status: "active",
      openedById,
      openedAt: new Date(),
    })
    .onConflictDoNothing()  // handles race: another counselor inserted first
    .returning();

  if (created) {
    return { session: created, wasJustCreated: true };
  }

  // 3. Race lost — fetch what the winner created
  const afterRace = await db
    .select()
    .from(poolSession)
    .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
    .limit(1);

  return { session: afterRace[0], wasJustCreated: false };
}
```

[VERIFIED: drizzle-orm 0.45.2 — `onConflictDoNothing()` available on InsertBuilder]

### Pattern 3: Typeahead Server Action (Called from useTransition)

The typeahead does NOT navigate like Phase 3's SearchBar. It calls a Server Action directly and sets local state.

```typescript
// Source: drizzle-orm — notInArray confirmed in conditions.d.ts
// Location: src/app/(protected)/pools/[poolId]/actions.ts

"use server";
import { db } from "@/db";
import { camper, pairMember } from "@/db/schema";
import { and, or, ilike, eq, notInArray } from "drizzle-orm";

export type CamperSuggestion = {
  id: string;
  firstName: string;
  lastName: string;
  bunk: string;
  code: string;
};

export async function searchCampersAction(
  query: string,
  sessionId: string,
): Promise<CamperSuggestion[]> {
  await requireAuth();

  const q = query.trim();
  if (!q) return [];

  // Subquery: campers already in a pair in this session
  const alreadyPaired = db
    .select({ camperId: pairMember.camperId })
    .from(pairMember)
    .where(eq(pairMember.sessionId, sessionId));

  // 1. Exact code match first (fast path for PAIR-01)
  const exact = await db
    .select()
    .from(camper)
    .where(and(eq(camper.code, q), notInArray(camper.id, alreadyPaired)))
    .limit(1);

  if (exact.length > 0) return exact;

  // 2. Name / partial code fuzzy match
  return db
    .select()
    .from(camper)
    .where(
      and(
        or(
          ilike(camper.firstName, `%${q}%`),
          ilike(camper.lastName, `%${q}%`),
          ilike(camper.code, `%${q}%`),
        ),
        notInArray(camper.id, alreadyPaired),
      ),
    )
    .limit(10);
}
```

Client-side usage in CamperField:

```typescript
// Source: React 19 — useTransition is stable in react 19.2.4
"use client";
import { useTransition, useState, useRef } from "react";
import { searchCampersAction } from "../actions";

// Inside CamperField component:
const [isPending, startTransition] = useTransition();
const [suggestions, setSuggestions] = useState<CamperSuggestion[]>([]);
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleInput(value: string) {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    startTransition(async () => {
      const results = await searchCampersAction(value, sessionId);
      setSuggestions(results);
    });
  }, 300); // matches Phase 3 debounce (D-03 discretion)
}
```

[VERIFIED: React 19.2.4 installed — useTransition is stable]
[VERIFIED: drizzle-orm conditions.d.ts — notInArray accepts SQLWrapper (subquery)]

### Pattern 4: Add Pair Action with PAIR-04 Handling

```typescript
// Source: drizzle-orm — transaction API, verified in package
// Location: src/app/(protected)/pools/[poolId]/actions.ts

"use server";
import { db } from "@/db";
import { pair, pairMember } from "@/db/schema";
import { revalidatePath } from "next/cache";

export type AddPairResult =
  | { success: true }
  | { success: false; error: string; conflictCamperId?: string };

export async function addPairAction(
  sessionId: string,
  poolId: string,
  camper1Id: string,
  camper2Id: string,
): Promise<AddPairResult> {
  await requireAuth();

  try {
    await db.transaction(async (tx) => {
      const pairId = crypto.randomUUID();
      await tx.insert(pair).values({ id: pairId, sessionId, createdAt: new Date() });
      // The UNIQUE(camper_id, session_id) index on pairMember enforces PAIR-04 at DB level
      await tx.insert(pairMember).values([
        { pairId, camperId: camper1Id, sessionId },
        { pairId, camperId: camper2Id, sessionId },
      ]);
    });
  } catch (err: unknown) {
    // PostgreSQL unique violation code: 23505
    if (err instanceof Error && err.message.includes("23505")) {
      return {
        success: false,
        error: "PAIR-04",
        // Caller can look up camper name from their local state using conflictCamperId
      };
    }
    return { success: false, error: "Could not add pair. Please try again." };
  }

  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}
```

[VERIFIED: Drizzle transaction API available (used in Phase 3 importCampersAction)]
[VERIFIED: PostgreSQL unique violation — error code 23505 in standard pg error format]

### Pattern 5: Close Session Action

```typescript
// IMPORTANT: redirect() must be OUTSIDE try/catch per Next.js 16 docs
// Source: node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md (verified)

"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function closeSessionAction(sessionId: string) {
  await requireAuth();

  await db
    .update(poolSession)
    .set({ status: "closed", closedAt: new Date() })
    .where(and(eq(poolSession.id, sessionId), eq(poolSession.status, "active")));

  revalidatePath("/pools");
  revalidatePath("/pools/[poolId]", "page"); // invalidates all /pools/* pages
  redirect("/pools"); // must be outside try/catch — throws internally
}
```

[VERIFIED: Next.js 16 docs — redirect() throws internally, must be outside try/catch]
[VERIFIED: Next.js 16 docs — revalidatePath(path, 'page') invalidates dynamic route pages]

### Anti-Patterns to Avoid

- **Using the `session` table name for swim sessions:** The `session` table is owned by Better Auth. Adding columns to it or naming a new table `session` will cause schema conflicts and confuse the ORM relations.
- **URL-navigation pattern for typeahead (Phase 3 SearchBar approach):** `router.push(pathname + ?q=...)` causes a full page navigation. The typeahead needs inline results without navigation — use Server Action + useTransition.
- **Calling `redirect()` inside `try/catch`:** Next.js 16's `redirect()` works by throwing a special error internally. Wrapping it in try/catch will catch and swallow the redirect.
- **3-column pair model (`camper1Id`, `camper2Id`, `camper3Id`):** Cannot express a DB-level unique constraint that prevents a camper from appearing in any of the three columns across different pairs in the same session. Requires a trigger or full application-level enforcement.
- **Checking PAIR-04 before insert without a transaction:** The select-then-insert sequence has a race condition if two counselors add the same camper simultaneously. The DB unique constraint is the safety net; the transaction ensures the check and insert are atomic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PAIR-04 DB enforcement | Custom trigger or CHECK constraint | `UNIQUE(camper_id, session_id)` on `pairMember` table | Drizzle's `uniqueIndex()` generates the correct PostgreSQL DDL; triggers require raw SQL and are harder to maintain |
| One active session per pool | Application-level mutex or Redis lock | PostgreSQL partial unique index via `uniqueIndex().on(poolId).where(sql\`status = 'active'\`)` | DB enforces the invariant at the storage level; no application coordination needed |
| Duplicate-free camper list for typeahead | Manual filter in application code | `notInArray(camper.id, subquery)` in the Drizzle query | Subquery executes in a single DB round-trip; application-level filtering requires fetching all pairs first |
| Modal/dialog state | Custom dialog library | Inline `useState(false)` with `fixed inset-0` overlay (established Phase 2 pattern) | DeleteConfirmDialog.tsx pattern is already proven — copy and adapt |
| Focus management after pair add | FocusManager or focus-trap library | `inputRef.current?.focus()` in the form success handler | One `.focus()` call suffices; D-05 is explicit about the target |

**Key insight:** The junction table approach converts PAIR-04 from a complex application invariant into a simple DB constraint. The DB handles the hard part; the application only needs to parse the error code and display a helpful message.

---

## Common Pitfalls

### Pitfall 1: `session` Table Name Collision

**What goes wrong:** Defining a new Drizzle table named `session` conflicts with Better Auth's existing `session` table (the one with `expiresAt`, `token`, `userId`). Drizzle-kit push will attempt to alter the existing table or throw a schema conflict. All existing auth session relations break.

**Why it happens:** The word "session" is natural for a swim session. The conflict is non-obvious unless you read the schema first.

**How to avoid:** Name the swim session table `poolSession` in TypeScript (Drizzle schema export) mapping to `pool_session` in the database. The DB table name `pool_session` has no conflict.

**Warning signs:** Drizzle-kit push output showing modification of the `session` table; auth breaking after migration.

[VERIFIED: src/db/schema.ts — `session` table exists with expiresAt/token/userId columns]

### Pitfall 2: `searchParams` is a Promise in Next.js 16

**What goes wrong:** Accessing `searchParams.q` directly (without `await`) returns undefined. This pattern was changed in Next.js 15+ — `searchParams` is now a Promise.

**Why it happens:** Next.js 16 made `searchParams` async to align with the streaming model.

**How to avoid:** Follow the Phase 3 pattern: `const { q = "" } = await searchParams;`

**Warning signs:** `searchParams` access returns `undefined` or a `Promise` object; same issue applies to `params` in dynamic routes — `const { poolId } = await params;`

[VERIFIED: src/app/(admin)/admin/campers/page.tsx — comment explicitly warns about this; `searchParams: Promise<{...}>` type is used]

### Pitfall 3: `redirect()` Caught by try/catch

**What goes wrong:** A Server Action wraps its entire body in try/catch. `redirect('/pools')` is called inside the try block. The redirect never fires — the catch block runs instead.

**Why it happens:** Next.js `redirect()` works by throwing a special internal error. A catch block with `catch (err)` catches it.

**How to avoid:** Perform all fallible operations inside try/catch, then call `redirect()` after the try/catch block.

**Warning signs:** `redirect()` called but page never navigates; no error in server logs.

[VERIFIED: Next.js 16 docs — node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md]

### Pitfall 4: `revalidatePath` for Dynamic Routes

**What goes wrong:** Calling `revalidatePath('/pools/[poolId]')` without the second argument `'page'` may not correctly invalidate all matching pool session pages.

**How to avoid:** For the specific session: `revalidatePath(\`/pools/${poolId}\`)`. To invalidate ALL pool session pages (e.g., after close): `revalidatePath('/pools/[poolId]', 'page')`.

[VERIFIED: Next.js 16 docs — revalidatePath.md; type parameter required for dynamic segments]

### Pitfall 5: `params` is a Promise in Dynamic Route Pages

**What goes wrong:** Same as Pitfall 2 but for route params. In `/pools/[poolId]/page.tsx`, `params.poolId` is not accessible without `await`.

**How to avoid:**
```typescript
export default async function PoolSessionPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;
  // ...
}
```

[VERIFIED: Inferred from Next.js 16 searchParams pattern; same async treatment applies to params]

### Pitfall 6: Unique Constraint Error Parsing

**What goes wrong:** The PostgreSQL unique violation error (code 23505) may be wrapped differently depending on the postgres driver version and Drizzle version. Checking `err.message.includes("23505")` may not match if the error is wrapped or has a different format.

**How to avoid:** Check both `err.code === "23505"` (if the error exposes a `code` property from the pg driver) and `err.message.includes("23505")` as a fallback. Or use a helper that checks both:
```typescript
function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return "code" in err
    ? (err as { code: string }).code === "23505"
    : err.message.includes("23505");
}
```

[ASSUMED — PostgreSQL error code 23505 is the standard unique violation code; driver error wrapping is training knowledge]

### Pitfall 7: Supabase Realtime Compatibility (Phase 5 Forward)

**What goes wrong:** Phase 5 will watch the `pair` and `pairMember` tables via Supabase Realtime. If Phase 4 uses destructive updates (UPDATE pair SET camper3Id = ?) instead of INSERT into pairMember, Phase 5 won't see trio additions as INSERT events.

**How to avoid:** All pair membership changes — including trio adds — must be INSERTs and DELETEs on `pairMember`, never UPDATEs to existing rows. This is natural with the junction table model.

[ASSUMED — based on Supabase Realtime behavior and Phase 5 design intent from CONTEXT.md]

---

## Code Examples

### Schema Additions

```typescript
// Source: drizzle-orm pg-core API — uniqueIndex().where() confirmed in indexes.d.ts
// Location: src/db/schema.ts — add after existing tables

import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const poolSession = pgTable(
  "pool_session",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pool.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // 'active' | 'closed'
    openedById: text("opened_by_id").references(() => user.id, { onDelete: "set null" }),
    openedAt: timestamp("opened_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
  },
  (table) => [
    // Enforces D-01: one active session per pool at a time (DB level)
    uniqueIndex("unique_active_session_per_pool")
      .on(table.poolId)
      .where(sql`status = 'active'`),
    index("pool_session_pool_id_idx").on(table.poolId),
    index("pool_session_status_idx").on(table.status),
  ],
);

export const pair = pgTable("pair", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => poolSession.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pairMember = pgTable(
  "pair_member",
  {
    pairId: text("pair_id")
      .notNull()
      .references(() => pair.id, { onDelete: "cascade" }),
    camperId: text("camper_id")
      .notNull()
      .references(() => camper.id, { onDelete: "cascade" }),
    sessionId: text("session_id")  // denormalized for the unique constraint
      .notNull()
      .references(() => poolSession.id, { onDelete: "cascade" }),
  },
  (table) => [
    // Enforces PAIR-04: a camper cannot appear twice in the same session (DB level)
    uniqueIndex("unique_camper_per_session")
      .on(table.camperId, table.sessionId),
    index("pair_member_pair_id_idx").on(table.pairId),
  ],
);
```

[VERIFIED: drizzle-orm 0.45.2 — uniqueIndex, index from pg-core; .where() on IndexBuilder confirmed]
[VERIFIED: partial unique index WHERE clause uses unquoted column name (no table prefix) as shown in PostgreSQL DDL convention]

### Fetching Pairs for Session Page

```typescript
// Source: drizzle-orm select API — confirmed in codebase usage
// Location: src/app/(protected)/pools/[poolId]/page.tsx

import { db } from "@/db";
import { pair, pairMember, camper } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getPairsForSession(sessionId: string) {
  // Get all pairs with their members in one query
  const members = await db
    .select({
      pairId: pairMember.pairId,
      camperId: pairMember.camperId,
      firstName: camper.firstName,
      lastName: camper.lastName,
      bunk: camper.bunk,
    })
    .from(pairMember)
    .innerJoin(camper, eq(pairMember.camperId, camper.id))
    .where(eq(pairMember.sessionId, sessionId));

  // Group by pairId in application code (simpler than SQL grouping for small counts)
  const pairsMap = new Map<string, typeof members>();
  for (const m of members) {
    if (!pairsMap.has(m.pairId)) pairsMap.set(m.pairId, []);
    pairsMap.get(m.pairId)!.push(m);
  }

  return Array.from(pairsMap.entries()).map(([id, members]) => ({ id, members }));
}
```

### Counting Swimmers and Pairs (Hero Numbers)

```typescript
// Two numbers needed for the header: total swimmers (pairMember count) and total pairs (pair count)
const [swimmerCount, pairCount] = await Promise.all([
  db
    .select({ count: sql<number>`count(*)` })
    .from(pairMember)
    .where(eq(pairMember.sessionId, sessionId))
    .then((r) => Number(r[0]?.count ?? 0)),
  db
    .select({ count: sql<number>`count(*)` })
    .from(pair)
    .where(eq(pair.sessionId, sessionId))
    .then((r) => Number(r[0]?.count ?? 0)),
]);
```

### Remove Pair Action

```typescript
"use server";
import { db } from "@/db";
import { pair } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function removePairAction(pairId: string, poolId: string) {
  await requireAuth();
  // pairMember rows cascade-delete via FK onDelete: "cascade"
  await db.delete(pair).where(eq(pair.id, pairId));
  revalidatePath(`/pools/${poolId}`);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` directly accessible | `searchParams` is a `Promise<{}>` | Next.js 15 | Must `await searchParams` before accessing keys |
| `params` directly accessible in page props | `params` is a `Promise<{}>` | Next.js 15 | Must `await params` to get `poolId` in dynamic route |
| Route Handlers for data mutations | Server Actions (Server Functions) | Next.js 13 | Form `action` attribute accepts async server functions directly |
| Client-side state management for auth | `auth.api.getSession({ headers })` in Server Components | Better Auth 1.x | No client auth state needed — server reads session from request cookies |

**Deprecated/outdated (do not use):**
- `getServerSideProps` / `getStaticProps` — Pages Router; this app uses App Router only
- `useFormState` — renamed to `useActionState` in React 19 (react 19.2.4 is installed; use `useActionState`)

---

## Open Questions (RESOLVED)

1. **Partial unique index WHERE clause syntax with Drizzle 0.45.2** — RESOLVED
   - **Decision:** Use `sql\`status = 'active'\`` (unqualified column name, no table prefix). This matches the PostgreSQL partial index DDL syntax natively and matches the verified comment in `drizzle-orm/pg-core/indexes.d.ts`.
   - **Fallback (if drizzle-kit push rejects):** Remove the `.where()` clause and enforce one-active-session-per-pool at application level inside a transaction: SELECT for existing active session, INSERT only if none found. Camp-scale concurrency (1–2 counselors per pool) makes application-level enforcement safe as a fallback.
   - **No mid-execution pivot needed:** Plan 04-01 Task 1 note documents both paths; executor checks drizzle-kit push output before proceeding.

2. **`onConflictDoNothing()` + `returning()` interaction** — RESOLVED
   - **Decision:** Drizzle returns `[]` (empty array) when `onConflictDoNothing()` fires. Access via destructure with nullish fallback: `const [created] = (await db.insert(...).onConflictDoNothing().returning()) ?? [];`. If `created` is `undefined`, the conflict fired and a 3rd SELECT retrieves the winning row.
   - **Risk:** Low. The `if (created)` null-check in the get-or-create pattern already handles this correctly.

3. **Join prompt for session creator vs. joiner** — RESOLVED
   - **Decision:** Show the join prompt whenever `wasJustCreated === false`. This means counselor A sees the board immediately on creation, then sees the join prompt on any subsequent navigation (including their own return). This is correct per D-03: "an active session already exists" → show prompt. No per-user session tracking needed.
   - **UX implication:** On a return visit, the "Session in progress — join?" copy still makes sense ("Another counselor has an active session" is slightly misleading for the creator, but this is Phase 4 scope — Phase 5 can refine with real-time awareness). Acceptable for v1.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / Next.js dev server | All development | ✓ | Next.js 16.2.9 confirmed | — |
| PostgreSQL (via Supabase) | All DB operations | ✓ | Supabase project established in Phase 1 | — |
| drizzle-kit push | Schema migration | ✓ | 0.31.10 (package.json) | — |
| lucide-react | Icons (UserPlus, Trash2, LogOut) | ✓ | 1.21.0 | — |

All dependencies are present. No installs required. The `npx drizzle-kit push` step is a blocking prerequisite (same as Phases 1 and 3) before any code that references `poolSession`, `pair`, or `pairMember` tables.

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (root — already exists) |
| Quick run command | `npx vitest run src/app/(protected)/pools` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SESS-01 | `getOrCreateActiveSession` creates a session if none exists | unit | `npx vitest run src/app/(protected)/pools/[poolId]/actions.test.ts` | ❌ Wave 0 |
| SESS-02 | `closeSessionAction` returns pair count for confirmation | unit | same | ❌ Wave 0 |
| SESS-03 | `closeSessionAction` sets status='closed', does not delete pair/pairMember | unit | same | ❌ Wave 0 |
| SESS-04 | `/pools` page query filters `WHERE status = 'active'` | unit | `npx vitest run src/app/(protected)/pools/page.test.tsx` | ❌ Wave 0 |
| PAIR-01 | `searchCampersAction` returns exact code match first | unit | `npx vitest run src/app/(protected)/pools/[poolId]/actions.test.ts` | ❌ Wave 0 |
| PAIR-02 | `searchCampersAction` returns name fuzzy matches, excludes paired campers | unit | same | ❌ Wave 0 |
| PAIR-03 | `removePairAction` calls db.delete and revalidatePath | unit | same | ❌ Wave 0 |
| PAIR-04 | `addPairAction` returns PAIR-04 error on unique constraint violation (mocked) | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/app/(protected)/pools`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/(protected)/pools/[poolId]/actions.test.ts` — covers SESS-01, SESS-02, SESS-03, PAIR-01, PAIR-02, PAIR-03, PAIR-04
- [ ] `src/app/(protected)/pools/page.test.tsx` — covers SESS-04
- Framework and mocks are already configured — `vitest.config.ts`, `src/test/setup.ts`, and the mock pattern (`vi.mock('@/lib/auth', ...)`) are all established in Phase 3

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAuth()` in every Server Action — any unauthenticated call throws |
| V3 Session Management | no | Better Auth manages auth sessions; Phase 4 doesn't touch auth session tokens |
| V4 Access Control | yes | All counselors can read/write pairs in any pool; admins are also counselors here. No per-pool ACL needed in Phase 4. |
| V5 Input Validation | yes | `query.trim()` in searchCampersAction; camper IDs validated by DB FK constraints; session ID validated by DB FK |
| V6 Cryptography | no | No encryption in Phase 4; `crypto.randomUUID()` for IDs |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated Server Action call | Elevation of Privilege | `requireAuth()` at the top of every exported action |
| PAIR-04 race condition (two devices add same camper simultaneously) | Tampering | Unique constraint on `pairMember(camper_id, session_id)` — second insert fails at DB level |
| Session ID spoofing (counselor submits a sessionId from a different pool) | Tampering | Verify sessionId belongs to the expected poolId before any mutation: `AND pool_session.pool_id = poolId` |
| Cross-pool data leak via typeahead | Information Disclosure | `searchCampersAction` is authenticated; camper table is shared across all pools (no per-pool scoping needed — all counselors see all campers) |

---

## Sources

### Primary (HIGH confidence)

- `src/db/schema.ts` — Confirmed: `session` table name is taken by Better Auth; `pool` and `camper` tables exist as foreign key targets
- `src/app/(admin)/admin/users/actions.ts` — Confirmed: `requireAdmin()` pattern; `requireAuth()` is a direct adaptation
- `src/app/(admin)/admin/campers/actions.ts` — Confirmed: Drizzle transaction pattern, `revalidatePath` usage
- `src/app/(admin)/admin/campers/page.tsx` — Confirmed: `await searchParams` pattern; `ilike`, `or`, `sql` from drizzle-orm
- `src/app/(admin)/admin/campers/components/SearchBar.tsx` — Confirmed: 300ms debounce with `setTimeout`; `useRouter` URL-navigation pattern (contrasted with Phase 4 useTransition pattern)
- `node_modules/drizzle-orm/pg-core/indexes.d.ts` — Confirmed: `uniqueIndex()`, `IndexBuilder.where(condition: SQL)`, `.on()` method
- `node_modules/drizzle-orm/sql/expressions/conditions.d.ts` — Confirmed: `notInArray(column, SQLWrapper)` accepts subquery
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` — Confirmed: `redirect()` behavior in Server Actions
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` — Confirmed: `type` parameter for dynamic routes
- `package.json` — Confirmed: versions of all dependencies; no new packages needed
- `vitest.config.ts` + `src/app/(admin)/admin/campers/actions.test.ts` — Confirmed: test infrastructure, mock patterns

### Secondary (MEDIUM confidence)

- Phase 3 CONTEXT.md D-10, D-11 — Camper display format and search pattern decisions (authoritative project decisions)
- Phase 4 CONTEXT.md — All locked decisions (D-01 through D-13) treated as authoritative

### Tertiary (LOW confidence — see Assumptions Log)

- PostgreSQL unique violation error code 23505 — standard, but driver error wrapping format is assumed
- Supabase Realtime preference for INSERT/DELETE over UPDATE on pairMember — inferred from Phase 5 design intent
- `onConflictDoNothing().returning()` return type behavior — confirmed types exist but exact runtime behavior for zero-row case is assumed

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PostgreSQL unique violation surfaces as an error with code `23505` or a message containing `"23505"` from the postgres driver | Pitfall 6 / Pattern 4 | `addPairAction` may fail to detect PAIR-04 violations and return a generic error instead of the specific inline message |
| A2 | Supabase Realtime will prefer watching INSERT/DELETE events on `pairMember` for Phase 5 real-time trio additions | Pitfall 7 | If Phase 5 uses a different subscription strategy, the junction table's event pattern may not matter |
| A3 | `drizzle-kit push` correctly generates a partial unique index from `uniqueIndex().on().where(sql\`status = 'active'\`)` | Standard Stack / Schema | If drizzle-kit push doesn't support this syntax, the DB-level one-active-session-per-pool constraint must be implemented differently (application-level transaction) |
| A4 | `insert().onConflictDoNothing().returning()` returns an empty array (not undefined or null) when the conflict fires | Pattern 2 (get-or-create) | If it throws instead of returning empty, the race-condition path in `getOrCreateActiveSession` will error |

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

**AGENTS.md directive:** "This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

Research compliance:
- [x] Next.js 16 docs consulted for `redirect()`, `revalidatePath()`, `searchParams` behavior — all verified from `node_modules/next/dist/docs/`
- [x] Dynamic route `params` async pattern derived from same source
- [x] No App Router patterns from training data used without verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in package.json; no new packages needed
- Schema design: HIGH — drizzle-orm type defs confirm `uniqueIndex().where()` and `notInArray`; table naming confirmed via schema.ts inspection
- Architecture patterns: HIGH — all patterns derived from verified codebase (Phase 2/3 actions, page patterns) and Next.js 16 docs
- Pitfalls: HIGH — pitfalls 1–5 are verified; pitfalls 6–7 are MEDIUM (A1, A2 in assumptions log)
- Test map: HIGH — vitest infrastructure confirmed; test file names follow Phase 3 convention

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (stable libraries — drizzle-orm, Next.js 16, Better Auth 1.x)
