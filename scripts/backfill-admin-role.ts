/**
 * One-time backfill script to set the seed admin user's role to 'admin'.
 * Run once after applying the admin plugin schema migration:
 *   npx tsx scripts/backfill-admin-role.ts
 *
 * The admin plugin's init hook sets defaultRole on NEW users only.
 * Existing users (created in Phase 1 before the role column existed) must be
 * backfilled manually. (D-04 mitigation — see Pitfall 4 in RESEARCH.md)
 *
 * Uses dynamic imports to ensure dotenv loads DATABASE_URL before the Drizzle
 * client is initialized (static imports are hoisted; dynamic imports are not).
 */
import { config } from "dotenv";

// Must run before any db module import — dotenv is the only static import needed
config({ path: ".env.local", override: true });

async function backfillAdminRole() {
  // Dynamic imports ensure DATABASE_URL is set before drizzle connects
  const { db } = await import("../src/db/index.js");
  const schema = await import("../src/db/schema.js");
  const { eq } = await import("drizzle-orm");

  const result = await db
    .update(schema.user)
    .set({ role: "admin" })
    .where(eq(schema.user.username, "admin"))
    .returning();

  if (result.length === 0) {
    console.error("Admin user not found — has the seed script been run?");
    process.exit(1);
  }

  console.log("Admin role backfill complete:");
  console.log(result);
  process.exit(0);
}

backfillAdminRole();
