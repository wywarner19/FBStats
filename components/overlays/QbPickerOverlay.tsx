"use client";

import { useGameStore } from "@/store/useGameStore";
import { offenseRoster } from "@/lib/format";
import { OverlayShell } from "./OverlayShell";
import { LABEL, cx } from "@/components/ui";

/** Set the current starting QB for the team on offense. */
export function QbPickerOverlay() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const setQb = useGameStore((s) => s.setQb);
  const setOverlay = useGameStore((s) => s.setOverlay);

  const team = sit.poss;
  const roster = offenseRoster(game.setup, team);
  const current = game.qb?.[team] ?? null;
  const teamName = team === "H" ? game.setup.home.name : game.setup.away.name;

  return (
    <OverlayShell width={560}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">Set quarterback</h3>
        <span className={`${LABEL} text-[11px]`}>{teamName}</span>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-dim font-semibold text-[13px] cursor-pointer"
        >
          Close
        </button>
      </div>
      <p className="m-0 mb-3.5 text-[14px] leading-[1.5] text-dim">
        The current QB pre-fills the passer on every pass play. You can still change the passer
        on any single play from the entry pad.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {roster.map((p) => (
          <button
            key={p.id}
            onClick={() => setQb(team, p.num)}
            className={cx(
              "relative min-h-[64px] rounded-[10px] border cursor-pointer flex flex-col items-center justify-center gap-0.5",
              current === p.num ? "bg-turf-wash border-turf" : "bg-panel-4 border-edge-3",
            )}
          >
            <span className="font-cond font-bold text-[22px] leading-none text-cloud">{p.num || "?"}</span>
            <span className="font-semi font-semibold text-[10px] leading-none tracking-[.08em] text-dim">{p.pos}</span>
            {current === p.num && (
              <span className="absolute top-1 right-1 font-semi font-bold text-[9px] leading-none tracking-[.1em] text-turf">QB</span>
            )}
          </button>
        ))}
      </div>
    </OverlayShell>
  );
}
