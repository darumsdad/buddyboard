import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { pool, poolSession } from "@/db/schema";
import { LogoutButton } from "./[poolId]/components/LogoutButton";
import { Waves } from "lucide-react";

export default async function PoolsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [pools, activeSessions] = await Promise.all([
    db.select().from(pool).orderBy(pool.name),
    db.select({ poolId: poolSession.poolId }).from(poolSession).where(eq(poolSession.status, "active")),
  ]);

  const activePoolIds = new Set(activeSessions.map((s) => s.poolId));

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-end gap-4 px-4 py-3 border-b border-slate-100">
        {session.user.role === "admin" && (
          <Link href="/admin/users" className="text-sm text-slate-500 hover:text-slate-900">
            Admin
          </Link>
        )}
        <LogoutButton userName={session.user.name} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <Image
          src="/camp-regesh-logo.png"
          alt="Camp Regesh"
          width={320}
          height={160}
          className="object-contain mb-1"
          priority
          unoptimized
        />
        <p className="text-sm font-semibold text-slate-400 tracking-widest uppercase mb-8">
          BuddyBoard
        </p>

        {/* Pool picker card */}
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Waves size={18} className="text-blue-500" />
            <h1 className="text-lg font-semibold text-slate-700">Select a Pool</h1>
            <Waves size={18} className="text-blue-500" />
          </div>

          <div className="flex flex-col gap-3">
            {pools.length === 0 ? (
              <p className="text-base text-slate-500 text-center">
                No pools configured — contact your administrator.
              </p>
            ) : (
              pools.map((p) => {
                const isActive = activePoolIds.has(p.id);
                return (
                  <Link
                    key={p.id}
                    href={`/pools/${p.id}`}
                    className="min-h-[52px] w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold rounded-xl transition-colors duration-150 flex items-center justify-between px-5 shadow-sm"
                  >
                    <span>{p.name}</span>
                    {isActive && (
                      <span className="flex items-center gap-1.5 text-sm font-medium bg-green-500 text-white px-2.5 py-1 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        Live
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
