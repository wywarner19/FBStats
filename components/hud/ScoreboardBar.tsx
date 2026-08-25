"use client";

import { useGameStore } from "@/store/useGameStore";
import { ClockField } from "./ClockField";
import { downLabel, possAbbr } from "@/lib/format";
import { spotLabel } from "@/lib/engine/rules";
import { cx } from "@/components/ui";

function Timeouts({ n, align }: { n: number; align: "start" | "end" }) {
  return (
    <div className={cx("flex gap-1 mt-1", align === "end" ? "justify-end" : "justify-start")}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cx("w-2 h-2 rounded-full", i < n ? "bg-turf" : "bg-edge-2")} />
      ))}
    </div>
  );
}

export function ScoreboardBar() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const startClock = useGameStore((s) => s.startClock);
  const stopClock = useGameStore((s) => s.stopClock);
  const flipPossession = useGameStore((s) => s.flipPossession);
  const openPenalty = useGameStore((s) => s.openPenalty);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const openKickoff = useGameStore((s) => s.openKickoff);
  const endQuarter = useGameStore((s) => s.endQuarter);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const canRedo = useGameStore((s) => s.game.redo.length > 0);

  const { home, away } = game.setup;

  return (
    <div className="flex flex-wrap items-stretch md:h-[76px] bg-panel-2 border-b border-edge flex-none">
      {/* Score + timeouts */}
      <div className="flex items-center gap-4 px-5 border-r border-edge">
        <div className="text-right">
          <div className="font-semi font-semibold text-[12px] leading-none tracking-[.14em] text-dim">{home.abbr}</div>
          <div className="font-cond font-bold text-[32px] leading-none text-cloud">{sit.scoreH}</div>
          <Timeouts n={game.timeouts?.H ?? 3} align="end" />
        </div>
        <div className="w-px h-[34px] bg-edge" />
        <div>
          <div className="font-semi font-semibold text-[12px] leading-none tracking-[.14em] text-dim">{away.abbr}</div>
          <div className="font-cond font-bold text-[32px] leading-none text-cloud">{sit.scoreA}</div>
          <Timeouts n={game.timeouts?.A ?? 3} align="start" />
        </div>
      </div>

      {/* Clock */}
      <div className="flex items-center gap-2.5 px-[18px] border-r border-edge">
        <div className="flex flex-col gap-1">
          <button
            onClick={startClock}
            className={cx(
              "relative w-[62px] h-[22px] bg-turf-ink border border-turf-edge rounded-md text-turf font-bold text-[11px] leading-none tracking-[.1em] cursor-pointer",
            )}
          >
            START
            {game.running && <span className="absolute -inset-0.5 border-2 border-turf rounded-lg" />}
          </button>
          <button
            onClick={stopClock}
            className="relative w-[62px] h-[22px] bg-flag-ink border border-flag-edge rounded-md text-flag font-bold text-[11px] leading-none tracking-[.1em] cursor-pointer"
          >
            STOP
            {!game.running && <span className="absolute -inset-0.5 border-2 border-flag rounded-lg" />}
          </button>
        </div>
        <div className="text-center min-w-[104px]">
          <ClockField className="w-[104px] bg-transparent border-0 border-b border-dashed border-edge-2 text-center font-cond font-bold text-[30px] leading-none tracking-[.02em] text-cloud pb-0.5 outline-none" />
          <div className="font-semi font-semibold text-[11px] leading-none tracking-[.14em] text-dim mt-1">
            Q{game.qtr} · TAP TO TYPE
          </div>
        </div>
      </div>

      {/* Situation */}
      <div className="flex-1 flex items-center gap-[22px] px-[22px]">
        <div>
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim mb-1">SITUATION</div>
          <div className="font-cond font-bold text-[26px] leading-none text-turf">{downLabel(sit)}</div>
        </div>
        <div>
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim mb-1">BALL ON</div>
          <div className="font-cond font-bold text-[26px] leading-none">{spotLabel(sit.spot, game.setup)}</div>
        </div>
        <div>
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim mb-1">POSSESSION</div>
          <button
            onClick={flipPossession}
            className="min-h-[40px] px-3.5 bg-panel-4 border border-edge-2 rounded-lg text-cloud font-cond font-bold text-[15px] leading-none tracking-[.08em] cursor-pointer"
          >
            {possAbbr(game, sit)} ⇄
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-[18px] border-l border-edge">
        <button
          onClick={openPenalty}
          className="min-h-[52px] px-[18px] bg-flag-ink border border-flag-edge rounded-[10px] text-flag font-cond font-bold text-[14px] leading-none tracking-[.1em] cursor-pointer"
        >
          FLAG
        </button>
        <button
          onClick={() => openKickoff()}
          className="min-h-[52px] px-3 bg-panel-4 border border-edge-2 rounded-[10px] text-cloud font-cond font-bold text-[13px] leading-none tracking-[.08em] cursor-pointer"
        >
          KICK
        </button>
        <button
          onClick={() => setOverlay("timeout")}
          className="min-h-[52px] px-3 bg-panel-4 border border-edge-2 rounded-[10px] text-cloud font-cond font-bold text-[13px] leading-none tracking-[.08em] cursor-pointer"
        >
          T.O.
        </button>
        <button
          onClick={endQuarter}
          className="min-h-[52px] px-3 bg-panel-4 border border-edge-2 rounded-[10px] text-dim font-cond font-bold text-[13px] leading-none tracking-[.08em] cursor-pointer"
          title="End the quarter — halftime at Q2, change ends at Q1/Q3"
        >
          {game.qtr === 2 ? "HALFTIME" : "END QTR"}
        </button>
        <button
          onClick={undo}
          className="min-h-[52px] px-3.5 bg-panel-4 border border-edge-2 rounded-[10px] text-cloud font-cond font-bold text-[14px] leading-none tracking-[.08em] cursor-pointer"
        >
          UNDO
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={cx(
            "min-h-[52px] px-3.5 border rounded-[10px] font-cond font-bold text-[14px] leading-none tracking-[.08em]",
            canRedo
              ? "bg-panel-4 border-edge-2 text-cloud cursor-pointer"
              : "bg-panel-3 border-edge text-dim-2 cursor-not-allowed",
          )}
          title={canRedo ? "Redo the last undone play" : "Nothing to redo"}
        >
          REDO
        </button>
      </div>
    </div>
  );
}
