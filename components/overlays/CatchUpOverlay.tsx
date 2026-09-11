"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { OverlayShell } from "./OverlayShell";
import { cx } from "@/components/ui";

/** Parse "m:ss" (or bare seconds) into whole seconds. */
function parseClock(v: string, fallback: number): number {
  const t = v.trim();
  if (!t) return fallback;
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    const mm = parseInt(m, 10) || 0;
    const ss = parseInt(s, 10) || 0;
    return Math.max(0, mm * 60 + ss);
  }
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * The "panic button" — when the log has fallen behind the live game, reconcile
 * everything at once: score, quarter, clock, possession, down/distance/spot.
 * Logged as one control event so it undoes and re-folds like any correction.
 */
export function CatchUpOverlay() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const catchUp = useGameStore((s) => s.catchUp);
  const setOverlay = useGameStore((s) => s.setOverlay);

  const { home, away } = game.setup;

  const [scoreH, setScoreH] = useState(String(sit.scoreH));
  const [scoreA, setScoreA] = useState(String(sit.scoreA));
  const [qtr, setQtr] = useState(game.qtr);
  const [clock, setClock] = useState(fmtClock(game.clockSec));
  const [poss, setPoss] = useState(sit.poss);
  const [down, setDown] = useState(sit.down || 1);
  const [dist, setDist] = useState(String(sit.dist ?? 10));
  const [side, setSide] = useState<"H" | "A">(sit.spot <= 50 ? "H" : "A");
  const [yard, setYard] = useState(String(sit.spot <= 50 ? Math.round(sit.spot) : 100 - Math.round(sit.spot)));

  const apply = () => {
    const y = Math.max(0, Math.min(50, parseInt(yard, 10) || 0));
    const spot = side === "H" ? y : 100 - y;
    catchUp({
      scoreH: Math.max(0, parseInt(scoreH, 10) || 0),
      scoreA: Math.max(0, parseInt(scoreA, 10) || 0),
      qtr,
      clockSec: parseClock(clock, game.clockSec),
      poss,
      down,
      dist: Math.max(1, Math.min(99, parseInt(dist, 10) || 10)),
      spot,
    });
  };

  const field = "h-12 bg-panel-3 border border-edge-3 rounded-[9px] text-center font-cond font-bold text-[22px] text-cloud outline-none";
  const seg = (on: boolean) =>
    cx(
      "flex-1 min-h-[48px] rounded-[9px] border font-cond font-bold text-[16px] leading-none cursor-pointer",
      on ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim hover:text-cloud",
    );

  return (
    <OverlayShell width={560}>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="px-2.5 py-[5px] bg-flag-ink border border-flag-edge rounded-md font-bold text-[11px] leading-none tracking-[.14em] text-flag">
          CATCH UP
        </span>
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">Reconcile to the live game</h3>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-cloud font-semibold text-[13px] cursor-pointer"
        >
          Cancel
        </button>
      </div>
      <p className="m-0 mb-4 text-[13px] leading-[1.5] text-dim">
        Fell behind? Set the scoreboard and situation to exactly where the real game is right now — no need to re-log the plays you missed. This is recorded as one correction you can undo.
      </p>

      {/* Score */}
      <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">SCORE</div>
      <div className="flex gap-3 mb-4">
        {([["H", home.abbr, scoreH, setScoreH], ["A", away.abbr, scoreA, setScoreA]] as const).map(
          ([k, abbr, val, setter]) => (
            <label key={k} className="flex-1">
              <div className="font-semi font-semibold text-[11px] leading-none tracking-[.14em] text-dim mb-1.5">{abbr}</div>
              <input
                type="number"
                inputMode="numeric"
                value={val}
                onChange={(e) => setter(e.target.value)}
                className={`${field} w-full`}
              />
            </label>
          ),
        )}
      </div>

      {/* Quarter + clock */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">QUARTER</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((q) => (
              <button key={q} onClick={() => setQtr(q)} className={seg(qtr === q)}>
                Q{q}
              </button>
            ))}
          </div>
        </div>
        <label className="flex-none w-[132px]">
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">CLOCK</div>
          <input
            value={clock}
            inputMode="numeric"
            placeholder="m:ss"
            onChange={(e) => setClock(e.target.value)}
            className={`${field} w-full placeholder:text-dim-2`}
          />
        </label>
      </div>

      {/* Possession */}
      <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">BALL WITH</div>
      <div className="flex gap-2 mb-4">
        {(["H", "A"] as const).map((t) => (
          <button key={t} onClick={() => setPoss(t)} className={seg(poss === t)}>
            {t === "H" ? home.abbr : away.abbr}
          </button>
        ))}
      </div>

      {/* Down / distance / spot */}
      <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">DOWN</div>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((d) => (
          <button key={d} onClick={() => setDown(d)} className={seg(down === d)}>
            {d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : "4th"}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mb-5">
        <label className="flex-none w-[110px]">
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
              <button key={s} onClick={() => setSide(s)} className={seg(side === s)}>
                {s === "H" ? home.abbr : away.abbr}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              value={yard}
              onChange={(e) => setYard(e.target.value)}
              placeholder="yd"
              className={`${field} w-[86px] flex-none placeholder:text-dim-2`}
            />
          </div>
          <div className="mt-1.5 text-[11px] leading-none text-dim-2">0–50 (50 = midfield)</div>
        </div>
      </div>

      <button
        onClick={apply}
        className="w-full min-h-[54px] bg-turf border-0 rounded-[10px] text-onaccent font-cond font-bold text-[17px] leading-none tracking-[.06em] cursor-pointer"
      >
        CATCH UP TO HERE
      </button>
    </OverlayShell>
  );
}
