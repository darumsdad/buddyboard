import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { CreateUserModal } from "./components/CreateUserModal";
import { UserTable } from "./components/UserTable";

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") redirect("/pools");

  const rows = await db
    .select({
      id: userTable.id,
      username: userTable.username,
      name: userTable.name,
      role: userTable.role,
      createdAt: userTable.createdAt,
      firstName: userTable.firstName,
      lastName: userTable.lastName,
    })
    .from(userTable)
    .orderBy(asc(userTable.createdAt));

  const users = rows.map((u) => ({
    ...u,
    createdAt: u.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            User Management
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/pools" className="text-sm text-slate-600 hover:text-slate-900">View Buddy Board</Link>
            <CreateUserModal />
          </div>
        </div>
        <UserTable users={users} />
      </div>
    </main>
  );
}
