import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { username, admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? `https://${process.env.VERCEL_URL}`,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: {
    additionalFields: {
      firstName: { type: "string", required: false, fieldName: "firstName" },
      lastName: { type: "string", required: false, fieldName: "lastName" },
    },
  },
  plugins: [username(), admin()],
  session: {
    expiresIn: 60 * 60 * 5, // 5-hour idle window (D-05)
    updateAge: 60 * 30, // Reset clock every 30 min of activity (prevents unexpected logouts per Pitfall 7)
  },
});

export type Session = typeof auth.$Infer.Session;
