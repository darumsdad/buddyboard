import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pairMember, camper } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params; // params is a Promise in Next.js 16

  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Group by pairId — mirrors getPairsForSession in page.tsx
  const pairMap = new Map<
    string,
    {
      id: string;
      members: Array<{
        camperId: string;
        firstName: string;
        lastName: string;
        bunk: string;
        code: string;
      }>;
    }
  >();

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

  const pairs = Array.from(pairMap.values());

  return Response.json({ pairs });
}
