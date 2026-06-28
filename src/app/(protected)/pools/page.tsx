import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PoolsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 text-center mb-6">
          Select a Pool
        </h1>
        <div className="flex flex-col gap-3">
          {["Main Pool", "Lap Pool", "Kiddie Pool"].map((pool) => (
            <button
              key={pool}
              className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150"
            >
              {pool}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
