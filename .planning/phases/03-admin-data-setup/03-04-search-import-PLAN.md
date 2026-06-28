---
phase: 03-admin-data-setup
plan: "04"
type: execute
wave: 3
depends_on:
  - 03-03
files_modified:
  - src/app/(admin)/admin/campers/page.tsx
  - src/app/(admin)/admin/campers/actions.ts
  - src/app/(admin)/admin/campers/actions.test.ts
  - src/app/(admin)/admin/campers/components/SearchBar.tsx
  - src/app/(admin)/admin/campers/components/PaginationControls.tsx
  - src/app/(admin)/admin/campers/components/ImportModal.tsx
  - scripts/generate-sample-template.ts
  - public/sample-roster.xlsx
autonomous: true
requirements:
  - CAMP-01
  - CAMP-02
  - CAMP-06

must_haves:
  truths:
    - "importCampersAction uses xlsx.utils.sheet_to_json with { raw: false, defval: '' } — no numeric coercion of codes"
    - "importCampersAction wraps DELETE + INSERT in a single db.transaction() — atomic all-or-nothing replace"
    - "importCampersAction performs in-memory duplicate code detection before touching the DB; reports 'Row N: duplicate code X (also in row M)'"
    - "A code stored as '042' reads back from the DB as the string '042' — no leading zero loss"
    - "importCampersAction rejects non-admin sessions with 'Unauthorized'"
    - "CampersPage reads searchParams as a Promise (await searchParams) — no synchronous access"
    - "Search uses ilike() on firstName, lastName, and code columns simultaneously (OR condition)"
    - "SearchBar debounces 300ms and updates ?q= + resets page=1 on input change"
    - "PaginationControls shows Previous / Page X of Y / Next; Previous disabled on page 1; Next disabled on last page"
    - "ImportModal shows row-level error list on failure; shows 'Imported N campers successfully.' on success"
    - "public/sample-roster.xlsx exists with headers: First Name, Last Name, Code, Bunk, Notes"
    - "npm test exits 0 with import action tests green"
  artifacts:
    - path: "src/app/(admin)/admin/campers/actions.ts"
      provides: "importCampersAction added to existing CRUD actions"
      exports:
        - importCampersAction
    - path: "src/app/(admin)/admin/campers/components/SearchBar.tsx"
      provides: "Debounced client search input that updates ?q= URL param"
      exports:
        - SearchBar
    - path: "src/app/(admin)/admin/campers/components/PaginationControls.tsx"
      provides: "Previous/Next pagination with page indicator"
      exports:
        - PaginationControls
    - path: "src/app/(admin)/admin/campers/components/ImportModal.tsx"
      provides: "File upload modal with useActionState for error/success feedback"
      exports:
        - ImportModal
    - path: "public/sample-roster.xlsx"
      provides: "Downloadable sample template for Excel import"
  key_links:
    - from: "src/app/(admin)/admin/campers/page.tsx"
      to: "src/app/(admin)/admin/campers/actions.ts"
      via: "importCampersAction used in ImportModal via useActionState"
      pattern: "importCampersAction"
    - from: "src/app/(admin)/admin/campers/components/SearchBar.tsx"
      to: "src/app/(admin)/admin/campers/page.tsx"
      via: "router.push updates ?q= param, triggering server re-render"
      pattern: "router\\.push.*pathname.*params"
    - from: "src/app/(admin)/admin/campers/page.tsx"
      to: "src/db/index.ts"
      via: "ilike() search query with pagination"
      pattern: "ilike.*camper\\.firstName|ilike.*camper\\.code"
---

<objective>
Complete the camper roster management vertical slice by adding three capabilities that build on Plan 03: server-side search with debounced URL updates (CAMP-06), Excel bulk import with all-or-nothing transaction (CAMP-01), and string code preservation throughout the import pipeline (CAMP-02).

Purpose: Search and import are the highest-value features of the camper roster. Search makes a 1,000-camper list manageable. Import replaces the tedious manual CRUD path for season setup. Both depend on the CRUD foundation laid in Plan 03.

Output: importCampersAction (SheetJS, Drizzle transaction), SearchBar, PaginationControls, ImportModal, updated CampersPage with async searchParams + ilike() query, sample Excel template.
</objective>

<execution_context>
@C:/Users/darum/AppData/Roaming/npm/node_modules/@anthropic/claude-code/../../../.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/darum/AppData/Roaming/npm/node_modules/@anthropic/claude-code/../../../.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-admin-data-setup/03-CONTEXT.md
@.planning/phases/03-admin-data-setup/03-RESEARCH.md
@.planning/phases/03-admin-data-setup/03-PATTERNS.md
@.planning/phases/03-admin-data-setup/03-UI-SPEC.md
@.planning/phases/03-admin-data-setup/03-03-SUMMARY.md

<interfaces>
<!-- importCampersAction signature (useActionState-compatible): -->
<!-- export async function importCampersAction(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> -->
<!-- type ImportResult = { success: true; count: number } | { success: false; errors: string[] } -->

<!-- SheetJS usage pattern (from RESEARCH.md Pattern 3): -->
<!-- import * as xlsx from "xlsx" -->
<!-- const buffer = Buffer.from(await file.arrayBuffer()); -->
<!-- const workbook = xlsx.read(buffer, { type: "buffer", cellText: true, cellDates: false }); -->
<!-- const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false }); -->
<!-- CRITICAL: raw: false prevents numeric coercion of "042" → 42 -->

<!-- Required Excel column keys (after trimming header whitespace): "First Name", "Last Name", "Code" -->
<!-- Optional: "Bunk", "Notes" -->
<!-- Row number in errors: i + 2 (1-indexed; row 1 is header) -->

<!-- searchParams type in Next.js 16: Promise<{ q?: string; page?: string }> — MUST be awaited -->
<!-- Drizzle search: or(ilike(camper.firstName, `%${q}%`), ilike(camper.lastName, `%${q}%`), ilike(camper.code, `%${q}%`)) -->
<!-- Count query: db.select({ count: sql<number>`count(*)` }).from(camper).where(where) -->
<!-- PAGE_SIZE = 50 -->

<!-- SearchBar pattern: "use client", useRouter + usePathname + useRef (timer), 300ms debounce, router.push(`${pathname}?${params}`) -->
<!-- PaginationControls pattern: "use client", useRouter + usePathname + useSearchParams, goTo(p) helper -->

<!-- ImportModal pattern: "use client", useActionState(importCampersAction, null), plain <form action={formAction}> (NOT next/form Form component) -->
<!-- Sample template link: <a href="/sample-roster.xlsx" download> styled as text-base text-blue-600 underline-offset-2 hover:underline -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: importCampersAction + xlsx install + import tests</name>
  <files>
    src/app/(admin)/admin/campers/actions.ts,
    src/app/(admin)/admin/campers/actions.test.ts
  </files>
  <behavior>
    - importCampersAction(non-admin, formData) → returns { success: false, errors: ["..."] } after requireAdmin throws (or catches and returns error shape — the function itself should call requireAdmin and let it throw; caller receives rejection)
    - importCampersAction(admin, formData with no file) → { success: false, errors: ["No file selected."] }
    - importCampersAction(admin, formData with file containing row where Code is blank) → { success: false, errors: ["Row 2: Code is blank"] } (no DB call)
    - importCampersAction(admin, formData with two rows having same code "042") → { success: false, errors: ["Row 3: duplicate code '042' (also in row 2)"] } (no DB call)
    - importCampersAction(admin, valid 2-row file with codes "042", "101") → calls db.transaction(); returns { success: true, count: 2 }; codes stored as strings "042" and "101"
    - importCampersAction(admin, valid file) → calls revalidatePath("/admin/campers") after transaction
  </behavior>
  <read_first>
    - src/app/(admin)/admin/campers/actions.ts — read the current file (from Plan 03) to understand existing exports and requireAdmin; importCampersAction must be APPENDED, not replacing existing content
    - src/app/(admin)/admin/campers/actions.test.ts — read current test file to understand existing mock setup and add import tests without breaking existing tests
    - .planning/phases/03-admin-data-setup/03-RESEARCH.md — Pattern 3 (importCampersAction full implementation) and Pitfall 1 (leading zeros), Pitfall 3 (duplicate check), Pitfall 6 (header whitespace)
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — section for importCampersAction
    - package.json — verify xlsx is not already installed before running npm install
  </read_first>
  <action>
Step 1 — Install xlsx: Run `npm install xlsx`. Verify with `npm list xlsx` — should show 0.18.5 or current latest stable. The package legitimacy audit in RESEARCH.md confirmed xlsx is [OK] (SheetJS, ~10 years old, github.com/SheetJS/sheetjs, no postinstall script).

Step 2 — Add importCampersAction to actions.ts: Append to the EXISTING actions.ts file (do not replace). Add import `import * as xlsx from "xlsx"` after existing imports. Add the ImportResult type: `type ImportResult = { success: true; count: number } | { success: false; errors: string[] }`.

Export async function importCampersAction with signature `(_prev: ImportResult | null, formData: FormData): Promise<ImportResult>`:
- Call `await requireAdmin()` — throws for non-admin (caller receives rejection, useActionState handles it).
- Get file: `const file = formData.get("file") as File | null;`
- If no file or file.size === 0: return `{ success: false, errors: ["No file selected."] }`.
- Parse: `const buffer = Buffer.from(await file.arrayBuffer()); const workbook = xlsx.read(buffer, { type: "buffer", cellText: true, cellDates: false }); const sheetName = workbook.SheetNames[0]; const sheet = workbook.Sheets[sheetName]; const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });`
- Validation loop: iterate rows with index i, rowNum = i + 2. For each row: trim all header key lookups (account for possible trailing spaces: `(row["First Name"] ?? row[" First Name"] ?? "").trim()`). Actually normalize by trimming all keys: build a normalized row object first: `const norm = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim(), String(v).trim()]));`. Then: firstName = norm["First Name"] ?? ""; lastName = norm["Last Name"] ?? ""; code = norm["Code"] ?? ""; bunk = norm["Bunk"] ?? ""; notes = norm["Notes"] ?? "".
- Validate: if !firstName push "Row N: First Name is blank"; if !lastName push "Row N: Last Name is blank"; if !code push "Row N: Code is blank"; else if seenCodes.has(code) push `Row N: duplicate code '${code}' (also in row ${seenCodes.get(code)})`; else seenCodes.set(code, rowNum). Collect into parsed array: { firstName, lastName, code, bunk: bunk || null, notes: notes || null }.
- If errors.length > 0: return `{ success: false, errors }`.
- All-or-nothing transaction: `await db.transaction(async (tx) => { await tx.delete(camper); if (parsed.length > 0) { await tx.insert(camper).values(parsed.map(r => ({ id: crypto.randomUUID(), ...r }))); } });`
- Call `revalidatePath("/admin/campers")`.
- Return `{ success: true, count: parsed.length }`.

Step 3 — Add import tests to actions.test.ts: Append new describe block for importCampersAction tests. The existing @/db mock needs db.transaction to be a vi.fn() that accepts a callback and calls it with a tx object having delete/insert as vi.fn(). Update the @/db mock to ensure `transaction: vi.fn().mockImplementation(async (cb) => cb({ delete: vi.fn().mockReturnValue({ /* void */ }), insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }) }))`.

Test cases (minimum 5): importCampersAction rejects non-admin (requireAdmin throws); importCampersAction returns { success: false, errors: ["No file selected."] } when formData.get("file") is null; importCampersAction returns row-level error when Code column is blank; importCampersAction returns duplicate code error for two rows with same code; importCampersAction calls db.transaction and returns { success: true, count: N } for valid rows. For file mocking: create a helper that returns a mock File with arrayBuffer() resolving to a Buffer from an xlsx.utils.aoa_to_sheet / xlsx.utils.book_new call (use SheetJS directly in the test to build a real xlsx buffer — this is simpler than deeply mocking SheetJS itself).
  </action>
  <verify>
    <automated>npm test -- actions.test 2>&1 | grep -E "passed|failed|Tests"</automated>
  </verify>
  <acceptance_criteria>
    - npm list xlsx returns a version (package installed)
    - actions.ts contains `export async function importCampersAction`
    - actions.ts contains `xlsx.utils.sheet_to_json` with `raw: false`
    - actions.ts contains `db.transaction` call wrapping DELETE + INSERT
    - actions.ts contains duplicate code detection with `seenCodes.has(code)`
    - actions.test.ts has at least 5 new test cases for importCampersAction
    - npm test exits 0 (all tests green — existing CRUD tests still passing, import tests added)
  </acceptance_criteria>
  <done>importCampersAction implemented with SheetJS all-or-nothing transaction; import tests green; existing CRUD tests unchanged.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: SearchBar + PaginationControls + ImportModal + wire campers page + sample template</name>
  <files>
    src/app/(admin)/admin/campers/page.tsx,
    src/app/(admin)/admin/campers/components/SearchBar.tsx,
    src/app/(admin)/admin/campers/components/PaginationControls.tsx,
    src/app/(admin)/admin/campers/components/ImportModal.tsx,
    scripts/generate-sample-template.ts,
    public/sample-roster.xlsx
  </files>
  <read_first>
    - src/app/(admin)/admin/campers/page.tsx — read the CURRENT file (from Plan 03) before modifying; it uses a simple db.select() with no searchParams; this task adds searchParams + ilike + pagination and wires in the new components
    - .planning/phases/03-admin-data-setup/03-RESEARCH.md — Pattern 1 (server component reads searchParams as Promise), Pattern 2 (SearchBar with debounce), anti-patterns section (do NOT use Form from next/form for file uploads; do NOT access searchParams synchronously)
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — SearchBar, PaginationControls, ImportModal sections (full implementations in PATTERNS.md to follow verbatim)
    - .planning/phases/03-admin-data-setup/03-UI-SPEC.md — Campers Page Layout (search row placement, ImportModal secondary button style), Interaction Contract (Import Modal States 1-4), Copywriting Contract (import error/success copy, search empty states)
    - node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md — confirm searchParams is Promise in this Next.js version
  </read_first>
  <action>
Step 1 — Update src/app/(admin)/admin/campers/page.tsx:
Read the current file carefully first. Replace the simple db.select() query with the full searchParams-aware version. Changes:
- Add to function signature: `{ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }` — the page must be async (it already is).
- After auth guard, add: `const { q = "", page = "1" } = await searchParams;` then `const pageNum = Math.max(1, parseInt(page, 10) || 1); const PAGE_SIZE = 50; const offset = (pageNum - 1) * PAGE_SIZE;`
- Add import: `import { ilike, or, sql, desc } from "drizzle-orm"` (replace the simple `desc` import if it was already there).
- Build where clause: `const where = q ? or(ilike(camper.firstName, \`%${q}%\`), ilike(camper.lastName, \`%${q}%\`), ilike(camper.code, \`%${q}%\`)) : undefined;`
- Replace single query with: `const [campers, totalResult] = await Promise.all([ db.select().from(camper).where(where).orderBy(desc(camper.createdAt)).limit(PAGE_SIZE).offset(offset), db.select({ count: sql<number>\`count(*)\` }).from(camper).where(where), ]);` then `const total = Number(totalResult[0]?.count ?? 0);`
- Add imports for new components: SearchBar, PaginationControls, ImportModal.
- In the return JSX: add a search row below the header div: `div className="flex gap-3 mt-6"` containing SearchBar (pass defaultValue={q}) and ImportModal. Below the search row: CamperTable. Below CamperTable: PaginationControls (pass page={pageNum}, total={total}, pageSize={PAGE_SIZE}).
- Also update the empty state text when q is set: pass q down to CamperTable so it can show "No results for '[q]'" vs "No campers yet". Add prop `searchQuery?: string` to CamperTable and update empty state logic: if searchQuery show "No results for '[searchQuery]'" / "Try a different name or code." else show "No campers yet" / "Upload a spreadsheet or add campers one at a time."

Step 2 — Create src/app/(admin)/admin/campers/components/SearchBar.tsx: Follow RESEARCH.md Pattern 2 exactly. "use client". Imports: useRouter, usePathname from "next/navigation"; useCallback, useRef from "react". Props: { defaultValue?: string }. Timer ref with ReturnType<typeof setTimeout>. handleChange: clearTimeout, 300ms setTimeout, build URLSearchParams with ?q= and page=1, router.push. Input type="search", defaultValue, onChange={handleChange}, placeholder="Search by name or code...", className (standard input class from UI-SPEC).

Step 3 — Create src/app/(admin)/admin/campers/components/PaginationControls.tsx: "use client". Imports: useRouter, usePathname, useSearchParams from "next/navigation". Props: { page: number; total: number; pageSize: number }. totalPages = Math.ceil(total / pageSize). goTo(p: number) function: build URLSearchParams from existing searchParams (to preserve ?q=), set page, router.push. Return: div className `flex items-center justify-between mt-4`. Left: p className `text-sm text-slate-600` showing total count (e.g. "{total} camper{total !== 1 ? 's' : ''}"). Right: div className `flex gap-2 items-center`, containing Previous button (disabled when page <= 1, className with min-h-[44px] px-3 border border-slate-300 rounded-md text-base text-slate-700 disabled:opacity-40), page indicator span ("Page {page} of {totalPages}" text-sm text-slate-600), Next button (disabled when page >= totalPages, same classes).

Step 4 — Create src/app/(admin)/admin/campers/components/ImportModal.tsx: "use client". Import useActionState from "react"; useState from "react"; importCampersAction from "../actions". State: open bool (useState false). `const [state, formAction, isPending] = useActionState(importCampersAction, null)`. Trigger button: "Import roster" with secondary styling (min-h-[44px] px-4 border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50). When open: overlay + card (bg-white). h2 "Import roster" (text-xl font-semibold text-slate-900 text-center mb-6). Form (plain HTML form, action={formAction}, NOT next/form Form): file input name="file" accept=".xlsx,.xls" (standard input class). Below file input: sample template download link — `<a href="/sample-roster.xlsx" download className="text-base text-blue-600 underline-offset-2 hover:underline">Download sample template</a>`. Error state: `state?.success === false` — show `<p className="mt-2 text-sm text-red-600">Import failed — fix the following issues and try again:</p>` followed by `<ul role="alert" className="mt-1 text-sm text-red-600 space-y-1">` listing each error as `<li>`. Success state: `state?.success === true` — show `<p className="mt-4 text-sm text-green-700">Imported {state.count} camper{state.count !== 1 ? 's' : ''} successfully.</p>`. Submit button: "Upload roster" (primary button class) disabled={isPending}, text changes to "Uploading..." when isPending. Close link below button: text "Close" (text-base text-slate-600 hover:text-slate-900), onClick={() => setOpen(false)}.

Step 5 — Generate sample template: Create scripts/generate-sample-template.ts: import * as xlsx from "xlsx". Build workbook: `const wb = xlsx.utils.book_new(); const ws = xlsx.utils.aoa_to_sheet([["First Name", "Last Name", "Code", "Bunk", "Notes"], ["Jane", "Smith", "042", "Cabin 3", ""], ["John", "Doe", "101", "Cabin 7", "Needs sunscreen"]]); xlsx.utils.book_append_sheet(wb, ws, "Roster"); xlsx.writeFile(wb, "public/sample-roster.xlsx");`. Run: `npx tsx scripts/generate-sample-template.ts`. Verify public/sample-roster.xlsx exists.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -15 && npm test 2>&1 | grep -E "passed|failed|Tests" | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - src/app/(admin)/admin/campers/page.tsx contains `await searchParams` (not synchronous searchParams access)
    - page.tsx contains `ilike(camper.firstName` and `ilike(camper.code`
    - page.tsx contains `db.transaction` — NO, wait, the transaction is in importCampersAction not the page. Remove this line.
    - page.tsx contains `sql<number>\`count(*)\`` for total count
    - SearchBar.tsx exists with `"use client"` and `usePathname` and 300ms debounce (`setTimeout`)
    - PaginationControls.tsx exists with `"use client"` and Previous/Next buttons with `disabled` logic
    - ImportModal.tsx exists with `"use client"` and `useActionState(importCampersAction`
    - ImportModal.tsx contains `<form action={formAction}` (plain form, not next/form Form)
    - ImportModal.tsx contains `href="/sample-roster.xlsx" download`
    - public/sample-roster.xlsx exists (binary file created by generate-sample-template.ts)
    - `npm run build` exits 0
    - `npm test` exits 0
  </acceptance_criteria>
  <done>Campers page has working search (debounced URL update, ilike query), pagination (50/page, prev/next), and Excel import with row-level error display; sample template downloadable at /sample-roster.xlsx; npm run build and npm test both exit 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → importCampersAction | Untrusted file upload (type, size, content) |
| Browser → CampersPage (searchParams) | Untrusted ?q= and ?page= URL params |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-04-E | Elevation of Privilege | importCampersAction | mitigate | requireAdmin() first statement; throws "Unauthorized" before file is read or any DB write occurs |
| T-03-04-T | Tampering | File upload — malicious non-Excel content | mitigate | SheetJS xlsx.read() will throw on non-XLSX/XLS binary data; catch any SheetJS parse error and return { success: false, errors: ["Could not parse file. Please upload an Excel file (.xlsx or .xls)."] }; next.config.ts bodySizeLimit: "5mb" caps resource exhaustion |
| T-03-04-T | Tampering | importCampersAction — malicious code values | mitigate | Drizzle parameterized query in tx.insert(); no raw SQL; in-memory duplicate detection with Map before any DB write |
| T-03-04-T | Tampering | SQL injection via ?q= search param | mitigate | ilike() via Drizzle ORM — parameterized; q value is never interpolated into a raw SQL string |
| T-03-04-D | Denial of Service | Large file upload > 5MB | mitigate | bodySizeLimit: "5mb" in next.config.ts rejects oversized requests before they reach the action |
| T-03-04-S | Spoofing | CSRF on importCampersAction | accept | Next.js built-in origin check covers Server Actions including multipart form submissions |
| T-03-04-T | Tampering | camper.code leading zero loss | mitigate | xlsx.utils.sheet_to_json with { raw: false } forces string representation; DB stores as text column; never cast to number anywhere in the chain |
  T-03-04-SC | Tampering | xlsx package install | accept | Package legitimacy verified in RESEARCH.md Package Legitimacy Audit: [OK], npm age ~10 years, SheetJS official repo, no postinstall script |
</threat_model>

<verification>
After both tasks complete:
- `npm install xlsx` completed; npm list xlsx shows installed version
- `npm test` exits 0 — all existing CRUD tests plus 5+ new import tests green
- `npm run build` exits 0
- public/sample-roster.xlsx exists with correct headers (First Name, Last Name, Code, Bunk, Notes)
- /admin/campers shows search bar + import button + pagination controls
- Typing in search bar updates URL ?q= after ~300ms and filtered results appear
- Uploading a valid Excel file replaces the roster; success message shows count
- Uploading an Excel file with a blank code or duplicate code shows row-level errors
- Downloading /sample-roster.xlsx returns an Excel file
- Previous/Next buttons navigate pages; disabled on first/last page
</verification>

<success_criteria>
- importCampersAction rejects non-admin with "Unauthorized"
- importCampersAction uses xlsx.utils.sheet_to_json with raw: false (leading zeros preserved)
- importCampersAction wraps DELETE+INSERT in db.transaction() (atomic all-or-nothing)
- importCampersAction detects duplicate codes in-memory before DB write; reports "Row N: duplicate code 'X' (also in row M)"
- CampersPage awaits searchParams (Promise) and builds ilike() OR query across firstName, lastName, code
- SearchBar debounces 300ms and updates ?q= param resetting page=1
- PaginationControls shows Previous/Next disabled at boundaries; page indicator "Page X of Y"
- ImportModal uses plain HTML form action={formAction} (not next/form)
- ImportModal shows import failure errors as a list; import success shows "Imported N campers successfully."
- Sample template link: /sample-roster.xlsx available for download
- npm run build exits 0
- npm test exits 0
</success_criteria>

<output>
Create `.planning/phases/03-admin-data-setup/03-04-SUMMARY.md` when done.
</output>
