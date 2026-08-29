"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { PENALTIES, CLOCK_NUDGES } from "@/lib/engine/constants";
import { penaltyPreview } from "@/lib/engine/reducer";
import { clampSpot, direction, spotLabel } from "@/lib/engine/rules";
import { ClockField } from "@/components/hud/ClockField";
import { OverlayShell } from "./OverlayShell";
import { LABEL, cx } from "@/components/ui";

export function PenaltyOverlay() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const pen = useGameStore((s) => s.pen);
  const choosePenalty = useGameStore((s) => s.choosePenalty);
  const applyPenalty = useGameStore((s) => s.applyPenalty);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const setClock = useGameStore((s) => s.setClock);

  // During a try, a foul can be enforced on the try or on the ensuing kickoff.
  const duringTry = !!sit.tryPending;
  const [onKickoff, setOnKickoff] = useState(false);

  // Spot-of-foul enforcement. Required for some fouls; optional for any.
  const [optInFoulSpot, setOptInFoulSpot] = useState(false);
  const [foulSpot, setFoulSpot] = useState(sit.spot);
  const requiresFoulSpot = !!pen?.spotFoul;
  const useFoulSpot = requiresFoulSpot || optInFoulSpot;
  const dir = direction(sit.poss);
  const nudgeFoul = (delta: number) => setFoulSpot((s) => clampSpot(s + dir * delta));
  const effFoulSpot = useFoulSpot ? foulSpot : undefined;

  const explain = pen
    ? pen.on === "OFF"
      ? `Marked back ${pen.yds} yards from the previous spot${pen.lossOfDown ? ", and the down counts." : "; the down is replayed."}`
      : `Marked off ${pen.yds} yards against the defense${pen.autoFirst ? ", automatic first down." : "; distance reduced, same down."}`
    : "";

  return (
    <OverlayShell width={920}>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="px-2.5 py-[5px] bg-flag-ink border border-flag-edge rounded-md font-bold text-[11px] leading-none tracking-[.14em] text-flag">FLAG</span>
        <h3 className="m-0 font-cond font-bold text-[28px] leading-none">Penalty</h3>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-dim font-semibold text-[13px] cursor-pointer"
        >
          Cancel
        </button>
      </div>
      <p className="m-0 mb-3.5 text-[14px] leading-[1.5] text-dim">
        Pick the foul. I&apos;ll show you the resulting down, distance and spot before anything is committed — accept it or decline and keep the play.
      </p>

      <div className="flex items-center gap-2.5 mb-4 px-3.5 py-2.5 bg-panel-3 rounded-[10px]">
        <span className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim">TIME ON CLOCK</span>
        <ClockField className="w-24 h-[38px] bg-panel border border-edge-3 rounded-lg text-center font-cond font-bold text-[22px] leading-none text-cloud outline-none" />
        <div className="flex gap-1.5">
          {CLOCK_NUDGES.map(([v, l]) => (
            <button
              key={l}
              onClick={() => setClock(Math.max(0, game.clockSec + v))}
              className="min-h-[38px] px-3 bg-panel-4 border border-edge-3 rounded-lg text-dim font-semibold text-[13px] leading-none cursor-pointer"
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        {PENALTIES.map((p) => {
          const sel = pen?.name === p.name;
          return (
            <button
              key={p.name}
              onClick={() => choosePenalty(p)}
              className="relative min-h-[64px] px-3.5 bg-panel-4 border border-edge-3 rounded-[10px] text-cloud cursor-pointer text-left"
            >
              <div className="font-semibold text-[15px] leading-[1.15]">{p.name}</div>
              <div className="font-medium text-[12px] leading-none text-dim mt-1">
                {p.yds} yds{p.autoFirst ? " · auto 1st" : ""}{p.lossOfDown ? " · loss of down" : ""}{p.spotFoul ? " · spot foul" : ""}
              </div>
              {sel && <span className="absolute -inset-0.5 border-2 border-flag rounded-xl" />}
            </button>
          );
        })}
      </div>

      {pen && (
        <div className="mt-4 p-4 bg-turf-wash border border-turf-wash-edge rounded-xl animate-fade">
          {duringTry && (
            <div className="mb-3">
              <div className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim mb-2">ENFORCE ON</div>
              <div className="flex gap-2">
                {[
                  { k: false, label: "The try", sub: "re-spot the PAT/2-pt" },
                  { k: true, label: "The kickoff", sub: "carry over to the kick" },
                ].map((o) => (
                  <button
                    key={String(o.k)}
                    onClick={() => setOnKickoff(o.k)}
                    className={cx(
                      "flex-1 min-h-[48px] rounded-[9px] border px-3 text-left cursor-pointer",
                      onKickoff === o.k ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
                    )}
                  >
                    <div className="font-semibold text-[14px] leading-none">{o.label}</div>
                    <div className="font-medium text-[11px] leading-none text-dim mt-1">{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Spot-of-foul enforcement (required for some fouls, optional for any). */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`${LABEL} text-[10px]`}>ENFORCE FROM</span>
              {requiresFoulSpot && (
                <span className="px-1.5 py-0.5 bg-flag-ink rounded font-semibold text-[9px] leading-none tracking-[.08em] text-flag">
                  SPOT OF FOUL REQUIRED
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOptInFoulSpot(false)}
                disabled={requiresFoulSpot}
                className={cx(
                  "flex-1 min-h-[44px] rounded-[9px] border px-3 text-left cursor-pointer",
                  !useFoulSpot ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
                  requiresFoulSpot && "opacity-40 cursor-not-allowed",
                )}
              >
                <div className="font-semibold text-[13px] leading-none">Previous spot</div>
                <div className="font-medium text-[11px] leading-none text-dim mt-1">the line of scrimmage</div>
              </button>
              <button
                onClick={() => setOptInFoulSpot(true)}
                className={cx(
                  "flex-1 min-h-[44px] rounded-[9px] border px-3 text-left cursor-pointer",
                  useFoulSpot ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
                )}
              >
                <div className="font-semibold text-[13px] leading-none">Spot of foul</div>
                <div className="font-medium text-[11px] leading-none text-dim mt-1">where the foul happened</div>
              </button>
            </div>
            {useFoulSpot && (
              <div className="flex items-center gap-2 mt-2.5">
                <span className="font-cond font-bold text-[18px] leading-none text-cloud min-w-[84px]">
                  {spotLabel(foulSpot, game.setup)}
                </span>
                {[-5, -1, 1, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => nudgeFoul(d)}
                    className="min-h-[38px] px-3 bg-panel-4 border border-edge-3 rounded-[8px] text-dim font-semibold text-[13px] leading-none cursor-pointer hover:text-cloud"
                  >
                    {d > 0 ? "+" : ""}{d}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="font-semi font-semibold text-[11px] leading-none tracking-[.18em] text-dim mb-2.5">IF YOU ACCEPT</div>
          {!duringTry && (
            <div className="font-cond font-bold text-[26px] leading-[1.1] text-turf mb-1.5">{penaltyPreview(game, pen, effFoulSpot)}</div>
          )}
          <p className="m-0 mb-4 text-[14px] leading-[1.5] text-slate">
            {duringTry
              ? onKickoff
                ? `${pen.yds} yards will be assessed on the kickoff; the try stands as-is.`
                : `Re-spots the try. The try is still owed after the foul.`
              : explain}
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => applyPenalty(true, duringTry ? onKickoff : undefined, effFoulSpot)}
              className="flex-1 min-h-[60px] bg-turf border-0 rounded-[11px] text-onaccent font-cond font-bold text-[18px] leading-none tracking-[.1em] cursor-pointer"
            >
              ACCEPT PENALTY
            </button>
            <button
              onClick={() => applyPenalty(false)}
              className="flex-1 min-h-[60px] bg-panel-4 border border-edge-2 rounded-[11px] text-cloud font-cond font-bold text-[18px] leading-none tracking-[.1em] cursor-pointer"
            >
              DECLINE — PLAY STANDS
            </button>
          </div>
        </div>
      )}
    </OverlayShell>
  );
}
