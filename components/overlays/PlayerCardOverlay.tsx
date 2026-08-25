"use client";

import { useGameStore } from "@/store/useGameStore";
import { computeBoxScore } from "@/lib/engine/boxscore";
import { allPlayers, playText, sitText } from "@/lib/format";

export function PlayerCardOverlay() {
  const game = useGameStore((s) => s.game);
  const cardNum = useGameStore((s) => s.cardNum);
  const setOverlay = useGameStore((s) => s.setOverlay);

  if (cardNum == null) return null;
  const box = computeBoxScore(game.plays);
  const player = allPlayers(game.setup).find((p) => p.num === cardNum);
  const inHome = game.setup.home.roster.some((p) => p.num === cardNum);

  const cardPlays = game.plays.filter(
    (p) => p.playerId === cardNum || p.targetId === cardNum || (p.tacklers ?? []).includes(cardNum),
  );

  const cr = box.rush[cardNum];
  const cp = box.pass[cardNum];
  const crc = box.rec[cardNum];
  const cd = box.def[cardNum];

  const stats = [
    { label: "RUSH", value: cr ? `${cr.att}/${cr.yds}` : "—" },
    { label: cp ? "PASS" : "REC", value: cp ? `${cp.cmp}/${cp.att} ${cp.yds}` : crc ? `${crc.rec}/${crc.yds}` : "—" },
    { label: "TACKLES", value: cd ? `${cd.tk}${cd.ast ? `+${cd.ast}` : ""}` : "—" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-7" style={{ background: "rgba(8,10,13,.72)" }}>
      <div className="w-full max-w-[560px] bg-panel border border-edge-2 rounded-2xl overflow-hidden animate-fade">
        <div className="flex items-center gap-4 px-6 py-5 bg-panel-3">
          <span className="w-[70px] h-[70px] flex-none rounded-[14px] bg-panel-4 border border-edge-2 grid place-items-center font-cond font-bold text-[34px] leading-none text-turf">
            {player ? player.num || "?" : "—"}
          </span>
          <div className="flex-1">
            <div className="font-cond font-bold text-[26px] leading-[1.05]">{player ? player.name : "Unknown jersey"}</div>
            <div className="font-semibold text-[13px] leading-none text-dim mt-1.5">
              {player ? `${player.pos} · ${inHome ? game.setup.home.name : game.setup.away.name}` : "Add him in Rosters"}
            </div>
          </div>
          <button
            onClick={() => setOverlay(null)}
            className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-dim font-semibold text-[13px] cursor-pointer"
          >
            Close
          </button>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-2.5 mb-[18px]">
            {stats.map((s) => (
              <div key={s.label} className="bg-panel-3 rounded-[10px] p-3.5">
                <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2">{s.label}</div>
                <div className="font-cond font-bold text-[26px] leading-none">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="font-semi font-semibold text-[10px] leading-none tracking-[.18em] text-dim mb-2">HIS PLAYS</div>
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-auto">
            {cardPlays.length === 0 ? (
              <div className="p-3.5 text-[14px] leading-none text-dim-2">No plays yet tonight.</div>
            ) : (
              cardPlays.map((p) => (
                <div key={p.id} className="flex gap-2.5 px-3 py-2.5 bg-panel-5 rounded-lg font-medium text-[14px] leading-[1.2] text-mist">
                  <span className="text-dim-2 min-w-[70px] text-[12px]">{sitText(game.setup, p)}</span>
                  <span>{playText(game.setup, p)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
