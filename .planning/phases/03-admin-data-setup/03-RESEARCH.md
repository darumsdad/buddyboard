# Phase 3: Admin Data Setup - Research

**Researched:** 2026-06-28
**Domain:** Drizzle ORM schema, Excel file parsing via Server Action, server-side search with URL params, admin CRUD UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Left sidebar for admin navigation (links: Users / Campers / Pools) — lives in `(admin)` layout
- **D-02:** Pools stored in new `pool` table (Drizzle schema), not config files
- **D-03:** Default pools "Pool 1", "Pool 2", "Pool 3" — seeded via the standalone script pattern (same as `scripts/seed-admin.ts`); inserts only on initial schema creation (idempotent)
- **D-04:** Excel import is destructive replace — upload = the roster, no merge/append
- **D-05:** Import is all-or-nothing; any row error aborts the entire import with row-level error details
- **D-06:** Required Excel columns: First Name, Last Name, Code. Optional: Bunk, Notes. Codes stored as strings (leading zeros preserved)
- **D-07:** A downloadable sample spreadsheet template is provided so admins know expected format
- **D-08:** Add individual camper form: First Name, Last Name, Code (required), Bunk, Notes (optional)
- **D-09:** "Clear all campers" action removes entire roster with a confirmation dialog
- **D-10:** Camper search is server-side with debounce (~300ms), paginated 50 per page

### Claude's Discretion

- Left sidebar design details (width, active state style, icons vs. text-only)
- Debounce timing for search (300ms is standard)
- Exact pagination UI (numbered pages vs. prev/next controls)
- Edit flow for individual campers — modal preferred (consistent with Phase 2)
- Error display style for Excel row errors — inline list below the upload area

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAMP-01 | Admin can upload an Excel spreadsheet to bulk-import campers (name + admin-assigned code) | SheetJS (xlsx) parses XLSX/XLS from a Buffer; Server Action receives File via FormData; all-or-nothing Drizzle transaction |
| CAMP-02 | Camper codes stored and treated as strings (preserves leading zeros) | Drizzle `text` column; SheetJS `cellText: true` option; no numeric coercion anywhere in the chain |
| CAMP-03 | Admin can add an individual camper manually (name + code) | Server Action insert + modal form pattern (same as CreateUserModal) |
| CAMP-04 | Admin can edit a camper's name or code | Server Action update + edit modal pattern |
| CAMP-05 | Admin can remove a camper from the roster | Server Action delete + DeleteConfirmDialog pattern (reuse from Phase 2) |
| CAMP-06 | Admin can search and filter camper list by name or code | Server component reads `searchParams` prop; client SearchBar updates URL with debounce; Drizzle `ilike()` + pagination |
| POOL-01 | Admin can add, rename, and remove pools without a code change | Pool CRUD server actions against new `pool` table |
| POOL-02 | System ships with 3 pools configured by default | `scripts/seed-pools.ts` — idempotent script run after `drizzle-kit push` |
</phase_requirements>

---

## Summary

Phase 3 adds two new Drizzle-managed database tables (`camper` and `pool`), a left sidebar to the admin layout, and three admin pages: Campers, Pools, and an Excel import flow. All mutations use the established Server Action + `requireAdmin()` guard pattern already proven in Phase 2. The Excel import is the most complex piece: a client component uploads a file via a Server Action that parses the spreadsheet using SheetJS, validates all rows, then replaces the entire roster in a single Drizzle transaction.

The server-side search for campers follows Next.js App Router's canonical pattern: the page component reads the `searchParams` prop (which is a Promise in this version of Next.js), queries the database with `ilike()`, and paginates results. A client SearchBar component updates the URL query string with a debounce, which triggers a server re-render. This avoids WebSocket/polling complexity while satisfying the "results update immediately" criterion.

Pool management is intentionally simple CRUD — add a name, rename in place, delete. No foreign key dependencies exist in Phase 3 (Phase 4 will introduce a `session` table that references `pool.id`), so deletion is safe for now.

**Primary recommendation:** Use SheetJS (`xlsx` package) for Excel parsing on the server. Implement import as a destructive-replace Drizzle transaction. Use URL `searchParams` + `ilike()` for server-side camper search. Follow all Phase 2 component and action patterns verbatim.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Excel file parse + validate | API / Backend (Server Action) | — | File bytes must be processed server-side; SheetJS runs in Node.js, not in the browser |
| Camper roster DB writes (import, CRUD) | API / Backend (Server Action) | Database | Drizzle mutations; `requireAdmin()` guard enforced at action layer |
| Pool CRUD | API / Backend (Server Action) | Database | Same pattern as camper mutations |
| Camper search query | API / Backend (Server Component) | Database | Server component reads `searchParams`, calls Drizzle |
| Search box / debounce / URL update | Browser / Client | Frontend Server (SSR) | `useRouter().push()` in a client component updates URL; triggers server re-render |
| Camper/Pool table display + modals | Browser / Client | Frontend Server (SSR) | Interactive island components in `components/` subdirectory; server component renders the outer page |
| Admin sidebar navigation | Frontend Server (SSR) | Browser / Client | Outer shell is server component; active-link highlighting uses `usePathname()` in a child client component |
| Default pool seeding | Database | — | `scripts/seed-pools.ts` runs once after schema push |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 (already installed) | `camper` and `pool` table definitions + queries | Established in Phases 1–2; all schema work goes here |
| xlsx (SheetJS) | 0.18.5 | Parse .xlsx/.xls file buffers into row arrays on the server | Industry-dominant Excel parser for Node.js; handles both .xlsx and .xls formats; processes from Buffer without temp files |
| next (App Router) | 16.2.9 (already installed) | `searchParams` prop for server-side search; Server Actions for mutations | Established; `searchParams` as a Promise is required in this Next.js version |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| postgres | 3.4.9 (already installed) | Supabase connection underlying Drizzle | No change needed |
| vitest | 4.1.9 (already installed) | Unit tests for server actions and components | Same test framework as Phases 1–2 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xlsx (SheetJS) | exceljs | exceljs is streaming-friendly and more actively maintained, but its API is more complex for simple bulk reads. SheetJS reads the whole file into memory which is fine for a camp roster (< 1MB). |
| URL searchParams for search | Server Action + state | URL params make the search bookmarkable and shareable; allow direct navigation to filtered results. Server Actions do not update the URL. |
| Drizzle transaction for import | Two separate DB calls | Transaction guarantees atomicity — if the INSERT fails, the DELETE is rolled back, preserving the original roster. |

**Installation (new dependency only):**
```bash
npm install xlsx
```

**Version verification (run before writing code):**
```bash
npm view xlsx version
# 0.18.5 (confirmed 2026-06-28)
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| xlsx | npm | ~10 yrs | github.com/SheetJS/sheetjs | [OK] | Approved |
| exceljs | npm | ~10 yrs | github.com/exceljs/exceljs | [OK] | Approved (not recommended — use xlsx) |

**postinstall check:**
```bash
npm view xlsx scripts.postinstall
# (empty — no postinstall script)
```

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Admin browser
    |
    | file input / form submit / URL change
    v
Client Components (SearchBar, ImportModal, AddCamperModal, EditCamperModal, PoolList)
    |
    | useRouter().push(?q=...) → URL change → server re-render
    | Server Action call (import, add, edit, delete)
    v
Server Components (page.tsx — reads searchParams prop)
    |
    | Server Actions (actions.ts — requireAdmin guard)
    v
Drizzle ORM (db instance from src/db/index.ts)
    |
    +-- SELECT (search + paginate) → ilike() + limit/offset
    +-- INSERT / UPDATE / DELETE (CRUD actions)
    +-- TRANSACTION (Excel import: DELETE all → INSERT batch)
    v
Supabase / PostgreSQL (camper table, pool table)
```

### Recommended Project Structure

```
src/
├── db/
│   └── schema.ts                    # Add camper + pool table definitions
├── app/
│   └── (admin)/
│       ├── layout.tsx               # Add sidebar navigation (server component shell + AdminSidebar client component)
│       └── admin/
│           ├── users/               # Unchanged from Phase 2
│           ├── campers/
│           │   ├── page.tsx         # Server component; reads searchParams; queries DB
│           │   ├── actions.ts       # Server Actions: import, add, edit, delete, clearAll
│           │   └── components/
│           │       ├── CamperTable.tsx         # Client; renders rows + action buttons
│           │       ├── SearchBar.tsx           # Client; debounced URL update
│           │       ├── PaginationControls.tsx  # Client; prev/next navigation
│           │       ├── AddCamperModal.tsx      # Client; add form modal
│           │       ├── EditCamperModal.tsx     # Client; edit form modal
│           │       └── ImportModal.tsx         # Client; file upload + error display
│           └── pools/
│               ├── page.tsx         # Server component; renders all pools
│               ├── actions.ts       # Server Actions: create, rename, remove pool
│               └── components/
│                   ├── PoolList.tsx            # Client; pool items with inline rename + delete
│                   └── AddPoolForm.tsx         # Client; inline form to add a pool
└── components/
    └── AdminSidebar.tsx             # Client component; uses usePathname() for active state
scripts/
└── seed-pools.ts                    # One-time seed: inserts 3 default pools (idempotent)
public/
└── sample-roster.xlsx              # Static sample file for download (generated by a setup script)
```

### Pattern 1: Server Component Reads searchParams (Next.js App Router)

**What:** Page receives `searchParams` as a Promise prop; awaits it to extract query/page values; passes to Drizzle query. This is the correct pattern for this version of Next.js where searchParams is async.

**When to use:** Any server-rendered page with URL-driven filtering or pagination.

```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
// src/app/(admin)/admin/campers/page.tsx
import { db } from "@/db";
import { camper } from "@/db/schema";
import { ilike, or } from "drizzle-orm";

const PAGE_SIZE = 50;

export default async function CampersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const where = q
    ? or(
        ilike(camper.firstName, `%${q}%`),
        ilike(camper.lastName, `%${q}%`),
        ilike(camper.code, `%${q}%`)
      )
    : undefined;

  const [campers, totalResult] = await Promise.all([
    db.select().from(camper).where(where).limit(PAGE_SIZE).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(camper).where(where),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  return (
    <main>
      {/* render SearchBar (client), CamperTable (client), PaginationControls (client) */}
    </main>
  );
}
```

### Pattern 2: Client SearchBar Updates URL with Debounce

**What:** Client component captures input changes, debounces 300ms, calls `router.push()` to update URL search params. Server re-renders automatically.

**When to use:** Server-side search where results must reflect current query without a submit button.

```typescript
// src/app/(admin)/admin/campers/components/SearchBar.tsx
"use client";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useRef } from "react";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (timer.current) clearTimeout(timer.current);
      const q = e.target.value;
      timer.current = setTimeout(() => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
      }, 300);
    },
    [router, pathname]
  );

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="Search by name or code..."
      className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
    />
  );
}
```

### Pattern 3: Excel Import Server Action (All-or-Nothing)

**What:** Receives a File from FormData, parses with SheetJS, validates all rows, then replaces roster in a transaction.

**When to use:** Destructive bulk import where partial success is worse than full failure.

```typescript
// Source: SheetJS official docs (sheetjs.com), Drizzle ORM transaction docs
// src/app/(admin)/admin/campers/actions.ts (excerpt)
"use server";
import * as xlsx from "xlsx";
import { db } from "@/db";
import { camper } from "@/db/schema";

type ImportResult =
  | { success: true; count: number }
  | { success: false; errors: string[] };

export async function importCampersAction(
  _prev: ImportResult | null,
  formData: FormData
): Promise<ImportResult> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, errors: ["No file selected."] };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: "buffer", cellText: true, cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // raw: false → values as formatted strings (preserves leading zeros when cell is text-formatted)
  const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });

  const errors: string[] = [];
  const seenCodes = new Map<string, number>();
  const parsed: Array<{ firstName: string; lastName: string; code: string; bunk: string | null; notes: string | null }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-indexed, row 1 is header
    const row = rows[i];
    const firstName = (row["First Name"] ?? "").trim();
    const lastName = (row["Last Name"] ?? "").trim();
    const code = (row["Code"] ?? "").trim();

    if (!firstName) errors.push(`Row ${rowNum}: First Name is blank`);
    if (!lastName) errors.push(`Row ${rowNum}: Last Name is blank`);
    if (!code) {
      errors.push(`Row ${rowNum}: Code is blank`);
    } else if (seenCodes.has(code)) {
      errors.push(`Row ${rowNum}: duplicate code '${code}' (also in row ${seenCodes.get(code)})`);
    } else {
      seenCodes.set(code, rowNum);
    }

    parsed.push({
      firstName,
      lastName,
      code,
      bunk: (row["Bunk"] ?? "").trim() || null,
      notes: (row["Notes"] ?? "").trim() || null,
    });
  }

  if (errors.length > 0) return { success: false, errors };

  // All-or-nothing replace
  await db.transaction(async (tx) => {
    await tx.delete(camper);
    if (parsed.length > 0) {
      await tx.insert(camper).values(
        parsed.map((r) => ({
          id: crypto.randomUUID(),
          firstName: r.firstName,
          lastName: r.lastName,
          code: r.code,
          bunk: r.bunk,
          notes: r.notes,
        }))
      );
    }
  });

  revalidatePath("/admin/campers");
  return { success: true, count: parsed.length };
}
```

### Pattern 4: Admin Sidebar with Active-Link Highlighting

**What:** The `(admin)` layout is a server component that renders an `AdminSidebar` client component (which uses `usePathname()` for active state highlighting).

**When to use:** Any server layout that needs client-side active state on navigation links.

```typescript
// src/components/AdminSidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/campers", label: "Campers" },
  { href: "/admin/pools", label: "Pools" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="w-48 shrink-0 bg-slate-50 border-r border-slate-200 min-h-screen p-4">
      <ul className="flex flex-col gap-1">
        {links.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

### Pattern 5: Drizzle Schema for New Tables

```typescript
// src/db/schema.ts — additions
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const camper = pgTable(
  "camper",
  {
    id: text("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    code: text("code").notNull().unique(),  // text type preserves leading zeros
    bunk: text("bunk"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("camper_code_idx").on(table.code),
    index("camper_name_idx").on(table.firstName, table.lastName),
  ]
);

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

### Pattern 6: Pool Seed Script (Idempotent)

```typescript
// scripts/seed-pools.ts
import { db } from "../src/db";
import { pool } from "../src/db/schema";

async function seedPools() {
  const existing = await db.select().from(pool).limit(1);
  if (existing.length > 0) {
    console.log("Pools already exist — seed is idempotent, no action needed.");
    process.exit(0);
  }
  await db.insert(pool).values([
    { id: crypto.randomUUID(), name: "Pool 1" },
    { id: crypto.randomUUID(), name: "Pool 2" },
    { id: crypto.randomUUID(), name: "Pool 3" },
  ]);
  console.log("Default pools seeded: Pool 1, Pool 2, Pool 3");
  process.exit(0);
}

seedPools().catch((e) => { console.error(e); process.exit(1); });
```

### Pattern 7: next.config.ts — Raise Server Action Body Size Limit

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",   // Default is 1MB — Excel files can exceed this
    },
  },
};

export default nextConfig;
```

### Anti-Patterns to Avoid

- **Do not use `<Form>` from `next/form` for file uploads.** The Next.js `Form` component is designed for URL-param updates (search), not multipart uploads. Use a plain HTML `<form>` with a client handler or React `useActionState`.
- **Do not parse Excel in the browser.** SheetJS runs in both environments, but validation (duplicate codes, DB unique constraint) requires server context. Parse server-side only.
- **Do not use numeric column type for camper codes.** Even `varchar` with a CHECK constraint won't preserve display representation across ORMs. Use `text` exclusively.
- **Do not read `searchParams` synchronously.** In this version of Next.js, `searchParams` is a Promise and must be `await`ed. Synchronous access is not supported and will throw at runtime.
- **Do not skip the `raw: false` option in `sheet_to_json`.** Without it, SheetJS may coerce numeric-looking codes ("042") to numbers, stripping the leading zero.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel file parsing | Custom XLSX byte parser | `xlsx` (SheetJS) | XLSX is a complex binary format with multiple compression layers, shared strings tables, and number format codes. Edge cases with cell types, merged cells, and encoding are numerous. |
| All-or-nothing DB replace | Separate DELETE + INSERT with manual error recovery | `db.transaction()` | Drizzle transactions auto-rollback on throw. Manual two-step without a transaction leaves the DB in a half-replaced state if the INSERT fails mid-way through 1,000 rows. |
| Search debouncing | `setTimeout` from scratch in every input | The `useRef` + `clearTimeout` pattern shown in Pattern 2 | There is no debounce utility in the current dependency set. The `useRef` pattern is idiomatic React and avoids adding a dependency like lodash. |
| URL search param construction | Manual string concatenation | `new URLSearchParams()` | Native API handles encoding, multiple values, and special characters correctly. |

**Key insight:** The Excel parsing ecosystem is vast and the binary format is complex. SheetJS is the well-established, audited library for this. Any hand-rolled solution will fail on real-world .xlsx files (formatted numbers, shared strings, etc.).

---

## Common Pitfalls

### Pitfall 1: 1MB Server Action Body Limit

**What goes wrong:** Admin uploads a large Excel file (or any file) via a Server Action and receives a cryptic 413 or body truncation error with no useful user-facing message.

**Why it happens:** Next.js Server Actions default to a 1MB body limit for DDoS mitigation. A camp roster for 1,000 campers in .xlsx is typically 50–150KB, but admin uploads of any file via a form goes through the action boundary. The limit applies to the whole FormData body.

**How to avoid:** Set `serverActions.bodySizeLimit: '5mb'` in `next.config.ts` before any file upload code is written. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md]

**Warning signs:** 413 errors in dev tools, or the action receives an empty/null file.

---

### Pitfall 2: Leading Zeros Lost in Excel Parsing

**What goes wrong:** A camper code "042" is read from the spreadsheet as the number `42` and stored as `"42"`, breaking lookup in Phase 4.

**Why it happens:** SheetJS by default infers cell types. A cell containing `042` without explicit text formatting in Excel will be parsed as a number.

**How to avoid:** Use `xlsx.utils.sheet_to_json(sheet, { raw: false, defval: "" })`. The `raw: false` option forces SheetJS to use the cell's formatted display string rather than the raw parsed value. Additionally, document in the sample template that codes must be formatted as text in Excel (prefix with apostrophe or set cell format to Text).

**Warning signs:** Codes in the database lack expected leading zeros; unit test comparing parsed code to original string fails.

---

### Pitfall 3: `searchParams` is a Promise in Next.js 16

**What goes wrong:** Code accesses `searchParams.q` directly (like older Next.js versions) and gets `undefined` or a type error at runtime.

**Why it happens:** In this version of Next.js (16.x), page props including `searchParams` are Promises that must be awaited. Synchronous property access does not work.

**How to avoid:** Always `const { q, page } = await searchParams;` in the page component body. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md]

**Warning signs:** TypeScript type for `searchParams` is `Promise<...>` and accessing `.q` gives `undefined`.

---

### Pitfall 4: Camper Table UNIQUE Constraint vs. In-Sheet Duplicate Check

**What goes wrong:** The all-or-nothing import relies on DB unique constraint rejection to catch duplicates, but the error message from PostgreSQL is not user-friendly and surfaces as a generic exception rather than a row-level error.

**Why it happens:** If row-level duplicate detection is skipped in the server action, the `INSERT` in the Drizzle transaction throws a constraint violation. The transaction rolls back (correct), but the error displayed to the user says nothing about which rows had duplicate codes.

**How to avoid:** Always perform in-memory duplicate detection in the server action before hitting the DB. Track seen codes in a `Map<string, rowNumber>` and report "Row N: duplicate code 'X' (also in row M)". The DB unique constraint is a safety net, not the primary validation mechanism.

---

### Pitfall 5: Missing `revalidatePath` After Pool/Camper Mutations

**What goes wrong:** Admin adds a pool; the page still shows the old list after the modal closes.

**Why it happens:** Next.js caches server component renders. Without calling `revalidatePath('/admin/pools')` (or `/admin/campers`), the stale render is served.

**How to avoid:** Every Server Action that mutates the DB must call `revalidatePath` on the affected route before returning. Follow the exact pattern established in `src/app/(admin)/admin/users/actions.ts`.

---

### Pitfall 6: Excel Column Name Whitespace Sensitivity

**What goes wrong:** SheetJS reads `"First Name "` (trailing space) instead of `"First Name"`, causing the column lookup to return `undefined` for all rows.

**Why it happens:** Excel headers can have invisible leading/trailing whitespace. `sheet_to_json` uses the raw header string as the key.

**How to avoid:** Trim all header keys in the parsed rows, or normalize them before lookup. Also document the exact expected column names in the sample template.

---

## Code Examples

### Drizzle ilike Search with Pagination

```typescript
// Source: Drizzle ORM query docs (drizzle.team/docs) + established db/index.ts pattern
import { db } from "@/db";
import { camper } from "@/db/schema";
import { ilike, or, sql } from "drizzle-orm";

async function searchCampers(q: string, page: number) {
  const PAGE_SIZE = 50;
  const offset = (page - 1) * PAGE_SIZE;
  const where = q
    ? or(
        ilike(camper.firstName, `%${q}%`),
        ilike(camper.lastName, `%${q}%`),
        ilike(camper.code, `%${q}%`)
      )
    : undefined;

  return db
    .select()
    .from(camper)
    .where(where)
    .orderBy(camper.lastName, camper.firstName)
    .limit(PAGE_SIZE)
    .offset(offset);
}
```

### useActionState for Import Error Feedback

```typescript
// Source: node_modules/next/dist/docs/01-app/02-guides/forms.md (useActionState pattern)
"use client";
import { useActionState } from "react";
import { importCampersAction } from "../actions";

export function ImportModal() {
  const [state, formAction, isPending] = useActionState(importCampersAction, null);

  return (
    <form action={formAction}>
      <input type="file" name="file" accept=".xlsx,.xls" required />
      <button type="submit" disabled={isPending}>
        {isPending ? "Importing..." : "Upload"}
      </button>
      {state?.success === false && (
        <ul role="alert" className="mt-4 text-sm text-red-600">
          {state.errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
      {state?.success === true && (
        <p className="mt-4 text-sm text-green-700">
          Imported {state.count} campers successfully.
        </p>
      )}
    </form>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` as synchronous object | `searchParams` as `Promise<...>` in page props | Next.js 15+ | Must `await searchParams` in async server components |
| `experimental.serverActions: true` to enable | Server Actions enabled by default | Next.js 14 | No opt-in needed; `bodySizeLimit` is the only config to set |

**Deprecated/outdated:**
- `getServerSideProps` for server-side data: replaced by async server components + `searchParams` prop
- `pages/api/` for file upload: replaced by Server Actions with FormData

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SheetJS `raw: false` preserves leading zeros for all numeric-formatted cells | Code Examples (Excel import) | Codes like "042" may be stored as "42"; low risk if sample template instructs text formatting |
| A2 | A camp roster Excel file for ~1,000 campers will be under 5MB | Standard Stack / Pitfall 1 | If files exceed 5MB, increase `bodySizeLimit`; trivially fixable |
| A3 | Drizzle `ilike()` is performant enough for ~1,000 campers without full-text search | Architecture | Correct for this scale; full-text search would be needed at 100k+ rows |

---

## Open Questions

1. **Sample template format (D-07)**
   - What we know: A downloadable sample .xlsx is needed; SheetJS can generate one
   - What's unclear: Whether to generate it as a static committed file in `public/` or as a dynamic route that generates it on demand
   - Recommendation: Generate it once via a small script (`scripts/generate-sample-template.ts`) using `xlsx.utils.book_new()` and commit the output to `public/sample-roster.xlsx`. Simplest approach with no runtime cost.

2. **Pool deletion safety in Phase 4**
   - What we know: In Phase 4, `session` will reference `pool.id`. Deleting a pool with active sessions would violate FK integrity.
   - What's unclear: Phase 3 has no sessions table yet, so no FK exists.
   - Recommendation: In Phase 3, allow unrestricted pool delete (no FK constraint exists). The Phase 4 schema migration adds the FK; the planner for Phase 4 should add a guard in the pool delete action.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | xlsx, scripts | ✓ | (existing project) | — |
| npx drizzle-kit push | Schema migration | ✓ | 0.31.10 (devDep) | — |
| npx tsx | Seed scripts | ✓ | (established pattern from seed-admin.ts) | — |
| Supabase (PostgreSQL) | All DB writes | ✓ | (existing, Phase 1 setup) | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + React Testing Library |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAMP-01 | `importCampersAction` rejects non-admin session | unit | `npm test -- actions.test` | ❌ Wave 0 |
| CAMP-01 | `importCampersAction` with valid file calls db.transaction | unit | `npm test -- actions.test` | ❌ Wave 0 |
| CAMP-01 | `importCampersAction` returns row-level errors for invalid rows | unit | `npm test -- actions.test` | ❌ Wave 0 |
| CAMP-02 | Imported code "042" stored as string "042" (no numeric coercion) | unit | `npm test -- actions.test` | ❌ Wave 0 |
| CAMP-03 | `addCamperAction` rejects non-admin | unit | `npm test -- actions.test` | ❌ Wave 0 |
| CAMP-03 | `addCamperAction` inserts camper record | unit | `npm test -- actions.test` | ❌ Wave 0 |
| CAMP-04 | `editCamperAction` updates name/code | unit | `npm test -- actions.test` | ❌ Wave 0 |
| CAMP-05 | `removeCamperAction` deletes camper | unit | `npm test -- actions.test` | ❌ Wave 0 |
| CAMP-06 | CampersPage renders search results from searchParams | unit | `npm test -- page.test` | ❌ Wave 0 |
| POOL-01 | `createPoolAction` / `renamePoolAction` / `removePoolAction` function correctly | unit | `npm test -- pools/actions.test` | ❌ Wave 0 |
| POOL-02 | seed-pools script inserts 3 pools when table is empty | manual | run `npx tsx scripts/seed-pools.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/(admin)/admin/campers/actions.test.ts` — covers CAMP-01 through CAMP-05 (requireAdmin, import, add, edit, delete, clearAll)
- [ ] `src/app/(admin)/admin/campers/page.test.tsx` — covers CAMP-06 (search renders)
- [ ] `src/app/(admin)/admin/pools/actions.test.ts` — covers POOL-01 (create, rename, remove)
- [ ] Mock pattern for `@/db` Drizzle instance: `vi.mock('@/db', () => ({ db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() } }))`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAdmin()` guard in every Server Action — established pattern from Phase 2 |
| V3 Session Management | no | Session managed by Better Auth — no changes in this phase |
| V4 Access Control | yes | `requireAdmin()` in every mutation; layout-level redirect for UX |
| V5 Input Validation | yes | Row-level validation in `importCampersAction`; required fields checked before DB write |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized camper mutation (add/edit/delete by non-admin) | Elevation of Privilege | `requireAdmin()` guard in every Server Action; layout redirects for UX |
| Malicious file upload (non-Excel, oversized) | Tampering | Validate `file.type` or extension before parsing; `bodySizeLimit: '5mb'` caps resource use |
| SQL injection via camper code or name fields | Tampering | Drizzle ORM uses parameterized queries exclusively — raw SQL never used |
| CSRF on Server Actions | Spoofing | Next.js CSRF protection is built-in for Server Actions (origin check) [VERIFIED: serverActions.md] |
| Duplicate code collision (DB level) | Tampering | Unique constraint on `camper.code`; in-action duplicate check produces user-readable errors |

---

## Sources

### Primary (HIGH confidence)

- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` — `bodySizeLimit` default (1MB) and configuration
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` — `searchParams` as Promise in Next.js App Router
- `node_modules/next/dist/docs/01-app/02-guides/forms.md` — `useActionState` pattern for server action error feedback
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/form.md` — `<input type="file">` behavior note (string vs object) with Next.js Form component
- `src/app/(admin)/admin/users/actions.ts` — `requireAdmin()` pattern (codebase)
- `src/app/(admin)/admin/users/components/CreateUserModal.tsx` — modal + server action call pattern (codebase)
- `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` — confirm dialog pattern (codebase)
- `src/db/schema.ts` — existing Drizzle table structure (codebase)
- `src/db/index.ts` — Drizzle db export pattern (codebase)
- `scripts/seed-admin.ts` — idempotent seed script pattern (codebase)

### Secondary (MEDIUM confidence)

- `npm view xlsx` — version 0.18.5, repository `github.com/SheetJS/sheetjs` [VERIFIED: npm registry]
- slopcheck verdict `[OK]` for `xlsx` and `exceljs` packages

### Tertiary (LOW confidence)

- SheetJS `raw: false` + `cellText: true` behavior for leading zeros — [ASSUMED] based on SheetJS documentation patterns; verify against actual camp roster before finalizing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in registry; Next.js docs read from node_modules
- Architecture: HIGH — patterns derived directly from existing codebase and official Next.js docs
- Pitfalls: HIGH — Server Action body limit is documented in Next.js; other pitfalls derived from schema constraints and established patterns

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (30 days — stable tech stack)
