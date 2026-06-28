"use client";

import { useActionState, useState } from "react";
import { importCampersAction } from "../actions";
import type { ImportResult } from "../actions";

export function ImportModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ImportResult | null, FormData>(
    importCampersAction,
    null,
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] px-4 border border-slate-300 rounded-md text-base text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
      >
        Import roster
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 text-center mb-6">
              Import roster
            </h2>

            <form action={formAction} className="flex flex-col gap-4">
              {/* D-04: Merge / Replace radio toggle */}
              <fieldset>
                <legend className="text-base font-semibold text-slate-900 mb-2">
                  Import mode
                </legend>
                <div className="flex items-start gap-2 mb-1">
                  <input
                    type="radio"
                    id="mode-merge"
                    name="mode"
                    value="merge"
                    defaultChecked
                    className="mt-1"
                  />
                  <label htmlFor="mode-merge" className="text-base text-slate-700">
                    Merge &mdash; add new SwimCodes, skip existing
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    id="mode-replace"
                    name="mode"
                    value="replace"
                    className="mt-1"
                  />
                  <label htmlFor="mode-replace" className="text-base text-slate-700">
                    Replace &mdash; clear all campers and re-import (cannot be undone)
                  </label>
                </div>
              </fieldset>

              {/* File input */}
              <div>
                <label
                  htmlFor="import-file"
                  className="block text-base font-semibold text-slate-900 mb-1"
                >
                  Roster file
                </label>
                <input
                  id="import-file"
                  type="file"
                  name="file"
                  accept=".xlsx,.xls"
                  className="min-h-[44px] w-full border border-slate-300 rounded-md px-3 text-base text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <a
                  href="/sample-roster.xlsx"
                  download
                  className="mt-1 block text-base text-blue-600 underline-offset-2 hover:underline"
                >
                  Download sample template
                </a>
              </div>

              {/* Error state */}
              {state?.success === false && (
                <div>
                  <p className="mt-2 text-sm text-red-600 font-medium">
                    Import failed &mdash; fix the following issues and try again:
                  </p>
                  <ul
                    role="alert"
                    className="mt-1 text-sm text-red-600 list-disc list-inside space-y-1"
                  >
                    {state.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success state */}
              {state?.success === true && (
                <p className="mt-4 text-sm text-green-700">
                  Imported {state.count} camper{state.count !== 1 ? "s" : ""} successfully.
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Uploading..." : "Upload roster"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
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
