import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig } from "drizzle-kit";

// DATABASE_URL_DIRECT (port 5432 direct) is not resolvable in this environment.
// Fall back to session pooler: same host as transaction pooler (DATABASE_URL) but port 5432.
// uselibpqcompat=true makes sslmode=require encrypt without verifying the Supabase cert chain.
function getDbUrl(): string {
  const pooler = process.env.DATABASE_URL;
  if (!pooler) throw new Error("DATABASE_URL not found in .env.local");
  const url = new URL(pooler);
  url.port = "5432";
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("uselibpqcompat", "true");
  return url.toString();
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: getDbUrl(),
  },
});
