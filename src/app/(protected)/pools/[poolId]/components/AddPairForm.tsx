"use client";

import { useState, useRef, useTransition } from "react";
import { addPairAction, type CamperSuggestion } from "../actions";
import { CamperField } from "./CamperField";

type AddPairFormProps = {
  sessionId: string;
  poolId: string;
};

export function AddPairForm({ sessionId, poolId }: AddPairFormProps) {
  const [camper1, setCamper1] = useState<CamperSuggestion | null>(null);
  const [camper2, setCamper2] = useState<CamperSuggestion | null>(null);
  const [pair04Error, setPair04Error] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const camper1Ref = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!camper1 || !camper2) return;

    setPair04Error(null);
    setGenericError(null);

    startTransition(async () => {
      const result = await addPairAction(sessionId, poolId, camper1.id, camper2.id);
      if (result.success) {
        setCamper1(null);
        setCamper2(null);
        setResetKey((k) => k + 1);
      } else if (result.error === "PAIR-04") {
        setPair04Error(
          "One of these campers is already in an active pair in this session. Choose a different camper.",
        );
      } else {
        setGenericError(result.error);
      }
    });
  }

  const isDisabled = isPending || !camper1 || !camper2;

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-md p-4">
      <div className="flex flex-col gap-4 md:flex md:flex-row md:gap-3 md:items-end">
        <CamperField
          key={`camper1-${resetKey}`}
          sessionId={sessionId}
          label="Camper 1"
          onResolved={setCamper1}
          error={null}
          inputRef={camper1Ref}
        />
        <CamperField
          key={`camper2-${resetKey}`}
          sessionId={sessionId}
          label="Camper 2"
          onResolved={setCamper2}
          error={null}
        />
        <button
          type="submit"
          disabled={isDisabled}
          aria-disabled={isDisabled ? "true" : undefined}
          className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {isPending ? "Adding…" : "Add pair"}
        </button>
      </div>
      {pair04Error && (
        <p role="alert" className="text-base text-red-600 mt-2">
          {pair04Error}
        </p>
      )}
      {genericError && (
        <p role="alert" className="text-base text-red-600 mt-2">
          {genericError}
        </p>
      )}
    </form>
  );
}
