# BuddyBoard Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-06-28
**Phases:** 8 (Phases 1–6, including inserted 2.1 and 2.2) | **Plans:** 28 | **Timeline:** 3 days

### What Was Built

- Complete auth foundation: Supabase + Drizzle + Better Auth with admin plugin; username/password login with persistent sessions
- Admin user management: create/remove accounts, reset passwords, first/last names; no developer involvement
- Full camper roster management: Excel import with leading-zero-safe codes, search, pagination, individual CRUD
- Pool configuration: admin-managed pool list, 3 defaults, no code changes required
- Session management: open/close with confirmation, archive on close, DB-enforced duplicate pair prevention
- Real-time multi-device sync: Supabase Realtime dual-table subscription, ConnectionBanner, live counts
- Buddy call screen: high-contrast, large-text, outdoor-optimized with live pair list
- Responsive polish: two-row mobile SessionHeader, full-width submit, Camp Regesh branding, consistent user display

### What Worked

- **Research-first pattern**: Investigating Supabase Realtime specifics upfront (dual-table subscription, removeChannel vs unsubscribe) prevented critical bugs during implementation
- **Wave-based plan structure**: Each phase's wave dependency model kept execution parallelism high while preventing integration issues
- **TDD for client components**: RED/GREEN gates on BuddyCallClient caught assertion bugs immediately (getByText vs getAllByText for duplicate DOM nodes)
- **Inserted decimal phases**: The 2.1/2.2 insertion model let urgent UX changes land cleanly without disrupting the main phase numbering
- **Vercel deployment from Phase 1**: Having a live deployed environment from day one meant real-world verification happened at every phase

### What Was Inefficient

- **REQUIREMENTS.md never stayed in sync**: Checkbox updates and traceability table were not kept current as phases completed — required a bulk cleanup at milestone close
- **ROADMAP.md progress table drifted**: Phase completion dates and plan counts in the progress table got stale; should update immediately after each phase
- **Some Phase 6 work done outside GSD plans**: Commits like "Camp Regesh branding", "check-off checkboxes", "consistent user display" happened outside the formal plan/execute loop — useful but not tracked
- **Pre-existing test failures not addressed**: Admin action tests failing due to DB ECONNREFUSED in test env were deferred repeatedly; now they're technical debt in v1.1

### Patterns Established

- Subscribe to BOTH `pair` (DELETE) AND `pair_member` (INSERT) for Supabase Realtime — cascade-deleted rows don't fire events on the child table
- Always use `supabase.removeChannel(channel)`, never `channel.unsubscribe()` — prevents TooManyChannels on component remount
- `redirect()` in Next.js 16 Server Actions must be outside `try/catch` — it throws internally
- `params` and `searchParams` must be awaited in Next.js 16 before property access
- `revalidatePath` is incompatible with Realtime subscriptions — remove from mutation actions when Realtime handles refresh
- Camper codes are always `text` — never cast to number anywhere in the stack

### Key Lessons

1. **Realtime architecture decisions are load-bearing** — the dual-table subscription pattern (pair DELETE + pair_member INSERT) was the most technically critical decision in the project. Getting it right in research prevented a class of bugs that would have been very hard to diagnose in production.
2. **Deployment environment matters from day one** — Hostinger's lack of WebSocket support would have blocked the entire real-time layer. Catching this in Phase 1 research (before any Realtime code was written) was the right moment.
3. **Keep planning docs in sync as you go** — the bulk REQUIREMENTS.md/ROADMAP.md update at milestone close took time that should have been distributed across phase transitions.
4. **Human verification checkpoints are real plans** — 06-03 was listed as a formal plan but treated as optional; additional polish commits happened outside the GSD loop. Better to fold post-verification polish back into the plan as tasks.

### Cost Observations

- Model mix: primarily Sonnet 4.6 throughout
- Sessions: multiple across 3 days
- Notable: The research phase for Supabase Realtime (phase 05) produced findings that directly shaped the implementation and prevented bugs — high ROI

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 | 28 | First milestone; established all baseline patterns |

### Top Lessons (Verified Across Milestones)

1. Research critical third-party integration specifics before implementation — especially event model edge cases
2. Keep requirements and roadmap docs in sync at each phase transition, not just at milestone close
