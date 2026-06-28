"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { ConnectionBanner } from "../components/ConnectionBanner";
import type { Pair } from "@/lib/pairs";

type BuddyCallClientProps = {
  initialPairs: Pair[];
  sessionId: string;
  poolId: string;
  poolName: string;
};

export function BuddyCallClient({
  initialPairs,
  sessionId,
  poolId,
  poolName,
}: BuddyCallClientProps) {
  const [pairs, setPairs] = useState<Pair[]>(initialPairs);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "reconnecting" | "disconnected"
  >("connected");

  // Re-fetch from the auth-gated Route Handler on every Realtime event
  const refreshPairs = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}/pairs`);
    if (res.ok) {
      const data = await res.json();
      setPairs(data.pairs);
    }
  }, [sessionId]);

  // 150ms debounce collapses pair INSERT bursts into one refetch (mirrors LiveBoard)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refreshPairs, 150);
  }, [refreshPairs]);

  // Disconnect detection via window offline/online — fires immediately on network drop.
  useEffect(() => {
    const handleOffline = () => setConnectionStatus("disconnected");
    const handleOnline = () => {
      setConnectionStatus("connected");
      refreshPairs();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [refreshPairs]);

  // Realtime subscription — channel name distinct from LiveBoard (Pitfall 1: RESEARCH.md)
  useEffect(() => {
    const channel = supabase
      .channel(`buddy-call:${sessionId}:pairs`)
      // INSERT on pair_member signals a new pair registration — filter by session_id
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pair_member",
          filter: `session_id=eq.${sessionId}`,
        },
        debouncedRefresh,
      )
      // DELETE on pair — no session_id column on pair table; Route Handler refetch is session-scoped
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "pair" },
        debouncedRefresh,
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionStatus("disconnected");
        }
        if (err) console.error("[BuddyCall Realtime]", err);
      });

    // MUST use removeChannel (not channel.unsubscribe()) to prevent TooManyChannels / Strict-Mode channel leak
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [sessionId, debouncedRefresh]);

  // Derived counts — updated on every pairs state change
  const swimmerCount = pairs.reduce((sum, p) => sum + p.members.length, 0);
  const pairCount = pairs.length;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Compact sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="flex items-center px-4 py-3">
          <a
            href={`/pools/${poolId}`}
            aria-label={`Back to session board for ${poolName}`}
            className="flex items-center gap-1 text-base text-slate-600 hover:text-slate-900 min-h-[44px]"
          >
            <ChevronLeft size={18} />
            Back to board
          </a>
          <span className="flex-1 text-center text-base font-semibold text-slate-700 truncate px-4">
            {poolName}
          </span>
          {/* Spacer to balance the back link */}
          <div className="w-[110px]" aria-hidden="true" />
        </div>
      </header>

      <ConnectionBanner status={connectionStatus} onRefresh={refreshPairs} />

      {/* Giant count block — primary content for outdoor buddy call */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-y-6">
          {/* Swimmer count — dominant display */}
          <div className="flex flex-col items-center gap-y-1">
            <output
              aria-live="polite"
              aria-atomic="true"
              className="text-6xl font-semibold text-slate-900 leading-none tabular-nums"
            >
              {swimmerCount}
            </output>
            <p className="text-xl font-semibold text-slate-500">swimmers</p>
          </div>

          {/* Pair count */}
          <div className="flex flex-col items-center gap-y-1">
            <output
              aria-live="polite"
              aria-atomic="true"
              className="text-4xl md:text-6xl font-semibold text-slate-900 leading-none tabular-nums"
            >
              {pairCount}
            </output>
            <p className="text-xl font-semibold text-slate-500">pairs</p>
          </div>
        </div>

        {/* Optional pair list — names only, secondary info */}
        {pairs.length > 0 && (
          <ul
            aria-label="Active pairs"
            className="mt-12 w-full max-w-sm divide-y divide-slate-200 text-left"
          >
            {pairs.map((pair) => (
              <li key={pair.id} className="py-3 text-base text-slate-700">
                {pair.members.map((m) => `${m.firstName} ${m.lastName}`).join(" / ")}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
