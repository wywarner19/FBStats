"use client";

import { useGameStore } from "@/store/useGameStore";
import { OverlayShell } from "./OverlayShell";
import { cx } from "@/components/ui";

const POSITIONS = ["QB", "RB", "FB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "—"];

export function PlayerEditOverlay() {
  const game = useGameStore((s) => s.game);
  const team = useGameStore((s) => s.editTeam);
  const id = useGameStore((s) => s.editId);
  const dispatch = useGameStore((s) => s.dispatch);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const flash = useGameStore((s) => s.flash);

  const roster = team === "H" ? game.setup.home.roster : game.setup.away.roster;
  const player = roster.find((p) => p.id === id);
  if (!player) return null;

  const update = (patch: Partial<{ num: number; name: string; pos: string; twoWay: boolean }>) =>
    dispatch({ type: "UPDATE_PLAYER", team, id: player.id, patch });

  const remove = () => {
    dispatch({ type: "REMOVE_PLAYER", team, id: player.id });
    setOverlay(null);
    flash("Player removed");
  };

  const teamName = team === "H" ? game.setup.home.name : game.setup.away.name;

  return (
    <OverlayShell width={560}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">Edit player</h3>
        <span className="font-semi font-semibold text-[11px] leading-none tracking-[.14em] text-dim uppercase">
          {teamName}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-cloud font-semibold text-[13px] cursor-pointer"
        >
          Done
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <label className="flex-none w-[110px]">
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">NUMBER</div>
          <input
            type="number"
            value={player.num < 0 ? "" : player.num}
            onChange={(e) => update({ num: e.target.value === "" ? -1 : parseInt(e.target.value, 10) || 0 })}
            className="w-full h-12 bg-panel-3 border border-edge-3 rounded-[9px] text-center font-cond font-bold text-[24px] leading-none text-turf outline-none"
          />
        </label>
        <label className="flex-1">
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">NAME</div>
          <input
            value={player.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="First initial. Last"
            className="w-full h-12 bg-panel-3 border border-edge-3 rounded-[9px] px-3.5 font-medium text-[16px] leading-none text-cloud outline-none placeholder:text-dim-2"
          />
        </label>
      </div>

      <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">POSITION</div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => update({ pos })}
            className={cx(
              "min-h-[44px] min-w-[52px] px-3 rounded-[9px] border font-semibold text-[14px] leading-none cursor-pointer",
              player.pos === pos
                ? "bg-panel-4 border-turf text-cloud"
                : "bg-panel-5 border-edge text-dim hover:text-cloud",
            )}
          >
            {pos}
          </button>
        ))}
      </div>

      <button
        onClick={() => update({ twoWay: !player.twoWay })}
        className={cx(
          "w-full min-h-[52px] rounded-[10px] border flex items-center justify-between px-4 mb-4 cursor-pointer",
          player.twoWay ? "bg-turf-wash border-turf-wash-edge" : "bg-panel-3 border-edge-3",
        )}
      >
        <div className="text-left">
          <div className="font-semibold text-[15px] leading-none text-cloud">Two-way athlete</div>
          <div className="font-medium text-[12px] leading-none text-dim mt-1.5">Plays both offense and defense</div>
        </div>
        <span
          className={cx(
            "relative w-[46px] h-[26px] rounded-full transition-colors flex-none",
            player.twoWay ? "bg-turf" : "bg-edge-2",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 w-[22px] h-[22px] rounded-full bg-ink transition-all",
              player.twoWay ? "left-[22px]" : "left-0.5",
            )}
          />
        </span>
      </button>

      <button
        onClick={remove}
        className="w-full min-h-[48px] bg-danger-ink border border-danger-edge rounded-[10px] text-danger font-cond font-bold text-[14px] leading-none tracking-[.1em] cursor-pointer"
      >
        REMOVE PLAYER
      </button>
    </OverlayShell>
  );
}
