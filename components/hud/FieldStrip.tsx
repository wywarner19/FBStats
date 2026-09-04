"use client";

import { useGameStore } from "@/store/useGameStore";
import { clampSpot, direction } from "@/lib/engine/rules";
import { spotLabel } from "@/lib/engine/rules";
import { LABEL } from "@/components/ui";

// Field → screen mapping used by the prototype: an absolute yard `y` in [0,100]
// maps to `y * 0.78 + 11` percent, leaving an end-zone gutter on each side.
const pct = (y: number) => `${clampSpot(y) * 0.78 + 11}%`;
const TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

export function FieldStrip() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const draft = useGameStore((s) => s.draft);
  const setEndFromField = useGameStore((s) => s.setEndFromField);
  const flipped = useGameStore((s) => s.fieldFlipped);
  const toggleFieldFlip = useGameStore((s) => s.toggleFieldFlip);

  const dir = direction(sit.poss);
  const ftd = clampSpot(sit.spot + dir * sit.dist);
  const endY = draft.end == null ? sit.spot : draft.end;
  const gA = Math.min(sit.spot, endY);
  const gB = Math.max(sit.spot, endY);

  // Flip mirrors the whole display: absolute yard y is drawn at (100 - y).
  const mx = (y: number) => pct(flipped ? 100 - clampSpot(y) : clampSpot(y));

  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const raw = ((e.clientX - r.left) / r.width * 100 - 11) / 0.78;
    let y = clampSpot(Math.round(raw));
    if (flipped) y = clampSpot(100 - y);
    setEndFromField(y);
  };

  const delta =
    draft.yards == null
      ? "no spot yet"
      : `${draft.yards > 0 ? "+" : ""}${draft.yards} yds · ends ${spotLabel(endY, game.setup)}`;

  return (
    <div className="px-[18px] pt-4 pb-3">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <span className={`${LABEL} text-[10px]`}>TAP THE FIELD WHERE THE PLAY ENDED</span>
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
        onClick={onTap}
        className="relative h-[190px] rounded-xl overflow-hidden border border-[#2c3b31] cursor-crosshair"
        style={{ background: "linear-gradient(180deg,#1b2a20,#16221a)", touchAction: "manipulation" }}
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
      </div>
    </div>
  );
}
