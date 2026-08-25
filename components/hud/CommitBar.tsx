"use client";

import { useGameStore } from "@/store/useGameStore";
import { ClockField } from "./ClockField";
import { CLOCK_NUDGES } from "@/lib/engine/constants";

export function CommitBar() {
  const game = useGameStore((s) => s.game);
  const setClock = useGameStore((s) => s.setClock);
  const commit = useGameStore((s) => s.commit);
  const clearDraft = useGameStore((s) => s.clearDraft);

  return (
    <div className="flex-none flex gap-2.5 py-3.5 px-[18px] bg-panel-2 border-t border-edge">
      <div className="hidden sm:flex flex-col flex-none w-[224px] gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim">
            TIME OF PLAY
          </span>
          <ClockField className="flex-1 h-7 bg-panel-3 border border-edge-3 rounded-[7px] text-center font-cond font-bold text-[18px] leading-none text-cloud outline-none" />
        </div>
        <div className="flex gap-[5px]">
          {CLOCK_NUDGES.map(([v, l]) => (
            <button
              key={l}
              onClick={() => setClock(Math.max(0, game.clockSec + v))}
              className="flex-1 h-[30px] bg-panel-4 border border-edge-3 rounded-[7px] text-dim font-semibold text-[12px] leading-none cursor-pointer hover:text-cloud"
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={commit}
        className="flex-1 min-h-[66px] bg-turf border-0 rounded-xl text-ink font-cond font-bold text-[24px] leading-none tracking-[.1em] cursor-pointer transition-transform active:scale-[.99] hover:brightness-105"
      >
        COMMIT PLAY
      </button>
      <button
        onClick={clearDraft}
        className="w-[130px] min-h-[66px] bg-panel-4 border border-edge-2 rounded-xl text-dim font-cond font-bold text-[15px] leading-none tracking-[.08em] cursor-pointer hover:text-cloud"
      >
        CLEAR
      </button>
    </div>
  );
}
