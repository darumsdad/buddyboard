"use client";

type ConnectionBannerProps = {
  status: "connected" | "reconnecting" | "disconnected";
  onRefresh: () => void;
};

export function ConnectionBanner({ status, onRefresh }: ConnectionBannerProps) {
  // Hidden entirely in connected state — no visual noise when all is well
  if (status === "connected") return null;

  if (status === "reconnecting") {
    return (
      <div className="sticky top-[57px] z-10 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
        <svg
          className="animate-spin h-4 w-4 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        <span className="text-sm text-amber-800">Reconnecting…</span>
      </div>
    );
  }

  // disconnected
  return (
    <div className="sticky top-[57px] z-10 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-red-800">⚠ Disconnected — data may be stale.</span>
      <button
        type="button"
        onClick={onRefresh}
        className="min-h-[44px] px-4 text-sm font-semibold text-red-700 hover:text-red-900 transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}
