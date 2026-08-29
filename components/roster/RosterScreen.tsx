"use client";

import { useGameStore } from "@/store/useGameStore";
import type { Player, TeamId } from "@/lib/types";
import { jersey } from "@/lib/format";
import { LABEL } from "@/components/ui";

const SCAN_ROWS = [
  { num: 3, name: "A. Whitcomb", pos: "WR", low: false },
  { num: 15, name: "D. Marchetti", pos: "QB", low: false },
  { num: 41, name: "R. Ozturk", pos: "LB", low: false },
  { num: 58, name: "T. Guerrero", pos: "OL", low: true },
  { num: 76, name: "J. Ekwueme", pos: "DL", low: false },
  { num: 8, name: "illegible", pos: "—", low: true },
];

function RosterColumn({ team }: { team: TeamId }) {
  const game = useGameStore((s) => s.game);
  const openCard = useGameStore((s) => s.openCard);
  const openEdit = useGameStore((s) => s.openEdit);
  const openAddPlayer = useGameStore((s) => s.openAddPlayer);
  const t = team === "H" ? game.setup.home : game.setup.away;
  const numColor = team === "H" ? "text-turf" : "text-flag";
  const heading = team === "H" ? `${t.name} — HOME` : `${t.name} — OPPONENT`;
  const headColor = team === "H" ? "text-turf" : "text-dim";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`font-semi font-semibold text-[11px] leading-none tracking-[.18em] uppercase ${headColor}`}>
          {heading}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => openAddPlayer(team)}
          className="min-h-[34px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-cloud font-semibold text-[12px] cursor-pointer hover:border-turf"
        >
          + Add player
        </button>
      </div>
      <div className="flex flex-col gap-px bg-edge border border-edge rounded-[11px] overflow-hidden">
        {t.roster.map((p: Player) => (
          <div key={p.id} className="flex items-center gap-3.5 bg-panel px-3.5 py-2.5">
            <span className={`w-11 text-center font-cond font-bold text-[20px] leading-none ${numColor}`}>
              {jersey(p.num)}
            </span>
            {/* Tap the name to edit number/name/position/two-way. */}
            <button
              onClick={() => openEdit(team, p.id)}
              className="flex-1 flex items-center gap-2 min-h-[40px] bg-transparent border-0 text-left cursor-pointer group"
            >
              <span className="font-medium text-[15px] leading-none text-cloud group-hover:text-turf">{p.name}</span>
              {p.twoWay && (
                <span className="px-1.5 py-0.5 bg-turf-wash border border-turf-wash-edge rounded font-semibold text-[9px] leading-none tracking-[.08em] text-turf">
                  2-WAY
                </span>
              )}
            </button>
            <span className="font-semi font-semibold text-[12px] leading-none tracking-[.1em] text-dim">
              {p.pos}
            </span>
            <button
              onClick={() => openCard(p.num)}
              className="min-h-[40px] px-3 bg-panel-4 border border-edge-2 rounded-[7px] text-dim font-semibold text-[11px] cursor-pointer hover:text-cloud"
            >
              CARD
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RosterScreen() {
  const scanned = useGameStore((s) => s.scanned);
  const setScanned = useGameStore((s) => s.setScanned);
  const dispatch = useGameStore((s) => s.dispatch);
  const flash = useGameStore((s) => s.flash);

  const acceptScan = () => {
    dispatch({ type: "ADD_PLAYER", team: "H", player: { num: 3, name: "A. Whitcomb", pos: "WR" } });
    dispatch({ type: "ADD_PLAYER", team: "H", player: { num: 15, name: "D. Marchetti", pos: "QB" } });
    setScanned(false);
    flash("2 players added from photo");
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      <div className="flex-1 md:overflow-auto px-7 py-6">
        <div className="flex items-center gap-3.5 mb-4">
          <h2 className="m-0 font-cond font-bold text-[30px] leading-none">Rosters</h2>
          <span className="px-2.5 py-[5px] bg-flag-ink border border-flag-edge rounded-[20px] font-semibold text-[11px] leading-none tracking-[.08em] text-flag">
            EDITABLE MID-GAME
          </span>
        </div>
        <p className="m-0 mb-[18px] max-w-[720px] text-[14px] leading-[1.5] text-dim">
          Tap <span className="text-cloud font-semibold">+ Add player</span> on
          either team to enter number, name and position — use{" "}
          <span className="text-turf font-semibold">Save &amp; add another</span>{" "}
          to rattle off a roster. Tap any player&apos;s name to edit. Or during
          entry, tap the <span className="text-flag font-semibold">?</span> tile
          to commit against an unknown jersey and back-fill later.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RosterColumn team="H" />
          <RosterColumn team="A" />
        </div>
      </div>

      <div className="w-full md:w-[380px] md:flex-none bg-panel-2 border-t md:border-t-0 md:border-l border-edge p-6 md:overflow-auto">
        <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3.5`}>IMPORT FROM PHOTO</div>
        <div className="relative w-full h-[200px] rounded-[11px] overflow-hidden border border-edge bg-panel grid place-items-center text-dim-2 text-[13px] text-center px-6">
          Drop a photo of the roster sheet
        </div>
        <button
          onClick={() => setScanned(true)}
          className="w-full min-h-[52px] mt-3.5 bg-turf border-0 rounded-[10px] text-ink font-cond font-bold text-[15px] tracking-[.1em] cursor-pointer"
        >
          {scanned ? "RE-SCAN PHOTO" : "SCAN PHOTO FOR NUMBERS"}
        </button>

        {scanned && (
          <div className="mt-[18px] animate-fade">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-semibold text-[13px] leading-none text-cloud">
                6 rows read · review before adding
              </span>
              <button
                onClick={acceptScan}
                className="min-h-[40px] px-3 bg-panel-4 border border-turf rounded-lg text-turf font-semibold text-[11px] cursor-pointer"
              >
                ACCEPT ALL
              </button>
            </div>
            <div className="flex flex-col gap-px bg-edge border border-edge rounded-[10px] overflow-hidden">
              {SCAN_ROWS.map((r) => (
                <div key={r.num} className="flex items-center gap-2.5 bg-panel px-3 py-2.5">
                  <span className="w-[34px] text-center font-cond font-bold text-[17px] leading-none text-cloud">
                    {r.num}
                  </span>
                  <span className="flex-1 font-medium text-[14px] leading-none">{r.name}</span>
                  <span className="font-semibold text-[11px] leading-none text-dim">{r.pos}</span>
                  {r.low && (
                    <span className="px-[7px] py-[3px] bg-flag-ink rounded-[5px] font-semibold text-[10px] leading-none text-flag">
                      CHECK
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-[22px] pt-[18px] border-t border-edge text-[13px] leading-[1.55] text-dim-2">
          Scanning never overwrites a player already credited with a stat —
          conflicts land in this review list instead.
        </div>
      </div>
    </div>
  );
}
