"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { OverlayShell } from "./OverlayShell";
import { playText } from "@/lib/format";

/** Pops after a committed play (when enabled) to capture the game clock for it. */
export function ClockPromptOverlay() {
  const game = useGameStore((s) => s.game);
  const id = useGameStore((s) => s.clockEditId);
  const dispatch = useGameStore((s) => s.dispatch);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const setAskClock = useGameStore((s) => s.setAskClock);
  const flash = useGameStore((s) => s.flash);

  const play = game.plays.find((p) => p.id === id);
  const [value, setValue] = useState(play?.clock ?? "");

  if (!play) return null;

  const close = () => setOverlay(null);
  const save = () => {
    const v = value.trim();
    if (v && v !== play.clock) dispatch({ type: "EDIT_PLAY", id: play.id, patch: { clock: v } });
    close();
  };

  return (
    <OverlayShell width={420}>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="m-0 font-cond font-bold text-[24px] leading-none">Time on the clock?</h3>
        <div className="flex-1" />
        <button
          onClick={() => {
            setAskClock(false);
            flash("Clock prompt off — turn it back on in Setup");
            close();
          }}
          className="min-h-[36px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-dim-2 font-semibold text-[12px] cursor-pointer hover:text-cloud"
          title="Stop asking after each play (re-enable in Setup)"
        >
          Stop asking
        </button>
      </div>

      <div className="text-[13px] leading-snug text-dim mb-3 truncate">{playText(game.setup, play)}</div>

      <input
        value={value}
        inputMode="numeric"
        autoFocus
        placeholder="m:ss"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="w-full h-14 bg-panel-3 border border-edge-3 rounded-[10px] text-center font-cond font-bold text-[32px] leading-none text-cloud outline-none placeholder:text-dim-2 mb-3"
      />

      <div className="flex gap-2.5">
        <button
          onClick={save}
          className="flex-1 min-h-[50px] bg-turf border-0 rounded-[10px] text-onaccent font-cond font-bold text-[16px] leading-none tracking-[.06em] cursor-pointer"
        >
          Set time
        </button>
        <button
          onClick={close}
          className="flex-1 min-h-[50px] bg-panel-4 border border-edge-2 rounded-[10px] text-cloud font-cond font-bold text-[16px] leading-none tracking-[.06em] cursor-pointer"
        >
          Skip
        </button>
      </div>
    </OverlayShell>
  );
}
