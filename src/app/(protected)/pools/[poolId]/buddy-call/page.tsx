import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pool, poolSession } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPairsForSession } from "@/lib/pairs";
import { BuddyCallClient } from "./BuddyCallClient";

// Buddy call screen — read-only Server Component.
// Auth is guaranteed by middleware.ts covering all (protected) routes.
// This page does NOT create a session (Pitfall 2 in RESEARCH.md).
export default async function BuddyCallPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params; // params is a Promise in Next.js 16

  // Step 1 — Pool lookup: validates the poolId URL parameter (T-06-01 threat model).
  const authSession = await auth.api.getSession({ headers: await headers() });
  const poolRecord = await db.select().from(pool).where(eq(pool.id, poolId)).limit(1);
  if (!poolRecord[0]) redirect("/pools");

  // Step 2 — Read-only active session query: never create a session here (Pitfall 2).
  const sessions = await db
    .select()
    .from(poolSession)
    .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
    .limit(1);

  // No active session — buddy call requires an active session to be meaningful.
  if (!sessions[0]) redirect(`/pools/${poolId}`);

  const session = sessions[0];

  // Step 3 — Fetch initial pairs for SSR snapshot (zero loading gap on first paint).
  const pairs = await getPairsForSession(session.id);

  // Step 4 — Render the client component with SSR snapshot props.
  return (
    <BuddyCallClient
      initialPairs={pairs}
      sessionId={session.id}
      poolId={poolId}
      poolName={poolRecord[0].name}
      userName={authSession?.user.name}
    />
  );
}
