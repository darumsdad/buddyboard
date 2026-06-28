import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CreateUserModal } from "./components/CreateUserModal";
import { UserTable } from "./components/UserTable";

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") redirect("/pools");

  const result = await auth.api.listUsers({
    query: { limit: 100, sortBy: "createdAt", sortDirection: "asc" },
    headers: await headers(),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = (result?.users ?? []) as any as Array<{
    id: string;
    username: string | null;
    name: string;
    role: string | null;
    createdAt: Date;
  }>;

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            User Management
          </h1>
          <CreateUserModal />
        </div>
        <UserTable users={users} />
      </div>
    </main>
  );
}
