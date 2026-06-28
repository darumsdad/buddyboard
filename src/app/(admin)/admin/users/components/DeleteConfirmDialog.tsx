"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { removeUserAction } from "../actions";

type Props = {
  userId: string;
  username: string;
};

export function DeleteConfirmDialog({ userId, username }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    try {
      await removeUserAction(userId);
      setOpen(false);
    } catch {
      setError("Could not remove user. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Delete user"
        className="w-10 h-10 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Remove {username}?
            </h2>
            <p className="text-base text-slate-700 mt-2">
              They will lose access immediately. This cannot be undone.
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
                Keep user
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="min-h-[44px] flex-1 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50"
              >
                Remove user
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
