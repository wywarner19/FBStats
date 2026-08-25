"use client";

import { useGameStore } from "@/store/useGameStore";
import { FIX_YARDS } from "@/lib/engine/constants";
import { playText, reviewStatus, sitText } from "@/lib/format";
import { OverlayShell } from "./OverlayShell";
import { cx } from "@/components/ui";

export function FixPlayOverlay() {
  const game = useGameStore((s) => s.game);
  const fixId = useGameStore((s) => s.fixId);
  const dispatch = useGameStore((s) => s.dispatch);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const flash = useGameStore((s) => s.flash);

  const adjustPlayYards = useGameStore((s) => s.adjustPlayYards);
  const toggleReviewFlag = useGameStore((s) => s.toggleReviewFlag);

  const play = game.plays.find((p) => p.id === fixId);
  if (!play) return null;

  const teamRoster = play.poss === "H" ? game.setup.home.roster : game.setup.away.roster;
  const review = reviewStatus(play);

  const adjustYards = (v: number) => adjustPlayYards(play.id, v);
  const reassign = (num: number) => {
    dispatch({ type: "EDIT_PLAY", id: play.id, patch: { playerId: num } });
    setOverlay(null);
    flash(`Reassigned to #${num}`);
  };
  const editClock = (clock: string) =>
    dispatch({ type: "EDIT_PLAY", id: play.id, patch: { clock } });
  const remove = () => {
    dispatch({ type: "DELETE_PLAY", id: play.id });
    setOverlay(null);
    flash("Play deleted — stats recomputed");
  };

  return (
    <OverlayShell width={720}>
      <div className="flex items-center gap-3 mb-3.5">
        <h3 className="m-0 font-cond font-bold text-[28px] leading-none">Fix a logged play</h3>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-dim font-semibold text-[13px] cursor-pointer"
        >
          Close
        </button>
      </div>
      <div className="px-4 py-3.5 bg-panel-3 rounded-[10px] font-medium text-[16px] leading-[1.3] text-cloud mb-3">
        {sitText(game.setup, play)} — {playText(game.setup, play)}
      </div>

      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <button
          onClick={() => toggleReviewFlag(play.id)}
          className={cx(
            "min-h-[40px] px-3.5 rounded-[9px] border font-semibold text-[13px] leading-none cursor-pointer",
            play.review?.flagged ? "bg-flag-ink border-flag text-flag" : "bg-panel-4 border-edge-2 text-dim hover:text-cloud",
          )}
        >
          ⚑ {play.review?.flagged ? "Flagged for review" : "Flag for review"}
        </button>
        {review.reasons
          .filter((r) => r !== "Flagged for review")
          .map((r) => (
            <span key={r} className="px-2.5 py-1.5 bg-flag-ink rounded-[6px] font-semibold text-[11px] leading-none text-flag">
              {r}
            </span>
          ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim">TIME OF THIS PLAY</span>
        <input
          value={play.clock}
          onChange={(e) => editClock(e.target.value)}
          className="w-[104px] h-11 bg-panel-3 border border-edge-3 rounded-[9px] text-center font-cond font-bold text-[22px] leading-none text-cloud outline-none"
        />
        <span className="text-[13px] leading-[1.4] text-dim-2">
          Correcting this only re-times the play-by-play — it does not move the game clock.
        </span>
      </div>

      <div className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim mb-2">ADJUST YARDS</div>
      <div className="flex gap-2 flex-wrap mb-4">
        {FIX_YARDS.map((v) => (
          <button
            key={v}
            onClick={() => adjustYards(v)}
            className="min-h-[52px] min-w-[64px] px-3.5 bg-panel-4 border border-edge-3 rounded-[10px] text-cloud font-cond font-bold text-[18px] leading-none cursor-pointer"
          >
            {v > 0 ? "+" : ""}{v}
          </button>
        ))}
      </div>

      <div className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim mb-2">REASSIGN BALL CARRIER</div>
      <div className="grid grid-cols-6 gap-[7px] mb-[18px]">
        {teamRoster.map((p) => (
          <button
            key={p.id}
            onClick={() => reassign(p.num)}
            className="min-h-[50px] bg-panel-4 border border-edge-3 rounded-[9px] text-cloud font-cond font-bold text-[18px] leading-none cursor-pointer"
          >
            {p.num || "?"}
          </button>
        ))}
      </div>

      <button
        onClick={remove}
        className="w-full min-h-[56px] bg-danger-ink border border-danger-edge rounded-[11px] text-danger font-cond font-bold text-[15px] leading-none tracking-[.1em] cursor-pointer"
      >
        DELETE THIS PLAY
      </button>
    </OverlayShell>
  );
}
