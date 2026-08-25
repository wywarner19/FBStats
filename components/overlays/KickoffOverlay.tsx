"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import type { TeamId } from "@/lib/types";
import { OverlayShell } from "./OverlayShell";
import { RolePicker } from "@/components/hud/RolePicker";
import { LABEL, cx } from "@/components/ui";

type Result = "Touchback" | "Returned" | "Onside";

/** Capture a kickoff — kicker (required), receiving team, and result. Used at
 * the start of each half and for the opening kickoff. */
export function KickoffOverlay() {
  const game = useGameStore((s) => s.game);
  const ctx = useGameStore((s) => s.kickoffCtx);
  const doKickoff = useGameStore((s) => s.doKickoff);
  const openKickoff = useGameStore((s) => s.openKickoff);
  const setOverlay = useGameStore((s) => s.setOverlay);

  const [receiving, setReceiving] = useState<TeamId | null>(ctx?.receiving ?? null);
  const [kicker, setKicker] = useState<number | null>(null);
  const [returner, setReturner] = useState<number | null>(null);
  const [result, setResult] = useState<Result>("Returned");
  const [toYard, setToYard] = useState<number>(25);

  const kicking = receiving ? (receiving === "H" ? "A" : "H") : null;
  const kickingTeam = kicking === "H" ? game.setup.home : kicking === "A" ? game.setup.away : null;
  const receivingTeam = receiving === "H" ? game.setup.home : receiving === "A" ? game.setup.away : null;
  const halfStart = ctx?.qtr != null;

  const confirm = () => {
    if (!receiving || kicker == null) return;
    // Persist the choice into the ctx via openKickoff receiving, then fire.
    if (ctx?.receiving !== receiving) openKickoff({ ...ctx, receiving });
    doKickoff({ kicker, returner, result, toSpot: result === "Returned" ? toYard : null });
  };

  return (
    <OverlayShell width={640}>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="px-2.5 py-[5px] bg-turf-ink border border-turf-edge rounded-md font-bold text-[11px] leading-none tracking-[.14em] text-turf">
          KICKOFF
        </span>
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">
          {halfStart ? `Q${ctx?.qtr} kickoff` : "Kickoff"}
        </h3>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-dim font-semibold text-[13px] cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {!ctx?.receiving && (
        <>
          <div className={`${LABEL} text-[10px] mb-2`}>RECEIVING TEAM</div>
          <div className="flex gap-2 mb-3.5">
            {(["H", "A"] as TeamId[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setReceiving(t);
                  setKicker(null);
                }}
                className={cx(
                  "flex-1 min-h-[48px] rounded-[9px] border font-cond font-bold text-[16px] leading-none cursor-pointer",
                  receiving === t ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
                )}
              >
                {(t === "H" ? game.setup.home : game.setup.away).abbr} receives
              </button>
            ))}
          </div>
        </>
      )}

      {receiving && kickingTeam && (
        <>
          <RolePicker
            label={`KICKER — REQUIRED (${kickingTeam.abbr})`}
            roster={kicking === "H" ? game.setup.home.roster : game.setup.away.roster}
            selected={kicker}
            onPick={setKicker}
          />

          <div className={`${LABEL} text-[10px] mb-2 mt-1`}>RESULT</div>
          <div className="flex gap-2 mb-3">
            {(["Touchback", "Returned", "Onside"] as Result[]).map((r) => (
              <button
                key={r}
                onClick={() => setResult(r)}
                className={cx(
                  "flex-1 min-h-[44px] rounded-[9px] border font-semibold text-[14px] leading-none cursor-pointer",
                  result === r ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {result === "Returned" && (
            <div className="mb-3">
              <div className={`${LABEL} text-[10px] mb-2`}>
                RETURNED TO {receivingTeam?.abbr} YARD LINE
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {[15, 20, 25, 30, 35, 40].map((y) => (
                  <button
                    key={y}
                    onClick={() => setToYard(y)}
                    className={cx(
                      "min-h-[42px] min-w-[52px] rounded-[8px] border font-cond font-bold text-[16px] leading-none cursor-pointer",
                      toYard === y ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <RolePicker
                label={`RETURNER — OPTIONAL (${receivingTeam?.abbr})`}
                roster={receiving === "H" ? game.setup.home.roster : game.setup.away.roster}
                selected={returner}
                onPick={(n) => setReturner(returner === n ? null : n)}
                accent="flag"
              />
            </div>
          )}

          <button
            disabled={kicker == null}
            onClick={confirm}
            className={cx(
              "w-full min-h-[58px] rounded-[11px] font-cond font-bold text-[18px] leading-none tracking-[.1em] cursor-pointer border-0 mt-1",
              kicker == null ? "bg-panel-3 text-dim-2 cursor-not-allowed" : "bg-turf text-ink",
            )}
          >
            {halfStart ? "START THE HALF" : "LOG KICKOFF"}
          </button>
        </>
      )}
    </OverlayShell>
  );
}
