import { db } from "@/db";
import { pairMember, camper } from "@/db/schema";
import { eq } from "drizzle-orm";

export type PairMember = {
  camperId: string;
  firstName: string;
  lastName: string;
  bunk: string;
  code: string;
};

export type Pair = {
  id: string;
  members: PairMember[];
};

export async function getPairsForSession(sessionId: string): Promise<Pair[]> {
  const rows = await db
    .select({
      pairId: pairMember.pairId,
      camperId: pairMember.camperId,
      firstName: camper.firstName,
      lastName: camper.lastName,
      bunk: camper.bunk,
      code: camper.code,
    })
    .from(pairMember)
    .innerJoin(camper, eq(pairMember.camperId, camper.id))
    .where(eq(pairMember.sessionId, sessionId));

  // Group by pairId in application code.
  const pairMap = new Map<string, Pair>();

  for (const row of rows) {
    const entry = pairMap.get(row.pairId) ?? { id: row.pairId, members: [] };
    entry.members.push({
      camperId: row.camperId,
      firstName: row.firstName,
      lastName: row.lastName,
      bunk: row.bunk,
      code: row.code,
    });
    pairMap.set(row.pairId, entry);
  }

  return Array.from(pairMap.values());
}
