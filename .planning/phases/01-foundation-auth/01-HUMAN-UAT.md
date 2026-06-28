---
status: partial
phase: 01-foundation-auth
source: [01-VERIFICATION.md]
started: 2026-06-28T03:00:00.000Z
updated: 2026-06-28T03:00:00.000Z
---

## Current Test

Awaiting human approval — all items were verified live during Plan 04 execution on 2026-06-28.

## Tests

### 1. Live Supabase DB — tables and admin user exist
expected: Tables user, session, account, verification exist in Supabase public schema; at least 1 row in user table with username = 'admin'
result: [pending]

### 2. SC-1: Login page loads at Vercel URL
expected: https://buddyboard-git-master-darumsdads-projects.vercel.app shows BuddyBoard heading, username/password fields, Log in button
result: [pending]

### 3. SC-2: Login flow works on live URL
expected: admin/BuddyBoard2024! reaches /pools; HttpOnly cookie visible in DevTools
result: [pending]

### 4. SC-3: Session persists across browser restart
expected: /pools loads after closing and reopening all browser windows without re-login
result: [pending]

### 5. SC-4: Unauthenticated /pools redirects to /login
expected: Fresh incognito window navigating to /pools redirects to /login (Vercel Deployment Protection must remain disabled)
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
