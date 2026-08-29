"use client";

import { useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { OverlayShell } from "./OverlayShell";
import { cx } from "@/components/ui";

const POSITIONS = ["QB", "RB", "FB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "—"];

/** Quick roster entry: type a player, then "Save & add another" or "Save & close". */
export function AddPlayerOverlay() {
  const game = useGameStore((s) => s.game);
  const team = useGameStore((s) => s.addTeam);
  const dispatch = useGameStore((s) => s.dispatch);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const flash = useGameStore((s) => s.flash);

  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [pos, setPos] = useState("—");
  const [twoWay, setTwoWay] = useState(false);
  const numRef = useRef<HTMLInputElement>(null);

  const teamName = team === "H" ? game.setup.home.name : game.setup.away.name;

  // Returns true if a player was actually saved.
  const save = (): boolean => {
    const n = num.trim();
    const nm = name.trim();
    if (!n && !nm) {
      flash("Add a number or a name first");
      return false;
    }
    const player = { num: n === "" ? -1 : parseInt(n, 10) || 0, name: nm, pos };
    dispatch({ type: "ADD_PLAYER", team, player });
    if (twoWay) {
      // twoWay isn't part of ADD_PLAYER — patch the just-appended player.
      const roster = useGameStore.getState().game.setup[team === "H" ? "home" : "away"].roster;
      const justAdded = roster[roster.length - 1];
      if (justAdded) dispatch({ type: "UPDATE_PLAYER", team, id: justAdded.id, patch: { twoWay: true } });
    }
    return true;
  };

  const reset = () => {
    setNum("");
    setName("");
    setPos("—");
    setTwoWay(false);
    numRef.current?.focus();
  };

  const saveAndAnother = () => {
    if (save()) {
      flash(`Added ${num.trim() ? "#" + num.trim() : name.trim()}`);
      reset();
    }
  };
  const saveAndClose = () => {
    if (save()) setOverlay(null);
  };

  const input =
    "w-full h-12 bg-panel-3 border border-edge-3 rounded-[9px] outline-none text-cloud";

  return (
    <OverlayShell width={560}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">Add player</h3>
        <span className="font-semi font-semibold text-[11px] leading-none tracking-[.14em] text-dim uppercase">
          {teamName}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-cloud font-semibold text-[13px] cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <label className="flex-none w-[110px]">
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">NUMBER</div>
          <input
            ref={numRef}
            type="number"
            value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder="#"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && saveAndAnother()}
            className={`${input} text-center font-cond font-bold text-[24px] leading-none text-turf placeholder:text-dim-2`}
          />
        </label>
        <label className="flex-1">
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">NAME</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First initial. Last"
            onKeyDown={(e) => e.key === "Enter" && saveAndAnother()}
            className={`${input} px-3.5 font-medium text-[16px] leading-none placeholder:text-dim-2`}
          />
        </label>
      </div>

      <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">POSITION</div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {POSITIONS.map((p) => (
          <button
            key={p}
            onClick={() => setPos(p)}
            className={cx(
              "min-h-[44px] min-w-[52px] px-3 rounded-[9px] border font-semibold text-[14px] leading-none cursor-pointer",
              pos === p ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim hover:text-cloud",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={() => setTwoWay((v) => !v)}
        className={cx(
          "w-full min-h-[52px] rounded-[10px] border flex items-center justify-between px-4 mb-5 cursor-pointer",
          twoWay ? "bg-turf-wash border-turf-wash-edge" : "bg-panel-3 border-edge-3",
        )}
      >
        <div className="text-left">
          <div className="font-semibold text-[15px] leading-none text-cloud">Two-way athlete</div>
          <div className="font-medium text-[12px] leading-none text-dim mt-1.5">Plays both offense and defense</div>
        </div>
        <span className={cx("relative w-[46px] h-[26px] rounded-full transition-colors flex-none", twoWay ? "bg-turf" : "bg-edge-2")}>
          <span className={cx("absolute top-0.5 w-[22px] h-[22px] rounded-full bg-ink transition-all", twoWay ? "left-[22px]" : "left-0.5")} />
        </span>
      </button>

      <div className="flex gap-2.5">
        <button
          onClick={saveAndAnother}
          className="flex-1 min-h-[52px] bg-panel-4 border border-turf rounded-[10px] text-turf font-cond font-bold text-[15px] leading-none tracking-[.06em] cursor-pointer"
        >
          Save &amp; add another
        </button>
        <button
          onClick={saveAndClose}
          className="flex-1 min-h-[52px] bg-turf border-0 rounded-[10px] text-onaccent font-cond font-bold text-[15px] leading-none tracking-[.06em] cursor-pointer"
        >
          Save &amp; close
        </button>
      </div>
    </OverlayShell>
  );
}
