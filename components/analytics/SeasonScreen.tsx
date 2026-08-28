"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { aggregateSeason, type SeasonAgg } from "@/lib/engine/analytics";
import { loadAllGames } from "@/lib/db/dexie";
import { LABEL, cx } from "@/components/ui";

export function SeasonScreen() {
  const game = useGameStore((s) => s.game);
  const teamProfiles = useGameStore((s) => s.teamProfiles);
  const startNewGame = useGameStore((s) => s.startNewGame);

  // Team options: your profiles, plus any home team seen in a stored game.
  const [teamName, setTeamName] = useState(game.setup.home.name);
  const [teamOptions, setTeamOptions] = useState<string[]>([]);

  const [agg, setAgg] = useState<SeasonAgg | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    loadAllGames()
      .then((games) => {
        if (!live) return;
        // Your teams only — opponents (mine === false) never aggregate here.
        const names = new Set<string>(teamProfiles.filter((t) => t.mine !== false).map((t) => t.name));
        games.forEach((g) => names.add(g.setup.home.name));
        setTeamOptions([...names]);
        setAgg(aggregateSeason(games, teamName));
      })
      .catch((e) => console.error("season load failed", e))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [teamName, teamProfiles, game.updatedAt]);

  const name = (num: number) => agg?.names[num]?.name ?? `#${num}`;

  const table = (
    title: string,
    cols: string,
    obj: Record<number, unknown> | undefined,
    fmt: (v: never) => string,
  ) => {
    const rows = Object.keys(obj ?? {});
    return (
      <div className="bg-panel border border-edge rounded-xl overflow-hidden">
        <div className="flex justify-between px-4 py-3 border-b border-edge">
          <span className="font-semi font-semibold text-[11px] leading-none tracking-[.18em] text-turf">{title}</span>
          <span className="font-semi font-semibold text-[11px] leading-none tracking-[.14em] text-dim-2">{cols}</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-4 text-[14px] text-dim-2">No stats yet.</div>
        ) : (
          rows.map((k) => (
            <div key={k} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1b2028]">
              <span className="w-[38px] font-cond font-bold text-[18px] leading-none text-dim">#{k}</span>
              <span className="flex-1 font-medium text-[14px] leading-none text-cloud">{name(+k)}</span>
              <span className="font-semi font-semibold text-[14px] leading-none tracking-[.06em] text-mist">
                {fmt((obj as Record<number, never>)[+k])}
              </span>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto px-7 pt-6 pb-[50px]">
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <h2 className="m-0 font-cond font-bold text-[30px] leading-none">Season</h2>
        <select
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="min-h-[40px] px-3 bg-panel-4 border border-edge-2 rounded-[9px] text-cloud font-semibold text-[14px] outline-none cursor-pointer"
        >
          {teamOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={startNewGame}
          className="min-h-[44px] px-4 bg-panel-4 border border-turf rounded-[10px] text-turf font-semibold text-[13px] leading-none cursor-pointer"
        >
          + New game
        </button>
      </div>

      {loading && <div className="text-dim-2 text-[14px]">Loading season…</div>}

      {agg && !loading && (
        <>
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="bg-panel border border-edge rounded-xl px-5 py-4">
              <div className={`${LABEL} text-[10px] mb-2`}>RECORD</div>
              <div className="font-cond font-bold text-[30px] leading-none text-cloud">
                {agg.record.w}–{agg.record.l}{agg.record.t ? `–${agg.record.t}` : ""}
              </div>
            </div>
            <div className="bg-panel border border-edge rounded-xl px-5 py-4">
              <div className={`${LABEL} text-[10px] mb-2`}>GAMES</div>
              <div className="font-cond font-bold text-[30px] leading-none text-cloud">{agg.gamesPlayed}</div>
            </div>
            {agg.games.map((gm, i) => (
              <div key={i} className="bg-panel border border-edge rounded-xl px-4 py-4 min-w-[110px]">
                <div className={`${LABEL} text-[10px] mb-2`}>vs {gm.opp}</div>
                <div className="flex items-baseline gap-2">
                  <span className={cx("font-cond font-bold text-[22px] leading-none", gm.result === "W" ? "text-turf" : gm.result === "L" ? "text-danger" : "text-dim")}>
                    {gm.result}
                  </span>
                  <span className="font-semibold text-[14px] leading-none text-mist">{gm.score}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))]">
            {table("RUSHING", "ATT · YDS · TD · LG", agg.box.rush, (v: (typeof agg.box.rush)[number]) => `${v.att} · ${v.yds} · ${v.td} · ${v.lg}`)}
            {table("PASSING", "C/ATT · YDS · TD · INT", agg.box.pass, (v: (typeof agg.box.pass)[number]) => `${v.cmp}/${v.att} · ${v.yds} · ${v.td} · ${v.int}`)}
            {table("RECEIVING", "TGT · REC · YDS · TD", agg.box.rec, (v: (typeof agg.box.rec)[number]) => `${v.tgt} · ${v.rec} · ${v.yds} · ${v.td}`)}
            {table("DEFENSE", "TK · AST", agg.box.def, (v: (typeof agg.box.def)[number]) => `${v.tk} · ${v.ast}`)}
            {table("KICKING", "PAT · FG", agg.box.kick, (v: (typeof agg.box.kick)[number]) => `${v.paMade}/${v.paAtt} · ${v.fgMade}/${v.fgAtt}`)}
          </div>
        </>
      )}
    </div>
  );
}
