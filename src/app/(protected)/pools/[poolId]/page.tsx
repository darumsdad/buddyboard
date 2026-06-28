import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolSession, pool } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { LiveBoard } from "./components/LiveBoard";
import { JoinSessionModal } from "./components/JoinSessionModal";
import { getPairsForSession } from "@/lib/pairs";

// -------------------------------------------------------------------
// Private helper: get-or-create the active session for a pool.
// Pattern from RESEARCH.md Pattern 2 — onConflictDoNothing handles
// concurrent session creation races at the DB level.
// -------------------------------------------------------------------
async function getOrCreateActiveSession(
  poolId: string,
  openedById: string,
): Promise<{
  session: typeof poolSession.$inferSelect;
  wasJustCreated: boolean;
}> {
  // 1. Check for an existing active session first.
  const existing = await db
    .select()
    .from(poolSession)
    .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
    .limit(1);

  if (existing.length > 0) {
    return { session: existing[0], wasJustCreated: false };
  }

  // 2. Try to insert a new session. onConflictDoNothing handles the race
  //    condition where two concurrent requests arrive simultaneously.
  const [created] = (await db
    .insert(poolSession)
    .values({
      id: crypto.randomUUID(),
      poolId,
      status: "active",
      openedById,
      openedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning()) ?? [];

  if (created) {
    return { session: created, wasJustCreated: true };
  }

  // 3. Race condition path: another request won the insert race.
  //    Re-fetch the session that the concurrent request created.
  const afterRace = await db
    .select()
    .from(poolSession)
    .where(and(eq(poolSession.poolId, poolId), eq(poolSession.status, "active")))
    .limit(1);

  return { session: afterRace[0], wasJustCreated: false };
}

// -------------------------------------------------------------------
// Page: params is a Promise in Next.js 16 (Pitfall 5 in RESEARCH.md)
// -------------------------------------------------------------------
export default async function PoolSessionPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;

  // Step 1 — Auth check.
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) redirect("/login");

  // Step 2 — Pool lookup: validates the poolId URL parameter (T-04-14).
  const poolRecord = await db
    .select()
    .from(pool)
    .where(eq(pool.id, poolId))
    .limit(1);

  if (!poolRecord[0]) redirect("/pools");

  // Step 3 — Get or create the active session (T-04-16 — race handled by onConflictDoNothing).
  const { session, wasJustCreated } = await getOrCreateActiveSession(
    poolId,
    authSession.user.id,
  );

  // Step 4 — Fetch pairs for the session.
  const pairs = await getPairsForSession(session.id);

  // Step 5 — Render.
  // JoinSessionModal overlays the board when a session pre-existed this page load.
  const sessionOpenedByOtherUser =
    !wasJustCreated && session.openedById !== authSession.user.id;

  return (
    <>
      {sessionOpenedByOtherUser && <JoinSessionModal poolName={poolRecord[0].name} sessionId={session.id} />}
      <LiveBoard
        initialPairs={pairs}
        sessionId={session.id}
        poolId={poolId}
        poolName={poolRecord[0].name}
      />
    </>
  );
}
