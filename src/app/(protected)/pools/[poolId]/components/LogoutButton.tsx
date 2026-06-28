"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className={className ?? "text-sm text-slate-600 hover:text-slate-900"}
    >
      Log out
    </button>
  );
}
