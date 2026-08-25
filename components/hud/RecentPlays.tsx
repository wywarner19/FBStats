"use client";

import { useGameStore } from "@/store/useGameStore";
import { deriveTimeline } from "@/lib/engine/rules";
import { playText, reviewStatus, sitText } from "@/lib/format";

/** The "LAST PLAYS — TAP TO FIX" list at the bottom of the entry panel. */
export function RecentPlays() {
  const game = useGameStore((s) => s.game);
  const openFix = useGameStore((s) => s.openFix);

  const timeline = deriveTimeline(game.setup, game.plays, game.anchor)
    .filter((t) => t.play.kind !== "Control")
    .slice(-4)
    .reverse();

  return (
    <div className="flex-none max-h-[230px] overflow-auto border-t border-edge bg-[#111519]">
      <div className="px-3.5 pt-2.5 pb-1.5 font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim">
        LAST PLAYS — TAP TO FIX
      </div>
      {timeline.map(({ play, atSnap }) => (
        <button
          key={play.id}
          onClick={() => openFix(play.id)}
          className="block w-full text-left px-3.5 py-2.5 bg-transparent border-0 border-b border-[#1b2028] cursor-pointer hover:bg-panel"
        >
          <div className="flex gap-2 items-baseline">
            <span className="font-semi font-semibold text-[11px] leading-none tracking-[.08em] text-dim-2 min-w-[74px]">
              {sitText(game.setup, atSnap)}
            </span>
            <span className="flex-1 font-medium text-[14px] leading-[1.25] text-mist">
              {playText(game.setup, play)}
            </span>
            {reviewStatus(play).needsReview && (
              <span className="flex-none px-1.5 py-0.5 bg-flag-ink rounded font-bold text-[9px] leading-none tracking-[.08em] text-flag">
                REVIEW
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
