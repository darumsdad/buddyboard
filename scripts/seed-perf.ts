/**
 * Seed script for the concurrent-pairs performance test.
 *
 * Run with:  npm run perf:seed
 *
 * Creates:
 *  - A pool named "__perf_test_pool__" (isolated from real pools)
 *  - Reads existing campers from the DB for the test to use
 *  - Writes tests/perf/.perf-state.json (pool ID + camper codes)
 *
 * Does NOT create or modify any camper records.
 * Idempotent: deletes and recreates the perf pool on each run.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import * as schema from "../src/db/schema";

const POOL_NAME = "__perf_test_pool__";

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client, { schema });

  // Remove previous perf pool (cascades → pool_session → pair → pair_member)
  const [existing] = await db
    .select({ id: schema.pool.id })
    .from(schema.pool)
    .where(eq(schema.pool.name, POOL_NAME))
    .limit(1);
  if (existing) {
    await db.delete(schema.pool).where(eq(schema.pool.id, existing.id));
    console.log("Removed previous perf pool.");
  }

  // Create fresh pool
  const poolId = crypto.randomUUID();
  await db.insert(schema.pool).values({ id: poolId, name: POOL_NAME });
  console.log(`Created pool: ${POOL_NAME} (id: ${poolId})`);

  // Read existing campers — ordered by code for deterministic partitioning
  const campers = await db
    .select({ code: schema.camper.code })
    .from(schema.camper)
    .orderBy(schema.camper.code);

  const camperCodes = campers.map((c) => c.code);

  if (camperCodes.length < 6) {
    console.error(`Only ${camperCodes.length} campers found — need at least 6 for a meaningful test.`);
    process.exit(1);
  }

  // How many pairs each worker can add
  const pairsAvailable = Math.floor(camperCodes.length / 2);
  const pairsPerWorker = Math.floor(pairsAvailable / 3);

  const stateDir = join(process.cwd(), "tests", "perf");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    join(stateDir, ".perf-state.json"),
    JSON.stringify({ poolId, camperCodes }, null, 2),
  );

  console.log(`\nFound ${camperCodes.length} campers → ${pairsAvailable} pairs available`);
  console.log(`Each of 3 workers will add ~${pairsPerWorker} pairs`);
  console.log(`State file: tests/perf/.perf-state.json`);
  console.log(`\nNow start the dev server, then:\n  PERF_USERNAME=x PERF_PASSWORD=y npm run perf:test`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
