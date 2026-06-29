"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  className?: string;
  userName?: string;
};

export function LogoutButton({ className, userName }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <div className="flex items-center gap-2">
      {userName && (
        <span className="text-sm text-slate-500">{userName}</span>
      )}
      <button
        onClick={handleLogout}
        className={className ?? "text-sm text-slate-600 hover:text-slate-900"}
      >
        Log out
      </button>
    </div>
  );
}
