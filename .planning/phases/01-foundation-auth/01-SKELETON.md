# Walking Skeleton — BuddyBoard

**Phase:** 1
**Generated:** 2026-06-27

## Capability Proven End-to-End

A deployed counselor can navigate to the Vercel app URL, log in with a username and password, land on the pool selection screen, and have that session persist after closing and reopening the browser — all backed by a live Supabase PostgreSQL database.

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 16.2.9, App Router, TypeScript strict | Full-stack React, file-based routing, API routes built-in; native fit for Vercel + Better Auth + Drizzle (D-01, D-02) |
| Styling | Tailwind CSS (bundled with create-next-app) | Utility-first, fast iteration, excellent for iPad-first responsive design; no component library overhead (D-03) |
| Data layer | Supabase PostgreSQL + Drizzle ORM 0.45.2 + `postgres` driver 3.4.9 | Cloud DB with built-in Realtime subscriptions (Phase 5); Drizzle gives type-safe schema-as-code; `postgres` driver preferred for Vercel serverless (D-04) |
| Auth | Better Auth 1.6.22, username plugin, Drizzle adapter, HTTP-only cookie | Handles token signing, session refresh, password hashing out of the box; Drizzle-native adapter; username plugin enables camp-staff workflow with no email dependency (D-05, D-06, D-07) |
| Session config | `expiresIn: 18000s` (5h), `updateAge: 1800s` (30min), always-persist | Sliding 5-hour idle window matches shared-iPad camp context; no "Remember Me" checkbox (D-05, D-07) |
| Directory layout | `src/` directory, route groups `(auth)` and `(protected)`, `src/db/`, `src/lib/` | Route groups segment public vs protected routes without affecting URL paths; db and lib are clean separation points for subsequent phases |
| Deployment target | Vercel, GitHub push → auto-deploy, PR preview URLs | Zero server config, native Next.js host; Supabase Realtime uses Supabase's own servers so no VPS is needed for WebSocket in Phase 5 (D-12, D-13) |
| Migration strategy | `drizzle-kit generate` + `drizzle-kit migrate` (file-based, not push) | Maintains schema history; `push` is destructive — never use in production |
| Connection strings | `DATABASE_URL` (Transaction pooler port 6543) for app; `DATABASE_URL_DIRECT` (direct port 5432) for migrations | Transaction mode requires `prepare: false`; migrations require session/direct mode features |

## Stack Touched in Phase 1

- [x] Project scaffold — Next.js 16.2.9, TypeScript strict, Tailwind, ESLint, Prettier, Vitest
- [x] Routing — `/login` (public), `/pools` (protected), `/` (redirect), `/api/auth/[...all]` (Better Auth handler)
- [x] Database — Supabase PostgreSQL: Drizzle schema applied via migration (write: seed admin user insert; read: session lookup on /pools page load)
- [x] UI — Login form (username + password + submit) wired to `authClient.signIn.username()` → POST `/api/auth/sign-in/username` → Supabase sessions table
- [x] Deployment — Vercel production URL live, GitHub `main` branch auto-deploys, PR branches get preview URLs

## Out of Scope (Deferred to Later Slices)

- Admin user management (create/remove/reset passwords) — Phase 2
- Camper roster (import, CRUD) — Phase 3
- Pool configuration management — Phase 3
- Pool sessions and buddy pairs — Phase 4
- Real-time WebSocket board updates — Phase 5
- Buddy call screen and responsive polish — Phase 6
- Email-based password reset — explicitly excluded (admin-controlled reset is sufficient)
- OAuth / third-party login — explicitly excluded
- CI lint/type-check gate — deferred to Phase 2+ per D-14
- Camp branding on login page — deferred per CONTEXT.md Deferred Ideas
- Row Level Security on Supabase — skipped for v1, handled at Next.js middleware layer

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Admin can manage counselor accounts (create, remove, reset password)
- Phase 3: Admin can configure pools and import/manage the full camper roster
- Phase 4: Counselors can run a complete pool session and manage buddy pairs over HTTP
- Phase 5: All devices at a pool see live buddy board updates in real time (Supabase Realtime)
- Phase 6: High-contrast buddy call screen, responsive polish for iPad + iPhone
