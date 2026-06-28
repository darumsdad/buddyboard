import { db } from "../src/db";
import { pool } from "../src/db/schema";

async function seedPools() {
  const existing = await db.select().from(pool).limit(1);
  if (existing.length > 0) {
    console.log("Pools already exist — seed is idempotent, no action needed.");
    process.exit(0);
  }
  await db.insert(pool).values([
    { id: crypto.randomUUID(), name: "Pool 1" },
    { id: crypto.randomUUID(), name: "Pool 2" },
    { id: crypto.randomUUID(), name: "Pool 3" },
  ]);
  console.log("Default pools seeded: Pool 1, Pool 2, Pool 3");
  process.exit(0);
}

seedPools().catch((e) => {
  console.error(e);
  process.exit(1);
});
