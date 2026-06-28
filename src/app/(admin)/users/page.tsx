import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { displayRole } from "@/lib/role-display";

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") redirect("/pools");

  const result = await auth.api.listUsers({
    query: { limit: 100, sortBy: "createdAt", sortDirection: "asc" },
    headers: await headers(),
  });
  const users = result?.users ?? [];

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            User Management
          </h1>
          <button
            disabled
            className="min-h-[44px] px-4 bg-blue-600 text-white text-base font-semibold rounded-md opacity-50 cursor-not-allowed"
          >
            Create user
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md overflow-hidden mt-8">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
                  Username
                </th>
                <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
                  Role
                </th>
                <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
                  Created
                </th>
                <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <p className="text-base text-slate-500 px-4 py-8 text-center">
                      No users yet
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="text-base text-slate-900 px-4 py-3">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(user as any).username ?? user.name}
                    </td>
                    <td className="text-base text-slate-900 px-4 py-3">
                      {displayRole(user.role)}
                    </td>
                    <td className="text-base text-slate-900 px-4 py-3">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="text-base text-slate-900 px-4 py-3">
                      {"—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
