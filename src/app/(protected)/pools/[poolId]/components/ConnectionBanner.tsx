"use client";

import { Loader2 } from "lucide-react";

type ConnectionBannerProps = {
  status: "connected" | "reconnecting" | "disconnected";
  onRefresh: () => void;
};

export function ConnectionBanner({ status, onRefresh }: ConnectionBannerProps) {
  if (status === "connected") {
    return null;
  }

  if (status === "reconnecting") {
    return (
      <div
        role="status"
        className="sticky top-[57px] z-9 bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2"
      >
        <Loader2 size={16} className="animate-spin text-slate-600" aria-hidden="true" />
        <span className="text-sm text-slate-600">Reconnecting…</span>
      </div>
    );
  }

  // disconnected
  return (
    <div
      role="status"
      className="sticky top-[57px] z-9 bg-amber-50 border-b border-amber-200 px-4 min-h-[44px] flex items-center justify-between"
    >
      <span className="text-sm text-amber-900">Disconnected — data may be stale.</span>
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh pair list"
        className="text-sm font-semibold text-amber-900 underline min-h-[44px] px-2"
      >
        Refresh
      </button>
    </div>
  );
}
