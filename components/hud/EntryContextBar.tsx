"use client";

import { useGameStore } from "@/store/useGameStore";
import { who } from "@/lib/format";
import type { Hash } from "@/lib/types";
import { cx } from "@/components/ui";

/**
 * Always-visible per-play context: the current QB (tap to change), the hash the
 * play is on, and a yard-by-yard nudge of the live ball spot. Shown in every
 * entry model so hash + QB are set on every play.
 */
export function EntryContextBar() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const draft = useGameStore((s) => s.draft);
  const setHash = useGameStore((s) => s.setHash);
  const openQbPicker = useGameStore((s) => s.openQbPicker);
  const nudgeSpot = useGameStore((s) => s.nudgeSpot);

  const qbNum = game.qb?.[sit.poss] ?? null;
  const qbLabel = qbNum != null ? who(game.setup, qbNum) : "Set QB";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 px-4 bg-panel-2 border-b border-edge flex-none">
      <div className="flex items-center gap-2">
        <span className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim">QB</span>
        <button
          onClick={openQbPicker}
          className="min-h-[34px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-cloud font-semibold text-[13px] leading-none cursor-pointer hover:border-turf"
        >
          {qbLabel} ▾
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim">HASH</span>
        <div className="flex gap-1">
          {(["L", "M", "R"] as Hash[]).map((h) => (
            <button
              key={h}
              onClick={() => setHash(h)}
              className={cx(
                "min-h-[34px] w-11 rounded-[8px] border font-cond font-bold text-[16px] leading-none cursor-pointer",
                draft.hash === h ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
              )}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim">BALL SPOT</span>
        <button
          onClick={() => nudgeSpot(-1)}
          className="min-h-[34px] w-11 bg-panel-4 border border-edge-3 rounded-[8px] text-dim font-semibold text-[15px] leading-none cursor-pointer hover:text-cloud"
          title="Move the line of scrimmage back one yard"
        >
          −1
        </button>
        <button
          onClick={() => nudgeSpot(1)}
          className="min-h-[34px] w-11 bg-panel-4 border border-edge-3 rounded-[8px] text-dim font-semibold text-[15px] leading-none cursor-pointer hover:text-cloud"
          title="Move the line of scrimmage forward one yard"
        >
          +1
        </button>
      </div>
    </div>
  );
}
