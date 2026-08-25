"use client";

import { useGameStore } from "@/store/useGameStore";
import { computeBoxScore } from "@/lib/engine/boxscore";
import { clockLabel, who } from "@/lib/format";

export function BoxScoreScreen() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const openCard = useGameStore((s) => s.openCard);
  const box = computeBoxScore(game.plays);

  const mkRows = (obj: Record<number, unknown>, fmt: (v: never) => string) =>
    Object.keys(obj).map((k) => {
      const id = Number(k);
      return {
        num: `#${id}`,
        name: who(game.setup, id).replace(/^#\d+\s/, ""),
        stat: fmt(obj[id] as never),
        onClick: () => openCard(id),
      };
    });

  const tables = [
    { title: "RUSHING", cols: "ATT · YDS · TD · LG", rows: mkRows(box.rush, (v: (typeof box.rush)[number]) => `${v.att} · ${v.yds} · ${v.td} · ${v.lg}`) },
    { title: "PASSING", cols: "C/ATT · YDS · TD · INT", rows: mkRows(box.pass, (v: (typeof box.pass)[number]) => `${v.cmp}/${v.att} · ${v.yds} · ${v.td} · ${v.int}`) },
    { title: "RECEIVING", cols: "TGT · REC · YDS · TD", rows: mkRows(box.rec, (v: (typeof box.rec)[number]) => `${v.tgt} · ${v.rec} · ${v.yds} · ${v.td}`) },
    { title: "DEFENSE", cols: "TK · AST", rows: mkRows(box.def, (v: (typeof box.def)[number]) => `${v.tk} · ${v.ast}`) },
    { title: "KICKING", cols: "PAT · FG", rows: mkRows(box.kick, (v: (typeof box.kick)[number]) => `${v.paMade}/${v.paAtt} · ${v.fgMade}/${v.fgAtt}`) },
  ];

  return (
    <div className="flex-1 overflow-auto px-7 pt-6 pb-[50px]">
      <div className="flex items-center gap-4 mb-5">
        <h2 className="m-0 font-cond font-bold text-[30px] leading-none">Live box score</h2>
        <span className="font-medium text-[14px] leading-none text-dim">
          {game.setup.home.abbr} {sit.scoreH} · {game.setup.away.abbr} {sit.scoreA} · Q{game.qtr} {clockLabel(game.clockSec)}
        </span>
      </div>
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        {tables.map((t) => (
          <div key={t.title} className="bg-panel border border-edge rounded-xl overflow-hidden">
            <div className="flex justify-between px-4 py-3 border-b border-edge">
              <span className="font-semi font-semibold text-[11px] leading-none tracking-[.18em] text-turf">{t.title}</span>
              <span className="font-semi font-semibold text-[11px] leading-none tracking-[.14em] text-dim-2">{t.cols}</span>
            </div>
            {t.rows.length === 0 ? (
              <div className="px-4 py-[22px] text-[14px] leading-none text-dim-2">No plays logged yet.</div>
            ) : (
              t.rows.map((r) => (
                <button
                  key={r.num}
                  onClick={r.onClick}
                  className="flex w-full items-center gap-3 px-4 py-2.5 bg-transparent border-0 border-b border-[#1b2028] cursor-pointer text-left hover:bg-panel-3"
                >
                  <span className="w-[38px] font-cond font-bold text-[19px] leading-none text-dim">{r.num}</span>
                  <span className="flex-1 font-medium text-[15px] leading-none text-cloud">{r.name}</span>
                  <span className="font-semi font-semibold text-[15px] leading-none tracking-[.06em] text-mist">{r.stat}</span>
                </button>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
