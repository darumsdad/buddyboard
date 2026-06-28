"use client";

import { useState, useRef } from "react";
import { Pencil } from "lucide-react";
import { renamePoolAction } from "../actions";

type Props = {
  pool: { id: string; name: string };
};

export function EditPoolModal({ pool }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await renamePoolAction(pool.id, new FormData(e.currentTarget));
      setOpen(false);
    } catch {
      setError("Could not rename pool. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
        title="Rename pool"
        aria-label="Rename pool"
      >
        <Pencil size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 text-center mb-6">
              Rename pool
            </h2>
            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="rename-pool-name"
                  className="text-base font-semibold text-slate-900 block mb-1"
                >
                  Pool name
                </label>
                <input
                  id="rename-pool-name"
                  name="name"
                  type="text"
                  required
                  defaultValue={pool.name}
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
                Save pool
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="text-base text-slate-600 hover:text-slate-900 text-center mt-2 block mx-auto"
              >
                Close
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
