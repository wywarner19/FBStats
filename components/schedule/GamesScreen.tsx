"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import type { GameState, TeamProfile } from "@/lib/types";
import { deriveSituation } from "@/lib/engine/rules";
import { loadAllGames } from "@/lib/db/dexie";
import { LABEL, cx } from "@/components/ui";

interface Row {
  id: string;
  date: string;
  matchup: string;
  status: string;
  score: string | null;
  example: boolean;
  active: boolean;
}

export function GamesScreen() {
  const teamProfiles = useGameStore((s) => s.teamProfiles);
  const currentGameId = useGameStore((s) => s.currentGameId);
  const gamesRefresh = useGameStore((s) => s.gamesRefresh);
  const gameUpdatedAt = useGameStore((s) => s.game.updatedAt);
  const openGame = useGameStore((s) => s.openGame);
  const createScheduledGame = useGameStore((s) => s.createScheduledGame);
  const removeGame = useGameStore((s) => s.removeGame);
  const setScreen = useGameStore((s) => s.setScreen);

  const [rows, setRows] = useState<Row[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    loadAllGames().then((games) => {
      if (!live) return;
      setRows(games.map((g) => toRow(g, currentGameId)));
    });
    return () => {
      live = false;
    };
  }, [gamesRefresh, gameUpdatedAt, currentGameId]);

  return (
    <div className="flex-1 overflow-auto px-7 pt-6 pb-16">
      <div className="max-w-[920px]">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <h2 className="m-0 font-cond font-bold text-[32px] leading-none">Games</h2>
          <span className="font-medium text-[14px] leading-none text-dim">your schedule</span>
          <div className="flex-1" />
          <button
            onClick={() => setAdding((v) => !v)}
            className="min-h-[44px] px-4 bg-turf border-0 rounded-[10px] text-ink font-cond font-bold text-[14px] tracking-[.06em] cursor-pointer"
          >
            {adding ? "Close" : "+ Add game"}
          </button>
        </div>

        {adding && (
          <AddGameForm
            onDone={() => setAdding(false)}
            profiles={teamProfiles}
            onCreate={createScheduledGame}
            goTeams={() => setScreen("teams")}
          />
        )}

        <div className="flex flex-col gap-px bg-edge border border-edge rounded-[11px] overflow-hidden">
          {rows.length === 0 && (
            <div className="bg-panel px-5 py-8 text-[14px] text-dim-2">
              No games yet. Tap <span className="text-turf font-semibold">+ Add game</span> to build your schedule.
            </div>
          )}
          {rows.map((r) => (
            <div key={r.id} className={cx("flex items-center gap-3 bg-panel px-4 py-3", r.active && "bg-panel-3")}>
              <button onClick={() => openGame(r.id)} className="flex-1 flex items-center gap-3 bg-transparent border-0 text-left cursor-pointer min-w-0">
                <span className="w-[92px] font-semi font-semibold text-[12px] leading-tight tracking-[.06em] text-dim">
                  {r.date || "—"}
                </span>
                <span className="flex-1 font-semibold text-[15px] leading-tight text-cloud truncate">{r.matchup}</span>
                {r.example && (
                  <span className="px-1.5 py-0.5 bg-flag-ink rounded font-semibold text-[9px] leading-none tracking-[.08em] text-flag">EXAMPLE</span>
                )}
                {r.active && (
                  <span className="px-1.5 py-0.5 bg-turf-ink rounded font-semibold text-[9px] leading-none tracking-[.08em] text-turf">OPEN</span>
                )}
                <span className={cx("w-[110px] text-right font-semibold text-[13px] leading-none", r.score ? "text-mist" : "text-dim-2")}>
                  {r.score ?? r.status}
                </span>
              </button>
              <button
                onClick={() => removeGame(r.id)}
                className="min-h-[34px] px-2.5 bg-panel-4 border border-edge-2 rounded-[7px] text-dim-2 font-semibold text-[11px] cursor-pointer hover:text-danger"
                title="Remove game"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {teamProfiles.length === 0 && (
          <div className="mt-4 bg-turf-wash border border-turf-wash-edge rounded-xl p-4 flex items-center gap-3">
            <div className="flex-1 text-[14px] text-slate">
              Set up your team first so its roster fills into every game.
            </div>
            <button onClick={() => setScreen("teams")} className="min-h-[44px] px-4 bg-panel-4 border border-turf rounded-[10px] text-turf font-semibold text-[13px] cursor-pointer">
              Set up team
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function toRow(g: GameState, currentId: string | null): Row {
  const scoring = g.plays.filter((p) => p.kind !== "Control").length;
  const sit = deriveSituation(g.setup, g.plays, g.anchor);
  const opp = g.setup.away.abbr;
  const venueSym = g.venue === "away" ? "@" : g.venue === "neutral" ? "vs (N)" : "vs";
  return {
    id: g.id,
    date: g.setup.info?.date ?? "",
    matchup: `${g.setup.home.abbr} ${venueSym} ${opp}`,
    status: scoring === 0 ? "Scheduled" : "In progress",
    score: scoring === 0 ? null : `${g.setup.home.abbr} ${sit.scoreH} – ${sit.scoreA} ${opp}`,
    example: !!g.example,
    active: g.id === currentId,
  };
}

function AddGameForm({
  profiles,
  onCreate,
  onDone,
  goTeams,
}: {
  profiles: TeamProfile[];
  onCreate: (o: { profileId: string; opponentProfileId?: string; opponentName?: string; opponentAbbr?: string; date?: string; venue?: "home" | "away" | "neutral" }) => Promise<void>;
  onDone: () => void;
  goTeams: () => void;
}) {
  const myTeams = profiles.filter((p) => p.mine !== false);
  const opponents = profiles.filter((p) => p.mine === false);

  const [profileId, setProfileId] = useState(myTeams[0]?.id ?? "");
  // "" sentinel = a brand-new opponent (show name/abbr inputs).
  const [oppId, setOppId] = useState<string>(opponents[0]?.id ?? "");
  const [oppName, setOppName] = useState("");
  const [oppAbbr, setOppAbbr] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState<"home" | "away" | "neutral">("home");

  if (myTeams.length === 0) {
    return (
      <div className="mb-4 bg-panel border border-edge rounded-xl p-5 text-[14px] text-dim">
        You need a team profile first.{" "}
        <button onClick={goTeams} className="text-turf font-semibold underline cursor-pointer">Set up your team →</button>
      </div>
    );
  }

  const isNew = oppId === "";
  const submit = async () => {
    if (isNew) {
      if (!oppName.trim() && !oppAbbr) return;
      await onCreate({ profileId, opponentName: oppName, opponentAbbr: oppAbbr || oppName.slice(0, 3).toUpperCase(), date, venue });
    } else {
      await onCreate({ profileId, opponentProfileId: oppId, date, venue });
    }
    setOppName("");
    setOppAbbr("");
    setDate("");
    onDone();
  };

  const input = "h-11 bg-panel-3 border border-edge-3 rounded-[9px] px-3 font-medium text-[15px] text-cloud outline-none placeholder:text-dim-2";

  return (
    <div className="mb-4 bg-panel border border-edge rounded-xl p-5">
      <div className={`${LABEL} text-[10px] mb-3`}>ADD A GAME</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-dim">YOUR TEAM</span>
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className={input}>
            {myTeams.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.abbr})</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-dim">DATE</span>
          <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Fri, Sep 12" className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-dim">OPPONENT</span>
          <select value={oppId} onChange={(e) => setOppId(e.target.value)} className={input}>
            {opponents.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.abbr}){p.roster.length ? ` · ${p.roster.length}` : ""}</option>
            ))}
            <option value="">＋ New opponent…</option>
          </select>
        </label>
        {isNew ? (
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-dim">NAME</span>
              <input value={oppName} onChange={(e) => setOppName(e.target.value)} placeholder="Riverton Prep" className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-dim">ABBR</span>
              <input value={oppAbbr} onChange={(e) => setOppAbbr(e.target.value.toUpperCase().slice(0, 4))} placeholder="RVT" className={input} />
            </label>
          </div>
        ) : (
          <div className="flex items-end">
            <p className="m-0 text-[12px] leading-snug text-dim-2">
              Their roster rolls over from your last meeting — edit it any time under <button onClick={goTeams} className="text-turf font-semibold cursor-pointer">Teams</button>.
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] text-dim">VENUE</span>
        {(["home", "away", "neutral"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVenue(v)}
            className={cx(
              "min-h-[38px] px-3.5 rounded-[8px] border font-semibold text-[13px] leading-none cursor-pointer capitalize",
              venue === v ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <button onClick={submit} className="min-h-[48px] px-5 bg-turf border-0 rounded-[10px] text-ink font-cond font-bold text-[15px] tracking-[.06em] cursor-pointer">
        Add to schedule
      </button>
    </div>
  );
}
