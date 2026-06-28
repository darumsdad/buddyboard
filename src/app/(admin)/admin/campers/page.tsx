import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { camper } from "@/db/schema";
import { CamperTable } from "./components/CamperTable";
import { AddCamperModal } from "./components/AddCamperModal";
import { ClearAllCampersDialog } from "./components/ClearAllCampersDialog";

export default async function CampersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/pools");

  const campers = await db
    .select()
    .from(camper)
    .orderBy(desc(camper.createdAt));

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
        <CamperTable campers={campers} />
      </div>
    </main>
  );
}
