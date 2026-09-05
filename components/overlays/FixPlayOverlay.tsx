"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { FIX_YARDS, PENALTIES } from "@/lib/engine/constants";
import { clampSpot, deriveTimeline, direction, ordinal, resolvePenalty, spotLabel } from "@/lib/engine/rules";
import { jersey, playText, reviewStatus, sitText } from "@/lib/format";
import type { PlayEvent, Situation } from "@/lib/types";
import { OverlayShell } from "./OverlayShell";
import { LABEL, cx } from "@/components/ui";

export function FixPlayOverlay() {
  const game = useGameStore((s) => s.game);
  const fixId = useGameStore((s) => s.fixId);
  const dispatch = useGameStore((s) => s.dispatch);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const flash = useGameStore((s) => s.flash);

  const adjustPlayYards = useGameStore((s) => s.adjustPlayYards);
  const toggleReviewFlag = useGameStore((s) => s.toggleReviewFlag);
  const toggleNullify = useGameStore((s) => s.toggleNullify);

  const play = game.plays.find((p) => p.id === fixId);
  if (!play) return null;

  const isPenalty = play.kind === "Penalty";
  const teamRoster = play.poss === "H" ? game.setup.home.roster : game.setup.away.roster;
  const review = reviewStatus(play, game.setup);
  const atSnap = deriveTimeline(game.setup, game.plays, game.anchor).find((t) => t.play.id === play.id)?.atSnap;

  const adjustYards = (v: number) => adjustPlayYards(play.id, v);
  const reassign = (num: number) => {
    dispatch({ type: "EDIT_PLAY", id: play.id, patch: { playerId: num } });
    setOverlay(null);
    flash(`Reassigned to #${num}`);
  };
  const editClock = (clock: string) => dispatch({ type: "EDIT_PLAY", id: play.id, patch: { clock } });
  const remove = () => {
    dispatch({ type: "DELETE_PLAY", id: play.id });
    setOverlay(null);
    flash("Play deleted — stats recomputed");
  };

  return (
    <OverlayShell width={720}>
      <div className="flex items-center gap-3 mb-3.5">
        <h3 className="m-0 font-cond font-bold text-[28px] leading-none">{isPenalty ? "Fix a penalty" : "Fix a logged play"}</h3>
        <div className="flex-1" />
        <button onClick={() => setOverlay(null)} className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-dim font-semibold text-[13px] cursor-pointer">
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
        {!isPenalty && (
          <button
            onClick={() => toggleNullify(play.id)}
            className={cx(
              "min-h-[40px] px-3.5 rounded-[9px] border font-semibold text-[13px] leading-none cursor-pointer",
              play.nullified ? "bg-danger-ink border-danger-edge text-danger" : "bg-panel-4 border-edge-2 text-dim hover:text-cloud",
            )}
            title="Wipe this play from the score & stats (called back by penalty) — keep it in the log"
          >
            ⊘ {play.nullified ? "Voided by penalty" : "Void (penalty)"}
          </button>
        )}
        {review.reasons
          .filter((r) => r !== "Flagged for review")
          .map((r) => (
            <span key={r} className="px-2.5 py-1.5 bg-flag-ink rounded-[6px] font-semibold text-[11px] leading-none text-flag">{r}</span>
          ))}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className={`${LABEL} text-[10px]`}>TIME OF THIS PLAY</span>
        <input
          value={play.clock}
          onChange={(e) => editClock(e.target.value)}
          className="w-[104px] h-11 bg-panel-3 border border-edge-3 rounded-[9px] text-center font-cond font-bold text-[22px] leading-none text-cloud outline-none"
        />
        <span className="text-[13px] leading-[1.4] text-dim-2">Re-times the play-by-play only — it does not move the game clock.</span>
      </div>

      {isPenalty && atSnap ? (
        <PenaltyEditor play={play} atSnap={atSnap} setup={game.setup} onPatch={(patch) => dispatch({ type: "EDIT_PLAY", id: play.id, patch })} />
      ) : (
        <>
          <div className={`${LABEL} text-[10px] mb-2`}>ADJUST YARDS</div>
          <div className="flex gap-2 flex-wrap mb-4">
            {FIX_YARDS.map((v) => (
              <button key={v} onClick={() => adjustYards(v)} className="min-h-[52px] min-w-[64px] px-3.5 bg-panel-4 border border-edge-3 rounded-[10px] text-cloud font-cond font-bold text-[18px] leading-none cursor-pointer">
                {v > 0 ? "+" : ""}{v}
              </button>
            ))}
          </div>

          <div className={`${LABEL} text-[10px] mb-2`}>REASSIGN BALL CARRIER</div>
          <div className="grid grid-cols-6 gap-[7px] mb-[18px]">
            {teamRoster.map((p) => (
              <button key={p.id} onClick={() => reassign(p.num)} className="min-h-[50px] bg-panel-4 border border-edge-3 rounded-[9px] text-cloud font-cond font-bold text-[18px] leading-none cursor-pointer">
                {jersey(p.num)}
              </button>
            ))}
          </div>
        </>
      )}

      <button onClick={remove} className="w-full min-h-[56px] bg-danger-ink border border-danger-edge rounded-[11px] text-danger font-cond font-bold text-[15px] leading-none tracking-[.1em] cursor-pointer">
        DELETE THIS PLAY
      </button>
    </OverlayShell>
  );
}

function PenaltyEditor({
  play,
  atSnap,
  setup,
  onPatch,
}: {
  play: PlayEvent;
  atSnap: Situation;
  setup: import("@/lib/types").GameSetup;
  onPatch: (patch: Partial<PlayEvent>) => void;
}) {
  const current = PENALTIES.find((p) => p.name === play.penalty) ?? PENALTIES[0];
  const [useFoulSpot, setUseFoulSpot] = useState(play.foulSpot != null || !!current.spotFoul);
  const [foulSpot, setFoulSpot] = useState(play.foulSpot ?? atSnap.spot);
  const dir = direction(atSnap.poss);

  const pen = PENALTIES.find((p) => p.name === play.penalty) ?? current;
  const requiresFoulSpot = !!pen.spotFoul;
  const effFoulSpot = useFoulSpot || requiresFoulSpot ? foulSpot : undefined;
  const r = resolvePenalty(atSnap, pen, effFoulSpot);

  const pickPenalty = (name: string) => {
    const p = PENALTIES.find((x) => x.name === name)!;
    onPatch({ penalty: p.name, penYds: p.yds, foulSpot: useFoulSpot || p.spotFoul ? foulSpot : undefined });
  };
  const nudgeFoul = (d: number) => {
    const next = clampSpot(foulSpot + dir * d);
    setFoulSpot(next);
    onPatch({ foulSpot: next });
  };
  const setEnforce = (fs: boolean) => {
    setUseFoulSpot(fs);
    onPatch({ foulSpot: fs ? foulSpot : undefined });
  };

  return (
    <div className="mb-2">
      <div className={`${LABEL} text-[10px] mb-2`}>CHANGE THE PENALTY</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <select
          value={play.penalty}
          onChange={(e) => pickPenalty(e.target.value)}
          className="h-11 bg-panel-3 border border-edge-3 rounded-[9px] px-3 font-semibold text-[15px] text-cloud outline-none"
        >
          {PENALTIES.map((p) => (
            <option key={p.name} value={p.name}>{p.name} — {p.yds} yds</option>
          ))}
        </select>
        <div className="flex items-center gap-2 px-3 h-11 bg-panel-5 border border-edge rounded-[9px]">
          <span className="text-[11px] text-dim">SPOT OF BALL (LOS)</span>
          <span className="font-cond font-bold text-[16px] text-cloud">{spotLabel(atSnap.spot, setup)}</span>
        </div>
      </div>

      <div className={`${LABEL} text-[10px] mb-2`}>ENFORCE FROM</div>
      <div className="flex gap-2 mb-2.5">
        {[
          { k: false, label: "Previous spot" },
          { k: true, label: "Spot of foul" },
        ].map((o) => (
          <button
            key={String(o.k)}
            onClick={() => setEnforce(o.k)}
            disabled={requiresFoulSpot}
            className={cx(
              "flex-1 min-h-[44px] rounded-[9px] border font-semibold text-[13px] leading-none cursor-pointer",
              (useFoulSpot || requiresFoulSpot) === o.k ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
              requiresFoulSpot && !o.k && "opacity-40 cursor-not-allowed",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {(useFoulSpot || requiresFoulSpot) && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-dim">SPOT OF PENALTY</span>
          <span className="font-cond font-bold text-[18px] text-cloud min-w-[84px]">{spotLabel(foulSpot, setup)}</span>
          {[-5, -1, 1, 5].map((d) => (
            <button key={d} onClick={() => nudgeFoul(d)} className="min-h-[38px] px-3 bg-panel-4 border border-edge-3 rounded-[8px] text-dim font-semibold text-[13px] leading-none cursor-pointer hover:text-cloud">
              {d > 0 ? "+" : ""}{d}
            </button>
          ))}
        </div>
      )}

      <div className="p-3.5 bg-turf-wash border border-turf-wash-edge rounded-[10px] mb-4">
        <div className={`${LABEL} text-[10px] mb-1.5`}>FINAL PLACEMENT OF THE BALL</div>
        <div className="font-cond font-bold text-[22px] leading-none text-turf">
          {ordinal(r.down)} & {r.dist} at {spotLabel(r.spot, setup)}
        </div>
      </div>
    </div>
  );
}
