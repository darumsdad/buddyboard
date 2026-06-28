---
status: partial
phase: 02-admin-user-management
source: [02-VERIFICATION.md]
started: 2026-06-28T00:00:00Z
updated: 2026-06-28T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Full admin walkthrough (9 steps)
expected: Create a "testcounselor" account, reset its password, delete it, confirm deleted user cannot log in, confirm a counselor-role user is redirected from /admin/users to /pools
result: [pending]

### 2. Role display in live browser
expected: "Counselor" (not "user") appears in the Role column in the UserTable after creating a user
result: [pending]

### 3. Seed admin DB state
expected: `npx tsx scripts/backfill-admin-role.ts` exits 0 confirming the seed admin's role='admin' persisted in Supabase
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
