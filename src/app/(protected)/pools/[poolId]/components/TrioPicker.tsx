"use client";

import { useState } from "react";
import { addPairMemberAction, type CamperSuggestion } from "../actions";
import { CamperField } from "./CamperField";

type Props = {
  pairId: string;
  sessionId: string;
  poolId: string;
  open: boolean;
  onClose: () => void;
};

export function TrioPicker({ pairId, sessionId, poolId, open, onClose }: Props) {
  const [resolved, setResolved] = useState<CamperSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleAdd() {
    if (!resolved) return;
    setLoading(true);
    setError(null);
    try {
      const result = await addPairMemberAction(
        pairId,
        resolved.id,
        sessionId,
        poolId,
      );
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Could not add to pair. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Add a third camper</h2>
        <div className="mt-4">
          <CamperField
            sessionId={sessionId}
            label="Camper"
            onResolved={setResolved}
            error={error}
          />
        </div>
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleAdd}
            disabled={!resolved || loading}
            className="min-h-[44px] w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding…" : "Add to pair"}
          </button>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 text-base font-semibold"
          >
            Keep pair as-is
          </button>
        </div>
      </div>
    </div>
  );
}
