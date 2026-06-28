import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Transaction mode pooler (port 6543) — required for Vercel serverless
// prepare: false is REQUIRED for Supabase Transaction mode pooler
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client, { schema });
