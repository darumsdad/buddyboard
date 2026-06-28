# Phase 4: Sessions & Buddy Pairs - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 15 new/modified files
**Analogs found:** 14 / 15

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/schema.ts` | model | CRUD | `src/db/schema.ts` (existing tables) | exact |
| `src/app/(protected)/pools/page.tsx` | component (Server) | request-response | `src/app/(protected)/pools/page.tsx` (current) | exact |
| `src/app/(protected)/pools/[poolId]/page.tsx` | component (Server) | request-response | `src/app/(admin)/admin/campers/page.tsx` | role-match |
| `src/app/(protected)/pools/[poolId]/actions.ts` | service | CRUD + request-response | `src/app/(admin)/admin/campers/actions.ts` | exact |
| `src/app/(protected)/pools/[poolId]/actions.test.ts` | test | — | `src/app/(admin)/admin/campers/actions.test.ts` | exact |
| `src/app/(protected)/pools/page.test.tsx` | test | — | `src/app/(admin)/admin/campers/actions.test.ts` | role-match |
| `src/app/(protected)/pools/[poolId]/components/SessionBoard.tsx` | component | request-response | `src/app/(admin)/admin/campers/page.tsx` | role-match |
| `src/app/(protected)/pools/[poolId]/components/SessionHeader.tsx` | component | request-response | `src/app/(protected)/pools/page.tsx` | role-match |
| `src/app/(protected)/pools/[poolId]/components/AddPairForm.tsx` | component | request-response | `src/app/(auth)/login/page.tsx` | role-match |
| `src/app/(protected)/pools/[poolId]/components/CamperField.tsx` | component | event-driven | `src/app/(admin)/admin/campers/components/SearchBar.tsx` | role-match |
| `src/app/(protected)/pools/[poolId]/components/PairList.tsx` | component | request-response | `src/app/(admin)/admin/campers/page.tsx` | role-match |
| `src/app/(protected)/pools/[poolId]/components/PairRow.tsx` | component | event-driven | `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` | role-match |
| `src/app/(protected)/pools/[poolId]/components/TrioPicker.tsx` | component | event-driven | `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` | exact |
| `src/app/(protected)/pools/[poolId]/components/JoinSessionModal.tsx` | component | event-driven | `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` | exact |
| `src/app/(protected)/pools/[poolId]/components/CloseSessionDialog.tsx` | component | event-driven | `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` | exact |

---

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD)

**Analog:** `src/db/schema.ts` (existing tables — `session`, `camper`, `pool`)

**Imports pattern** (lines 1-2 of existing schema.ts):
```typescript
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
```

Phase 4 must extend this import line to add `uniqueIndex` and import `sql` from `drizzle-orm`:
```typescript
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
```

**Core table pattern** (lines 104-133 of existing schema.ts — `camper` and `pool` tables are the FK targets):
```typescript
// Text PK via crypto.randomUUID() at insert time (NOT a DB default)
// defaultNow() for timestamps
// .references(() => otherTable.id, { onDelete: "cascade" }) for FKs
// Index array as the second argument: (table) => [ index(...).on(...), ... ]
export const pool = pgTable("pool", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**New tables pattern** (from RESEARCH.md Pattern — verified against drizzle-orm type defs):
```typescript
// CRITICAL: Do NOT name this table "session" — that name is taken by Better Auth (line 25-43 of schema.ts)
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
    sessionId: text("session_id") // denormalized for the unique constraint
      .notNull()
      .references(() => poolSession.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("unique_camper_per_session").on(table.camperId, table.sessionId),
    index("pair_member_pair_id_idx").on(table.pairId),
  ],
);
```

**Relations pattern** (lines 85-103 of schema.ts — follow the same `relations()` call structure):
```typescript
// After table definitions, add relations for Drizzle relational queries:
export const poolSessionRelations = relations(poolSession, ({ one, many }) => ({
  pool: one(pool, { fields: [poolSession.poolId], references: [pool.id] }),
  pairs: many(pair),
}));
export const pairRelations = relations(pair, ({ one, many }) => ({
  session: one(poolSession, { fields: [pair.sessionId], references: [poolSession.id] }),
  members: many(pairMember),
}));
export const pairMemberRelations = relations(pairMember, ({ one }) => ({
  pair: one(pair, { fields: [pairMember.pairId], references: [pair.id] }),
  camper: one(camper, { fields: [pairMember.camperId], references: [camper.id] }),
}));
```

---

### `src/app/(protected)/pools/page.tsx` (component, request-response) — MODIFY

**Analog:** `src/app/(protected)/pools/page.tsx` (current file, lines 1-32)

**Current structure to keep** (lines 1-8, 10-14):
```typescript
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PoolsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // ...
  {session.user.role === "admin" && (
    <Link href="/admin/users" className="absolute top-4 right-4 text-sm text-slate-600 hover:text-slate-900">Admin</Link>
  )}
```

**Changes needed:**
1. Add DB import and query for `pool` table — copy `db` import pattern from `src/app/(admin)/admin/campers/page.tsx` (line 7: `import { db } from "@/db";`)
2. Replace hardcoded `["Main Pool", "Lap Pool", "Kiddie Pool"]` array (line 21) with DB-fetched pools (`await db.select().from(pool).orderBy(pool.name)`)
3. Replace `<button>` elements with `<Link href={/pools/${p.id}}>` (same Tailwind classes: `min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150`)
4. Add Log out button next to Admin link — `text-sm text-slate-600 hover:text-slate-900` (text link style, NOT blue-600)
5. Add empty state: `"No pools configured — contact your administrator."` (text-base text-slate-500, centered)

**Log out button pattern** (source: `src/lib/auth-client.ts` + `src/app/(auth)/login/page.tsx` router pattern):
```typescript
// This must be a Client Component or a sub-component because authClient is browser-only
// authClient is imported from "@/lib/auth-client"
// Use authClient.signOut() then router.push("/login")
// Style: className="text-sm text-slate-600 hover:text-slate-900 ml-4"
```

---

### `src/app/(protected)/pools/[poolId]/page.tsx` (Server Component, request-response) — NEW

**Analog:** `src/app/(admin)/admin/campers/page.tsx` (lines 1-79)

**Imports pattern** (lines 1-7 of campers/page.tsx):
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { camper } from "@/db/schema";
// Phase 4 equivalent:
import { poolSession, pair, pairMember, pool } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
```

**Async params pattern** (from RESEARCH.md Pitfall 5 — verified against Next.js 16 docs in node_modules):
```typescript
export default async function PoolSessionPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params; // MUST await — params is a Promise in Next.js 16
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // ...
}
```

**Auth + DB query pattern** (lines 21-47 of campers/page.tsx):
```typescript
// Pattern: auth check → DB query → Promise.all for parallel fetches → render
const [swimmerCount, pairCount] = await Promise.all([
  db.select({ count: sql<number>`count(*)` }).from(pairMember)
    .where(eq(pairMember.sessionId, sessionId))
    .then((r) => Number(r[0]?.count ?? 0)),
  db.select({ count: sql<number>`count(*)` }).from(pair)
    .where(eq(pair.sessionId, sessionId))
    .then((r) => Number(r[0]?.count ?? 0)),
]);
```

**Get-or-create session pattern** (from RESEARCH.md Pattern 2 — copy verbatim into page.tsx or a lib helper):
```typescript
// wasJustCreated === false → show JoinSessionModal before the board
// wasJustCreated === true  → render the board directly
async function getOrCreateActiveSession(poolId: string, openedById: string) {
  const existing = await db
    .select()
    .from(poolSession)
    .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
    .limit(1);

  if (existing.length > 0) return { session: existing[0], wasJustCreated: false };

  const [created] = await db
    .insert(poolSession)
    .values({ id: crypto.randomUUID(), poolId, status: "active", openedById, openedAt: new Date() })
    .onConflictDoNothing()
    .returning() ?? [];

  if (created) return { session: created, wasJustCreated: true };

  const afterRace = await db
    .select().from(poolSession)
    .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
    .limit(1);
  return { session: afterRace[0], wasJustCreated: false };
}
```

---

### `src/app/(protected)/pools/[poolId]/actions.ts` (service, CRUD + request-response) — NEW

**Analog:** `src/app/(admin)/admin/campers/actions.ts` (lines 1-17 for guard, lines 74-84 for delete pattern, lines 101-241 for transaction pattern)

**File header and requireAuth guard** (adapt lines 1-17 of campers/actions.ts):
```typescript
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolSession, pair, pairMember, camper } from "@/db/schema";
import { eq, and, or, ilike, notInArray } from "drizzle-orm";

// requireAuth (not requireAdmin) — any authenticated counselor can manage pairs
async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session; // session.user.id available for attribution
}
```

**Simple delete action pattern** (lines 74-78 of campers/actions.ts):
```typescript
export async function removePairAction(pairId: string, poolId: string) {
  await requireAuth();
  // pairMember rows cascade-delete via FK onDelete: "cascade"
  await db.delete(pair).where(eq(pair.id, pairId));
  revalidatePath(`/pools/${poolId}`);
}
```

**Transaction pattern** (lines 199-216 of campers/actions.ts — adapt for addPairAction):
```typescript
// campers/actions.ts uses: await db.transaction(async (tx) => { await tx.delete(...); await tx.insert(...).values(...); });
// Phase 4 addPairAction follows this exactly:
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
      await tx.insert(pairMember).values([
        { pairId, camperId: camper1Id, sessionId },
        { pairId, camperId: camper2Id, sessionId },
      ]);
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return { success: false, error: "PAIR-04" };
    }
    return { success: false, error: "Could not add pair. Please try again." };
  }
  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return "code" in err
    ? (err as { code: string }).code === "23505"
    : err.message.includes("23505");
}
```

**redirect() outside try/catch pattern** (from RESEARCH.md Pitfall 3 — verified against Next.js 16 docs):
```typescript
// CRITICAL: redirect() must be called OUTSIDE try/catch
// It throws internally — catch blocks will swallow it
export async function closeSessionAction(sessionId: string, poolId: string) {
  await requireAuth();
  // All fallible DB work inside try/catch:
  await db
    .update(poolSession)
    .set({ status: "closed", closedAt: new Date() })
    .where(and(eq(poolSession.id, sessionId), eq(poolSession.status, "active")));
  revalidatePath("/pools");
  revalidatePath("/pools/[poolId]", "page");
  redirect("/pools"); // OUTSIDE try/catch — this throws internally
}
```

**Typeahead action pattern** (from RESEARCH.md Pattern 3):
```typescript
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

  const alreadyPaired = db
    .select({ camperId: pairMember.camperId })
    .from(pairMember)
    .where(eq(pairMember.sessionId, sessionId));

  const exact = await db.select().from(camper)
    .where(and(eq(camper.code, q), notInArray(camper.id, alreadyPaired)))
    .limit(1);
  if (exact.length > 0) return exact;

  return db.select().from(camper)
    .where(and(
      or(ilike(camper.firstName, `%${q}%`), ilike(camper.lastName, `%${q}%`), ilike(camper.code, `%${q}%`)),
      notInArray(camper.id, alreadyPaired),
    ))
    .limit(10);
}
```

---

### `src/app/(protected)/pools/[poolId]/actions.test.ts` (test) — NEW

**Analog:** `src/app/(admin)/admin/campers/actions.test.ts` (lines 1-201)

**Mock block pattern** (lines 1-28 of actions.test.ts — copy verbatim, adjust import paths):
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));
```

**Auth mock helper pattern** (lines 205-212 of actions.test.ts):
```typescript
// Phase 4 uses requireAuth (not requireAdmin), so mock without role check:
function makeAuthSession() {
  return {
    user: { id: "u1", role: "user" } as any,
    session: {} as any,
  };
}
```

**Test structure pattern** (lines 30-43 of actions.test.ts):
```typescript
describe("pool session actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("searchCampersAction rejects when session is null", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const { searchCampersAction } = await import("./actions");
    await expect(searchCampersAction("noah", "sess-1")).rejects.toThrow("Unauthorized");
  });
  // ...
});
```

**Transaction mock pattern** (lines 329-332 of actions.test.ts — adapt for addPairAction):
```typescript
vi.mocked(db.transaction).mockImplementation(async (cb) => {
  return cb({ insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }) } as any);
});
```

---

### `src/app/(protected)/pools/[poolId]/components/CloseSessionDialog.tsx` (component, event-driven) — NEW

**Analog:** `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` (lines 1-75 — copy structure almost verbatim)

**Full structure to copy** (all 75 lines of DeleteConfirmDialog.tsx):
```typescript
"use client";

import { useState } from "react";
// Replace Trash2 with no trigger icon — CloseSessionDialog is opened by a dedicated header button
import { closeSessionAction } from "../actions";

// Props: sessionId, poolId, activePairCount (to show count in body or skip dialog if 0)
export function CloseSessionDialog({ sessionId, poolId, activePairCount }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClose() {
    setLoading(true);
    try {
      await closeSessionAction(sessionId, poolId);
      // redirect happens server-side; component may unmount
    } catch {
      setError("Could not close session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Per D-12: if no active pairs, close immediately without dialog
  // (trigger from parent button onClick directly calling action)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] px-4 border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50"
      >
        Close session
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Close session?</h2>
            <p className="text-base text-slate-700 mt-2">
              {activePairCount} pairs are still in the water. Close anyway? All pair data will be archived.
            </p>
            {error && <p role="alert" className="text-base text-red-600 mt-2">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setOpen(false); setError(null); }}
                className="min-h-[44px] flex-1 border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50"
              >
                Keep session open
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                className="min-h-[44px] flex-1 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50"
              >
                Close session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**Key differences from DeleteConfirmDialog:**
- Trigger button is an outline secondary button (not a Trash2 icon button)
- Body text references pair count: `{activePairCount} pairs are still in the water.`
- Cancel label: "Keep session open" (not "Keep user")
- Confirm label: "Close session" (not "Remove user")
- Confirm button is `bg-red-600` (same destructive style)
- No try/catch swallowing redirect — `closeSessionAction` calls `redirect()` server-side; client action invokes then unmounts

---

### `src/app/(protected)/pools/[poolId]/components/JoinSessionModal.tsx` (component, event-driven) — NEW

**Analog:** `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` (modal overlay pattern, lines 38-70)

**Modal overlay structure to copy** (lines 39-70 of DeleteConfirmDialog.tsx):
```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Rendered when wasJustCreated === false (session pre-existed this page load)
// Parent (page.tsx Server Component) passes poolName as prop; modal state controls visibility
export function JoinSessionModal({ poolName }: { poolName: string }) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {poolName} — session in progress
        </h2>
        <p className="text-base text-slate-700 mt-2">
          Another counselor has an active session at this pool. Join to see the current pairs and add new ones.
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={() => setDismissed(true)}
            className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150"
          >
            Join session
          </button>
          <button
            onClick={() => router.push("/pools")}
            className="min-h-[44px] w-full border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### `src/app/(protected)/pools/[poolId]/components/TrioPicker.tsx` (component, event-driven) — NEW

**Analog:** `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` (modal overlay + useState pattern)

Same modal overlay structure as JoinSessionModal/CloseSessionDialog. Differences:
- Triggered by "+1" button on a PairRow (`onClick={() => setOpen(true)}`)
- Contains a single `CamperField` component (same component as AddPairForm)
- "Add to pair" button: `bg-blue-600`, disabled until camper resolved
- "Keep pair as-is" button: text link style (`text-slate-600`, no border)
- On success: calls `addPairMemberAction(pairId, camperId, sessionId, poolId)` then closes

---

### `src/app/(protected)/pools/[poolId]/components/CamperField.tsx` (component, event-driven) — NEW

**Analog:** `src/app/(admin)/admin/campers/components/SearchBar.tsx` (lines 1-34)

**Debounce pattern to copy** (lines 9-23 of SearchBar.tsx):
```typescript
// SearchBar uses router.push for navigation — CamperField diverges: use useTransition + Server Action
"use client";
import { useTransition, useState, useRef } from "react";
import { searchCampersAction, type CamperSuggestion } from "../actions";

// Key difference from SearchBar: NO router.push — results stay local, no URL change
const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
const [isPending, startTransition] = useTransition();
const [suggestions, setSuggestions] = useState<CamperSuggestion[]>([]);
const [resolved, setResolved] = useState<CamperSuggestion | null>(null);

function handleInput(value: string) {
  if (timer.current) clearTimeout(timer.current);
  timer.current = setTimeout(() => {
    startTransition(async () => {
      const results = await searchCampersAction(value, sessionId);
      setSuggestions(results);
    });
  }, 300); // matches Phase 3 SearchBar debounce timing
}
```

**Input Tailwind classes to copy from SearchBar** (line 31 of SearchBar.tsx):
```typescript
className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
```

**Resolved chip classes** (from UI-SPEC Component 5):
```typescript
// When a camper is selected, replace input with chip:
className="inline-flex items-center gap-1 bg-blue-100 border border-blue-300 rounded-full px-3 py-1 text-sm font-semibold text-blue-700"
// Chip × clear button:
// className="ml-1 text-blue-500 hover:text-blue-700"
// PAIR-04 error state on chip container: border-red-400
```

---

### `src/app/(protected)/pools/[poolId]/components/PairRow.tsx` (component, event-driven) — NEW

**Analog:** `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` (icon button pattern, lines 31-37)

**Icon button pattern to copy** (lines 31-37 of DeleteConfirmDialog.tsx):
```typescript
// Remove button — exact class match from UI-SPEC:
<button
  onClick={() => setOpen(true)}
  title="Delete user"
  className="w-10 h-10 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
>
  <Trash2 size={18} />
</button>
```

**+1 button pattern** (from UI-SPEC Component 8):
```typescript
// Only rendered when pair has < 3 members
<button
  onClick={() => setTrioPickerOpen(true)}
  title="Add third camper"
  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
>
  <UserPlus size={18} />
</button>
```

**Row layout** (from UI-SPEC Component 8):
```typescript
<div className="flex items-center justify-between px-4 py-3">
  <span className="text-base text-slate-900">
    {/* "Noah S. · Bunk 4 — Liam R. · Bunk 7" format per Phase 3 D-11 */}
    {members.map((m) => `${m.firstName} ${m.lastName} · ${m.bunk}`).join(" — ")}
  </span>
  <div className="flex items-center gap-2">
    {members.length < 3 && <PlusOneButton ... />}
    <RemoveButton ... />
  </div>
</div>
```

---

### `src/app/(protected)/pools/[poolId]/components/AddPairForm.tsx` (component, request-response) — NEW

**Analog:** `src/app/(auth)/login/page.tsx` (lines 42-90 — form state + button disabled pattern)

**Form state pattern** (lines 8-35 of login/page.tsx):
```typescript
"use client";
import { useState, useRef, useTransition } from "react";
// Phase 4 uses useTransition (not useState loading) for the Server Action call
// useRef for camper1InputRef to restore focus after submission (D-05)

const [isPending, startTransition] = useTransition();
const [error, setError] = useState<string | null>(null);
const camper1Ref = useRef<HTMLInputElement>(null);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!camper1 || !camper2) return;
  setError(null);
  startTransition(async () => {
    const result = await addPairAction(sessionId, poolId, camper1.id, camper2.id);
    if (result.success) {
      setCamper1(null);
      setCamper2(null);
      camper1Ref.current?.focus(); // D-05: focus returns to Camper 1
    } else {
      setError(result.error);
    }
  });
}
```

**Button disabled pattern** (lines 82-88 of login/page.tsx):
```typescript
// Login page's disabled pattern — apply same to Add pair button:
<button
  type="submit"
  disabled={isPending || !camper1 || !camper2} // disabled until both resolved
  className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isPending ? "Adding…" : "Add pair"}
</button>
```

**Error display pattern** (lines 78-80 of login/page.tsx):
```typescript
{error && (
  <p role="alert" className="text-base text-red-600">
    {error}
  </p>
)}
```

---

### `src/app/(protected)/pools/[poolId]/components/SessionHeader.tsx` (component, request-response) — NEW

**Analog:** `src/app/(protected)/pools/page.tsx` (lines 11-14 — top bar link + layout)

**Header structure** (from UI-SPEC Component 3):
```typescript
// Sticky header — new to Phase 4, no direct codebase analog for sticky
// Closest: pools/page.tsx uses "absolute top-4 right-4" for Admin link
<header className="sticky top-0 z-10 bg-white border-b border-slate-200">
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-xl font-semibold text-slate-900">{poolName}</span>
    <div className="text-4xl font-semibold text-slate-900 text-center">
      {swimmerCount} swimmers · {pairCount} pairs
    </div>
    <div className="flex items-center">
      <CloseSessionDialog sessionId={sessionId} poolId={poolId} activePairCount={pairCount} />
      <LogoutButton /> {/* text link: text-sm text-slate-600 hover:text-slate-900 ml-4 */}
    </div>
  </div>
</header>
```

**Log out link/button pattern** (from `src/lib/auth-client.ts` + login page router pattern):
```typescript
"use client";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }
  return (
    <button onClick={handleLogout} className="text-sm text-slate-600 hover:text-slate-900 ml-4">
      Log out
    </button>
  );
}
```

---

### `src/app/(protected)/pools/[poolId]/components/PairList.tsx` (component, request-response) — NEW

**Analog:** `src/app/(admin)/admin/campers/page.tsx` (list + empty state pattern, lines 52-79)

**List + empty state pattern:**
```typescript
// Scrollable list with divide-y (from UI-SPEC Component 7)
// Empty state pattern matches campers page structure
{pairs.length === 0 ? (
  <div className="py-12 text-center">
    <p className="text-base font-semibold text-slate-900">No pairs checked in yet</p>
    <p className="text-base text-slate-500 mt-2">Use the form above to add the first buddy pair.</p>
  </div>
) : (
  <div className="divide-y divide-slate-200">
    {pairs.map((p) => (
      <PairRow key={p.id} pair={p} poolId={poolId} sessionId={sessionId} />
    ))}
  </div>
)}
```

---

### `src/app/(protected)/pools/[poolId]/components/SessionBoard.tsx` (component, request-response) — NEW

**Analog:** `src/app/(admin)/admin/campers/page.tsx` (page-level composition pattern, lines 52-79)

This is a pure composition component — no logic, just arranges SessionHeader + AddPairForm + PairList. No direct codebase analog for the layout itself; follow UI-SPEC page layout contract (the ASCII diagram in Component 2).

---

## Shared Patterns

### Auth Guard (Server Actions)
**Source:** `src/app/(admin)/admin/users/actions.ts` lines 7-13
**Apply to:** `src/app/(protected)/pools/[poolId]/actions.ts` (all exported actions)
```typescript
async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
```
Note: Phase 4 removes the `session.user.role !== "admin"` check — any authenticated user is a counselor.

### Auth Check (Server Components / Pages)
**Source:** `src/app/(protected)/pools/page.tsx` lines 7-8 and `src/app/(admin)/admin/campers/page.tsx` lines 21-23
**Apply to:** `src/app/(protected)/pools/[poolId]/page.tsx`
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
```

### Client Logout
**Source:** `src/lib/auth-client.ts` (authClient.signOut) + `src/app/(auth)/login/page.tsx` (useRouter pattern)
**Apply to:** `LogoutButton` sub-component used in SessionHeader and pools/page.tsx top bar
```typescript
// Must be "use client" — authClient is browser-only
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
// Pattern: await authClient.signOut(); router.push("/login");
```

### Modal Overlay Structure
**Source:** `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` lines 39-70
**Apply to:** CloseSessionDialog, JoinSessionModal, TrioPicker
```typescript
// All three dialogs use this identical overlay:
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm">
    {/* content */}
  </div>
</div>
// useState(false) for open/closed — no external dialog library
```

### Error Display
**Source:** `src/app/(auth)/login/page.tsx` lines 78-80 and `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` lines 47-49
**Apply to:** AddPairForm (generic error), CamperField (PAIR-04 inline error), CloseSessionDialog
```typescript
{error && (
  <p role="alert" className="text-base text-red-600 mt-2">
    {error}
  </p>
)}
```

### Input Tailwind Classes
**Source:** `src/app/(auth)/login/page.tsx` lines 58, 74 and `src/app/(admin)/admin/campers/components/SearchBar.tsx` line 31
**Apply to:** CamperField input (unresolved state), any text inputs in Phase 4
```typescript
className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
```

### Primary Button Tailwind Classes
**Source:** `src/app/(auth)/login/page.tsx` line 86 and `src/app/(protected)/pools/page.tsx` line 22
**Apply to:** Add pair button, Join session button, Pool selection buttons
```typescript
className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
```

### Destructive Icon Button
**Source:** `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` lines 31-37
**Apply to:** PairRow remove button (Trash2 icon)
```typescript
className="w-10 h-10 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
// <Trash2 size={18} /> inside
// title="Remove pair"
```

### Drizzle DB Import
**Source:** `src/app/(admin)/admin/campers/actions.ts` lines 6-8
**Apply to:** All files that query the database
```typescript
import { db } from "@/db";
import { camper } from "@/db/schema"; // replace with Phase 4 tables as needed
import { eq } from "drizzle-orm";
```

### revalidatePath After Mutation
**Source:** `src/app/(admin)/admin/campers/actions.ts` lines 44-45, 77-78
**Apply to:** All Server Actions that modify pair/session data
```typescript
// Specific page revalidation:
revalidatePath(`/pools/${poolId}`);
// All pool session pages (use after closeSessionAction):
revalidatePath("/pools/[poolId]", "page");
revalidatePath("/pools");
```

### Test Mock Block
**Source:** `src/app/(admin)/admin/campers/actions.test.ts` lines 1-28
**Apply to:** `src/app/(protected)/pools/[poolId]/actions.test.ts`, `src/app/(protected)/pools/page.test.tsx`
```typescript
// Copy mock block verbatim; add vi.mock("next/navigation") for redirect:
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/(protected)/pools/[poolId]/components/SessionBoard.tsx` | component | request-response | Pure layout composition — no existing page composes a sticky header + form + scrollable list in this way. Follow UI-SPEC ASCII diagram directly. |

---

## Metadata

**Analog search scope:** `src/app/(admin)/`, `src/app/(protected)/`, `src/app/(auth)/`, `src/db/`, `src/lib/`
**Files scanned:** 8 source files read in full
**Pattern extraction date:** 2026-06-28
