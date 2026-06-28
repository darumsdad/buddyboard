"use client";

import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { removePairAction } from "../actions";
import { TrioPicker } from "./TrioPicker";

type PairMember = {
  camperId: string;
  firstName: string;
  lastName: string;
  bunk: string;
};

type Props = {
  pair: {
    id: string;
    members: PairMember[];
  };
  sessionId: string;
  poolId: string;
};

export function PairRow({ pair, sessionId, poolId }: Props) {
  const [trioPickerOpen, setTrioPickerOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleRemove() {
    setRemoving(true);
    setRemoveError(null);
    try {
      await removePairAction(pair.id, poolId);
      // page re-renders via revalidatePath in the action
    } catch {
      setRemoveError("Could not remove pair. Please try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-base text-slate-900">
          {pair.members
            .map((m) => `${m.firstName} ${m.lastName} · ${m.bunk}`)
            .join(" — ")}
        </span>
        <div className="flex items-center gap-2">
          {pair.members.length < 3 && (
            <button
              type="button"
              onClick={() => setTrioPickerOpen(true)}
              title="Add third camper"
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <UserPlus size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            title="Remove pair"
            className="w-10 h-10 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      {removeError && (
        <p role="alert" className="text-sm text-red-600 mt-1 px-4">
          {removeError}
        </p>
      )}
      <TrioPicker
        open={trioPickerOpen}
        onClose={() => setTrioPickerOpen(false)}
        pairId={pair.id}
        sessionId={sessionId}
        poolId={poolId}
      />
    </>
  );
}
