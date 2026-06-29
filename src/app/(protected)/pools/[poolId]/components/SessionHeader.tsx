"use client";

import Link from "next/link";
import { Users, ChevronLeft } from "lucide-react";
import { CloseSessionDialog } from "./CloseSessionDialog";
import { LogoutButton } from "./LogoutButton";

type SessionHeaderProps = {
  poolName: string;
  swimmerCount: number;
  pairCount: number;
  sessionId: string;
  poolId: string;
  userName?: string;
};

export function SessionHeader({
  poolName,
  swimmerCount,
  pairCount,
  sessionId,
  poolId,
  userName,
}: SessionHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      {/* Top row — always single row (mobile and md+) */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/pools"
            className="flex items-center gap-0.5 text-sm text-slate-500 hover:text-slate-900 min-h-[44px]"
            aria-label="Back to pool list"
          >
            <ChevronLeft size={16} />
            Pools
          </Link>
          <span className="text-xl font-semibold text-slate-900">{poolName}</span>
        </div>

        {/* Count inline on md+ */}
        <div className="hidden md:block text-center">
          <p className="text-4xl font-semibold text-slate-900 leading-none">
            {swimmerCount} swimmers · {pairCount} pairs
          </p>
          <Link
            href={`/pools/${poolId}/buddy-call`}
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-md bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 min-h-[44px]"
          >
            <Users size={18} />
            Buddy Call
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <CloseSessionDialog
            sessionId={sessionId}
            poolId={poolId}
            activePairCount={pairCount}
          />
          <div className="border-l border-slate-200 pl-4">
            <LogoutButton className="text-sm text-slate-600 hover:text-slate-900" userName={userName} />
          </div>
        </div>
      </div>

      {/* Count stacked below on mobile */}
      <div className="md:hidden text-center px-4 pb-3">
        <p className="text-4xl font-semibold text-slate-900 leading-none">
          {swimmerCount} swimmers · {pairCount} pairs
        </p>
        <Link
          href={`/pools/${poolId}/buddy-call`}
          className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-md bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 min-h-[44px]"
        >
          <Users size={18} />
          Buddy Call
        </Link>
      </div>
    </header>
  );
}
