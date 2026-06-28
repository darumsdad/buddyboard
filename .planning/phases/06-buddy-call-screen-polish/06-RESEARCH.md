# Phase 6: Buddy Call Screen & Polish — Research

**Researched:** 2026-06-28
**Domain:** Next.js App Router (nested route, Server Component + "use client" boundary), Supabase Realtime, Tailwind CSS responsive layout
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New route at `/pools/[poolId]/buddy-call`. Clean URL, back-button navigation.
- **D-02:** Server Component SSR fetch on load (same pattern as `pools/[poolId]/page.tsx`). No separate API call for initial data.
- **D-03:** "Back to board" link navigates to `/pools/[poolId]`.
- **D-04:** Primary content is a giant count display — total swimmer count and pair count in very large high-contrast text.
- **D-05:** Individual pair list is secondary or absent. Counselors navigate back for pair details if needed.
- **D-06:** Pair member display format: first + last name only, separated by " / ". Trios show all 3 members on one row; wrap if needed.
- **D-07:** Compact header shows pool name and "Back to board" link. Dominant visual is the count.
- **D-08:** Live Realtime subscription on buddy call screen — same pattern as Phase 5 LiveBoard. Accepts SSR snapshot props, manages live state via useState.
- **D-09:** ConnectionBanner reused on buddy call screen (critical for safety).
- **D-10:** `SessionHeader` stacks vertically on small screens. On `md+` (768px+): existing single-row layout. On mobile: pool name + Close/Logout on top row, large count centered below.
- **D-11:** `AddPairForm` CamperField inputs stack vertically on mobile. On `md+`: current side-by-side layout. Submit button full-width on mobile.
- **D-12:** Responsive scope limited to session board (`SessionHeader`, `AddPairForm`, buddy call route). Admin screens excluded.

### Claude's Discretion

- Exact text size for giant count — very large (text-6xl or larger), high contrast (slate-900 on white)
- Visual design of "Back to board" link (chevron-left icon appropriate)
- Whether a minimal pair list appears below the count
- Touch target sizes (min-h-[44px] minimum)
- Whether buddy call route needs separate Supabase client hook or can reuse LiveBoard pattern

### Deferred Ideas (OUT OF SCOPE)

- Pair list on buddy call screen with per-pair check-off
- Print-friendly buddy call sheet
- Session history / past buddy boards
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOARD-03 | Counselor can open a buddy call screen — clean, high-contrast, scrollable list of all pairs optimized for outdoor use (large text, high contrast, large touch targets) | New route + BuddyCallClient component with giant count display, own Realtime subscription, ConnectionBanner |
| UX-01 | App is fully usable on iPad and laptop — no broken layouts, no horizontal scroll, all controls reachable | SessionHeader md+ layout analysis (count overflows single row on wide screens — confirmed by reading existing flex structure); AddPairForm already uses flex-col/flex-row breakpoint |
| UX-02 | App is best-effort responsive on iPhone — all features accessible, layout may be compact but nothing hidden or broken | SessionHeader mobile stacking (D-10), AddPairForm submit button full-width (D-11) |
</phase_requirements>

---

## Summary

Phase 6 has three distinct work streams: (1) new `buddy-call` route with a giant count display, (2) a live Realtime subscription on that screen using the same dual-table pattern established in Phase 5, and (3) responsive Tailwind CSS polish on two existing components.

The new route is a Server Component (`buddy-call/page.tsx`) that reads the active session for the pool and fetches initial pairs. It passes these as props to `BuddyCallClient` (a `"use client"` component), which manages live state and the Realtime subscription independently from `LiveBoard`. The two components share the same *pattern* but use different Supabase channel names to allow independent lifecycle management.

The responsive polish is smaller than it looks. `AddPairForm` already stacks its CamperField inputs vertically via `flex-col gap-4 md:flex md:flex-row md:gap-3 md:items-end` (Phase 5 implemented this). The only remaining AddPairForm change is `w-full md:w-auto` on the submit button. `SessionHeader` needs a non-trivial layout change: the 4xl count must be hidden from the flex row on mobile and rendered in a second row below using `md:hidden` / `hidden md:block`. The "View all pairs" link (to the buddy call route) was designed in Phase 4 but never implemented — Phase 6 adds it to `SessionHeader`, which already receives `poolId` as a prop.

**Primary recommendation:** Create `BuddyCallClient` as a standalone "use client" component co-located in the `buddy-call/` route directory, extract `getPairsForSession` to `src/lib/pairs.ts` to avoid duplication between `page.tsx` and `buddy-call/page.tsx`, and implement responsive SessionHeader changes with `md:hidden` / `hidden md:block` pattern.

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Read Next.js docs before writing code.** The `node_modules/next/dist/docs/` guide is authoritative. Key docs read for this phase: `01-app/01-getting-started/05-server-and-client-components.md` (confirmed Server Component + `"use client"` boundary pattern), `03-layouts-and-pages.md` (file-based routing for nested routes).
- **params is a Promise in Next.js 16** — `const { poolId } = await params` (confirmed in every existing page, Route Handler, and Next.js docs example). [VERIFIED: node_modules/next/dist/docs]
- **Tailwind CSS only** — no shadcn components, no new component libraries. Phase 5 UI-SPEC inherited.
- **lucide-react** already installed (Phase 2.2); `ChevronLeft` is available for the back link without a new install.
- **@supabase/supabase-js** installed in Phase 5-01; `supabase` singleton from `@/lib/supabase-browser` is available.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Giant count display (buddy call screen) | Browser / Client | — | Count updates live via Realtime; needs useState + useEffect |
| SSR pair snapshot (buddy call initial load) | Frontend Server (SSR) | — | Server Component fetches DB and passes initialPairs as props; zero loading gap on first paint |
| Realtime subscription (buddy call) | Browser / Client | — | Supabase WebSocket; must live in useEffect in client component |
| Pair list in buddy call screen | Browser / Client | — | Driven by live pairs state from same BuddyCallClient |
| Responsive SessionHeader layout | Browser / Client | — | SessionHeader is already "use client"; CSS breakpoints resolved by browser |
| Responsive AddPairForm submit button | Browser / Client | — | AddPairForm is "use client"; Tailwind w-full md:w-auto |
| Auth gate for buddy-call route | Middleware | — | `middleware.ts` already covers all routes under (protected); buddy-call/page.tsx is a read-only Server Component, no user ID needed |
| Data fetch (active session + pairs) | Frontend Server (SSR) | — | Drizzle DB queries in Server Component, same pattern as pools/[poolId]/page.tsx |

---

## Standard Stack

No new packages are needed for Phase 6.

### Core (already installed)

| Library | Purpose | Status |
|---------|---------|--------|
| `@supabase/supabase-js` | Realtime subscription in BuddyCallClient | Installed Phase 5-01 |
| `lucide-react` | `ChevronLeft` icon for back link | Installed Phase 2.2 |
| `tailwindcss` | Responsive breakpoints (`md:` prefix) | Installed Phase 1 |
| `next` | App Router, Server Components, file-based routing | Project foundation |
| `drizzle-orm` | DB queries in buddy-call/page.tsx | Already used in pools/[poolId]/page.tsx |

### Package Legitimacy Audit

> No new packages are installed in Phase 6. All dependencies listed above are already present in `package.json` and were vetted in earlier phases. This section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Counselor Device)
  │
  ├─ GET /pools/{poolId}/buddy-call
  │    │
  │    ▼
  │  buddy-call/page.tsx  [Server Component — SSR]
  │    ├─ middleware.ts auth check (cookie)
  │    ├─ DB: pool lookup (validate poolId)
  │    ├─ DB: getActiveSession(poolId) — read-only, no create
  │    ├─ DB: getPairsForSession(sessionId) — same query as page.tsx
  │    └─ renders <BuddyCallClient initialPairs sessionId poolId poolName />
  │
  ▼
  BuddyCallClient  ["use client"]
  ├─ useState(initialPairs)   ← zero loading gap (SSR snapshot)
  ├─ useState(connectionStatus)
  ├─ useEffect: Supabase channel "buddy-call:{sessionId}:pairs"
  │     ├─ pair_member INSERT (session_id filter)  ──┐
  │     └─ pair DELETE (no filter)                  ─┤─ debouncedRefresh (150ms)
  │                                                   │
  │                                                   ▼
  │                                          GET /api/sessions/{sessionId}/pairs
  │                                          (Phase 5 Route Handler — reused)
  │                                                   │
  │                                                   └─ setPairs(data.pairs)
  │
  ├─ renders: compact header (pool name + back link)
  ├─ renders: <ConnectionBanner status onRefresh />
  └─ renders: giant count block (swimmerCount / pairCount)
               └─ optional pair list (names only)
```

### Recommended Project Structure

```
src/app/(protected)/pools/[poolId]/
├─ buddy-call/
│   ├─ page.tsx              (NEW — Server Component, SSR fetch)
│   └─ BuddyCallClient.tsx   (NEW — "use client", Realtime subscription)
├─ components/
│   ├─ SessionHeader.tsx      (MODIFY — responsive layout D-10, View all pairs link)
│   ├─ AddPairForm.tsx        (MODIFY — submit button w-full md:w-auto)
│   └─ ... (all others unchanged)
└─ page.tsx                   (unchanged)

src/lib/
└─ pairs.ts                   (NEW — extracted getPairsForSession helper, shared by
                               page.tsx and buddy-call/page.tsx)
```

### Pattern 1: BuddyCallClient — Mirrors LiveBoard

**What:** `"use client"` component that accepts SSR snapshot props, initializes live state from them, then opens a Supabase Realtime channel to keep counts live.

**When to use:** Any screen that needs live Realtime data + SSR hydration with zero loading gap.

**Channel name:** `buddy-call:${sessionId}:pairs` — separate from LiveBoard's `session:${sessionId}:pairs` to allow independent lifecycle.

**Why separate, not reuse LiveBoard:** BuddyCallClient has different UI (giant count, no pair-entry form, compact header) and independent Realtime subscription lifecycle. Reusing LiveBoard would require threading its entire SessionBoard child through props or wrapping complexity. A standalone component is simpler.

```typescript
// Source: LiveBoard.tsx (Phase 5 implementation) — same pattern, different channel + UI
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { ChevronLeft } from "lucide-react";

type PairMember = { camperId: string; firstName: string; lastName: string; bunk: string; code: string };
type Pair = { id: string; members: PairMember[] };

type BuddyCallClientProps = {
  initialPairs: Pair[];
  sessionId: string;
  poolId: string;
  poolName: string;
};

export function BuddyCallClient({ initialPairs, sessionId, poolId, poolName }: BuddyCallClientProps) {
  const [pairs, setPairs] = useState<Pair[]>(initialPairs);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting" | "disconnected">("connected");

  const refreshPairs = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/pairs`);
    if (res.ok) {
      const data = await res.json();
      setPairs(data.pairs);
    }
  }, [sessionId]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refreshPairs, 150);
  }, [refreshPairs]);

  useEffect(() => {
    const channel = supabase
      .channel(`buddy-call:${sessionId}:pairs`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pair_member", filter: `session_id=eq.${sessionId}` }, debouncedRefresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "pair" }, debouncedRefresh)
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnectionStatus("disconnected");
        if (err) console.error("[BuddyCall Realtime]", err);
      });

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, debouncedRefresh]);

  const swimmerCount = pairs.reduce((sum, p) => sum + p.members.length, 0);
  const pairCount = pairs.length;

  // ... render giant count block
}
```

### Pattern 2: buddy-call/page.tsx — Read-Only Server Component

**What:** Server Component fetches the current active session (read-only — no creation) and pairs, then passes as props to BuddyCallClient. Auth is guaranteed by middleware.

**Key difference from pools/[poolId]/page.tsx:** No `getOrCreateActiveSession` — the buddy call screen is display-only. If no active session exists, display zero counts (sessionId can be undefined/null and BuddyCallClient shows 0).

```typescript
// Source: pools/[poolId]/page.tsx — same structure, read-only variant
// [VERIFIED: node_modules/next/dist/docs — params is Promise in Next.js 16]
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolSession, pool } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPairsForSession } from "@/lib/pairs";   // shared helper
import { BuddyCallClient } from "./BuddyCallClient";

export default async function BuddyCallPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;

  // Pool lookup validates poolId (T-06 threat model)
  const poolRecord = await db.select().from(pool).where(eq(pool.id, poolId)).limit(1);
  if (!poolRecord[0]) redirect("/pools");

  // Read active session — do NOT create one (buddy call is display-only)
  const sessions = await db
    .select()
    .from(poolSession)
    .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
    .limit(1);

  const session = sessions[0] ?? null;
  const pairs = session ? await getPairsForSession(session.id) : [];

  return (
    <BuddyCallClient
      initialPairs={pairs}
      sessionId={session?.id ?? ""}
      poolId={poolId}
      poolName={poolRecord[0].name}
    />
  );
}
```

**Note on auth:** `middleware.ts` already protects all routes not matching `login|api/auth|_next/...`. The buddy-call page is read-only and needs no `authSession.user.id`. An explicit `auth.api.getSession()` call can be omitted for simplicity, matching the middleware-only protection pattern. However, if defense-in-depth is desired, adding it costs one line and follows the existing page.tsx pattern. [ASSUMED — planner decides; both are safe]

### Pattern 3: getPairsForSession Extraction

**What:** Move `getPairsForSession()` from `pools/[poolId]/page.tsx` into `src/lib/pairs.ts` so both `page.tsx` and `buddy-call/page.tsx` can import it without duplication.

**Source:** `pools/[poolId]/page.tsx` lines 65–98 (current implementation). The Phase 5 PATTERNS.md already flagged this: "The Route Handler should duplicate the function body (or a shared helper can be extracted to `src/lib/pairs.ts` at the planner's discretion)."

**Recommendation:** Extract to `src/lib/pairs.ts`. The function is already written — this is a cut-paste with export, then update the import in `page.tsx`.

### Pattern 4: SessionHeader Responsive Stacking (D-10)

**Current layout (single flex row, no responsive stacking):**
```tsx
// Current SessionHeader.tsx — all three elements in one flex row
<div className="flex items-center justify-between px-4 py-3">
  <span className="text-xl font-semibold text-slate-900">{poolName}</span>
  <div className="text-center">
    <p className="text-4xl font-semibold text-slate-900 leading-none">
      {swimmerCount} swimmers · {pairCount} pairs
    </p>
  </div>
  <div className="flex items-center">
    <CloseSessionDialog ... />
    <LogoutButton ... />
  </div>
</div>
```

**After D-10 responsive fix (from 06-UI-SPEC.md):**
```tsx
<header className="sticky top-0 z-10 bg-white border-b border-slate-200">
  {/* Top row — present on all viewport sizes */}
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-xl font-semibold text-slate-900">{poolName}</span>
    {/* Count inline — visible md+ only */}
    <div className="hidden md:block text-center">
      <p className="text-4xl font-semibold text-slate-900 leading-none">
        {swimmerCount} swimmers · {pairCount} pairs
      </p>
    </div>
    <div className="flex items-center">
      <CloseSessionDialog sessionId={sessionId} poolId={poolId} activePairCount={pairCount} />
      <LogoutButton className="text-base text-slate-600 hover:text-slate-900 ml-4" />
    </div>
  </div>
  {/* Count row — visible on mobile only, hidden md+ */}
  <div className="md:hidden text-center px-4 pb-3">
    <p className="text-4xl font-semibold text-slate-900 leading-none">
      {swimmerCount} swimmers · {pairCount} pairs
    </p>
  </div>
</header>
```

**"View all pairs" / buddy call link placement:** The UI-SPEC does not explicitly position this link within the revised SessionHeader layout. Two options:
- Option A: Add as a small link below the count in the mobile count row and beside the count on md+ (aligns with "count leads to buddy call screen" mental model)
- Option B: Add as an icon-button or small link in the top row right-side cluster beside CloseSession

[ASSUMED — planner decides. SessionHeader already receives `poolId` prop, so either option is implementable without new prop changes.]

### Pattern 5: AddPairForm Submit Button Full-Width (D-11)

**What is already done (Phase 5-02):** CamperField stacking is implemented at line 68:
```tsx
<div className="flex flex-col gap-4 md:flex md:flex-row md:gap-3 md:items-end">
```

**What remains for Phase 6 — submit button needs `w-full md:w-auto`:**
```tsx
// Current (line 125) — no width class:
className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"

// After D-11 fix:
className="min-h-[44px] w-full md:w-auto px-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
```

This is the only change needed in `AddPairForm.tsx` for Phase 6.

### Anti-Patterns to Avoid

- **Importing LiveBoard in BuddyCallClient:** LiveBoard renders SessionBoard, AddPairForm, PairList — all wrong for the buddy call screen. BuddyCallClient is a purpose-built component.
- **Using `getOrCreateActiveSession` in buddy-call/page.tsx:** Creates a new session when none exists. The buddy call screen is read-only — only display existing data.
- **Duplicating `getPairsForSession` inline:** Leads to divergent implementations. Extract to shared lib.
- **Using `channel.unsubscribe()` instead of `supabase.removeChannel(channel)`:** Causes TooManyChannels leak under React Strict Mode (established critical finding from Phase 5-05 SUMMARY).
- **Adding responsive polish to admin screens:** D-12 explicitly excludes admin routes from Phase 6 scope.
- **Fixing the pre-existing LiveBoard.tsx `any` errors:** These are out of scope; they have `eslint-disable-next-line` comments and the pattern is intentional (Supabase realtime internal API access).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Realtime connection management | Custom WebSocket + reconnect logic | Supabase channel (same as Phase 5) | Auto-reconnect, status callbacks, cleanup all built in |
| Live count derivation | Server-side count queries | `pairs.reduce(...)` client-side (established in Phase 5 D-02) | Consistent with Phase 5; counts stay in sync with live pair state |
| Route auth middleware | Custom auth check in buddy-call/page.tsx | `middleware.ts` already protects all routes | Middleware covers entire (protected) group; explicit check is optional defense-in-depth |
| Responsive icon buttons | Custom touch-target hack | `min-h-[44px]` Tailwind class | Established pattern from all Phase 4/5 components |

---

## Common Pitfalls

### Pitfall 1: Supabase channel name collision with LiveBoard

**What goes wrong:** If `BuddyCallClient` uses the same channel name as `LiveBoard` (`session:${sessionId}:pairs`), opening both screens simultaneously (e.g., phone + tablet) causes channel conflicts — one subscription silently fails or events are delivered to the wrong handler.

**Why it happens:** Supabase Realtime channels are identified by name; two clients subscribing to the same channel name on the same Supabase connection creates undefined behavior.

**How to avoid:** Use `buddy-call:${sessionId}:pairs` as the channel name in BuddyCallClient. [VERIFIED: Phase 5 CONTEXT.md + 06-UI-SPEC.md both specify this distinct name]

**Warning signs:** Realtime events updating the wrong component, or one screen getting no updates when both are open.

### Pitfall 2: Creating a session in buddy-call/page.tsx

**What goes wrong:** If `getOrCreateActiveSession` is copy-pasted from `page.tsx` into `buddy-call/page.tsx`, opening the buddy call URL directly (no active session) silently creates a new session in the DB.

**How to avoid:** Use a read-only session query — `SELECT ... WHERE poolId=X AND status='active'`. Return empty pairs if no session exists; show 0 counts.

### Pitfall 3: params not awaited in buddy-call/page.tsx

**What goes wrong:** `params.poolId` throws in Next.js 16 because `params` is a `Promise`.

**How to avoid:** Always `const { poolId } = await params` before use. [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md, pools/[poolId]/page.tsx line 108]

### Pitfall 4: AddPairForm responsive — thinking more work is needed

**What goes wrong:** The CamperField stacking is already implemented (`flex-col gap-4 md:flex-row`). Over-engineering additional breakpoints wastes time.

**How to avoid:** The ONLY AddPairForm change for Phase 6 is `w-full md:w-auto` on the submit button (confirmed by reading AddPairForm.tsx line 68 vs the UI-SPEC).

### Pitfall 5: SessionHeader "View all pairs" link missing poolId

**What goes wrong:** If the link is added to `SessionBoard.tsx` instead of `SessionHeader.tsx`, it doesn't have `poolId` in scope without prop drilling.

**How to avoid:** Add to `SessionHeader.tsx` — it already receives `poolId` as a prop (line 19 of the current file). Alternatively, add to `SessionBoard.tsx` which also receives `poolId`. Either works; SessionHeader is the canonical location per Phase 4 D-08.

### Pitfall 6: Using `<a href>` for the buddy call link in SessionHeader

**What goes wrong:** A plain `<a>` tag causes a full page reload, losing React state. For internal navigation, `<Link>` from `next/link` is preferred.

**How to avoid:** Use `import Link from "next/link"` and `<Link href={/pools/${poolId}/buddy-call}>`. SessionHeader is already `"use client"` so `Link` import works fine.

**Exception:** The "Back to board" link in BuddyCallClient uses `<a href>` per the UI-SPEC. This is intentional — navigating back to the board page should reinitiate the full board lifecycle.

---

## Code Examples

### Giant Count Block (from 06-UI-SPEC.md)

```tsx
// Source: .planning/phases/06-buddy-call-screen-polish/06-UI-SPEC.md
// BuddyCallClient main content area
<main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
  <div className="flex flex-col items-center gap-y-6">
    <div className="flex flex-col items-center gap-y-1">
      <output aria-live="polite" aria-atomic="true"
        className="text-6xl font-semibold text-slate-900 leading-none tabular-nums">
        {swimmerCount}
      </output>
      <p className="text-xl font-semibold text-slate-500">swimmers</p>
    </div>
    <div className="flex flex-col items-center gap-y-1">
      <output aria-live="polite" aria-atomic="true"
        className="text-4xl md:text-6xl font-semibold text-slate-900 leading-none tabular-nums">
        {pairCount}
      </output>
      <p className="text-xl font-semibold text-slate-500">pairs</p>
    </div>
  </div>
  {pairs.length > 0 && (
    <ul aria-label="Active pairs" className="mt-12 w-full max-w-sm divide-y divide-slate-200 text-left">
      {pairs.map((pair) => (
        <li key={pair.id} className="py-3 text-base text-slate-700">
          {pair.members.map((m) => `${m.firstName} ${m.lastName}`).join(" / ")}
        </li>
      ))}
    </ul>
  )}
</main>
```

Key classes: `tabular-nums` prevents digit-shift layout jank. `aria-live="polite" aria-atomic="true"` on `<output>` announces count changes to screen readers.

### Back Link (from 06-UI-SPEC.md)

```tsx
// Source: .planning/phases/06-buddy-call-screen-polish/06-UI-SPEC.md
// Note: uses <a> not <Link> — full navigation, not client-side routing
<a
  href={`/pools/${poolId}`}
  aria-label={`Back to session board for ${poolName}`}
  className="flex items-center gap-1 text-base text-slate-600 hover:text-slate-900 min-h-[44px]"
>
  <ChevronLeft size={18} />
  Back to board
</a>
```

### Pair Name Format (from CONTEXT.md D-06)

```typescript
// Source: .planning/phases/06-buddy-call-screen-polish/06-UI-SPEC.md
function formatPairNames(members: PairMember[]): string {
  return members.map((m) => `${m.firstName} ${m.lastName}`).join(" / ");
}
// Pair:  "Ana Ruiz / Ben Cruz"
// Trio:  "Ana Ruiz / Ben Cruz / Sam Lee"
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `revalidatePath` in Server Actions | Client-side Route Handler refetch via `refreshPairs` callback | Phase 5 migrated to this; buddy call screen inherits it without extra work |
| `SessionBoard` as single static component | `LiveBoard` owns Realtime, passes live state to `SessionBoard` | Buddy call screen creates `BuddyCallClient` as a parallel standalone client component |
| Pair count from server SQL | Derived client-side (`pairs.reduce(...)`) | Established in Phase 5; buddy call screen follows same pattern |

---

## Key Research Answers

**Q1: Reuse `useLiveBoard` hook or own subscription?**

There is no `useLiveBoard` custom hook — the Realtime logic lives directly in `LiveBoard.tsx` (useEffect, no extracted hook). The buddy call screen should create its OWN subscription logic inside `BuddyCallClient.tsx` using the same pattern (copy the useEffect body, change channel name). This is the simplest path and is explicitly specified in the UI-SPEC. [VERIFIED: LiveBoard.tsx read]

**Q2: SSR pattern for buddy-call/page.tsx?**

Read-only Server Component: validate poolId, query active session (SELECT only, no INSERT), call `getPairsForSession(session.id)` from `src/lib/pairs.ts`. Extract `getPairsForSession` from `page.tsx` to the shared lib — this avoids duplication. The buddy-call page does NOT use `getOrCreateActiveSession`. [VERIFIED: reading page.tsx + CONTEXT.md D-02]

**Q3: "View all pairs" link — SessionHeader or SessionBoard?**

`SessionHeader` already receives `poolId` (confirmed by reading the file). The link belongs in `SessionHeader` per Phase 4 D-08 and Phase 6 CONTEXT D-08. Currently the link does NOT exist in the codebase (grep of all source files found zero matches for "View all pairs" or "buddy-call"). Phase 6 must add it. Use `<Link>` from `next/link` since SessionHeader is already `"use client"`. [VERIFIED: SessionHeader.tsx read + grep]

**Q4: SessionHeader current flex structure for responsive adaptation?**

Single `<div className="flex items-center justify-between px-4 py-3">` with 3 children: pool name span, count div (text-4xl), Close+Logout div. The count is in the middle of the flex row with no responsive breakpoint — it will overflow on narrow screens. Fix: duplicate the count element with `hidden md:block` in-row and `md:hidden` in a second row below. [VERIFIED: SessionHeader.tsx read]

**Q5: Does AddPairForm need more responsive work?**

The CamperField container already has `flex flex-col gap-4 md:flex md:flex-row md:gap-3 md:items-end` (line 68 of AddPairForm.tsx). The only remaining Phase 6 change is adding `w-full md:w-auto` to the submit button (line 125). The `+` button for trio remains inline beside Camper 2 field and works on mobile without changes. [VERIFIED: AddPairForm.tsx read]

**Q6: Should Phase 6 fix the TypeScript errors from Phase 5?**

The pre-existing TypeScript errors are:
- `LiveBoard.tsx` lines 71-73: two `any` uses with `eslint-disable-next-line` comments — intentional (Supabase realtime internal API)
- `supabase-browser.ts`: module-not-found — resolved once Phase 5-01's npm install runs on the main branch (worktree divergence artifact per 05-06 SUMMARY)

Phase 6 should NOT fix these. They are Phase 5 pre-existing issues noted as out of scope in 05-06 SUMMARY. [VERIFIED: 05-06-SUMMARY.md]

---

## Open Questions

1. **Auth check in buddy-call/page.tsx**
   - What we know: `middleware.ts` protects all non-login routes. `page.tsx` does an explicit `auth.api.getSession()` for user ID (needed by `getOrCreateActiveSession`). Buddy-call page doesn't need user ID.
   - What's unclear: Whether defense-in-depth requires the explicit auth check or if middleware is sufficient.
   - Recommendation: Omit the explicit auth check for simplicity (buddy call is read-only, middleware is the established first gate). If the codebase standard requires explicit checks in all Server Components, add it as a one-liner.

2. **"View all pairs" link visual placement in SessionHeader**
   - What we know: SessionHeader needs the link; it has `poolId`. The UI-SPEC responsive layout diagram does not show where to put it.
   - What's unclear: Should it appear as text link beside the count, or as an icon-button in the action cluster?
   - Recommendation: Small text link below the count (mobile: in the `md:hidden` count row; md+: beside the count in the `hidden md:block` div). Keeps the top row uncluttered.

3. **Handling sessionId="" when no active session exists in BuddyCallClient**
   - What we know: If buddy-call/page.tsx finds no active session, it passes `sessionId=""` and `initialPairs=[]`. BuddyCallClient will attempt to subscribe to `buddy-call::pairs` (empty sessionId).
   - What's unclear: Whether Supabase silently ignores a channel with an empty filter.
   - Recommendation: Guard in BuddyCallClient — if `!sessionId`, skip the Realtime subscription and render zeros without ConnectionBanner. Or redirect to `/pools/[poolId]` from the Server Component when no active session exists.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| `@supabase/supabase-js` | BuddyCallClient Realtime | Installed (Phase 5-01) | Confirmed by LiveBoard.tsx importing `supabase-browser` |
| `lucide-react` | ChevronLeft back link | Installed (Phase 2.2) | Loader2, Plus, X already in use |
| `NEXT_PUBLIC_SUPABASE_URL` | supabase-browser.ts singleton | Set in Phase 5-01 | Required for Realtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase-browser.ts singleton | Set in Phase 5-01 | Required for Realtime |
| Supabase publication setup | pair/pair_member Realtime | Manual step (Phase 5-01) | Already done in Phase 5 |

No blocking missing dependencies.

---

## Validation Architecture

`nyquist_validation: true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/app/\(protected\)/pools/\[poolId\]/buddy-call/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOARD-03 | BuddyCallClient renders swimmerCount and pairCount prominently | unit | `npx vitest run --reporter=verbose src/app/\(protected\)/pools/\[poolId\]/buddy-call/BuddyCallClient.test.tsx` | No — Wave 0 |
| BOARD-03 | BuddyCallClient shows ConnectionBanner when disconnected | unit | same file | No — Wave 0 |
| BOARD-03 | BuddyCallClient shows pair names formatted as "First Last / First Last" | unit | same file | No — Wave 0 |
| BOARD-03 | BuddyCallClient shows 0 swimmers / 0 pairs with empty initialPairs | unit | same file | No — Wave 0 |
| UX-01 | SessionHeader count visible on md+ breakpoint | manual | — | n/a — CSS only |
| UX-01 | AddPairForm submit button not overflowing on laptop | manual | — | n/a — CSS only |
| UX-02 | SessionHeader count stacks below pool name on narrow viewport | manual | — | n/a — CSS only |
| UX-02 | AddPairForm submit button spans full width on iPhone | manual | — | n/a — CSS only |
| UX-02 | No horizontal scroll on /pools/[poolId] on iPhone viewport | manual | — | n/a — visual |

**Why CSS breakpoint tests are manual-only:** jsdom does not implement CSS media queries. `window.matchMedia` is not available in jsdom without polyfilling. Responsive layout correctness must be verified by resizing a real browser window or using DevTools device emulation. [VERIFIED: vitest.config.ts `environment: "jsdom"`]

### Sampling Rate

- **Per task commit:** `npx vitest run src/app/\\(protected\\)/pools/\\[poolId\\]/buddy-call/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/(protected)/pools/[poolId]/buddy-call/BuddyCallClient.test.tsx` — covers BOARD-03 (unit tests for count display, pair list format, connection status)

*(No framework config gaps — existing vitest.config.ts covers all test files under `src/`)*

---

## Security Domain

This phase adds one new route and modifies two existing components. No new Server Actions, no new auth paths, no new form submissions.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | indirect | middleware.ts cookie check covers buddy-call route; no new auth logic |
| V3 Session Management | no | no new session manipulation |
| V4 Access Control | yes | buddy-call route is read-only; no write operations; poolId validated against DB (pool record lookup before session query) |
| V5 Input Validation | yes | poolId from URL params validated against pool table (redirect if not found) |
| V6 Cryptography | no | no new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Direct URL access to buddy-call with invalid poolId | Tampering | Pool record lookup before session query; redirect to /pools if poolId unknown |
| Accessing another pool's session data via sessionId injection | Tampering | Not applicable — sessionId is derived server-side from poolId, never taken from client input |
| Stale count displayed as live (disconnect not shown) | Spoofing/Elevation of Privilege | ConnectionBanner on buddy call screen (D-09) — identical to Phase 5 pattern |

---

## Sources

### Primary (HIGH confidence)

- `src/app/(protected)/pools/[poolId]/components/LiveBoard.tsx` — confirmed Realtime subscription pattern, channel name format, removeChannel cleanup
- `src/app/(protected)/pools/[poolId]/components/SessionHeader.tsx` — confirmed current flex layout (single row, no responsive stacking)
- `src/app/(protected)/pools/[poolId]/components/AddPairForm.tsx` — confirmed CamperField stacking already implemented (line 68), submit button lacks `w-full`
- `src/app/(protected)/pools/[poolId]/page.tsx` — confirmed SSR pattern, `getPairsForSession` function, `await params` pattern
- `.planning/phases/06-buddy-call-screen-polish/06-UI-SPEC.md` — confirmed exact Tailwind classes, BuddyCallClient layout, count typography, SessionHeader responsive pattern
- `.planning/phases/06-buddy-call-screen-polish/06-CONTEXT.md` — all locked decisions
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` — confirmed Server Component + "use client" boundary pattern, `params` as Promise
- `vitest.config.ts` — confirmed jsdom environment (explains why CSS breakpoints are manual-only)
- `src/middleware.ts` — confirmed all non-login routes are auth-protected

### Secondary (MEDIUM confidence)

- `.planning/phases/05-real-time-live-board/05-05-SUMMARY.md` — pre-existing TypeScript errors described, removeChannel rationale
- `.planning/phases/05-real-time-live-board/05-06-SUMMARY.md` — TypeScript errors confirmed out-of-scope for Phase 5
- `.planning/phases/05-real-time-live-board/05-PATTERNS.md` — `getPairsForSession` extraction recommendation

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Auth check in buddy-call/page.tsx can be omitted (middleware is sufficient for read-only page) | Pattern 2 / Open Questions | Low — worst case is unauthenticated user sees zero counts; middleware prevents this anyway |
| A2 | "View all pairs" link position in SessionHeader (beside/below count) is Claude's discretion | Pattern 4 | Low — purely visual, easy to adjust |
| A3 | Empty sessionId ("") passed to BuddyCallClient when no active session is preferable to redirect | Open Questions | Medium — if Supabase throws on empty-string channel filter, BuddyCallClient will log an error; recommendation is to guard or redirect |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified as already installed by reading existing source files
- Architecture: HIGH — all patterns verified from actual source code + UI-SPEC
- Pitfalls: HIGH — pitfalls verified by reading actual code (responsive classes, channel name, getOrCreate vs read-only)
- Responsive CSS analysis: HIGH — read actual AddPairForm.tsx and SessionHeader.tsx source

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (Tailwind, Next.js, Supabase APIs stable; no external factors affecting this research)
