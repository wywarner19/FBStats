"use client";

import { useGameStore } from "@/store/useGameStore";
import { PLAY_TYPES, RESULTS } from "@/lib/engine/constants";
import { offenseRoster, defenseRoster } from "@/lib/format";
import type { PlayType } from "@/lib/types";
import { LABEL } from "@/components/ui";

export function LeftRailC() {
  const draft = useGameStore((s) => s.draft);
  const chooseType = useGameStore((s) => s.chooseType);
  const chooseResult = useGameStore((s) => s.chooseResult);
  const results = RESULTS[draft.type ?? "Run"];

  return (
    <div className="w-full md:w-[210px] md:flex-none bg-panel-2 border-b md:border-b-0 md:border-r border-edge p-3.5 flex flex-col gap-2 md:overflow-auto">
      <div className={`${LABEL} text-[10px] mb-0.5`}>LEFT THUMB</div>
      {PLAY_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => chooseType(t as PlayType)}
          className="relative min-h-[60px] bg-panel-4 border border-edge-3 rounded-[10px] text-cloud font-cond font-bold text-[20px] leading-none tracking-[.08em] cursor-pointer"
        >
          {t.toUpperCase()}
          {draft.type === t && <span className="absolute -inset-0.5 border-2 border-turf rounded-xl" />}
        </button>
      ))}
      <div className="h-px bg-edge my-1.5" />
      {results.map((r) => (
        <button
          key={r}
          onClick={() => chooseResult(r)}
          className="relative min-h-[48px] bg-panel-3 border border-edge-3 rounded-[10px] text-slate font-semibold text-[14px] leading-none cursor-pointer"
        >
          {r}
          {draft.result === r && <span className="absolute -inset-0.5 border-2 border-flag rounded-xl" />}
        </button>
      ))}
    </div>
  );
}

export function JerseyPadC() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const draft = useGameStore((s) => s.draft);
  const padMode = useGameStore((s) => s.padMode);
  const togglePad = useGameStore((s) => s.togglePad);
  const choosePlayer = useGameStore((s) => s.choosePlayer);
  const toggleTackler = useGameStore((s) => s.toggleTackler);

  const list = padMode === "off" ? offenseRoster(game.setup, sit.poss) : defenseRoster(game.setup, sit.poss);

  return (
    <div className="flex-1 overflow-auto p-3.5">
      <div className="flex items-baseline justify-between mb-2.5">
        <span className={`${LABEL} text-[10px]`}>RIGHT THUMB — JERSEY PAD</span>
        <button
          onClick={togglePad}
          className="min-h-[36px] px-3 bg-panel-4 border border-edge-2 rounded-[7px] text-cloud font-semibold text-[11px] leading-none cursor-pointer"
        >
          {padMode === "off" ? "OFFENSE" : "DEFENSE"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {list.map((p) => {
          const sel = padMode === "off" ? draft.playerId === p.num : draft.tacklers.includes(p.num);
          return (
            <button
              key={p.id}
              onClick={() => (padMode === "off" ? choosePlayer(p.num) : toggleTackler(p.num))}
              className="relative min-h-[76px] bg-panel-4 border border-edge-3 rounded-[11px] cursor-pointer flex flex-col items-center justify-center gap-0.5"
            >
              <span className="font-cond font-bold text-[28px] leading-none text-cloud">{p.num || "?"}</span>
              <span className="font-semi font-semibold text-[10px] leading-none tracking-[.08em] text-dim">{p.pos}</span>
              {sel && <span className="absolute -inset-0.5 border-2 border-turf rounded-[13px]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
