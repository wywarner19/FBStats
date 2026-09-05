"use client";

import { useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { clampSpot, direction } from "@/lib/engine/rules";
import { spotLabel } from "@/lib/engine/rules";
import { QUICK_YARDS } from "@/lib/engine/constants";
import { LABEL, cx } from "@/components/ui";

// Field → screen mapping used by the prototype: an absolute yard `y` in [0,100]
// maps to `y * 0.78 + 11` percent, leaving an end-zone gutter on each side.
const pct = (y: number) => `${clampSpot(y) * 0.78 + 11}%`;
const TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

export function FieldStrip() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const draft = useGameStore((s) => s.draft);
  const setEndFromField = useGameStore((s) => s.setEndFromField);
  const setYards = useGameStore((s) => s.setYards);
  const chooseResult = useGameStore((s) => s.chooseResult);
  const flipped = useGameStore((s) => s.fieldFlipped);
  const toggleFieldFlip = useGameStore((s) => s.toggleFieldFlip);
  const [typed, setTyped] = useState("");
  const dragging = useRef(false);

  const dir = direction(sit.poss);
  const ftd = clampSpot(sit.spot + dir * sit.dist);
  const endY = draft.end == null ? sit.spot : draft.end;
  const gA = Math.min(sit.spot, endY);
  const gB = Math.max(sit.spot, endY);

  // Flip mirrors the whole display: absolute yard y is drawn at (100 - y).
  const mx = (y: number) => pct(flipped ? 100 - clampSpot(y) : clampSpot(y));

  // Which visual side the offense's attacking end zone is on (for the TD zone).
  const attackRight = (sit.poss === "H") !== flipped;
  const attackGoal = sit.poss === "H" ? 100 : 0;

  const spotFromX = (clientX: number, rect: DOMRect) => {
    const raw = ((clientX - rect.left) / rect.width * 100 - 11) / 0.78;
    let y = clampSpot(Math.round(raw));
    if (flipped) y = clampSpot(100 - y);
    return y;
  };

  // Drag (or tap) the ball along the field to set where the play ended.
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setEndFromField(spotFromX(e.clientX, e.currentTarget.getBoundingClientRect()));
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setEndFromField(spotFromX(e.clientX, e.currentTarget.getBoundingClientRect()));
  };
  const onUp = () => {
    dragging.current = false;
  };

  const scoreTd = () => {
    setEndFromField(attackGoal);
    chooseResult("Touchdown");
  };

  const delta =
    draft.yards == null
      ? "no spot yet"
      : `${draft.yards > 0 ? "+" : ""}${draft.yards} yds · ends ${spotLabel(endY, game.setup)}`;

  return (
    <div className="px-[18px] pt-4 pb-3">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <span className={`${LABEL} text-[10px]`}>DRAG OR TAP WHERE THE PLAY ENDED</span>
        <button
          onClick={toggleFieldFlip}
          className="flex-none min-h-[26px] px-2 bg-panel-4 border border-edge-2 rounded-[6px] text-dim font-semibold text-[10px] leading-none tracking-[.06em] cursor-pointer hover:text-cloud hover:border-turf"
          title="Flip the field so it matches the direction you're facing"
        >
          ⇄ FLIP
        </button>
        <span className="font-semibold text-[13px] leading-none text-turf ml-auto">{delta}</span>
      </div>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative h-[190px] rounded-xl overflow-hidden border border-[#2c3b31] cursor-crosshair select-none"
        style={{ background: "linear-gradient(180deg,#1b2a20,#16221a)", touchAction: "none" }}
      >
        {TICKS.map((y) => (
          <div key={`t${y}`} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: mx(y) }} />
        ))}
        {TICKS.map((y) => (
          <div
            key={`l${y}`}
            className="absolute bottom-1.5 -translate-x-1/2 font-cond font-semibold text-[13px] leading-none text-white/30"
            style={{ left: mx(y) }}
          >
            {y <= 50 ? y : 100 - y}
          </div>
        ))}
        {/* End zones — HOME (turf) at y=0, AWAY (flag) at y=100; colors swap when flipped. */}
        <div
          className="absolute top-0 bottom-0 w-[22px] left-0"
          style={
            flipped
              ? { background: "rgba(216,162,74,.06)", borderRight: "1px solid rgba(216,162,74,.25)" }
              : { background: "rgba(85,201,138,.06)", borderRight: "1px solid rgba(85,201,138,.25)" }
          }
        />
        <div
          className="absolute top-0 bottom-0 w-[22px] right-0"
          style={
            flipped
              ? { background: "rgba(85,201,138,.06)", borderLeft: "1px solid rgba(85,201,138,.25)" }
              : { background: "rgba(216,162,74,.06)", borderLeft: "1px solid rgba(216,162,74,.25)" }
          }
        />
        {/* Gain highlight */}
        <div
          className="absolute top-3.5 bottom-[34px]"
          style={{
            background: "rgba(85,201,138,.16)",
            borderLeft: "2px solid #55c98a",
            borderRight: "2px dashed rgba(85,201,138,.55)",
            left: mx(flipped ? gB : gA),
            width: `${(gB - gA) * 0.78}%`,
          }}
        />
        {/* LOS line */}
        <div className="absolute top-1.5 bottom-[26px] w-[3px] bg-turf" style={{ left: mx(sit.spot) }} />
        {/* First-down line */}
        <div className="absolute top-1.5 bottom-[26px] w-[2px] bg-flag" style={{ left: mx(ftd) }} />
        <div className="absolute top-0.5 -translate-x-1/2 px-[7px] py-0.5 bg-turf rounded-[5px] font-bold text-[11px] leading-[1.4] text-onaccent whitespace-nowrap" style={{ left: mx(sit.spot) }}>
          LOS
        </div>
        <div className="absolute top-6 -translate-x-1/2 px-[7px] py-0.5 bg-flag rounded-[5px] font-bold text-[11px] leading-[1.4] text-onaccent whitespace-nowrap" style={{ left: mx(ftd) }}>
          1ST
        </div>
        {/* Hash marks */}
        <div className="absolute left-[22px] right-[22px] h-px bg-white/10 top-[62px]" />
        <div className="absolute left-[22px] right-[22px] h-px bg-white/10 top-[118px]" />

        {/* Draggable ball marker at the play's end spot */}
        {draft.end != null && (
          <div
            className="absolute top-[86px] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-turf border-2 border-onaccent shadow pointer-events-none"
            style={{ left: mx(endY) }}
          />
        )}

        {/* Touchdown zone — tap the attacking end zone to score */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={scoreTd}
          className={cx(
            "absolute top-0 bottom-0 w-[22px] grid place-items-center cursor-pointer",
            attackRight ? "right-0" : "left-0",
            draft.result === "Touchdown" ? "bg-turf/30" : "hover:bg-turf/15",
          )}
          title="Touchdown — offense reached the end zone"
        >
          <span className="font-cond font-bold text-[11px] leading-none tracking-[.08em] text-turf [writing-mode:vertical-rl] rotate-180">
            TD
          </span>
        </button>
      </div>

      {/* Or set the gain/loss directly, without tapping the field. */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={`${LABEL} text-[10px] mr-0.5`}>OR YARDS</span>
        {QUICK_YARDS.map((y) => (
          <button
            key={y}
            onClick={() => setYards(y)}
            className={cx(
              "min-h-[34px] min-w-[38px] px-2 rounded-[8px] border font-cond font-bold text-[15px] leading-none cursor-pointer",
              draft.yards === y ? "bg-panel-4 border-turf text-cloud" : "bg-panel-4 border-edge-2 text-slate hover:border-turf hover:text-cloud",
            )}
          >
            {y > 0 ? `+${y}` : y}
          </button>
        ))}
        <input
          value={typed}
          inputMode="numeric"
          placeholder="±#"
          onChange={(e) => setTyped(e.target.value.replace(/[^0-9-]/g, "").slice(0, 4))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && typed !== "" && typed !== "-") {
              setYards(parseInt(typed, 10) || 0);
              setTyped("");
            }
          }}
          className="w-14 h-[34px] bg-panel-3 border border-edge-3 rounded-[8px] text-center font-cond font-bold text-[15px] text-cloud outline-none placeholder:text-dim-2"
        />
      </div>
    </div>
  );
}
