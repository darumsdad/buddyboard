"use client";

import { CamperDeleteDialog } from "./CamperDeleteDialog";
import { EditCamperModal } from "./EditCamperModal";

type Camper = {
  id: string;
  firstName: string;
  lastName: string;
  code: string;
  bunk: string;
  notes: string | null;
};

type Props = {
  campers: Camper[];
  searchQuery?: string;
};

export function CamperTable({ campers, searchQuery }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden mt-8">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Name
            </th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Code
            </th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Bunk
            </th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Notes
            </th>
            <th className="text-sm font-semibold text-slate-900 px-4 py-3 text-left">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {campers.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="px-4 py-12 text-center">
                  {searchQuery ? (
                    <>
                      <p className="text-base font-semibold text-slate-900 mb-1">
                        No results for &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p className="text-base text-slate-500">
                        Try a different name or code.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-semibold text-slate-900 mb-1">
                        No campers yet
                      </p>
                      <p className="text-base text-slate-500">
                        Upload a spreadsheet or add campers one at a time.
                      </p>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            campers.map((c) => (
              <tr key={c.id}>
                <td className="text-base text-slate-900 px-4 py-3">
                  {c.firstName} {c.lastName}
                </td>
                <td className="text-base text-slate-900 px-4 py-3">
                  {c.code}
                </td>
                <td className="text-base text-slate-900 px-4 py-3">
                  {c.bunk}
                </td>
                <td className="text-base text-slate-900 px-4 py-3">
                  {c.notes
                    ? c.notes.length > 48
                      ? c.notes.slice(0, 48) + "…"
                      : c.notes
                    : "—"}
                </td>
                <td className="text-base text-slate-900 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <EditCamperModal camper={c} />
                    <CamperDeleteDialog
                      camperId={c.id}
                      name={`${c.firstName} ${c.lastName}`}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
