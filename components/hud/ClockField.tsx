"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { clockLabel, parseClock } from "@/lib/format";

/** Editable game-clock field: tap to type m:ss, commits on blur. */
export function ClockField({ className }: { className?: string }) {
  const game = useGameStore((s) => s.game);
  const setClock = useGameStore((s) => s.setClock);
  const stopClock = useGameStore((s) => s.stopClock);
  const flash = useGameStore((s) => s.flash);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const display = editing ? value : clockLabel(game.clockSec);

  return (
    <input
      value={display}
      onFocus={() => {
        setEditing(true);
        setValue(clockLabel(game.clockSec));
        stopClock();
      }}
      onChange={(e) => setValue(e.target.value)}
      onBlur={(e) => {
        const v = parseClock(e.target.value);
        setEditing(false);
        if (v == null) {
          flash("Keep it as m:ss — clock unchanged");
          return;
        }
        setClock(v);
        flash(`Clock set to ${clockLabel(v)}`);
      }}
      inputMode="numeric"
      className={className}
    />
  );
}
