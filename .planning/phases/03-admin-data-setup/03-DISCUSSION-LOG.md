# Phase 3: Admin Data Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 3-Admin Data Setup
**Areas discussed:** Admin navigation, Excel import behavior, Default pool names, Camper search scope

---

## Admin Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Left sidebar | Persistent vertical nav — Users / Campers / Pools. Conventional admin panel pattern. | ✓ (Claude decided) |
| Horizontal tabs | Tab row at the top of the admin section. Lighter than a sidebar. | |
| Top nav links | Simple text links in the page header. Minimal design. | |

**User's choice:** "You decide — based on convention"
**Notes:** Claude chose left sidebar as the conventional admin panel pattern, consistent with admin tasks being desktop-primary.

---

## Excel Import Behavior

### Replace vs. Append

| Option | Description | Selected |
|--------|-------------|----------|
| Replace entire roster | New upload wipes existing campers and imports fresh. | ✓ |
| Append / merge | Adds new campers, skips or updates existing ones by code. | |

**User's choice:** Replace entire roster
**Notes:** User also requested a "Clear all campers" button for season rollover (e.g., between summers). This was added to phase scope as CRUD addition.

### Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fail all, show row-level errors | Nothing imported until spreadsheet is clean. Admin sees which rows failed. | ✓ |
| Import valid rows, skip bad ones | Partial import — good rows go in, bad rows reported. | |

**User's choice:** Fail all, show row-level errors

### Excel Columns

| Option | Description | Selected |
|--------|-------------|----------|
| First Name, Last Name, Code — 3 columns | Enables typeahead by either name component in Phase 4. | ✓ |
| Full name, Code — 2 columns | Simpler but fragile for Phase 4 typeahead. | |
| You decide | Whatever works best for Phase 4. | |

**User's choice:** First Name, Last Name, Code (3 required columns)
**Notes:** User also requested optional "Bunk" and "Notes" columns — informational only, stored and visible to admins, never shown to counselors or on the buddy board.

---

## Default Pool Names

| Option | Description | Selected |
|--------|-------------|----------|
| Generic names (Pool 1, 2, 3) | Admin renames from the UI before the season. | ✓ |
| Real camp pool names | Use actual camp pool names as defaults. | |

**User's choice:** "Pool 1", "Pool 2", "Pool 3" — don't know actual names yet, admin will rename from the UI.

### Seeding Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| DB migration seed | Drizzle migration inserts 3 defaults if pools table is empty. | ✓ |
| App-level first-run check | App checks on startup and inserts defaults if empty. | |

**User's choice:** DB migration seed — consistent with Phase 1 admin user seed pattern.

---

## Camper Search Scope

### Roster Size

| Option | Description | Selected |
|--------|-------------|----------|
| Under 300 | Client-side filter works great. | |
| 300–1,000 | Client-side viable but worth evaluating. | |
| Over 1,000 | Server-side search with debounce recommended. | ~1,000 (user estimate) |

**User's choice:** ~1,000 campers

### Search Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side search + pagination | Debounced request to server, 50 per page. Scales to 5k+. | ✓ |
| Load all, client-side filter | Load all ~1k at page load, filter in JS. Simpler but slower initial load. | |

**User's choice:** Server-side search + pagination

---

## Claude's Discretion

- Admin sidebar design details (width, active state, icons vs. text-only)
- Debounce timing for search (300ms standard)
- Pagination UI (numbered pages vs. prev/next controls)
- Edit flow for individual campers (modal, consistent with Phase 2 patterns)
- Error display style for Excel row errors

## Deferred Ideas

None — discussion stayed within phase scope.
