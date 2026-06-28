# Phase 3: Admin Data Setup - Pattern Map

> **Post-execution update (2026-06-28):** Several patterns changed after manual testing. See ⚠️ markers.

**Mapped:** 2026-06-28
**Files analyzed:** 22 (19 source/config + 3 test files)
**Analogs found:** 18 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/schema.ts` | model | CRUD | `src/db/schema.ts` (self) | exact |
| `src/app/(admin)/layout.tsx` | layout | request-response | `src/app/(admin)/layout.tsx` (self) | exact |
| `src/components/AdminSidebar.tsx` | component | request-response | none in codebase | no analog |
| `src/app/(admin)/admin/campers/page.tsx` | server component | CRUD + search | `src/app/(admin)/admin/users/page.tsx` | exact |
| `src/app/(admin)/admin/campers/actions.ts` | server actions | CRUD | `src/app/(admin)/admin/users/actions.ts` | exact |
| `src/app/(admin)/admin/campers/components/CamperTable.tsx` | component | CRUD | `src/app/(admin)/admin/users/components/UserTable.tsx` | exact |
| `src/app/(admin)/admin/campers/components/SearchBar.tsx` | component | request-response | none in codebase | no analog |
| `src/app/(admin)/admin/campers/components/PaginationControls.tsx` | component | request-response | none in codebase | no analog |
| `src/app/(admin)/admin/campers/components/AddCamperModal.tsx` | component | CRUD | `src/app/(admin)/admin/users/components/CreateUserModal.tsx` | exact |
| `src/app/(admin)/admin/campers/components/EditCamperModal.tsx` | component | CRUD | `src/app/(admin)/admin/users/components/CreateUserModal.tsx` | role-match |
| `src/app/(admin)/admin/campers/components/ImportModal.tsx` | component | file-I/O | `src/app/(admin)/admin/users/components/CreateUserModal.tsx` | partial |
| `src/app/(admin)/admin/pools/page.tsx` | server component | CRUD | `src/app/(admin)/admin/users/page.tsx` | exact |
| `src/app/(admin)/admin/pools/actions.ts` | server actions | CRUD | `src/app/(admin)/admin/users/actions.ts` | exact |
| `src/app/(admin)/admin/pools/components/PoolList.tsx` | component | CRUD | `src/app/(admin)/admin/users/components/UserTable.tsx` | role-match |
| `src/app/(admin)/admin/pools/components/AddPoolForm.tsx` | component | CRUD | `src/app/(admin)/admin/users/components/CreateUserModal.tsx` | role-match |
| `src/app/(admin)/admin/pools/components/EditPoolModal.tsx` | component | CRUD | `src/app/(admin)/admin/users/components/CreateUserModal.tsx` | role-match |
| `scripts/seed-pools.ts` | utility | CRUD | `scripts/seed-admin.ts` | role-match |
| `next.config.ts` | config | — | `next.config.ts` (self) | exact |
| `public/sample-roster.csv` | static asset | file-I/O | none in codebase | no analog |
| `src/app/(admin)/admin/campers/actions.test.ts` | test | CRUD | `src/app/(admin)/admin/users/actions.test.ts` | exact |
| `src/app/(admin)/admin/campers/page.test.tsx` | test | CRUD | `src/app/(admin)/admin/users/page.test.tsx` | exact |
| `src/app/(admin)/admin/pools/actions.test.ts` | test | CRUD | `src/app/(admin)/admin/users/actions.test.ts` | exact |

---

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD)

**Analog:** `src/db/schema.ts` (self — add two new table exports)

**Existing import block** (lines 1–2):
```typescript
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
```

**Add to imports** — `sql` is needed for `count(*)` query in the campers page:
```typescript
import { sql } from "drizzle-orm"; // add to campers page, not schema itself
```

**Existing table pattern** (lines 4–23 — `user` table): every table uses
- `text("id").primaryKey()` — UUID stored as text
- `timestamp("created_at").defaultNow().notNull()`
- `timestamp("updated_at").$onUpdate(() => new Date()).notNull()`
- `(table) => [index("name_idx").on(table.column)]` as the second `pgTable` argument

**New tables to append** (after existing exports):
```typescript
export const camper = pgTable(
  "camper",
  {
    id: text("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    code: text("code").notNull().unique(),   // text preserves leading zeros
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

Note: `/* @__PURE__ */ new Date()` is the existing codebase style for `$onUpdate` (lines 13, 21, 32, etc.). Use the same form.

---

### `src/app/(admin)/layout.tsx` (layout, request-response)

**Analog:** `src/app/(admin)/layout.tsx` (self — add sidebar around `children`)

**Current full file** (lines 1–14):
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/pools");
  return <>{children}</>;
}
```

**Modified return** — keep auth guard unchanged; wrap children with sidebar:
```typescript
import { AdminSidebar } from "@/components/AdminSidebar";

// ... auth guard unchanged ...

return (
  <div className="flex min-h-screen">
    <AdminSidebar />
    <div className="flex-1">{children}</div>
  </div>
);
```

---

### `src/components/AdminSidebar.tsx` (component, request-response)

**Analog:** No existing analog — new client component pattern. Use RESEARCH.md Pattern 4.

**Full implementation from RESEARCH.md**:
```typescript
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

---

### `src/app/(admin)/admin/campers/page.tsx` (server component, CRUD + search)

**Analog:** `src/app/(admin)/admin/users/page.tsx`

**Imports pattern** (lines 1–8 of analog):
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
```

For campers page, adapt to:
```typescript
import { ilike, or, sql } from "drizzle-orm";
import { camper } from "@/db/schema";
// Remove asc — order by lastName, firstName instead
```

**Auth guard pattern** (lines 12–13 of analog):
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session || session.user.role !== "admin") redirect("/pools");
```

**Core query pattern** (lines 14–26 of analog — adapt for searchParams + pagination):
```typescript
// searchParams is a Promise in Next.js 16 — must be awaited
export default async function CampersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  // ... auth guard ...
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const PAGE_SIZE = 50;
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
  // render SearchBar, CamperTable, PaginationControls, ClearAllCampers trigger
}
```

**Page layout shell** (lines 37–48 of analog):
```typescript
return (
  <main className="bg-white min-h-screen">
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Campers</h1>
        {/* AddCamperModal + ImportModal + ClearAll trigger */}
      </div>
      {/* SearchBar */}
      <CamperTable campers={campers} />
      <PaginationControls page={pageNum} total={total} pageSize={PAGE_SIZE} />
    </div>
  </main>
);
```

---

### `src/app/(admin)/admin/campers/actions.ts` (server actions, CRUD)

**Analog:** `src/app/(admin)/admin/users/actions.ts`

**File header and requireAdmin pattern** (lines 1–13 of analog — copy verbatim):
```typescript
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}
```

**Add imports** for Drizzle mutations:
```typescript
import { db } from "@/db";
import { camper } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as xlsx from "xlsx";
```

**Simple action shape** (lines 38–45 of analog — `removeUserAction`):
```typescript
export async function removeCamperAction(camperId: string) {
  await requireAdmin();
  await db.delete(camper).where(eq(camper.id, camperId));
  revalidatePath("/admin/campers");
}
```

**revalidatePath call** — every action ends with `revalidatePath("/admin/campers")` (same pattern as line 35 and 45 of analog).

**importCampersAction** ⚠️ — uses `useActionState`-compatible signature (`_prev, formData`) and returns a typed union. **File format: CSV (not xlsx).** Uses `papaparse` (`file.text()` + `Papa.parse(..., { header: true, skipEmptyLines: true })`). SheetJS/xlsx removed. Same CampMinder column mapping applies.

---

### `src/app/(admin)/admin/campers/components/CamperTable.tsx` (component, CRUD)

**Analog:** `src/app/(admin)/admin/users/components/UserTable.tsx`

**"use client" directive + type definition** (lines 1–16 of analog):
```typescript
"use client";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";  // adapt for camper

type Camper = {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  bunk: string | null;
  notes: string | null;
};
```

**Table shell** (lines 18–44 of analog):
```typescript
export function CamperTable({ campers }: { campers: Camper[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden mt-8">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">Name</th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">Code</th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">Bunk</th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">Notes</th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {/* empty state + row map — follow UserTable pattern exactly */}
        </tbody>
      </table>
    </div>
  );
}
```

**Empty state pattern** (lines 42–50 of analog):
```typescript
{campers.length === 0 ? (
  <tr>
    <td colSpan={5}>
      <p className="text-base text-slate-500 px-4 py-8 text-center">
        No campers yet. Import a roster or add campers individually.
      </p>
    </td>
  </tr>
) : (
  campers.map((c) => (
    <tr key={c.id}>
      <td className="text-base text-slate-900 px-4 py-3">
        {c.firstName} {c.lastName}
      </td>
      {/* ... other cells ... */}
      <td className="text-base text-slate-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <EditCamperModal camper={c} />
          <DeleteConfirmDialog camperId={c.id} name={`${c.firstName} ${c.lastName}`} />
        </div>
      </td>
    </tr>
  ))
)}
```

---

### `src/app/(admin)/admin/campers/components/SearchBar.tsx` (component, request-response)

**Analog:** No existing analog. Use RESEARCH.md Pattern 2 verbatim.

**Full implementation from RESEARCH.md**:
```typescript
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

---

### `src/app/(admin)/admin/campers/components/PaginationControls.tsx` (component, request-response)

**Analog:** No existing analog. New component; follow SearchBar URL pattern.

**Pattern to follow** — uses `usePathname` + `useSearchParams` + `useRouter().push()` for navigation. Button Tailwind classes follow the `min-h-[44px]` touch target convention from `CreateUserModal.tsx` (line 37):
```typescript
"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = { page: number; total: number; pageSize: number };

export function PaginationControls({ page, total, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-slate-600">
        {total} camper{total !== 1 ? "s" : ""}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="min-h-[44px] px-3 border border-slate-300 rounded-md text-base text-slate-700 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm text-slate-600 self-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="min-h-[44px] px-3 border border-slate-300 rounded-md text-base text-slate-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

### `src/app/(admin)/admin/campers/components/AddCamperModal.tsx` (component, CRUD)

**Analog:** `src/app/(admin)/admin/users/components/CreateUserModal.tsx`

**Full modal pattern** (lines 1–161) — copy structure verbatim; adapt fields.

**Modal trigger button** (lines 36–40):
```typescript
<button
  onClick={() => setOpen(true)}
  className="min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150"
>
  Add camper
</button>
```

**State management** (lines 7–9):
```typescript
const [open, setOpen] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Submit handler** (lines 11–31):
```typescript
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  setError(null);
  try {
    await addCamperAction(new FormData(e.currentTarget));
    setOpen(false);
    (e.currentTarget as HTMLFormElement).reset();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      setError("That code is already in use. Choose a different code.");
    } else {
      setError("Could not add camper. Please try again.");
    }
  } finally {
    setLoading(false);
  }
}
```

**Overlay + card** (lines 42–45):
```typescript
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm">
```

**Input field pattern** (lines 55–63):
```typescript
<input
  id="first-name"
  name="first-name"
  type="text"
  required
  placeholder="Enter first name"
  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
/>
```

**Error display** (lines 133–135):
```typescript
{error && (
  <p role="alert" className="text-base text-red-600">{error}</p>
)}
```

**Submit + cancel buttons** (lines 138–154):
```typescript
<button
  type="submit"
  disabled={loading}
  className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Add camper
</button>
<button
  type="button"
  onClick={() => { setOpen(false); setError(null); }}
  className="text-base text-slate-600 hover:text-slate-900 text-center mt-2 block mx-auto"
>
  Close
</button>
```

---

### `src/app/(admin)/admin/campers/components/EditCamperModal.tsx` (component, CRUD)

**Analog:** `src/app/(admin)/admin/users/components/CreateUserModal.tsx` (role-match — same modal structure, pre-filled values)

Follow the same pattern as `AddCamperModal.tsx` above. Key differences:
- Receives `camper` prop with existing values
- Uses `defaultValue={camper.firstName}` on inputs instead of empty
- Calls `editCamperAction` instead of `addCamperAction`
- Hidden `<input type="hidden" name="id" value={camper.id} />` to pass the record ID
- Trigger button text: "Edit" (styled as text link, like `DeleteConfirmDialog` line 32)

---

### `src/app/(admin)/admin/campers/components/ImportModal.tsx` (component, file-I/O)

**Analog:** `src/app/(admin)/admin/users/components/CreateUserModal.tsx` (partial — same overlay/card shell; different form pattern)

**Overlay + card shell**: same as `CreateUserModal.tsx` lines 42–45.

**Key difference**: use `useActionState` from React (not plain `useState` handler) because the action returns structured error data:
```typescript
"use client";
import { useActionState } from "react";
import { importCampersAction } from "../actions";

export function ImportModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(importCampersAction, null);

  return (
    <>
      {/* trigger button — same className as AddCamperModal trigger */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm">
            <h2 className="text-3xl font-semibold text-slate-900 text-center mb-8">
              Import Roster
            </h2>
            <form action={formAction} className="flex flex-col gap-4">
              <input type="file" name="file" accept=".xlsx,.xls" required
                className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
              {state?.success === false && (
                <ul role="alert" className="mt-2 text-sm text-red-600 space-y-1">
                  {state.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {state?.success === true && (
                <p className="text-sm text-green-700">
                  Imported {state.count} campers successfully.
                </p>
              )}
              <button type="submit" disabled={isPending}
                className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                {isPending ? "Importing..." : "Upload"}
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="text-base text-slate-600 hover:text-slate-900 text-center mt-2 block mx-auto">
                Close
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

### `src/app/(admin)/admin/pools/page.tsx` (server component, CRUD)

**Analog:** `src/app/(admin)/admin/users/page.tsx`

**Copy auth guard + layout shell** (lines 10–48 of analog) verbatim. Adapt:
- Import `pool` from `@/db/schema` instead of `user`
- Query: `db.select().from(pool).orderBy(asc(pool.name))` — no date formatting needed
- Render `<PoolList pools={pools} />` and `<AddPoolForm />`
- No searchParams needed (pool list is small)

---

### `src/app/(admin)/admin/pools/actions.ts` (server actions, CRUD)

**Analog:** `src/app/(admin)/admin/users/actions.ts`

**Copy requireAdmin + file header** (lines 1–13) verbatim.

**Action shape** — simpler than campers (no file upload); follow `removeUserAction` shape (lines 38–45):
```typescript
import { db } from "@/db";
import { pool } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createPoolAction(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("Pool name is required");
  await db.insert(pool).values({ id: crypto.randomUUID(), name });
  revalidatePath("/admin/pools");
}

export async function renamePoolAction(poolId: string, formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("Pool name is required");
  await db.update(pool).set({ name }).where(eq(pool.id, poolId));
  revalidatePath("/admin/pools");
}

export async function removePoolAction(poolId: string) {
  await requireAdmin();
  await db.delete(pool).where(eq(pool.id, poolId));
  revalidatePath("/admin/pools");
}
```

---

### `src/app/(admin)/admin/pools/components/PoolList.tsx` (component, CRUD)

**Analog:** `src/app/(admin)/admin/users/components/UserTable.tsx` (role-match — table with action column)

Pool list is simpler than camper table: one column (name) + actions column (rename trigger + delete). Follow `UserTable.tsx` structure but as a simpler list or single-column table. `DeleteConfirmDialog` pattern (lines 1–73 of that file) applies directly for pool delete — just swap prop names and action call.

---

### `src/app/(admin)/admin/pools/components/AddPoolForm.tsx` (component, CRUD) ⚠️

**Analog:** `src/app/(admin)/admin/users/components/CreateUserModal.tsx` (role-match)

**Shipped as a modal, not an inline form.** The `Plus` icon in the page header opens a modal dialog (same max-w-sm overlay shell). Inline form below the list was removed for consistency with the campers page pattern. Trigger: `<button><Plus size={20} /></button>` with `title="Add pool"`.

---

### `src/app/(admin)/admin/pools/components/EditPoolModal.tsx` (component, CRUD)

**Analog:** `src/app/(admin)/admin/users/components/CreateUserModal.tsx` (role-match)

Same overlay + card shell. One field (name), pre-filled with `pool.name`. Calls `renamePoolAction`.

---

### `scripts/seed-pools.ts` (utility, CRUD)

**Analog:** `scripts/seed-admin.ts`

**Import path pattern** (line 10 of analog):
```typescript
import { db } from "../src/db";
import { pool } from "../src/db/schema";
```

**Idempotent check + exit pattern** (lines 12–55 of analog — adapt):
```typescript
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

**Error handling pattern** (lines 33–54 of analog):
```typescript
// seed-admin.ts wraps the main call with a .catch() at the bottom — same here
```

---

### `next.config.ts` (config)

**Analog:** `next.config.ts` (self — currently minimal, lines 1–7)

**Current file**:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

**Add `serverActions.bodySizeLimit`**:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
```

---

### `public/sample-roster.xlsx` (static asset)

**Analog:** None. Generated via a one-off script using SheetJS:
```typescript
// scripts/generate-sample-template.ts (run once; commit output to public/)
import * as xlsx from "xlsx";

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet([
  ["First Name", "Last Name", "Code", "Bunk", "Notes"],
  ["Jane", "Smith", "042", "Cabin 3", ""],
  ["John", "Doe", "101", "Cabin 7", "Needs sunscreen"],
]);
xlsx.utils.book_append_sheet(wb, ws, "Roster");
xlsx.writeFile(wb, "public/sample-roster.xlsx");
```

---

### `src/app/(admin)/admin/campers/actions.test.ts` (test, CRUD)

**Analog:** `src/app/(admin)/admin/users/actions.test.ts`

**Mock block** (lines 1–20 of analog — copy + adapt for `@/db`):
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

**requireAdmin rejection test shape** (lines 27–38 of analog):
```typescript
it("addCamperAction rejects when session is null", async () => {
  const { auth } = await import("@/lib/auth");
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
  const { addCamperAction } = await import("./actions");
  const formData = new FormData();
  await expect(addCamperAction(formData)).rejects.toThrow("Unauthorized");
});
```

**revalidatePath assertion shape** (lines 114–138 of analog):
```typescript
it("addCamperAction calls revalidatePath('/admin/campers') on success", async () => {
  // mock admin session + db.insert
  const { revalidatePath } = await import("next/cache");
  // call action
  expect(revalidatePath).toHaveBeenCalledWith("/admin/campers");
});
```

---

### `src/app/(admin)/admin/campers/page.test.tsx` (test, CRUD)

**Analog:** `src/app/(admin)/admin/users/page.test.tsx`

**Mock block** (lines 1–46 of analog — adapt):
```typescript
vi.mock("./components/CamperTable", () => ({
  CamperTable: ({ campers }: { campers: unknown[] }) => (
    <div>{campers.length === 0 ? "No campers yet" : "Campers list"}</div>
  ),
}));
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  },
}));
```

**Async page render pattern** (lines 53–59 of analog):
```typescript
it("renders h1 with text 'Campers'", async () => {
  const jsx = await CampersPage({ searchParams: Promise.resolve({}) });
  render(jsx);
  expect(screen.getByRole("heading", { name: /Campers/i })).toBeInTheDocument();
});
```

---

### `src/app/(admin)/admin/pools/actions.test.ts` (test, CRUD)

**Analog:** `src/app/(admin)/admin/users/actions.test.ts`

Same structure as the campers actions test. Replace `camper` with `pool`, replace action names (`createPoolAction`, `renamePoolAction`, `removePoolAction`), use `revalidatePath("/admin/pools")`.

---

## Shared Patterns

### Authentication Guard
**Source:** `src/app/(admin)/admin/users/actions.ts` lines 7–13
**Apply to:** All `actions.ts` files (campers, pools)
```typescript
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}
```
Copy this function verbatim into every `actions.ts` file — it is not exported or shared via a utility module.

### Layout-Level Auth Redirect
**Source:** `src/app/(admin)/admin/users/page.tsx` lines 12–13
**Apply to:** All admin page.tsx server components (campers, pools)
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session || session.user.role !== "admin") redirect("/pools");
```

### revalidatePath After Every Mutation
**Source:** `src/app/(admin)/admin/users/actions.ts` lines 35, 45
**Apply to:** Every exported server action in `campers/actions.ts` and `pools/actions.ts`
```typescript
revalidatePath("/admin/campers"); // or "/admin/pools"
```
Must be called before the action returns — not after awaiting a response.

### Modal Overlay + Card Shell
**Source:** `src/app/(admin)/admin/users/components/CreateUserModal.tsx` lines 42–45
**Apply to:** `AddCamperModal`, `EditCamperModal`, `ImportModal`, `AddPoolForm` (if modal), `EditPoolModal`
```typescript
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm">
```

### Input Field Tailwind Class
**Source:** `src/app/(admin)/admin/users/components/CreateUserModal.tsx` line 62
**Apply to:** Every `<input>` in all modal/form components
```typescript
className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
```

### Primary Button Tailwind Class
**Source:** `src/app/(admin)/admin/users/components/CreateUserModal.tsx` lines 138–142
**Apply to:** Every submit/primary action button
```typescript
className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
```

### Destructive Confirm Dialog
**Source:** `src/app/(admin)/admin/users/components/DeleteConfirmDialog.tsx` (full file, lines 1–73)
**Apply to:** Individual camper delete, "Clear all campers", pool delete
- The `DeleteConfirmDialog` component from Phase 2 is directly reusable; import it with adapted props.
- Two-button layout: cancel left (`border-slate-300`), confirm right (`bg-red-600`).

### Table Structure
**Source:** `src/app/(admin)/admin/users/components/UserTable.tsx` lines 18–81
**Apply to:** `CamperTable`, `PoolList`
- `bg-white border border-slate-200 rounded-md overflow-hidden mt-8` wrapping div
- `bg-slate-50` thead
- `divide-y divide-slate-200` tbody
- `text-sm font-semibold text-slate-900 px-4 py-3 text-left` th
- `text-base text-slate-900 px-4 py-3` td

### Vitest Mock Template
**Source:** `src/app/(admin)/admin/users/actions.test.ts` lines 1–20
**Apply to:** All new `*.test.ts` files
```typescript
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Add for DB-touching tests:
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(),
    delete: vi.fn(), transaction: vi.fn(),
  },
}));
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/AdminSidebar.tsx` | component | request-response | No navigation sidebar exists yet; `usePathname()` for active links is a new pattern in this codebase |
| `src/app/(admin)/admin/campers/components/SearchBar.tsx` | component | request-response | No search or URL-update components exist yet |
| `src/app/(admin)/admin/campers/components/PaginationControls.tsx` | component | request-response | No pagination components exist yet |
| `public/sample-roster.xlsx` | static asset | file-I/O | No static download assets exist; generated by a one-off script |

For these four, use RESEARCH.md Patterns 2 and 4 as the authoritative reference.

---

## Post-Execution Patterns (added 2026-06-28)

### Icon-Only Action Buttons
All action trigger buttons use lucide-react icons with no visible text label. `title` and `aria-label` provide accessibility. Sizes: 20px for header cluster icons, 16px for inline row icons, 24px for primary Upload icon.
- Header: `className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"`
- Row edit: `className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"`
- Row delete: `className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"`

### useActionState Child-Mount Pattern
When a modal uses `useActionState`, place the hook inside an inner component that only renders when `open === true`. Mounting/unmounting resets state to the initial value automatically — no `key` tricks or ref guards needed.
```tsx
export function ImportModal() {
  const [open, setOpen] = useState(false);
  return <>{open && <ImportForm onClose={() => setOpen(false)} />}</>;
}
function ImportForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(importCampersAction, null);
  // state is always null on first render — no stale carry-over
}
```

### e.currentTarget Before Await
Capture `const form = e.currentTarget` before any `await` in form submit handlers. React nullifies `e.currentTarget` after the first yield, so `form.reset()` or reads after `await` will throw otherwise.

### Sonner Toast on Action Success
Import `toast` from `sonner`. `<Toaster position="bottom-right" richColors />` lives in `(admin)/layout.tsx`. Call `toast.success(message)` after closing the modal — do not show an in-dialog success state.

---

## Metadata

**Analog search scope:** `src/app/(admin)/`, `src/db/`, `scripts/`, root config files
**Files scanned:** 11 source files (all key analogs listed in task brief)
**Pattern extraction date:** 2026-06-28
