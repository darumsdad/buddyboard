"use client";

import { useState } from "react";
import { EditPoolModal } from "./EditPoolModal";
import { removePoolAction } from "../actions";

type Pool = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type PoolDeleteDialogProps = {
  poolId: string;
  poolName: string;
};

function PoolDeleteDialog({ poolId, poolName }: PoolDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    try {
      await removePoolAction(poolId);
      setOpen(false);
    } catch {
      setError("Could not remove pool. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-base text-red-600 hover:underline cursor-pointer min-h-[44px] flex items-center"
      >
        Remove
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Remove {poolName}?
            </h2>
            <p className="text-base text-slate-700 mt-2">
              This pool will be permanently removed. Counselors will no longer be able to start sessions in this pool.
            </p>
            {error && (
              <p role="alert" className="text-base text-red-600 mt-2">
                {error}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="min-h-[44px] flex-1 border border-slate-300 rounded-md px-4 text-base text-slate-700 font-semibold hover:bg-slate-50"
              >
                Keep pool
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="min-h-[44px] flex-1 bg-red-600 hover:bg-red-700 text-white rounded-md px-4 text-base font-semibold disabled:opacity-50"
              >
                Remove pool
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PoolList({ pools }: { pools: Pool[] }) {
  if (pools.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900">No pools yet</h2>
        <p className="text-base text-slate-500 mt-2">
          Add a pool to get started. The system needs at least one pool before counselors can run sessions.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white mt-4">
      {pools.map((pool) => (
        <li key={pool.id} className="flex items-center justify-between px-4 py-3">
          <span className="text-base text-slate-900">{pool.name}</span>
          <div className="flex items-center gap-3">
            <EditPoolModal pool={pool} />
            <PoolDeleteDialog poolId={pool.id} poolName={pool.name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
