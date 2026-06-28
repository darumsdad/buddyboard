"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { importCampersAction } from "../actions";
import type { ImportResult } from "../actions";

export function ImportModal() {
  const [open, setOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [errorsDismissed, setErrorsDismissed] = useState(false);
  const [state, formAction, isPending] = useActionState<ImportResult | null, FormData>(
    importCampersAction,
    null,
  );
  const handledKey = useRef<number | null>(null);

  useEffect(() => {
    if (state?.success === true && handledKey.current !== modalKey) {
      handledKey.current = modalKey;
      setOpen(false);
      toast.success(
        `${state.count} camper${state.count !== 1 ? "s" : ""} imported`,
      );
    }
  }, [state, modalKey]);

  function handleOpen() {
    setModalKey((k) => {
      const next = k + 1;
      handledKey.current = next; // pre-mark so stale success state doesn't auto-close
      return next;
    });
    setErrorsDismissed(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setErrorsDismissed(false);
  }

  const showErrors = state?.success === false && !errorsDismissed;

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
        title="Import roster"
        aria-label="Import roster"
      >
        <Upload size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-slate-900 text-center mb-6">
              Import roster
            </h2>

            <form key={modalKey} action={formAction} className="flex flex-col gap-4">
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

              <div>
                <label
                  htmlFor="import-file"
                  className="block text-base font-semibold text-slate-900 mb-1"
                >
                  Roster file (.xlsx)
                </label>
                <input
                  id="import-file"
                  type="file"
                  name="file"
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

              {showErrors && state.success === false && (
                <div className="border border-red-200 rounded-md bg-red-50 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm text-red-700 font-medium">
                      {state.errors.length} issue{state.errors.length !== 1 ? "s" : ""} found &mdash; fix and re-upload
                    </p>
                    <button
                      type="button"
                      onClick={() => setErrorsDismissed(true)}
                      className="text-red-400 hover:text-red-600 text-xl leading-none flex-shrink-0"
                      aria-label="Dismiss errors"
                    >
                      &times;
                    </button>
                  </div>
                  <ul
                    role="alert"
                    className="text-sm text-red-700 list-disc list-inside space-y-1 max-h-40 overflow-y-auto"
                  >
                    {state.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                onClick={() => setErrorsDismissed(false)}
                className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Uploading..." : "Upload roster"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] w-full border border-slate-300 rounded-md text-base text-slate-700 font-medium hover:bg-slate-50 transition-colors"
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
