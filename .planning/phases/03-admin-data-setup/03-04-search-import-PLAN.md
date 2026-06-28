---
phase: 03-admin-data-setup
plan: "04"
type: execute
wave: 3
depends_on:
  - 03-03
files_modified:
  - src/app/(admin)/admin/campers/actions.ts
  - src/app/(admin)/admin/campers/actions.test.ts
  - src/app/(admin)/admin/campers/page.tsx
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
    - "importCampersAction maps CampMinder columns: 'Preferred Name'→firstName, 'Last Name'→lastName, 'SwimCode'→code, fuzzy Bunk (case-insensitive contains 'Bunk')→bunk"
    - "importCampersAction normalizes names to title case on import per D-13 (e.g. 'HAGLER, BENJI' → 'Hagler, Benji')"
    - "importCampersAction supports Merge mode (insert new SwimCodes, skip existing) and Replace mode (delete all + insert all) per D-04"
    - "Both Merge and Replace modes are all-or-nothing: any row error aborts the entire import"
    - "Row error messages use 'SwimCode' terminology per D-05: 'Row N: SwimCode is blank', 'Row N: duplicate SwimCode X (also in row M)', 'Row N: Last Name is blank'"
    - "Blank bunk in import is a row error (bunk is required per D-08 and NOT NULL in DB)"
    - "A SwimCode stored as '042' reads back from the DB as the string '042' — no leading zero loss"
    - "ImportModal shows a merge/replace radio toggle before the file input per D-04"
    - "CampersPage awaits searchParams as a Promise — no synchronous access per RESEARCH.md Pitfall 3"
    - "Search uses ilike() on firstName, lastName, and code columns simultaneously (OR condition)"
    - "SearchBar debounces 300ms and updates ?q= + resets page=1 on input change"
    - "PaginationControls shows Previous / Page X of Y / Next; disabled at boundaries"
    - "sample-roster.xlsx has CampMinder columns: Last Name, Preferred Name, SwimCode, Bunk (per D-07)"
    - "npm test exits 0 with import action tests green"
  artifacts:
    - path: src/app/(admin)/admin/campers/actions.ts
      provides: importCampersAction added to existing CRUD actions (Merge + Replace modes, CampMinder columns, title case, bunk required)
      contains: "export async function importCampersAction"
    - path: src/app/(admin)/admin/campers/components/SearchBar.tsx
      provides: debounced client search input that updates ?q= URL param
      contains: "SearchBar"
    - path: src/app/(admin)/admin/campers/components/PaginationControls.tsx
      provides: Prev/Next pagination with page indicator
      contains: "PaginationControls"
    - path: src/app/(admin)/admin/campers/components/ImportModal.tsx
      provides: file upload modal with merge/replace radio toggle and useActionState feedback
      contains: "ImportModal"
    - path: public/sample-roster.xlsx
      provides: downloadable CampMinder-format sample template
  key_links:
    - from: src/app/(admin)/admin/campers/components/ImportModal.tsx
      to: src/app/(admin)/admin/campers/actions.ts
      via: useActionState(importCampersAction, null)
      pattern: "importCampersAction"
    - from: src/app/(admin)/admin/campers/components/SearchBar.tsx
      to: src/app/(admin)/admin/campers/page.tsx
      via: router.push updates ?q= param triggering server re-render
      pattern: "router\\.push.*pathname"
    - from: src/app/(admin)/admin/campers/page.tsx
      to: src/db/index.ts
      via: ilike() search with pagination
      pattern: "ilike.*camper\\.firstName|ilike.*camper\\.code"
---

<objective>
Complete the camper roster management feature by adding server-side search with debounced URL updates (CAMP-06), Excel bulk import with Merge and Replace modes (CAMP-01), and string code preservation throughout the import pipeline (CAMP-02).

This plan incorporates the updated decisions from CONTEXT.md: D-04 (Merge + Replace import modes), D-05 (SwimCode terminology in errors), D-06 (CampMinder column mapping with fuzzy Bunk), D-07 (CampMinder-format sample template), D-08 (bunk required in import), D-12 (blank SwimCode = hard row error), and D-13 (title case normalization on import).

Purpose: Search makes a 1,000-camper list manageable. Import replaces tedious manual entry for season setup. Both depend on the CRUD actions and page shell from Plan 03.

Output: importCampersAction (SheetJS, two modes, CampMinder columns, title case), updated CampersPage (async searchParams + ilike + pagination), SearchBar, PaginationControls, ImportModal (with merge/replace toggle), and CampMinder-format sample template.
</objective>

<execution_context>
@C:/Users/darum/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/darum/.claude/get-shit-done/templates/summary.md
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
export async function importCampersAction(
  _prev: ImportResult | null,
  formData: FormData
): Promise<ImportResult>

type ImportResult = { success: true; count: number } | { success: false; errors: string[] }

<!-- D-04: TWO import modes — both from FormData "mode" field: -->
<!-- "merge": add new SwimCodes, skip campers whose code already exists in DB -->
<!-- "replace": delete all campers, then insert all parsed rows -->
<!-- Both modes: all-or-nothing validation first; any row error aborts before any DB write -->

<!-- D-06 CampMinder column mapping (KEY CHANGE from old plan): -->
<!-- "Preferred Name" → firstName (title-cased per D-13) -->
<!-- "Last Name" → lastName (title-cased per D-13) -->
<!-- "SwimCode" → code (preserved as string; raw: false prevents numeric coercion) -->
<!-- Fuzzy Bunk: find column whose key.toLowerCase().includes("bunk") → bunk value -->
<!--   e.g. "2025 Bunk", "Bunk", "Camp Bunk" all match -->
<!-- "Division" → extracted for notes field (if present) -->
<!-- "Camp Grade" → extracted for notes field (if present) -->
<!-- Division + Camp Grade stored verbatim in notes as "Division: B | Grade: 1st" -->
<!--   If only Division: "Division: B"; if only Grade: "Grade: 1st"; if neither: null -->

<!-- D-05/D-12 Row error messages use "SwimCode" (not "Code"): -->
<!-- "Row N: SwimCode is blank" (D-12 — blank SwimCode is always a hard error) -->
<!-- "Row N: duplicate SwimCode 'X' (also in row M)" -->
<!-- "Row N: Last Name is blank" -->
<!-- "Row N: Bunk is blank" (D-08 — bunk required since DB is NOT NULL) -->
<!-- Note: blank Preferred Name is NOT a listed error (per D-05, only Last Name and SwimCode) -->

<!-- D-13 Title case helper (names only, not codes): -->
function toTitleCase(s: string): string {
  return s.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
<!-- Apply to firstName and lastName only. Never apply to code. -->

<!-- SheetJS parse options (RESEARCH.md Pattern 3 — unchanged): -->
const buffer = Buffer.from(await file.arrayBuffer());
const workbook = xlsx.read(buffer, { type: "buffer", cellText: true, cellDates: false });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });

<!-- Normalize row headers to handle trailing whitespace (RESEARCH.md Pitfall 6): -->
const norm = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim(), String(v).trim()]));

<!-- searchParams type in this Next.js version is Promise — MUST be awaited: -->
export default async function CampersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;

<!-- Drizzle search (ilike on 3 columns): -->
import { ilike, or, sql, desc } from "drizzle-orm";
const where = q
  ? or(ilike(camper.firstName, `%${q}%`), ilike(camper.lastName, `%${q}%`), ilike(camper.code, `%${q}%`))
  : undefined;
const PAGE_SIZE = 50;
const [campers, totalResult] = await Promise.all([
  db.select().from(camper).where(where).orderBy(desc(camper.createdAt)).limit(PAGE_SIZE).offset(offset),
  db.select({ count: sql<number>`count(*)` }).from(camper).where(where),
]);
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: xlsx install + importCampersAction (Merge + Replace, CampMinder columns, title case) + import tests</name>
  <files>
    src/app/(admin)/admin/campers/actions.ts,
    src/app/(admin)/admin/campers/actions.test.ts
  </files>
  <behavior>
    - importCampersAction(non-admin, formData) → throws "Unauthorized" (requireAdmin guard)
    - importCampersAction(admin, formData with no file) → { success: false, errors: ["No file selected."] }
    - importCampersAction(admin, file with row where SwimCode column is blank) → { success: false, errors: ["Row 2: SwimCode is blank"] } — no DB write (D-12)
    - importCampersAction(admin, file with two rows having same SwimCode "042") → { success: false, errors: ["Row 3: duplicate SwimCode '042' (also in row 2)"] } — no DB write (D-05)
    - importCampersAction(admin, file with row where Last Name is blank) → { success: false, errors: ["Row 2: Last Name is blank"] } — no DB write (D-05)
    - importCampersAction(admin, file with row where Bunk is blank) → { success: false, errors: ["Row 2: Bunk is blank"] } — no DB write (D-08 bunk required)
    - importCampersAction(admin, mode="replace", valid 2-row file) → calls db.transaction with DELETE then INSERT; returns { success: true, count: 2 }; calls revalidatePath("/admin/campers")
    - importCampersAction(admin, mode="merge", valid file with 1 new SwimCode and 1 existing) → calls db.transaction with INSERT only for new SwimCode; returns { success: true, count: 1 } (count = new rows only)
    - importCampersAction(admin, file with lastName "SCHWARTZ") → stored firstName/lastName as title case "Schwartz" (D-13)
    - importCampersAction(admin, file with SwimCode "042") → stored code as string "042" (not 42)
  </behavior>
  <read_first>
    - src/app/(admin)/admin/campers/actions.ts — read current file (from Plan 03); importCampersAction is APPENDED to existing exports; requireAdmin already defined; bunk is NOT NULL in DB schema
    - src/app/(admin)/admin/campers/actions.test.ts — read current test file; existing mock setup; add new describe block for importCampersAction without breaking existing tests
    - .planning/phases/03-admin-data-setup/03-CONTEXT.md — D-04 (Merge+Replace modes), D-05 (SwimCode error terminology), D-06 (CampMinder column mapping, fuzzy Bunk, Division/Grade→notes), D-07 (sample template format), D-08 (bunk required), D-12 (blank SwimCode hard error), D-13 (title case)
    - .planning/phases/03-admin-data-setup/03-RESEARCH.md — Pattern 3 (SheetJS all-or-nothing), Pitfall 2 (raw: false), Pitfall 4 (in-memory duplicate check), Pitfall 6 (header whitespace)
    - package.json — verify xlsx not already installed before running npm install
  </read_first>
  <action>
    Step 1 — Install xlsx: Run `npm install xlsx`. The package legitimacy audit in RESEARCH.md confirmed [OK]. Verify: `npm list xlsx` shows a version.

    Step 2 — Append importCampersAction to existing actions.ts:
    - Add import `import * as xlsx from "xlsx"` at the top of the file (after existing imports)
    - Add type alias: `type ImportResult = { success: true; count: number } | { success: false; errors: string[] }`
    - Add helper function (not exported): `function toTitleCase(s: string): string { return s.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "); }` — D-13: apply to first and last names only, never to code
    - Export async function importCampersAction(_prev: ImportResult | null, formData: FormData): Promise<ImportResult>:

    1. `await requireAdmin();` — throws for non-admin
    2. Extract mode: `const mode = (formData.get("mode") as string ?? "merge").trim();` — "merge" or "replace" (D-04)
    3. Get file: `const file = formData.get("file") as File | null; if (!file || file.size === 0) return { success: false, errors: ["No file selected."] };`
    4. Wrap remaining in try/catch: if SheetJS throws on parse, return `{ success: false, errors: ["Could not parse file. Please upload an Excel file (.xlsx or .xls)."] }`.
    5. Parse: Buffer → xlsx.read with { type: "buffer", cellText: true, cellDates: false } → sheet_to_json with { defval: "", raw: false }
    6. Normalize loop: for each row, build norm = Object.fromEntries(Object.entries(row).map(([k,v]) => [k.trim(), String(v).trim()])). Find fuzzy bunk key: `const bunkKey = Object.keys(norm).find(k => k.toLowerCase().includes("bunk")) ?? "";`
    7. Extract from norm: lastName = norm["Last Name"] ?? ""; swimCode = norm["SwimCode"] ?? ""; preferredName = norm["Preferred Name"] ?? ""; bunkValue = bunkKey ? norm[bunkKey] ?? "" : ""; division = norm["Division"] ?? ""; grade = norm["Camp Grade"] ?? "";
    8. Build notes: `const notesParts: string[] = []; if (division) notesParts.push("Division: " + division); if (grade) notesParts.push("Grade: " + grade); const notes = notesParts.length > 0 ? notesParts.join(" | ") : null;`
    9. Apply title case (D-13): `const firstName = preferredName ? toTitleCase(preferredName) : ""; const lastName2 = lastName ? toTitleCase(lastName) : "";`
    10. Validate (row errors use SwimCode terminology per D-05/D-12; collect all errors before aborting): rowNum = i + 2. if !lastName2 push "Row N: Last Name is blank"; if !swimCode push "Row N: SwimCode is blank"; else if seenCodes.has(swimCode) push `Row N: duplicate SwimCode '${swimCode}' (also in row ${seenCodes.get(swimCode)})`; else seenCodes.set(swimCode, rowNum). if !bunkValue push "Row N: Bunk is blank" (D-08: bunk required since DB is NOT NULL).
    11. Push to parsed: { firstName, lastName: lastName2, code: swimCode, bunk: bunkValue, notes }.
    12. After loop: `if (errors.length > 0) return { success: false, errors };`
    13. Execute import (D-04 — two modes):
        - mode === "replace": `await db.transaction(async (tx) => { await tx.delete(camper); if (parsed.length > 0) { await tx.insert(camper).values(parsed.map(r => ({ id: crypto.randomUUID(), firstName: r.firstName, lastName: r.lastName, code: r.code, bunk: r.bunk, notes: r.notes }))); } }); revalidatePath("/admin/campers"); return { success: true, count: parsed.length };`
        - mode === "merge" (default): `const existingCodes = new Set((await db.select({ code: camper.code }).from(camper)).map(r => r.code)); const toInsert = parsed.filter(r => !existingCodes.has(r.code)); await db.transaction(async (tx) => { if (toInsert.length > 0) { await tx.insert(camper).values(toInsert.map(r => ({ id: crypto.randomUUID(), ...r }))); } }); revalidatePath("/admin/campers"); return { success: true, count: toInsert.length };`

    Step 3 — Add import tests to actions.test.ts:
    - Read the current test file carefully before modifying. Add a new describe("importCampersAction", ...) block.
    - The @/db mock already has transaction: vi.fn() from Plan 03. Update it if needed to call the callback with a tx object: `transaction: vi.fn().mockImplementation(async (cb) => cb({ delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }), insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }) }))`.
    - For file mocking: create a helper `makeXlsxFile(rows: Record<string, string>[])` that uses SheetJS (imported in the test) to build a real xlsx buffer: `xlsx.write(wb, { type: "buffer", bookType: "xlsx" })`. Wrap in a mock File object: `{ arrayBuffer: () => Promise.resolve(buffer), size: buffer.length, name: "test.xlsx" }`.
    - Test all 10 behaviors listed in the behavior block above. For the merge mode test: mock `db.select` chain to return [{ code: "042" }] (existing code), then call with mode="merge" and file containing SwimCode "042" and "101" — expect count=1 (only "101" inserted).
  </action>
  <verify>
    <automated>npm test -- actions.test 2>&1 | grep -E "passed|failed|Tests"</automated>
  </verify>
  <acceptance_criteria>
    - npm list xlsx shows a version is installed
    - actions.ts contains `export async function importCampersAction`
    - actions.ts contains `raw: false` in the sheet_to_json call
    - actions.ts contains `"SwimCode"` column lookup: grep for `norm["SwimCode"]`
    - actions.ts contains `"Preferred Name"` column lookup: grep for `norm["Preferred Name"]`
    - actions.ts contains `toLowerCase().includes("bunk")` for fuzzy bunk detection (D-06)
    - actions.ts contains `toTitleCase` helper function (D-13)
    - actions.ts contains `mode === "replace"` and `mode === "merge"` branches (D-04)
    - actions.ts contains `"SwimCode is blank"` and `"duplicate SwimCode"` error strings (D-05/D-12 — NOT "Code is blank")
    - actions.ts contains `"Bunk is blank"` error string (D-08)
    - actions.test.ts has at least 10 test cases for importCampersAction in a new describe block
    - npm test exits 0 (all existing CRUD tests still pass; new import tests pass)
  </acceptance_criteria>
  <done>importCampersAction implemented with SheetJS (CampMinder columns, Merge+Replace modes, title case, bunk required); all 10 import tests green; existing CRUD tests unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: SearchBar + PaginationControls + ImportModal (merge/replace toggle) + wire campers page + sample template</name>
  <files>
    src/app/(admin)/admin/campers/page.tsx,
    src/app/(admin)/admin/campers/components/SearchBar.tsx,
    src/app/(admin)/admin/campers/components/PaginationControls.tsx,
    src/app/(admin)/admin/campers/components/ImportModal.tsx,
    scripts/generate-sample-template.ts,
    public/sample-roster.xlsx
  </files>
  <read_first>
    - src/app/(admin)/admin/campers/page.tsx — read the CURRENT file from Plan 03 before modifying; it uses simple db.select() without searchParams; this task replaces that query with the full ilike+pagination version and adds new component imports
    - src/app/(admin)/admin/campers/components/CamperTable.tsx — check the Camper type prop interface (bunk is string, not string|null) and the searchQuery prop added below
    - .planning/phases/03-admin-data-setup/03-RESEARCH.md — Pattern 1 (page reads searchParams as Promise), Pattern 2 (SearchBar debounce), Pattern 3 (ImportModal useActionState); Anti-patterns: do NOT use Form from next/form for file uploads; do NOT access searchParams synchronously
    - .planning/phases/03-admin-data-setup/03-PATTERNS.md — SearchBar section (full implementation), PaginationControls section (full implementation), ImportModal section (full implementation)
    - .planning/phases/03-admin-data-setup/03-UI-SPEC.md — Campers Page Layout (search row with inline Import button); Interaction Contract Import Modal States 1-4; Copywriting Contract (search empty state, import success/error copy)
    - .planning/phases/03-admin-data-setup/03-CONTEXT.md — D-04 (ImportModal needs merge/replace radio), D-07 (sample template is CampMinder format: Last Name, Preferred Name, SwimCode, Bunk)
    - node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md — confirm searchParams is a Promise in this Next.js version
  </read_first>
  <action>
    Step 1 — Update src/app/(admin)/admin/campers/page.tsx:
    Read the current file carefully. Add searchParams-aware query, import new components. Changes:
    - Function signature: add `{ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }` parameter. Keep the function async.
    - After auth guard: `const { q = "", page = "1" } = await searchParams;` then `const pageNum = Math.max(1, parseInt(page, 10) || 1); const PAGE_SIZE = 50; const offset = (pageNum - 1) * PAGE_SIZE;`
    - Update drizzle-orm import to include: ilike, or, sql, desc
    - Build where clause: `const where = q ? or(ilike(camper.firstName, \`%${q}%\`), ilike(camper.lastName, \`%${q}%\`), ilike(camper.code, \`%${q}%\`)) : undefined;`
    - Replace query with: `const [campers, totalResult] = await Promise.all([ db.select().from(camper).where(where).orderBy(desc(camper.createdAt)).limit(PAGE_SIZE).offset(offset), db.select({ count: sql<number>\`count(*)\` }).from(camper).where(where), ]); const total = Number(totalResult[0]?.count ?? 0);`
    - Add imports: SearchBar, PaginationControls, ImportModal from "./components/..."
    - In the return JSX, after the header row (h1 + ClearAll + AddCamper): add a div className `flex gap-3 mt-6 items-center` containing SearchBar (defaultValue={q} — full width) and ImportModal (inline, secondary button trigger). Below that: CamperTable (pass campers and searchQuery={q || undefined}). Below CamperTable: PaginationControls (page={pageNum} total={total} pageSize={PAGE_SIZE}).
    - Update CamperTable to accept an optional `searchQuery?: string` prop for empty state differentiation. In CamperTable.tsx: if campers.length === 0 and searchQuery is set, show "No results for '{searchQuery}'" heading + "Try a different name or code." body. If no searchQuery, show "No campers yet" + existing body text. (Edit CamperTable.tsx to add this prop — it's already in files_modified implicitly since it's the same file context. Add it here.)

    Step 2 — Create src/app/(admin)/admin/campers/components/SearchBar.tsx:
    Follow RESEARCH.md Pattern 2 exactly (no deviation). "use client". Import: useRouter, usePathname from "next/navigation"; useCallback, useRef from "react". Props: { defaultValue?: string }. Timer ref: `const timer = useRef<ReturnType<typeof setTimeout> | null>(null)`. handleChange (useCallback): if timer.current clearTimeout it; set new 300ms timer that calls `router.push(\`${pathname}?${params.toString()}\`)` with URLSearchParams containing ?q= (only if non-empty) and page=1. Return: input type="search" defaultValue={defaultValue} onChange={handleChange} placeholder="Search by name or code..." className (standard input class).

    Step 3 — Create src/app/(admin)/admin/campers/components/PaginationControls.tsx:
    "use client". Import: useRouter, usePathname, useSearchParams from "next/navigation". Props: { page: number; total: number; pageSize: number }. totalPages = Math.ceil(total / pageSize) || 1. `function goTo(p: number) { const params = new URLSearchParams(searchParams.toString()); params.set("page", String(p)); router.push(\`${pathname}?${params.toString()}\`); }`. Return: div className `flex items-center justify-between mt-4`. Left: p className `text-sm text-slate-600` text `{total} camper{total !== 1 ? 's' : ''}`. Right: div flex gap-2 items-center: Previous button (disabled={page <= 1}, onClick={() => goTo(page-1), className `min-h-[44px] px-3 border border-slate-300 rounded-md text-base text-slate-700 disabled:opacity-40`), span className `text-sm text-slate-600` text `Page {page} of {totalPages}`, Next button (disabled={page >= totalPages}, onClick={() => goTo(page+1), same className).

    Step 4 — Create src/app/(admin)/admin/campers/components/ImportModal.tsx:
    "use client". Import: useActionState from "react"; useState from "react"; importCampersAction from "../actions". State: `const [open, setOpen] = useState(false)`. Action state: `const [state, formAction, isPending] = useActionState(importCampersAction, null)`. Trigger button: "Import roster" className `min-h-[44px] px-4 border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50 transition-colors` (secondary styling from UI-SPEC). When open: overlay + bg-white card. h2 "Import roster" (text-xl font-semibold text-slate-900 text-center mb-6).

    Form is plain HTML `<form action={formAction}>` — NOT the next/form Form component (RESEARCH.md anti-pattern warning). Inside:

    MERGE/REPLACE RADIO TOGGLE (D-04 — required): fieldset with legend "Import mode" (sr-only or text-base font-semibold text-slate-900 mb-2). Two radio inputs:
    - name="mode" value="merge" defaultChecked. Label: "Merge — add new SwimCodes, skip existing"
    - name="mode" value="replace". Label: "Replace — clear all campers and re-import (cannot be undone)"
    Style each option as a label+input pair, radio inputs with `mr-2`. Option div className `flex items-start gap-2 mb-1`. Label text-base text-slate-700.

    File input: name="file" accept=".xlsx,.xls" className (standard input class with min-h-[44px]).

    Sample template link below file input: `<a href="/sample-roster.xlsx" download className="text-base text-blue-600 underline-offset-2 hover:underline">Download sample template</a>`

    Error state (state?.success === false): `<p className="mt-2 text-sm text-red-600 font-medium">Import failed — fix the following issues and try again:</p>` then `<ul role="alert" className="mt-1 text-sm text-red-600 list-disc list-inside space-y-1">{state.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>`

    Success state (state?.success === true): `<p className="mt-4 text-sm text-green-700">Imported {state.count} camper{state.count !== 1 ? 's' : ''} successfully.</p>`

    Submit button: "Upload roster" (primary button class) disabled={isPending}, text "Uploading..." when isPending.

    Close link: button type="button" onClick={() => setOpen(false)} className `text-base text-slate-600 hover:text-slate-900 text-center mt-2 block mx-auto` text "Close".

    Step 5 — Generate CampMinder-format sample template (D-07):
    Create scripts/generate-sample-template.ts: import * as xlsx from "xlsx". Build workbook with CampMinder column order (Last Name, Preferred Name, SwimCode, Bunk) — this matches what admins export from CampMinder:
    `const ws = xlsx.utils.aoa_to_sheet([["Last Name", "Preferred Name", "SwimCode", "Bunk"], ["Smith", "Jane", "042", "Cabin 3"], ["Doe", "John", "101", "Cabin 7"]]);`
    `xlsx.utils.book_append_sheet(wb, ws, "Roster"); xlsx.writeFile(wb, "public/sample-roster.xlsx");`
    Run: `npx tsx scripts/generate-sample-template.ts`. Verify public/sample-roster.xlsx is created.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20 && npm test 2>&1 | grep -E "passed|failed|Tests" | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - page.tsx contains `await searchParams` (NOT synchronous searchParams.q access)
    - page.tsx contains `ilike(camper.firstName` and `ilike(camper.code`
    - page.tsx contains `sql<number>\`count(*)\`` for total count query
    - SearchBar.tsx exists with "use client", usePathname, and 300ms debounce via setTimeout
    - PaginationControls.tsx exists with "use client", Previous/Next buttons with disabled logic
    - ImportModal.tsx exists with "use client" and `useActionState(importCampersAction`
    - ImportModal.tsx contains `<form action={formAction}` (plain form, not imported Form from next/form)
    - ImportModal.tsx contains `name="mode"` radio inputs with values "merge" and "replace" (D-04)
    - ImportModal.tsx contains `href="/sample-roster.xlsx" download`
    - scripts/generate-sample-template.ts contains "Last Name", "Preferred Name", "SwimCode", "Bunk" (CampMinder format per D-07)
    - public/sample-roster.xlsx exists as a file
    - npm run build exits 0
    - npm test exits 0
  </acceptance_criteria>
  <done>Campers page has working search (ilike, 300ms debounce), pagination (50/page), and Excel import (Merge+Replace toggle, CampMinder columns, SwimCode error messages, title case); sample template has CampMinder column order; all tests green; build exits 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → importCampersAction | Untrusted multipart form upload: file content, file size, mode selection |
| Browser → CampersPage (URL) | Untrusted ?q= and ?page= search params |
| Server → SheetJS | Untrusted binary file content parsed as XLSX |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-04-01 | Elevation of Privilege | importCampersAction | mitigate | requireAdmin() is the first statement; throws "Unauthorized" before file is read or any DB operation begins |
| T-03-04-02 | Tampering | File upload — malicious non-Excel content | mitigate | SheetJS xlsx.read() throws on non-XLSX binary; catch and return { success: false, errors: ["Could not parse file..."] }; bodySizeLimit "5mb" limits resource exhaustion (set in 03-01) |
| T-03-04-03 | Tampering | importCampersAction Replace mode — destructive delete | mitigate | requireAdmin() guard; Replace mode clearly labelled in UI ("cannot be undone"); requires explicit mode selection (default is Merge); DB transaction rolls back on insert failure |
| T-03-04-04 | Tampering | SQL injection via ?q= search param | mitigate | ilike() via Drizzle ORM — parameterized queries; q value never interpolated into raw SQL |
| T-03-04-05 | Tampering | camper.code leading-zero loss | mitigate | xlsx.utils.sheet_to_json with { raw: false } forces string representation; code column is text() in DB; never cast to number anywhere in importCampersAction |
| T-03-04-06 | Tampering | Duplicate SwimCode in import sheet bypassing DB unique constraint | mitigate | In-memory seenCodes Map detects duplicates before any DB write; DB unique constraint is backup safety net |
| T-03-04-07 | Denial of Service | Large xlsx file exceeding bodySizeLimit | mitigate | bodySizeLimit "5mb" in next.config.ts (set in 03-01) rejects oversized requests before they reach the action |
| T-03-04-08 | Spoofing | CSRF on importCampersAction (multipart form) | accept | Next.js built-in origin check covers Server Actions including multipart form submissions (verified from node_modules/next/dist/docs/serverActions.md) |
| T-03-04-SC | Tampering | xlsx package install | accept | Package legitimacy confirmed in RESEARCH.md Package Legitimacy Audit: [OK], npm ~10 years old, SheetJS official repo, no postinstall script found |
</threat_model>

<verification>
After both tasks complete:
- `npm install xlsx` completed; npm list xlsx shows version
- `npm test` exits 0 — 10+ import tests + all existing CRUD/page tests green
- `npm run build` exits 0
- public/sample-roster.xlsx exists with columns: Last Name, Preferred Name, SwimCode, Bunk (CampMinder format per D-07)
- /admin/campers shows search input + "Import roster" button + camper table + pagination
- Typing in search updates URL ?q= after ~300ms; filtered results appear
- ImportModal shows merge/replace radio toggle, file input, sample template download link
- Selecting Replace mode, uploading a valid CampMinder Excel file with SwimCode/Preferred Name/Last Name/Bunk columns: all campers replaced, success count shown
- Selecting Merge mode with same file: only new SwimCodes added, existing skipped, count of new rows shown
- Uploading file with blank SwimCode shows "Row N: SwimCode is blank" error (not "Code")
- Uploading file with duplicate SwimCodes shows "Row N: duplicate SwimCode 'X' (also in row M)"
- Names from "HAGLER, BENJI" stored as "Hagler, Benji" (title case per D-13)
- Downloading /sample-roster.xlsx returns Excel file with CampMinder column headers
- Previous/Next buttons navigate pages; disabled at boundaries
</verification>

<success_criteria>
- importCampersAction rejects non-admin with "Unauthorized"
- importCampersAction maps CampMinder columns (Preferred Name, Last Name, SwimCode, fuzzy Bunk) per D-06
- importCampersAction applies title case to firstName and lastName (D-13)
- importCampersAction supports Merge and Replace modes with radio toggle in ImportModal (D-04)
- Row errors use "SwimCode" terminology: "SwimCode is blank", "duplicate SwimCode" (D-05/D-12)
- Blank Bunk triggers "Bunk is blank" row error (D-08)
- All-or-nothing: any row error aborts the entire import before any DB write (both modes)
- CampersPage awaits searchParams Promise; ilike() search on firstName, lastName, code
- SearchBar debounces 300ms; PaginationControls shows Previous/Page X of Y/Next
- ImportModal uses plain HTML form (not next/form); has merge/replace toggle
- sample-roster.xlsx at /public with Last Name, Preferred Name, SwimCode, Bunk headers (D-07)
- npm run build exits 0; npm test exits 0
- CAMP-01 satisfied: admin can upload Excel spreadsheet to bulk-import campers
- CAMP-02 satisfied: codes stored as strings with leading zeros preserved
- CAMP-06 satisfied: admin can search and filter camper list by name or code
</success_criteria>

<output>
Create `.planning/phases/03-admin-data-setup/03-04-SUMMARY.md` when done.
</output>
