"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CloseSessionDialog } from "./CloseSessionDialog";
import { LogoutButton } from "./LogoutButton";

type SessionHeaderProps = {
  poolName: string;
  swimmerCount: number;
  pairCount: number;
  sessionId: string;
  poolId: string;
};

export function SessionHeader({
  poolName,
  swimmerCount,
  pairCount,
  sessionId,
  poolId,
}: SessionHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      {/* Top row — always single row (mobile and md+) */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xl font-semibold text-slate-900">{poolName}</span>

        {/* Count inline on md+ */}
        <div className="hidden md:block text-center">
          <p className="text-4xl font-semibold text-slate-900 leading-none">
            {swimmerCount} swimmers · {pairCount} pairs
          </p>
          <Link
            href={`/pools/${poolId}/buddy-call`}
            className="inline-flex items-center gap-1 text-base text-slate-600 hover:text-slate-900 min-h-[44px]"
          >
            View all pairs
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="flex items-center">
          <CloseSessionDialog
            sessionId={sessionId}
            poolId={poolId}
            activePairCount={pairCount}
          />
          <LogoutButton className="text-sm text-slate-600 hover:text-slate-900 ml-4" />
        </div>
      </div>

      {/* Count stacked below on mobile */}
      <div className="md:hidden text-center px-4 pb-3">
        <p className="text-4xl font-semibold text-slate-900 leading-none">
          {swimmerCount} swimmers · {pairCount} pairs
        </p>
        <Link
          href={`/pools/${poolId}/buddy-call`}
          className="inline-flex items-center gap-1 text-base text-slate-600 hover:text-slate-900 min-h-[44px]"
        >
          View all pairs
          <ChevronRight size={16} />
        </Link>
      </div>
    </header>
  );
}
