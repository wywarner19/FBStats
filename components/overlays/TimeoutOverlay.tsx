"use client";

import { useGameStore } from "@/store/useGameStore";
import type { TeamId } from "@/lib/types";
import { OverlayShell } from "./OverlayShell";
import { cx } from "@/components/ui";

/** Charge a team timeout (NFHS: 3 per half) or take an uncharged injury/official timeout. */
export function TimeoutOverlay() {
  const game = useGameStore((s) => s.game);
  const takeTimeout = useGameStore((s) => s.takeTimeout);
  const injuryTimeout = useGameStore((s) => s.injuryTimeout);
  const setOverlay = useGameStore((s) => s.setOverlay);

  const dots = (n: number) =>
    [0, 1, 2].map((i) => (
      <span
        key={i}
        className={cx("w-2.5 h-2.5 rounded-full", i < n ? "bg-turf" : "bg-edge-2")}
      />
    ));

  const teamBtn = (team: TeamId) => {
    const t = team === "H" ? game.setup.home : game.setup.away;
    const left = game.timeouts[team] ?? 0;
    return (
      <button
        onClick={() => takeTimeout(team)}
        disabled={left <= 0}
        className={cx(
          "flex-1 min-h-[92px] rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer",
          left <= 0 ? "bg-panel-3 border-edge text-dim-2 cursor-not-allowed" : "bg-panel-4 border-edge-2 hover:border-turf text-cloud",
        )}
      >
        <span className="font-cond font-bold text-[22px] leading-none tracking-[.06em]">{t.abbr}</span>
        <div className="flex gap-1.5">{dots(left)}</div>
        <span className="font-medium text-[12px] leading-none text-dim">{left} left · charge one</span>
      </button>
    );
  };

  return (
    <OverlayShell width={560}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">Timeout</h3>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-dim font-semibold text-[13px] cursor-pointer"
        >
          Cancel
        </button>
      </div>
      <p className="m-0 mb-3.5 text-[14px] leading-[1.5] text-dim">
        Charge a team timeout (3 per half, reset at halftime) or take an injury / official&apos;s
        timeout that isn&apos;t charged to either team. The clock stops either way.
      </p>
      <div className="flex gap-2.5 mb-3">
        {teamBtn("H")}
        {teamBtn("A")}
      </div>
      <button
        onClick={injuryTimeout}
        className="w-full min-h-[52px] bg-flag-ink border border-flag-edge rounded-[10px] text-flag font-cond font-bold text-[15px] leading-none tracking-[.08em] cursor-pointer"
      >
        INJURY / OFFICIAL&apos;S TIMEOUT — NO CHARGE
      </button>
    </OverlayShell>
  );
}
