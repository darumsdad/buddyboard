"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createPoolAction } from "../actions";

export function AddPoolForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError(null);
    try {
      await createPoolAction(new FormData(form));
      form.reset();
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists")) {
        setError("A pool with that name already exists.");
      } else {
        setError("Could not add pool. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
        title="Add pool"
        aria-label="Add pool"
      >
        <Plus size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 text-center mb-6">
              Add pool
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="pool-name"
                  className="block text-base font-semibold text-slate-900 mb-1"
                >
                  Pool name
                </label>
                <input
                  id="pool-name"
                  name="name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter pool name"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {error && (
                <p role="alert" className="text-base text-red-600">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Adding..." : "Add pool"}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                className="min-h-[44px] w-full border border-slate-300 rounded-md text-base text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
