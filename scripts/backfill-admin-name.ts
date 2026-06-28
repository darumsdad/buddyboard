import { config } from "dotenv";

config({ path: ".env.local", override: true });

async function backfillAdminName() {
  const { db } = await import("../src/db/index.js");
  const schema = await import("../src/db/schema.js");
  const { eq } = await import("drizzle-orm");

  const result = await db
    .update(schema.user)
    .set({ firstName: "Camp", lastName: "Admin" })
    .where(eq(schema.user.username, "admin"))
    .returning();

  if (result.length === 0) {
    console.error("Admin user not found — has the seed script been run?");
    process.exit(1);
  }

  console.log("Admin name backfill complete:");
  console.log(result);
  process.exit(0);
}

backfillAdminName();
