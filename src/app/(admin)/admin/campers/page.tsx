import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ilike, or, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { camper } from "@/db/schema";
import { CamperTable } from "./components/CamperTable";
import { AddCamperModal } from "./components/AddCamperModal";
import { ClearAllCampersDialog } from "./components/ClearAllCampersDialog";
import { SearchBar } from "./components/SearchBar";
import { PaginationControls } from "./components/PaginationControls";
import { ImportModal } from "./components/ImportModal";

const PAGE_SIZE = 50;

export default async function CampersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/pools");

  // searchParams is a Promise in Next.js 16 — must be awaited (RESEARCH.md Pitfall 3)
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const where = q
    ? or(
        ilike(camper.firstName, `%${q}%`),
        ilike(camper.lastName, `%${q}%`),
        ilike(camper.code, `%${q}%`),
      )
    : undefined;

  const [campers, totalResult] = await Promise.all([
    db
      .select()
      .from(camper)
      .where(where)
      .orderBy(desc(camper.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(camper).where(where),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">Campers</h1>
          <div className="flex items-center gap-3">
            <ClearAllCampersDialog />
            <AddCamperModal />
          </div>
        </div>

        <div className="flex gap-3 mt-6 items-center">
          <div className="flex-1">
            <SearchBar defaultValue={q} />
          </div>
          <ImportModal />
        </div>

        <CamperTable campers={campers} searchQuery={q || undefined} />

        <PaginationControls
          page={pageNum}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </main>
  );
}
