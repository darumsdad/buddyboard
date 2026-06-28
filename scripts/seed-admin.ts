/**
 * One-time admin user creation script.
 * Run once after applying the database migration:
 *   npx tsx scripts/seed-admin.ts
 *
 * SECURITY: Change the admin password immediately after first login.
 * This default password is documented and must not remain in production.
 * (T-02-03 mitigation — see PLAN 01-02 threat model)
 */
import { auth } from "../src/lib/auth";

async function seedAdmin() {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: "admin@camp.local", // Required by emailAndPassword plugin even though login uses username
        password: "BuddyBoard2024!", // CHANGE THIS PASSWORD after first login
        name: "Admin",
        username: "admin",
      },
    });

    if (result && "user" in result) {
      console.log("Admin user created successfully:");
      console.log(`  Username: admin`);
      console.log(`  Email:    admin@camp.local`);
      console.log(`  Name:     Admin`);
      console.log("");
      console.log("IMPORTANT: Change the password immediately after first login.");
    } else {
      console.log("Sign-up response:", JSON.stringify(result, null, 2));
    }
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; body?: unknown };

    // User already exists — idempotent behavior (running seed twice is safe)
    if (
      err?.status === 422 ||
      err?.message?.toLowerCase().includes("already") ||
      err?.message?.toLowerCase().includes("exist") ||
      err?.message?.toLowerCase().includes("duplicate")
    ) {
      console.log("Admin user already exists — seed is idempotent, no action needed.");
      process.exit(0);
    }

    console.error("Failed to create admin user:");
    console.error(err?.message ?? error);
    if (err?.body) {
      console.error("Response body:", JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  }

  process.exit(0);
}

seedAdmin();
