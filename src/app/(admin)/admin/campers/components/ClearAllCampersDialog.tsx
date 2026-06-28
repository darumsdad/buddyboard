"use client";

import { useState } from "react";
import { clearAllCampersAction } from "../actions";

export function ClearAllCampersDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClearAll() {
    setLoading(true);
    setError(null);
    try {
      await clearAllCampersAction();
      setOpen(false);
    } catch {
      setError("Could not clear campers. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] px-4 border border-red-200 rounded-md text-base text-red-600 font-medium hover:bg-red-50 transition-colors"
      >
        Clear all campers
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 text-center mb-4">
              Clear all campers?
            </h2>
            <p className="text-base text-slate-700 text-center">
              This will permanently remove all campers from the roster. This
              cannot be undone.
            </p>
            {error && (
              <p role="alert" className="text-base text-red-600 mt-2 text-center">
                {error}
              </p>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="min-h-[44px] px-4 border border-slate-300 rounded-md text-base text-slate-700 hover:bg-slate-50"
              >
                Keep roster
              </button>
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="min-h-[44px] px-4 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50"
              >
                {loading ? "Clearing..." : "Clear all campers"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
