"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { OverlayShell } from "./OverlayShell";
import { cx } from "@/components/ui";

/** Manually correct down / distance / ball spot — opened by tapping the
 *  situation or ball-spot readout on the scoreboard. */
export function SetSituationOverlay() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const setSituation = useGameStore((s) => s.setSituation);
  const setOverlay = useGameStore((s) => s.setOverlay);

  const { home, away } = game.setup;

  const [down, setDown] = useState(sit.down || 1);
  const [dist, setDist] = useState(String(sit.dist ?? 10));
  // spot <= 50 is home territory (home's Y line); > 50 is away's (100 - Y).
  const [side, setSide] = useState<"H" | "A">(sit.spot <= 50 ? "H" : "A");
  const [yard, setYard] = useState(String(sit.spot <= 50 ? Math.round(sit.spot) : 100 - Math.round(sit.spot)));

  const apply = () => {
    const y = Math.max(0, Math.min(50, parseInt(yard, 10) || 0));
    const spot = side === "H" ? y : 100 - y;
    const d = Math.max(1, Math.min(99, parseInt(dist, 10) || 10));
    setSituation({ down, dist: d, spot });
    setOverlay(null);
  };

  const field = "h-12 bg-panel-3 border border-edge-3 rounded-[9px] text-center font-cond font-bold text-[22px] text-cloud outline-none";

  return (
    <OverlayShell width={520}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">Set situation</h3>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-cloud font-semibold text-[13px] cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">DOWN</div>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((d) => (
          <button
            key={d}
            onClick={() => setDown(d)}
            className={cx(
              "flex-1 min-h-[52px] rounded-[10px] border font-cond font-bold text-[20px] leading-none cursor-pointer",
              down === d ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim hover:text-cloud",
            )}
          >
            {d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : "4th"}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mb-5">
        <label className="flex-none w-[120px]">
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">TO GO</div>
          <input
            type="number"
            inputMode="numeric"
            value={dist}
            onChange={(e) => setDist(e.target.value)}
            className={`${field} w-full`}
          />
        </label>
        <div className="flex-1">
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">BALL ON</div>
          <div className="flex gap-2">
            {(["H", "A"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={cx(
                  "flex-1 min-h-[48px] rounded-[9px] border font-cond font-bold text-[16px] leading-none cursor-pointer",
                  side === s ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim hover:text-cloud",
                )}
              >
                {s === "H" ? home.abbr : away.abbr}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              value={yard}
              onChange={(e) => setYard(e.target.value)}
              placeholder="yd"
              className={`${field} w-[92px] flex-none placeholder:text-dim-2`}
            />
          </div>
          <div className="mt-1.5 text-[11px] leading-none text-dim-2">0–50 (50 = midfield)</div>
        </div>
      </div>

      <button
        onClick={apply}
        className="w-full min-h-[52px] bg-turf border-0 rounded-[10px] text-onaccent font-cond font-bold text-[16px] leading-none tracking-[.06em] cursor-pointer"
      >
        Set situation
      </button>
    </OverlayShell>
  );
}
