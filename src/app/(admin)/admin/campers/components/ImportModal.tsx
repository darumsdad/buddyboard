"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { importCampersAction } from "../actions";
import type { ImportResult } from "../actions";

export function ImportModal({ size = 20 }: { size?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
        title="Import roster"
        aria-label="Import roster"
      >
        <Upload size={size} />
      </button>

      {open && <ImportForm onClose={() => setOpen(false)} />}
    </>
  );
}

function ImportForm({ onClose }: { onClose: () => void }) {
  const [errorsDismissed, setErrorsDismissed] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState<ImportResult | null, FormData>(
    importCampersAction,
    null,
  );

  useEffect(() => {
    if (state?.success === true) {
      onClose();
      toast.success(`${state.count} camper${state.count !== 1 ? "s" : ""} imported`);
    }
  }, [state, onClose]);

  const showErrors = state?.success === false && !errorsDismissed;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 text-center mb-6">
          Import roster
        </h2>

        <form action={formAction} className="flex flex-col gap-4">
          <fieldset>
            <legend className="text-base font-semibold text-slate-900 mb-2">
              Mode
            </legend>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-base text-slate-700 cursor-pointer">
                <input type="radio" name="mode" value="merge" defaultChecked />
                Merge
              </label>
              <label className="flex items-center gap-2 text-base text-slate-700 cursor-pointer">
                <input type="radio" name="mode" value="replace" />
                Replace
              </label>
            </div>
          </fieldset>

          <div>
            <input
              ref={fileInputRef}
              id="import-file"
              type="file"
              name="file"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] w-full flex items-center gap-2 px-4 border border-slate-300 rounded-md text-base text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Paperclip size={16} className="text-slate-400 shrink-0" />
              <span className="truncate">
                {fileName ?? "Choose file…"}
              </span>
            </button>
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
                  className="text-red-400 hover:text-red-600 text-xl leading-none shrink-0"
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
            {isPending ? "Uploading…" : "Upload"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full border border-slate-300 rounded-md text-base text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
