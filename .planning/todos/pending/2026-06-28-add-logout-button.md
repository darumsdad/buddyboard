---
created: 2026-06-28T00:00:00Z
title: Add logout button to BuddyBoard and admin panel
area: ui
files:
  - src/app/(protected)/pools/page.tsx
  - src/app/(admin)/admin/users/page.tsx
  - src/lib/auth-client.ts
---

## Problem

There is no way for users to log out. No logout button exists on the main BuddyBoard screen (/pools) or the admin panel (/admin/users). The better-auth client exposes `authClient.signOut()` but it is not wired up anywhere in the UI.

## Solution

Add a logout button to both screens:
- `/pools` — BuddyBoard main screen (counselor view)
- `/admin/users` — admin panel

On click: call `authClient.signOut()` then redirect to `/login`. The admin panel already has a nav area (top-right, next to "View Buddy Board" link) — add the button there. The pools page will need a similar header treatment.
