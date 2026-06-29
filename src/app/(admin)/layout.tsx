import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Toaster } from "sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/pools");
  return (
    <div className="flex min-h-screen">
      <AdminSidebar userName={session.user.name} />
      <div className="flex-1 min-w-0">{children}</div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
