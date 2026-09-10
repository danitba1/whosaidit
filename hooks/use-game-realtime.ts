"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function useGameRealtime(gameId: string | null, onChange: () => void) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const supabase = createClient();
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => onChange(),
      )
      .subscribe((s) => {
        if (cancelled) return;
        if (s === "SUBSCRIBED") setStatus("connected");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("disconnected");
        else setStatus("connecting");
      });

    const visibility = () => {
      if (document.visibilityState === "visible") onChange();
    };
    document.addEventListener("visibilitychange", visibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", visibility);
      void supabase.removeChannel(channel);
    };
  }, [gameId, onChange]);

  return status;
}

export function usePresence(gameId: string | null, participantId: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!gameId) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence-${gameId}`, {
      config: { presence: { key: participantId || `anon-${Math.random()}` } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ at: Date.now() });
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId, participantId]);

  return count;
}
