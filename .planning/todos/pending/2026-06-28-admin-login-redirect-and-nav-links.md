---
created: 2026-06-28T00:00:00.000Z
title: Admin login redirect and cross-screen nav links
area: auth
files: []
---

## Problem

When an admin logs in they land on the same screen as counselors instead of going directly to the admin screen. Navigation between the admin area and the main buddy board screen is also missing — admins need a way to get to the buddy board from admin, and a way to get back to admin from the buddy board. Counselors should not see the admin link on the buddy board screen.

## Solution

1. After login, check the user's role and redirect admins to `/admin` and counselors to the buddy board.
2. Add a "Go to Buddy Board" link on the admin screen (visible to all admins).
3. Add an "Admin" link on the buddy board screen that is only rendered when the current user has the admin role.
