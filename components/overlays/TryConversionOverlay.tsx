"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { offenseRoster, jersey } from "@/lib/format";
import type { Player } from "@/lib/types";
import { OverlayShell } from "./OverlayShell";
import { LABEL, cx } from "@/components/ui";

type Mode = "menu" | "kick" | "two";

/**
 * Shown automatically whenever the situation has a pending try (a touchdown was
 * just committed). Captures kicker (required) / holder / snapper for a PAT, or
 * the scorer / receiver for a 2-point, and allows flagging a penalty mid-try.
 */
export function TryConversionOverlay() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const applyTry = useGameStore((s) => s.applyTry);
  const undo = useGameStore((s) => s.undo);
  const openPenalty = useGameStore((s) => s.openPenalty);

  const [mode, setMode] = useState<Mode>("menu");
  const [kicker, setKicker] = useState<number | null>(null);
  const [holder, setHolder] = useState<number | null>(null);
  const [snapper, setSnapper] = useState<number | null>(null);
  const [twoKind, setTwoKind] = useState<"run" | "pass">("run");
  const [scorer, setScorer] = useState<number | null>(null);
  const [receiver, setReceiver] = useState<number | null>(null);

  const team = sit.tryPending;
  if (!team) return null;
  const scorerTeam = team === "H" ? game.setup.home : game.setup.away;
  const roster = offenseRoster(game.setup, team);

  const finishKick = (made: boolean) => {
    if (kicker == null) return;
    applyTry({ tryType: "kick", made, kicker, holder, snapper });
  };
  const finishTwo = (made: boolean) => {
    applyTry({
      tryType: twoKind,
      made,
      playerId: scorer,
      targetId: twoKind === "pass" ? receiver : null,
    });
  };

  return (
    <OverlayShell width={680}>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="px-2.5 py-[5px] bg-turf-ink border border-turf-edge rounded-md font-bold text-[11px] leading-none tracking-[.14em] text-turf">
          TOUCHDOWN
        </span>
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">{scorerTeam.abbr} — point after</h3>
        <div className="flex-1" />
        <span className="font-cond font-bold text-[20px] leading-none text-cloud">
          {game.setup.home.abbr} {sit.scoreH} · {game.setup.away.abbr} {sit.scoreA}
        </span>
      </div>

      {mode === "menu" && (
        <>
          <p className="m-0 mb-4 text-[14px] leading-[1.5] text-dim">
            Pick the try. Points post and{" "}
            {team === "H" ? game.setup.away.abbr : game.setup.home.abbr} receives the kickoff.
          </p>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <button
              onClick={() => setMode("kick")}
              className="min-h-[76px] rounded-[11px] border bg-turf-wash border-turf-wash-edge hover:border-turf cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span className="font-cond font-bold text-[22px] leading-none tracking-[.06em] text-turf">PAT KICK</span>
              <span className="font-medium text-[12px] leading-none text-dim">+1 · pick kicker</span>
            </button>
            <button
              onClick={() => setMode("two")}
              className="min-h-[76px] rounded-[11px] border bg-panel-4 border-edge-2 hover:border-turf cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span className="font-cond font-bold text-[22px] leading-none tracking-[.06em] text-cloud">2-POINT</span>
              <span className="font-medium text-[12px] leading-none text-dim">+2 · run or pass</span>
            </button>
          </div>
        </>
      )}

      {mode === "kick" && (
        <div className="animate-fade">
          <RolePicker label="KICKER — REQUIRED" roster={roster} selected={kicker} onPick={setKicker} accent />
          <RolePicker label="HOLDER — OPTIONAL" roster={roster} selected={holder} onPick={(n) => setHolder(holder === n ? null : n)} />
          <RolePicker label="SNAPPER — OPTIONAL" roster={roster} selected={snapper} onPick={(n) => setSnapper(snapper === n ? null : n)} />
          <div className="flex gap-2.5 mt-3">
            <button
              disabled={kicker == null}
              onClick={() => finishKick(true)}
              className={cx(
                "flex-1 min-h-[58px] rounded-[11px] font-cond font-bold text-[18px] leading-none tracking-[.1em] cursor-pointer border-0",
                kicker == null ? "bg-panel-3 text-dim-2 cursor-not-allowed" : "bg-turf text-ink",
              )}
            >
              PAT GOOD (+1)
            </button>
            <button
              disabled={kicker == null}
              onClick={() => finishKick(false)}
              className="flex-1 min-h-[58px] bg-panel-4 border border-edge-2 rounded-[11px] text-cloud font-cond font-bold text-[18px] leading-none tracking-[.1em] cursor-pointer"
            >
              NO GOOD
            </button>
          </div>
        </div>
      )}

      {mode === "two" && (
        <div className="animate-fade">
          <div className="flex gap-2 mb-3">
            {(["run", "pass"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTwoKind(k)}
                className={cx(
                  "flex-1 min-h-[44px] rounded-[9px] border font-semibold text-[14px] leading-none cursor-pointer",
                  twoKind === k ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
                )}
              >
                {k === "run" ? "Run" : "Pass"}
              </button>
            ))}
          </div>
          <RolePicker
            label={twoKind === "pass" ? "PASSER — OPTIONAL" : "BALL CARRIER — OPTIONAL"}
            roster={roster}
            selected={scorer}
            onPick={(n) => setScorer(scorer === n ? null : n)}
          />
          {twoKind === "pass" && (
            <RolePicker label="RECEIVER — OPTIONAL" roster={roster} selected={receiver} onPick={(n) => setReceiver(receiver === n ? null : n)} />
          )}
          <div className="flex gap-2.5 mt-3">
            <button
              onClick={() => finishTwo(true)}
              className="flex-1 min-h-[58px] bg-turf border-0 rounded-[11px] text-ink font-cond font-bold text-[18px] leading-none tracking-[.1em] cursor-pointer"
            >
              2-PT GOOD (+2)
            </button>
            <button
              onClick={() => finishTwo(false)}
              className="flex-1 min-h-[58px] bg-panel-4 border border-edge-2 rounded-[11px] text-cloud font-cond font-bold text-[18px] leading-none tracking-[.1em] cursor-pointer"
            >
              FAILED
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2.5 mt-3">
        <button
          onClick={openPenalty}
          className="flex-1 min-h-[44px] bg-flag-ink border border-flag-edge rounded-[10px] text-flag font-semibold text-[13px] leading-none cursor-pointer"
        >
          ⚑ Flag a penalty
        </button>
        {mode !== "menu" && (
          <button
            onClick={() => setMode("menu")}
            className="flex-1 min-h-[44px] bg-transparent border border-edge rounded-[10px] text-dim font-semibold text-[13px] cursor-pointer hover:text-cloud"
          >
            ← Back
          </button>
        )}
        <button
          onClick={undo}
          className="flex-1 min-h-[44px] bg-transparent border border-edge rounded-[10px] text-dim font-semibold text-[13px] cursor-pointer hover:text-cloud"
        >
          Undo the TD
        </button>
      </div>
    </OverlayShell>
  );
}

function RolePicker({
  label,
  roster,
  selected,
  onPick,
  accent,
}: {
  label: string;
  roster: Player[];
  selected: number | null;
  onPick: (num: number) => void;
  accent?: boolean;
}) {
  return (
    <div className="mb-2.5">
      <div className={`${LABEL} text-[10px] mb-1.5`}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {roster.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.num)}
            className={cx(
              "relative min-h-[44px] min-w-[46px] px-2 rounded-[8px] border font-cond font-bold text-[17px] leading-none cursor-pointer",
              selected === p.num
                ? accent
                  ? "bg-turf-wash border-turf text-turf"
                  : "bg-panel-4 border-turf text-cloud"
                : "bg-panel-5 border-edge text-slate",
            )}
          >
            {jersey(p.num)}
          </button>
        ))}
      </div>
    </div>
  );
}
