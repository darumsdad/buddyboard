---
phase: 01-foundation-auth
plan: "04"
subsystem: deployment
tags: [vercel, github, ci-cd, better-auth, production, env-vars]
dependency_graph:
  requires:
    - next.js-16-project-scaffold
    - better-auth-tables-applied
    - admin-user-seeded
    - login-page-ui
    - pools-placeholder-page
    - auth-middleware
  provides:
    - live-vercel-deployment
    - github-auto-deploy
    - production-url
  affects:
    - all-future-deployments
    - counselor-auth-flow-production
tech_stack:
  added:
    - Vercel (hosting, CI/CD — free tier, GitHub integration)
    - GitHub (source control, push-to-deploy trigger)
  patterns:
    - Vercel GitHub integration: push to master triggers automatic production deploy
    - Vercel env vars injected at build and runtime (no secrets in repo)
    - BETTER_AUTH_URL must exactly match the Vercel-assigned production domain
key_files:
  created: []
  modified: []
decisions:
  - "BETTER_AUTH_URL set to https://buddyboard-git-master-darumsdads-projects.vercel.app (exact Vercel domain — mismatching causes silent auth failures)"
  - "Vercel Deployment Protection disabled — it intercepted unauthenticated requests before reaching Next.js middleware, masking the app's own /login redirect (Criterion 4)"
  - "GitHub repo is private — Supabase connection strings are in Vercel env vars, never in the repo"
  - "DATABASE_URL_DIRECT in Vercel set to session-mode pooler (port 5432) per Plan 02 deviation — IPv4 direct connection unavailable without Supabase IPv4 add-on"
metrics:
  duration_minutes: 45
  completed_date: "2026-06-28"
  tasks_completed: 2
  files_created: 0
  files_modified: 0
---

# Phase 01 Plan 04: Deploy Summary

**One-liner:** BuddyBoard deployed to Vercel (https://buddyboard-git-master-darumsdads-projects.vercel.app) with GitHub auto-deploy and all four Phase 1 success criteria verified on the live production URL.

## Tasks Completed

| Task | Name | Type | Outcome |
|------|------|------|---------|
| 1 | Connect GitHub to Vercel and configure env vars | human-action | Done — Vercel project live, 5 env vars set, GitHub push triggers build |
| 2 | Verify all four Phase 1 success criteria on live URL | human-verify | Done — all 4 criteria passed |

## Verification Results

All four ROADMAP Phase 1 success criteria verified on the live production URL:

| Criterion | URL | Result |
|-----------|-----|--------|
| 1. Navigating to app URL shows login page | https://buddyboard-git-master-darumsdads-projects.vercel.app | PASS |
| 2. Login with admin/BuddyBoard2024! reaches /pools | https://buddyboard-git-master-darumsdads-projects.vercel.app/pools | PASS |
| 3. Session survives browser close and reopen | /pools after browser restart | PASS |
| 4. Unauthenticated /pools access redirects to /login | /pools in fresh incognito window | PASS |

Auto-deploy also confirmed: push to master triggers Vercel redeploy within ~30 seconds.

## Deviations from Plan

### User-Resolved Issues

**1. Vercel Deployment Protection intercepted Criterion 4**
- **Found during:** Task 2 (verifying unauthenticated redirect)
- **Issue:** Vercel's built-in Deployment Protection feature intercepted all unauthenticated requests before they reached the Next.js app, presenting a Vercel login page instead of the app's /login redirect. This is a Vercel platform feature, not an app bug.
- **Fix:** Disabled Deployment Protection in Vercel project settings → Deployment Protection → set to "None". After disabling, Criterion 4 passed — unauthenticated /pools correctly redirects to the app's /login page.
- **Impact:** Preview deployments now have no access gate. Acceptable for Phase 1 MVP (per D-14, no CI gate in Phase 1). Phase 2+ can re-enable Deployment Protection selectively or add a CI gate.
- **Files modified:** None (Vercel dashboard setting only)

## Environment Variables Configured in Vercel

| Variable | Environments | Notes |
|----------|--------------|-------|
| DATABASE_URL | Production, Preview, Development | Supabase Transaction pooler port 6543 |
| DATABASE_URL_DIRECT | Production, Preview, Development | Session-mode pooler port 5432 (see Plan 02 deviation) |
| BETTER_AUTH_SECRET | Production, Preview, Development | 32+ char secret matching .env.local |
| BETTER_AUTH_URL | Production only | https://buddyboard-git-master-darumsdads-projects.vercel.app |
| NEXT_PUBLIC_APP_URL | Production only | https://buddyboard-git-master-darumsdads-projects.vercel.app |

## Known Stubs

None. This plan deployed existing code — no new stubs introduced.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model:
- T-04-01 (BETTER_AUTH_URL mismatch): Mitigated — URL set to exact Vercel domain and verified via login test
- T-04-02 (weak secret): Mitigated — 32+ char secret from .env.local used
- T-04-03 (secrets in git): Mitigated — .env.local gitignored; verified before push
- T-04-SC (npm package tampering): Mitigated — package-lock.json committed; Vercel installs pinned versions

| Flag | File | Description |
|------|------|-------------|
| threat_flag: access-control | Vercel dashboard | Deployment Protection is now disabled — preview URLs are publicly accessible with no gate. Acceptable for MVP (no sensitive data in Phase 1 beyond single admin account). Re-evaluate when real camper data is present. |

## Phase 1 Complete

BuddyBoard Phase 1 walking skeleton is fully verified in production:

- Next.js 15 app scaffold with TypeScript, Tailwind, ESLint
- Better Auth v1.6.22 username/password auth with HTTP-only sessions (5-hour idle timeout)
- Supabase PostgreSQL with drizzle-kit-applied Better Auth schema
- Admin user seeded (username: admin)
- Login page with generic error messages
- /pools placeholder with server-side session guard
- Next.js middleware protecting all routes
- Vercel CI/CD: push to master = deployed in ~2 minutes
- GitHub repo: https://github.com/darumsdad/buddyboard (private)
- Production URL: https://buddyboard-git-master-darumsdads-projects.vercel.app

Phase 2 can begin.

## Self-Check: PASSED

No new files were created or modified by this plan — it was a human-action deployment plan.
All verification was performed on the live production URL.
Commit fd133a6 (initial SUMMARY.md): FOUND
