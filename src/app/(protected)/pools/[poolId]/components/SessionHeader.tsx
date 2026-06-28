"use client";

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
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xl font-semibold text-slate-900">{poolName}</span>

        <div className="text-center">
          <p className="text-4xl font-semibold text-slate-900 leading-none">
            {swimmerCount} swimmers · {pairCount} pairs
          </p>
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
    </header>
  );
}
