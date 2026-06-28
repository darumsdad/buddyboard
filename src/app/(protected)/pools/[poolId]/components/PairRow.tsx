"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { removePairAction } from "../actions";

type PairMember = {
  camperId: string;
  firstName: string;
  lastName: string;
  bunk: string;
  code: string;
};

type Props = {
  pair: {
    id: string;
    members: PairMember[];
  };
  sessionId: string;
  poolId: string;
  onRemoved: () => void;
};

export function PairRow({ pair, poolId, onRemoved }: Props) {
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleRemove() {
    setRemoving(true);
    setRemoveError(null);
    try {
      await removePairAction(pair.id, poolId);
      onRemoved();
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
            .map((m) => `${m.code} — ${m.firstName} ${m.lastName}`)
            .join("  ·  ")}
        </span>
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
      {removeError && (
        <p role="alert" className="text-sm text-red-600 mt-1 px-4">
          {removeError}
        </p>
      )}
    </>
  );
}
