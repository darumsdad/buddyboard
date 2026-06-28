"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { editCamperAction } from "../actions";

type Camper = {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  bunk: string;
  notes: string | null;
};

type Props = {
  camper: Camper;
};

export function EditCamperModal({ camper }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await editCamperAction(new FormData(e.currentTarget));
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        setError("That code is already in use. Choose a different code.");
      } else if (msg.includes("Bunk")) {
        setError("Bunk is required.");
      } else {
        setError("Could not save camper. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
        title="Edit camper"
        aria-label="Edit camper"
      >
        <Pencil size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-lg p-8 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 text-center mb-8">
              Edit camper
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={camper.id} />
              <div>
                <label
                  htmlFor="edit-first-name"
                  className="text-base font-semibold text-slate-900"
                >
                  First Name
                </label>
                <input
                  id="edit-first-name"
                  name="first-name"
                  type="text"
                  required
                  defaultValue={camper.firstName}
                  placeholder="Enter first name"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-last-name"
                  className="text-base font-semibold text-slate-900"
                >
                  Last Name
                </label>
                <input
                  id="edit-last-name"
                  name="last-name"
                  type="text"
                  required
                  defaultValue={camper.lastName}
                  placeholder="Enter last name"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-code"
                  className="text-base font-semibold text-slate-900"
                >
                  Code
                </label>
                <input
                  id="edit-code"
                  name="code"
                  type="text"
                  required
                  defaultValue={camper.code}
                  placeholder="Enter SwimCode"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-bunk"
                  className="text-base font-semibold text-slate-900"
                >
                  Bunk
                </label>
                <input
                  id="edit-bunk"
                  name="bunk"
                  type="text"
                  required
                  defaultValue={camper.bunk}
                  placeholder="Enter bunk"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-notes"
                  className="text-base font-semibold text-slate-900"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="edit-notes"
                  name="notes"
                  rows={3}
                  defaultValue={camper.notes ?? ""}
                  placeholder="Optional notes"
                  className="border border-slate-300 rounded-md px-3 py-2 text-base text-slate-900 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                {loading ? "Saving..." : "Save camper"}
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
