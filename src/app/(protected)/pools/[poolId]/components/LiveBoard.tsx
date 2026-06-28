"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { SessionBoard } from "./SessionBoard";
import { ConnectionBanner } from "./ConnectionBanner";

// Mirror types from SessionBoard — shared structure convention
type PairMember = {
  camperId: string;
  firstName: string;
  lastName: string;
  bunk: string;
  code: string;
};

type Pair = {
  id: string;
  members: PairMember[];
};

type LiveBoardProps = {
  initialPairs: Pair[];
  sessionId: string;
  poolId: string;
  poolName: string;
};

export function LiveBoard({ initialPairs, sessionId, poolId, poolName }: LiveBoardProps) {
  // SSR hydration — no loading gap on first paint (D-11 / BOARD-01)
  const [pairs, setPairs] = useState<Pair[]>(initialPairs);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "reconnecting" | "disconnected"
  >("connected");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Re-fetch from the auth-gated Route Handler on every Realtime event
  const refreshPairs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/pairs`);
      if (res.ok) {
        const data = await res.json();
        setPairs(data.pairs);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [sessionId]);

  // 150ms debounce collapses the trio INSERT burst into one refetch (Pitfall 3)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refreshPairs, 150);
  }, [refreshPairs]);

  // Disconnect detection via window offline/online — fires immediately on network drop.
  // WebSocket-level disconnects are covered by the subscribe status callback below
  // (CHANNEL_ERROR / TIMED_OUT → disconnected).
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

  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionId}:pairs`)
      // INSERT on pair_member signals a new pair registration — filter by session_id
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pair_member", filter: `session_id=eq.${sessionId}` },
        debouncedRefresh,
      )
      // DELETE on pair — no session_id column on pair table; Route Handler re-fetch is session-scoped
      // Subscribing to pair DELETE because cascade-deleted pair_member rows do NOT fire events (Critical Finding #1)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "pair" },
        debouncedRefresh,
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("disconnected");
        }
        if (err) console.error("[Realtime]", err);
      });

    // MUST use removeChannel (not the bare channel teardown method) to prevent TooManyChannels / Strict-Mode channel leak
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [sessionId, debouncedRefresh]);

  // Derived counts — updated on every pairs state change
  const swimmerCount = pairs.reduce((sum, p) => sum + p.members.length, 0);
  const pairCount = pairs.length;

  return (
    <div className="min-h-screen bg-white">
      <ConnectionBanner status={connectionStatus} onRefresh={refreshPairs} />
      <SessionBoard
        poolName={poolName}
        swimmerCount={swimmerCount}
        pairCount={pairCount}
        sessionId={sessionId}
        poolId={poolId}
        pairs={pairs}
        onPairMutated={refreshPairs}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
