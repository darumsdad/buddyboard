# Phase 1: Foundation & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 1-Foundation & Auth
**Areas discussed:** Frontend framework, Session behavior, Login page, CI/CD & deployment

---

## Frontend Framework

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js (App Router) | Full-stack React, file-based routing, API routes built in. Most natural fit for Supabase + Better Auth + Drizzle. | ✓ |
| Vite + React (SPA) | Lighter, no server component complexity. Needs a separate API layer for auth and DB. | |
| Remix | Server-first React with nested routing. Less common with Better Auth. | |

**User's choice:** Next.js (App Router)
**Notes:** No hesitation. Clear first choice.

| Option | Description | Selected |
|--------|-------------|----------|
| Strict TypeScript + ESLint + Prettier | tsconfig strict mode, ESLint recommended rules, Prettier formatting. | ✓ |
| Default TypeScript (non-strict) | Less initial friction, misses null checks and implicit any. | |
| You decide | Claude picks strict + ESLint + Prettier. | |

**User's choice:** Strict TypeScript + ESLint + Prettier

| Option | Description | Selected |
|--------|-------------|----------|
| src/db/ inside Next.js app | Schema and migrations co-located. Single repo, single package.json. | ✓ |
| packages/db/ monorepo | Separate package. More overhead, only worth it for multi-app setups. | |
| You decide | Claude picks src/db/. | |

**User's choice:** src/db/ inside the Next.js app

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind CSS | Utility-first, fast iteration, excellent for iPad-first responsive design. | ✓ |
| CSS Modules | Scoped CSS per component. More traditional. | |
| shadcn/ui + Tailwind | Pre-built accessible components on top of Tailwind. Can add later. | |

**User's choice:** Tailwind CSS

---

## Session Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| 30 days (rolling) | Effectively stays logged in all summer. | |
| 7 days (rolling) | More conservative — weekly re-login. | |
| Until logout (no expiry) | Never expires except on explicit logout. | |
| 5 hours (user suggestion) | User raised shared device concern and suggested 5 hours. | ✓ |

**User's choice:** 5-hour idle timeout
**Notes:** User flagged that devices are shared camp iPads and laptops — not personal devices. This changed the calculus from "keep counselors logged in all summer" to "clear idle sessions after a shift."

| Option | Description | Selected |
|--------|-------------|----------|
| Idle timeout (resets on activity) | Clock resets on use. Expires after 5 hours of inactivity. | ✓ (Claude) |
| Absolute timeout (from login) | Expires 5 hours after login regardless of activity. | |
| You decide | Claude picks idle timeout. | |

**User's choice:** You decide → Claude picked idle timeout (avoids mid-shift interruptions)

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP-only cookie | Server-set, JS cannot read. Better Auth default. Protects against XSS. | ✓ |
| localStorage + cookie | Also accessible to JS. Not needed here. | |
| You decide | Claude picks HTTP-only cookie. | |

**User's choice:** HTTP-only cookie

| Option | Description | Selected |
|--------|-------------|----------|
| No "Remember me" checkbox — always persist | Session always survives restarts up to idle limit. Simpler UX. | ✓ |
| Add "Remember me" checkbox | More control, adds friction to login. | |

**User's choice:** No checkbox — always persist

**Follow-up:** User briefly suggested logging everyone out when a pool session closes. After discussion, deferred — not needed for v1.

| Option | Description | Selected |
|--------|-------------|----------|
| All counselors at that pool | Server-side session revocation on pool close. | |
| Only the counselor who closed | Others stay logged in. | |
| Nobody — just end the pool session | Auth unaffected by pool session lifecycle. | ✓ (deferred) |

**User's choice:** Deferred — not needed

---

## Login Page

| Option | Description | Selected |
|--------|-------------|----------|
| App name + username/password form | "BuddyBoard" heading, username/password, Login button. | ✓ |
| Camp branding + login form | Camp name/logo at top. Requires knowing camp name now. | |
| Just the form | Ultra-minimal, no heading. | |

**User's choice:** App name + form

| Option | Description | Selected |
|--------|-------------|----------|
| Generic error: "Invalid username or password" | Same message for wrong username or wrong password. | ✓ (Claude) |
| Specific errors | "User not found" vs "Wrong password". | |
| You decide | Claude picks generic. | |

**User's choice:** You decide → Claude picked generic error (security best practice)

| Option | Description | Selected |
|--------|-------------|----------|
| Pool selection screen | Counselors go straight to choosing a pool. Correct first destination. | ✓ |
| Dashboard / home screen | Generic home with multiple options. Overkill for Phase 1. | |
| You decide | Claude picks pool selection. | |

**User's choice:** Pool selection screen

| Option | Description | Selected |
|--------|-------------|----------|
| List of pool names, click to enter | Simple placeholder. Phase 4 adds session logic on top. | ✓ |
| "You are logged in" placeholder text | Bare confirmation page. | |
| You decide | Claude picks list. | |

**User's choice:** List of pool names

---

## CI/CD & Deployment

**Background:** User asked for tradeoff analysis between Vercel and Hostinger before deciding. Key clarification provided: Supabase Realtime WebSocket runs from Supabase's servers, not the app server — so no VPS is needed for WebSocket support. This eliminated the main reason for choosing Hostinger for Phase 1.

User also confirmed: if prototype is built on Vercel, migration to Hostinger later requires only a deploy pipeline change (GitHub Actions + nginx config) — zero application code changes.

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel | Zero server setup. git push = deployed. Native Next.js host. Migration to Hostinger later is pipeline-only. | ✓ |
| Hostinger VPS | 2-4 hours server setup. Camp already pays for it. DevOps overhead. | |

**User's choice:** Vercel
**Notes:** User was initially unsure but chose Vercel after understanding (a) Supabase handles WebSocket, and (b) moving to Hostinger later is a pipeline swap, not a rewrite.

| Option | Description | Selected |
|--------|-------------|----------|
| Set up CI/CD in Phase 1 | Connect GitHub to Vercel now. Auto-deploy on push to main. PR preview URLs. | ✓ |
| Manual deploy for now | Run vercel CLI when ready. Risk of losing track of what's live. | |

**User's choice:** Set up CI/CD in Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| No CI test gate | No tests yet — nothing to gate. Add lint/type-check step in Phase 2+. | ✓ |
| Set up CI skeleton now | GitHub Actions runs tsc --noEmit and ESLint on every PR. | |

**User's choice:** No CI test gate in Phase 1

---

## Claude's Discretion

- Idle timeout vs absolute timeout for sessions (chose idle — avoids mid-shift interruptions)
- Generic vs specific login error messages (chose generic — security best practice)
- Login form UX details (validation, field order, button style)
- Exact Drizzle schema column names and types (follow Better Auth's recommended schema)
- Next.js project structure conventions (route groups, middleware placement)

## Deferred Ideas

- Force-logout all counselors when a pool session closes — not needed for v1; discussed and withdrawn
- CI lint/type-check gate — Phase 2+ when there's code to validate
- Camp branding on login page — can add if the camp wants their name/logo
