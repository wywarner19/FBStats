"use client";

import { useEffect, useState } from "react";
import type { GameState } from "@/lib/types";
import { normalizeGame } from "@/lib/engine/factory";
import { watchGame } from "@/lib/sync/gameSync";
import { BroadcastDashboard } from "./BroadcastDashboard";

/** Read-only live view opened via a share link (?watch=<id>). No login. */
export function WatchView({ cloudId }: { cloudId: string }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = watchGame(cloudId, (g, err) => {
      setLoaded(true);
      if (g) {
        setGame(normalizeGame(g));
        setError(null);
      } else {
        setError(err ?? "Unavailable");
      }
    });
    return unsub;
  }, [cloudId]);

  if (game) return <BroadcastDashboard overrideGame={game} live />;

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-ink text-cloud font-barlow gap-3 px-6 text-center">
      <div className="font-cond font-bold text-[28px] tracking-[.1em] text-turf">FBSTATS · LIVE</div>
      <div className="text-[15px] text-dim">
        {!loaded ? "Connecting to the live game…" : error ?? "Waiting for the game to start…"}
      </div>
      {loaded && error && (
        <div className="text-[13px] text-dim-2 max-w-[340px]">
          Double-check the link. The game appears here as soon as the statistician taps “Share live”.
        </div>
      )}
    </div>
  );
}
