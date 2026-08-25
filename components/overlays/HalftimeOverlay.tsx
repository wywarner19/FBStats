"use client";

import { useGameStore } from "@/store/useGameStore";
import { OverlayShell } from "./OverlayShell";

export function HalftimeOverlay() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const resumeHalf = useGameStore((s) => s.resumeHalf);
  const setOverlay = useGameStore((s) => s.setOverlay);

  const { home, away } = game.setup;

  return (
    <OverlayShell width={680}>
      <h3 className="m-0 mb-2 font-cond font-bold text-[32px] leading-none">Halftime</h3>
      <p className="m-0 mb-5 text-[15px] leading-[1.55] text-dim">
        Through two quarters: {home.abbr} {sit.scoreH}, {away.abbr} {sit.scoreA}. Pick who receives and
        the app resumes on 3rd quarter, 1st &amp; 10 — no stuck clock, no ghost possession.
      </p>
      <div className="flex gap-2.5">
        {(["H", "A"] as const).map((team) => (
          <button
            key={team}
            onClick={() => resumeHalf(team)}
            className="flex-1 min-h-[74px] bg-panel-4 border border-turf rounded-xl text-cloud font-cond font-bold text-[20px] leading-none tracking-[.06em] cursor-pointer"
          >
            {team === "H" ? home.abbr : away.abbr} RECEIVES
          </button>
        ))}
      </div>
      <button
        onClick={() => setOverlay(null)}
        className="w-full min-h-[48px] mt-3 bg-transparent border border-edge rounded-[10px] text-dim font-semibold text-[13px] cursor-pointer"
      >
        Not yet — back to entry
      </button>
    </OverlayShell>
  );
}
