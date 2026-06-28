"use client";

import { useState, useRef, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addPairAction, type CamperSuggestion } from "../actions";
import { CamperField } from "./CamperField";

type AddPairFormProps = {
  sessionId: string;
  poolId: string;
};

export function AddPairForm({ sessionId, poolId }: AddPairFormProps) {
  const [camper1, setCamper1] = useState<CamperSuggestion | null>(null);
  const [camper2, setCamper2] = useState<CamperSuggestion | null>(null);
  const [camper3, setCamper3] = useState<CamperSuggestion | null>(null);
  const [showCamper3, setShowCamper3] = useState(false);
  const [pair04Error, setPair04Error] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const camper1Ref = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleDismissCamper3() {
    setShowCamper3(false);
    setCamper3(null);
    setResetKey((k) => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!camper1 || !camper2) return;

    setPair04Error(null);
    setGenericError(null);

    startTransition(async () => {
      const result = await addPairAction(
        sessionId,
        poolId,
        camper1.id,
        camper2.id,
        camper3?.id,
      );
      if (result.success) {
        setCamper1(null);
        setCamper2(null);
        setCamper3(null);
        setShowCamper3(false);
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
  const isTrio = Boolean(camper3);

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-md p-4">
      <div className="flex flex-col gap-4 md:flex md:flex-row md:gap-3 md:items-end">
        <div className="md:w-72">
          <CamperField
            key={`camper1-${resetKey}`}
            sessionId={sessionId}
            label="Camper 1"
            onResolved={setCamper1}
            error={null}
            inputRef={camper1Ref}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 md:w-72">
            <CamperField
              key={`camper2-${resetKey}`}
              sessionId={sessionId}
              label="Camper 2"
              onResolved={setCamper2}
              error={null}
            />
          </div>
          {!showCamper3 && (
            <button
              type="button"
              onClick={() => setShowCamper3(true)}
              title="Add third camper"
              className="mb-0.5 w-10 h-[44px] flex items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors flex-shrink-0"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        {showCamper3 && (
          <div className="md:w-72">
            <CamperField
              key={`camper3-${resetKey}`}
              sessionId={sessionId}
              label="Camper 3"
              onResolved={setCamper3}
              error={null}
              labelSuffix={
                <button
                  type="button"
                  onClick={handleDismissCamper3}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Remove third camper"
                >
                  <X size={14} />
                </button>
              }
            />
          </div>
        )}
        <button
          type="submit"
          disabled={isDisabled}
          aria-disabled={isDisabled ? "true" : undefined}
          className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {isPending ? "Adding…" : isTrio ? "Add trio" : "Add pair"}
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
