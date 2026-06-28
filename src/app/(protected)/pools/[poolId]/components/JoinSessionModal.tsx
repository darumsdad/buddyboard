"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  poolName: string;
  sessionId: string;
};

const storageKey = (sessionId: string) => `joined-session:${sessionId}`;

export function JoinSessionModal({ poolName, sessionId }: Props) {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && !!sessionStorage.getItem(storageKey(sessionId)),
  );
  const router = useRouter();

  function handleJoin() {
    sessionStorage.setItem(storageKey(sessionId), "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {poolName} — session in progress
        </h2>
        <p className="text-base text-slate-700 mt-2">
          Another counselor has an active session at this pool. Join to see the
          current pairs and add new ones.
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleJoin}
            className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150"
          >
            Join session
          </button>
          <button
            onClick={() => router.push("/pools")}
            className="min-h-[44px] w-full border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
