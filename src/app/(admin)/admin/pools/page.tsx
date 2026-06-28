import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pool } from "@/db/schema";
import { PoolList } from "./components/PoolList";
import { AddPoolForm } from "./components/AddPoolForm";

export default async function PoolsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") redirect("/pools");

  const pools = await db.select().from(pool).orderBy(asc(pool.name));

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">Pools</h1>
        </div>
        <PoolList pools={pools} />
        <AddPoolForm />
      </div>
    </main>
  );
}
