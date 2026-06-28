"use client";

import { useState } from "react";
import { closeSessionAction } from "../actions";

type Props = {
  sessionId: string;
  poolId: string;
  activePairCount: number;
};

export function CloseSessionDialog({ sessionId, poolId, activePairCount }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClose() {
    setLoading(true);
    try {
      await closeSessionAction(sessionId, poolId);
      // redirect happens server-side; component may unmount
    } catch {
      setError("Could not close session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTrigger() {
    // Per D-12: if no active pairs, close immediately without dialog
    if (activePairCount === 0) {
      await handleClose();
    } else {
      setOpen(true);
    }
  }

  return (
    <>
      <button
        onClick={handleTrigger}
        className="min-h-[44px] px-4 border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50"
      >
        Close session
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Close session?</h2>
            <p className="text-base text-slate-700 mt-2">
              {activePairCount} pairs are still in the water. Close anyway? All pair
              data will be archived.
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
                className="min-h-[44px] flex-1 border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50"
              >
                Keep session open
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                className="min-h-[44px] flex-1 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50"
              >
                {loading ? "Closing…" : "Close session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
