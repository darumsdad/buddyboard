"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { poolSession, pair, pairMember, camper } from "@/db/schema";
import { eq, and, or, ilike, notExists, sql } from "drizzle-orm";

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  if ("code" in e) return e.code === "23505";
  return typeof e.message === "string" && e.message.includes("23505");
}

export type CamperSuggestion = {
  id: string;
  firstName: string;
  lastName: string;
  bunk: string;
  code: string;
};

export type AddPairResult =
  | { success: true }
  | { success: false; error: string };

export async function searchCampersAction(
  query: string,
  sessionId: string,
): Promise<CamperSuggestion[]> {
  await requireAuth();

  const q = query.trim();
  if (!q) return [];

  const cols = {
    id: camper.id,
    firstName: camper.firstName,
    lastName: camper.lastName,
    bunk: camper.bunk,
    code: camper.code,
  };

  // "not already paired in this session" via NOT EXISTS — safe when subquery returns 0 rows
  const notAlreadyPaired = notExists(
    db
      .select({ _: sql`1` })
      .from(pairMember)
      .where(and(eq(pairMember.camperId, camper.id), eq(pairMember.sessionId, sessionId))),
  );

  // 1. Exact code match first (fast path for PAIR-01)
  const exact = await db
    .select(cols)
    .from(camper)
    .where(and(eq(camper.code, q), notAlreadyPaired))
    .limit(1);

  if (exact.length > 0) return exact;

  // 2. Fuzzy name / partial code match (PAIR-02)
  return db
    .select(cols)
    .from(camper)
    .where(
      and(
        or(
          ilike(camper.firstName, `%${q}%`),
          ilike(camper.lastName, `%${q}%`),
          ilike(camper.code, `%${q}%`),
        ),
        notAlreadyPaired,
      ),
    )
    .limit(10);
}

export async function addPairAction(
  sessionId: string,
  poolId: string,
  camper1Id: string,
  camper2Id: string,
  camper3Id?: string,
): Promise<AddPairResult> {
  await requireAuth();

  try {
    await db.transaction(async (tx) => {
      const pairId = crypto.randomUUID();
      await tx.insert(pair).values({ id: pairId, sessionId, createdAt: new Date() });
      const members: { pairId: string; camperId: string; sessionId: string }[] = [
        { pairId, camperId: camper1Id, sessionId },
        { pairId, camperId: camper2Id, sessionId },
      ];
      if (camper3Id) members.push({ pairId, camperId: camper3Id, sessionId });
      await tx.insert(pairMember).values(members);
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return { success: false, error: "PAIR-04" };
    }
    return { success: false, error: "Could not add pair. Please try again." };
  }

  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}

export async function addPairMemberAction(
  pairId: string,
  camperId: string,
  sessionId: string,
  poolId: string,
): Promise<AddPairResult> {
  await requireAuth();

  try {
    await db.insert(pairMember).values({ pairId, camperId, sessionId });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return { success: false, error: "PAIR-04" };
    }
    return { success: false, error: "Could not add to pair. Please try again." };
  }

  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}

export async function removePairAction(pairId: string, poolId: string): Promise<void> {
  await requireAuth();
  await db.delete(pair).where(eq(pair.id, pairId));
  revalidatePath(`/pools/${poolId}`);
}

export async function closeSessionAction(sessionId: string, poolId: string): Promise<void> {
  await requireAuth();
  await db
    .update(poolSession)
    .set({ status: "closed", closedAt: new Date() })
    .where(and(eq(poolSession.id, sessionId), eq(poolSession.status, "active")));
  revalidatePath("/pools");
  revalidatePath("/pools/[poolId]", "page");
  redirect("/pools"); // OUTSIDE try/catch — redirect throws internally in Next.js
}
