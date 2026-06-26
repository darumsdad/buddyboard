# Technology Stack

**Project:** BuddyBoard — Real-time collaborative pool safety tracking
**Researched:** 2026-06-26
**Overall confidence:** HIGH

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15 (App Router) | Full-stack React framework | Standard 2025 choice for TypeScript web apps; App Router enables co-located server components and Route Handlers; no separate API server needed; excellent Vercel integration |
| React | 19 | UI runtime | Ships with Next.js 15; concurrent features improve responsiveness |
| TypeScript | 5.x | Language | Non-negotiable for a safety-critical app; catches data shape mismatches at compile time |

**Why Next.js over plain React + Express:** A single codebase for frontend and API routes is simpler to deploy and maintain for a team-sized camp app. The App Router pattern fits: server components for initial board render, client components for real-time subscription.

**Why App Router over Pages Router:** App Router is current. Pages Router is legacy. All new Next.js investment targets App Router. The real-time pattern (client component subscribes to Supabase, server component renders initial state) works cleanly with App Router layouts.

---

### UI Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | v4 | Utility-first styling | Released stable January 2025; zero config, faster builds, ships with Next.js 15 scaffolding; essential for rapid iteration |
| shadcn/ui | latest | Accessible component primitives | Not a dependency — components are copied into the codebase; built on Radix UI (WAI-ARIA compliant); works perfectly with Tailwind v4; Dialog, Combobox, Table, and Command components directly useful for this app |

**Why shadcn/ui over a full component library (Chakra, MUI):** shadcn/ui components are owned code. No dependency version conflicts, no design system fighting the buddy-call screen's high-contrast outdoor readability requirement. You control every pixel.

---

### Real-Time Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Realtime | managed | WebSocket-based multi-device sync | The browser client connects directly to Supabase over WebSocket — Vercel's serverless functions are never in the WebSocket loop, so no Vercel connection-lifetime limitation applies |

**Mechanism to use:** `postgres_changes` subscription on the `buddy_pairs` table, filtered by `pool_id`. When a counselor inserts or deletes a pair, Supabase replicates the change to all subscribed clients in real time. No custom WebSocket server needed.

**Why Supabase Realtime over Socket.io:** Socket.io requires a persistent Node.js server, which forces you off Vercel (or into a separate long-running process). Supabase Realtime's architecture handles the persistent connection entirely on Supabase's Elixir/Phoenix cluster, which is built for this. The BuddyBoard will have at most ~9 concurrent counselors across 3 pools — Supabase free tier handles 200 concurrent connections.

**Why `postgres_changes` over Broadcast for this app:** Buddy pair data is durable state that must be persisted and read back on page load. `postgres_changes` guarantees that every subscribed client sees the database truth. Broadcast is ephemeral (fire-and-forget) and would require separate DB write logic. For BuddyBoard's append-and-delete pair model, `postgres_changes` is the correct primitive.

**Presence (optional):** Supabase Presence can show which counselors are currently connected to a pool channel. Useful but not required for v1.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase PostgreSQL | managed | Primary data store | PostgreSQL is required by Supabase Realtime (it uses logical replication to detect changes); co-locating the DB with Realtime on Supabase eliminates cross-service latency; managed removes ops burden |
| Drizzle ORM | latest | Query builder / schema management | TypeScript-native, SQL-transparent, ~57KB bundle, sub-100ms serverless cold starts; no Rust binary; significantly leaner than Prisma for Next.js Route Handlers running on Vercel serverless |

**Why Drizzle over Prisma:** Prisma's Rust query engine was removed in Prisma 7 (late 2025) but Drizzle still wins on bundle size and cold start for serverless. For a camp app with small schema (users, campers, pools, sessions, buddy_pairs), Drizzle's SQL-adjacent API is easy to reason about. Migrations via `drizzle-kit` are straightforward.

**Why PostgreSQL over SQLite:** Supabase Realtime requires PostgreSQL logical replication. SQLite has no managed Realtime equivalent. Decision is locked by the real-time requirement.

**Why not Firebase/Firestore:** NoSQL is poorly suited for the relational data model here (campers, sessions, buddy pairs have clear foreign keys). Firebase Auth also lacks username-only flows. Vendor lock-in is higher.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Better Auth | v1.x | Session-based auth with username+password | Explicit username plugin; no email required; database sessions (not JWT-only); admin-controlled password reset; actively maintained (v1.6.11 as of research date) |

**Configuration:** Use `emailAndPassword: { enabled: true }` as the transport mechanism but enable the `username()` plugin so sign-in accepts username instead of email. Better Auth stores its tables in the same Supabase PostgreSQL instance managed by Drizzle's schema.

**Why not Supabase Auth:** Supabase Auth is designed around email/magic-link/OAuth flows. The username-only requirement means faking emails (e.g., `username@internal`) — a hacky workaround that breaks the admin password reset story. Better Auth is purpose-built for this pattern.

**Why not NextAuth (Auth.js):** The Credentials provider in Auth.js explicitly discourages username/password and only supports JWT sessions (no database sessions with credentials). Auth.js is the wrong fit for an app that needs server-side session management and admin-controlled password reset.

**Why not Lucia Auth:** Lucia entered maintenance mode in early 2025. The author has publicly deprecated it and recommends alternatives. Do not start a new project on Lucia.

**Admin password reset flow:** Better Auth exposes an admin plugin that allows server-side `updateUserPassword(userId, newPassword)` — no email flow required. An admin Route Handler calls this after verifying the requesting user has admin role.

---

### Excel Import

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SheetJS (xlsx) | latest | Parse uploaded Excel roster files | Most widely used (~7.8M weekly downloads vs ExcelJS's ~1.9M); reads .xlsx, .xls, .ods, .csv in one library; runs server-side in a Next.js Route Handler; camp rosters will be hundreds of rows, never approaching the 100K+ rows where ExcelJS's memory advantage matters |

**Pattern:** Admin uploads file via form, Route Handler receives the `File`, passes the `ArrayBuffer` to `XLSX.read()`, iterates the sheet rows, validates columns, upserts camper records. No streaming needed at camp scale.

---

### Hosting / Deployment

| Layer | Platform | Why |
|-------|----------|-----|
| Next.js app | Vercel | Optimal Next.js host (built by same team); automatic preview deployments; no WebSocket limitation applies because the WebSocket connection runs browser → Supabase directly, never through Vercel |
| PostgreSQL + Realtime | Supabase (managed) | Free tier: 500MB DB, 200 concurrent Realtime connections — sufficient for 3 pools of counselors; upgrade path is one click |

**Environment variables:** `DATABASE_URL` (Supabase connection string), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, for admin operations and Better Auth), `BETTER_AUTH_SECRET`.

**Why not Railway or Fly.io:** Those platforms are needed when you run a persistent WebSocket server yourself (Socket.io). This stack offloads WebSocket infrastructure to Supabase, so the Next.js deployment can be purely serverless on Vercel. No reason to add ops complexity.

---

## What NOT to Use and Why

| Technology | Reason to Avoid |
|------------|----------------|
| **Socket.io** | Requires a persistent Node.js server process; incompatible with Vercel serverless; forces a separate deployment on Railway/Fly.io; overkill when Supabase Realtime solves the same problem without infrastructure |
| **Polling** | Explicitly excluded by project requirements; stale data is a safety risk |
| **Supabase Auth** | Username-only auth requires faking emails, which breaks the admin password reset story and adds confusion |
| **Lucia Auth** | Deprecated as of early 2025; maintenance mode only |
| **NextAuth/Auth.js Credentials** | JWT-only sessions with credentials provider; actively discourages password auth; cannot do database sessions with username/password |
| **Prisma** | Heavier than Drizzle for serverless; no strong advantage over Drizzle for this schema size; cold start penalty on Vercel functions |
| **Firebase/Firestore** | NoSQL is wrong shape for relational buddy-pair data; Realtime Database requires full denormalization; Auth lacks username-only flows |
| **Server-Sent Events (SSE)** | One-way (server → client only); counselors need to write data, not just receive it; requires extra complexity vs Supabase's bidirectional WebSocket |
| **ExcelJS** | Only worth it for 100K+ rows or rich formatting generation; more setup than SheetJS for a simple read-and-import use case |
| **SvelteKit / Vue / Remix** | Viable frameworks but the Next.js + Supabase combination has the deepest documentation, most community examples for this exact stack, and Vercel as the default deploy target |

---

## Installation

```bash
# Scaffold
npx create-next-app@latest buddyboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Database + Realtime client
npm install @supabase/supabase-js

# ORM
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Auth
npm install better-auth

# Excel import
npm install xlsx

# UI components (via shadcn CLI — copies components into codebase)
npx shadcn@latest init
npx shadcn@latest add button input table dialog command combobox
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Next.js 15 + App Router | HIGH | Official docs, Context7 verified, dominant pattern in 2025 |
| Tailwind CSS v4 | HIGH | Stable release January 2025, official Next.js guide updated |
| shadcn/ui | HIGH | Context7 verified, actively maintained, no breaking changes |
| Supabase Realtime (`postgres_changes`) | HIGH | Official docs confirm browser-direct WebSocket pattern; Supabase GitHub confirms Elixir/Phoenix architecture |
| Drizzle ORM | HIGH | Context7 verified, multiple comparison sources agree on serverless advantage |
| Better Auth (username plugin) | HIGH | Context7 retrieved actual source code for `username()` plugin; `signIn.username` API confirmed |
| SheetJS | MEDIUM | Download counts and comparisons from multiple sources; no Context7 docs but library is stable and widely used |
| Vercel deployment (no WebSocket issue) | HIGH | Confirmed: WebSocket runs browser → Supabase, not through Vercel |

---

## Sources

- [Supabase Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts)
- [Supabase Realtime Broadcast from Database (April 2025)](https://supabase.com/blog/realtime-broadcast-from-database)
- [Better Auth username plugin (Context7 / GitHub)](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/username.mdx)
- [Better Auth vs Lucia vs NextAuth 2026 — BuildPilot](https://trybuildpilot.com/625-better-auth-vs-lucia-vs-nextauth-2026)
- [Node.js Authentication: Lucia to Better Auth migration](https://www.nodejs-security.com/blog/nodejs-authentication-migration-from-lucia-to-better-auth)
- [Vercel WebSocket limitations — Knowledge Base](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections)
- [WebSockets on Vercel — Ably analysis](https://ably.com/topic/ai-stack/websockets-on-vercel-why-serverless-functions-cant-host-them)
- [Drizzle vs Prisma 2026 — Makerkit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [SheetJS vs ExcelJS vs node-xlsx 2026 — PkgPulse](https://www.pkgpulse.com/guides/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026)
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Railway vs Fly.io comparison — Railway docs](https://docs.railway.com/platform/compare-to-fly)
- [Real-Time Collaborative Apps with Next.js and Supabase — Newline](https://www.newline.co/courses/real-time-collaborative-apps-with-nextjs-and-supabase)
