"use client";

import { useGameStore } from "@/store/useGameStore";
import { computeBoxScore } from "@/lib/engine/boxscore";
import { deriveTimeline, spotLabel } from "@/lib/engine/rules";
import {
  pct,
  situationalSplits,
  timeOfPossession,
} from "@/lib/engine/analytics";
import { clockLabel, downLabel, playText, possAbbr, sitText, who } from "@/lib/format";
import type { BoxScore, TeamId } from "@/lib/types";
import { LABEL, cx } from "@/components/ui";

function topBy<T>(obj: Record<number, T>, score: (v: T) => number): [number, T] | null {
  let best: [number, T] | null = null;
  let bestScore = -Infinity;
  for (const [k, v] of Object.entries(obj)) {
    const s = score(v);
    if (s > bestScore) {
      bestScore = s;
      best = [Number(k), v];
    }
  }
  return best;
}

function topLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function BroadcastDashboard() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const setBroadcast = useGameStore((s) => s.setBroadcast);

  const { home, away } = game.setup;
  const boxH = computeBoxScore(game.plays, "H");
  const boxA = computeBoxScore(game.plays, "A");
  const splits = situationalSplits(game);
  const top = timeOfPossession(game);

  const timeline = deriveTimeline(game.setup, game.plays, game.anchor);
  const feed = timeline
    .map(({ play, atSnap }, i) => ({
      key: play.id,
      n: i + 1,
      qtr: `Q${play.qtr}`,
      clock: play.clock,
      sit: play.kind === "Control" ? "" : sitText(game.setup, atSnap),
      text: playText(game.setup, play),
      td: play.result === "Touchdown",
      score: !!play.scoring,
      flag: play.kind === "Penalty",
      control: play.kind === "Control",
    }))
    .reverse();
  const latest = feed[0];

  const teamNet = (team: TeamId) =>
    game.plays
      .filter((p) => p.poss === team && ["Run", "Pass", "Sack"].includes(p.kind))
      .reduce((t, p) => t + (p.yards || 0), 0);
  const teamPlays = (team: TeamId) =>
    game.plays.filter((p) => p.poss === team && ["Run", "Pass", "Sack", "Punt", "FG", "Kneel"].includes(p.kind)).length;
  const firstDowns = (team: TeamId) =>
    timeline.filter(
      ({ play, atSnap }) =>
        atSnap.poss === team &&
        (play.kind === "Run" || play.kind === "Pass") &&
        (play.yards >= atSnap.dist || play.result === "First down" || play.result === "Touchdown"),
    ).length;

  return (
    <div className="fixed inset-0 z-50 bg-ink text-cloud font-barlow overflow-auto">
      {/* Scoreboard header */}
      <div className="sticky top-0 z-10 bg-panel-2 border-b border-edge">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <ScoreBlock abbr={home.abbr} name={home.name} score={sit.scoreH} to={game.timeouts?.H ?? 3} poss={sit.poss === "H"} />
          <div className="font-cond font-bold text-[22px] text-dim-2">vs</div>
          <ScoreBlock abbr={away.abbr} name={away.name} score={sit.scoreA} to={game.timeouts?.A ?? 3} poss={sit.poss === "A"} />
          <div className="flex-1" />
          <div className="text-center">
            <div className="font-cond font-bold text-[40px] leading-none">{clockLabel(game.clockSec)}</div>
            <div className={`${LABEL} text-[11px] mt-1`}>Q{game.qtr}</div>
          </div>
          <div className="text-center min-w-[150px]">
            <div className="font-cond font-bold text-[30px] leading-none text-turf">{downLabel(sit)}</div>
            <div className="font-semibold text-[15px] leading-none text-cloud mt-1.5">
              {sit.tryPending ? "TRY" : `${spotLabel(sit.spot, game.setup)}`} · {possAbbr(game, sit)} ball
            </div>
          </div>
          <button
            onClick={() => setBroadcast(false)}
            className="min-h-[44px] px-4 bg-panel-4 border border-edge-2 rounded-[10px] text-dim font-semibold text-[13px] cursor-pointer hover:text-cloud"
          >
            Exit
          </button>
        </div>
        {latest && (
          <div className="px-6 py-2.5 bg-panel border-t border-edge flex items-center gap-3">
            <span className="px-2 py-1 bg-turf-ink rounded-[5px] font-bold text-[10px] tracking-[.14em] text-turf">LATEST</span>
            <span className="font-medium text-[17px] leading-tight text-cloud">{latest.text}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Play-by-play */}
        <div className="bg-panel border border-edge rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-edge">
            <span className={`${LABEL} text-[11px]`}>PLAY-BY-PLAY</span>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {feed.map((p) => (
              <div
                key={p.key}
                className={cx(
                  "flex items-baseline gap-3 px-5 py-2.5 border-b border-[#1b2028]",
                  p.control && "bg-panel-2",
                )}
              >
                <span className="w-[64px] font-semi font-semibold text-[12px] leading-none tracking-[.06em] text-dim-2">
                  {p.qtr} {p.clock}
                </span>
                {p.sit && (
                  <span className="w-[120px] font-semibold text-[13px] leading-none text-mist">{p.sit}</span>
                )}
                <span className={cx("flex-1 text-[15px] leading-snug", p.control ? "text-dim italic" : "text-cloud font-medium")}>
                  {p.text}
                </span>
                {p.td && <span className="px-2 py-1 bg-turf-ink rounded-[5px] font-bold text-[10px] tracking-[.1em] text-turf">TD</span>}
                {p.flag && <span className="px-2 py-1 bg-flag-ink rounded-[5px] font-bold text-[10px] tracking-[.1em] text-flag">FLAG</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Leaders + team stats */}
        <div className="flex flex-col gap-4">
          <TeamPanel
            teamId="H"
            abbr={home.abbr}
            box={boxH}
            setup={game.setup}
            net={teamNet("H")}
            plays={teamPlays("H")}
            firstDowns={firstDowns("H")}
            third={`${splits.H.thirdDown.conv}/${splits.H.thirdDown.att} · ${pct(splits.H.thirdDown.conv, splits.H.thirdDown.att)}`}
            top={topLabel(top.H)}
          />
          <TeamPanel
            teamId="A"
            abbr={away.abbr}
            box={boxA}
            setup={game.setup}
            net={teamNet("A")}
            plays={teamPlays("A")}
            firstDowns={firstDowns("A")}
            third={`${splits.A.thirdDown.conv}/${splits.A.thirdDown.att} · ${pct(splits.A.thirdDown.conv, splits.A.thirdDown.att)}`}
            top={topLabel(top.A)}
          />
        </div>
      </div>
    </div>
  );
}

function ScoreBlock({ abbr, name, score, to, poss }: { abbr: string; name: string; score: number; to: number; poss: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-cond font-bold text-[22px] leading-none tracking-[.06em]">{abbr}</span>
          {poss && <span className="w-2.5 h-2.5 rounded-full bg-turf" title="Has the ball" />}
        </div>
        <div className="flex gap-1 mt-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cx("w-2 h-2 rounded-full", i < to ? "bg-turf" : "bg-edge-2")} />
          ))}
        </div>
      </div>
      <div className="font-cond font-bold text-[52px] leading-none">{score}</div>
    </div>
  );
}

function TeamPanel({
  teamId,
  abbr,
  box,
  setup,
  net,
  plays,
  firstDowns,
  third,
  top,
}: {
  teamId: TeamId;
  abbr: string;
  box: BoxScore;
  setup: import("@/lib/types").GameSetup;
  net: number;
  plays: number;
  firstDowns: number;
  third: string;
  top: string;
}) {
  const rush = topBy(box.rush, (v) => v.yds);
  const pass = topBy(box.pass, (v) => v.yds);
  const rec = topBy(box.rec, (v) => v.yds);
  const def = topBy(box.def, (v) => v.tk + v.ast);
  const nm = (n: number) => who(setup, n).replace(/^#\d+\s/, "") || `#${n}`;

  const stats = [
    { label: "Total yds", value: `${net}` },
    { label: "Plays", value: `${plays}` },
    { label: "1st downs", value: `${firstDowns}` },
    { label: "3rd down", value: third },
    { label: "Time of poss.", value: top },
  ];
  const leaders = [
    rush && { role: "RUSH", line: `#${rush[0]} ${nm(rush[0])} — ${rush[1].att} for ${rush[1].yds}${rush[1].td ? `, ${rush[1].td} TD` : ""}` },
    pass && { role: "PASS", line: `#${pass[0]} ${nm(pass[0])} — ${pass[1].cmp}/${pass[1].att}, ${pass[1].yds}${pass[1].td ? `, ${pass[1].td} TD` : ""}${pass[1].int ? `, ${pass[1].int} INT` : ""}` },
    rec && { role: "REC", line: `#${rec[0]} ${nm(rec[0])} — ${rec[1].rec} for ${rec[1].yds}${rec[1].td ? `, ${rec[1].td} TD` : ""}` },
    def && { role: "TACK", line: `#${def[0]} ${nm(def[0])} — ${def[1].tk} solo${def[1].ast ? `, ${def[1].ast} ast` : ""}` },
  ].filter(Boolean) as { role: string; line: string }[];

  return (
    <div className={cx("bg-panel border rounded-xl overflow-hidden", teamId === "H" ? "border-turf-edge" : "border-flag-edge")}>
      <div className="flex items-center gap-2 px-5 py-3 border-b border-edge">
        <span className={cx("font-cond font-bold text-[20px] leading-none tracking-[.06em]", teamId === "H" ? "text-turf" : "text-flag")}>{abbr}</span>
        <span className={`${LABEL} text-[10px]`}>LEADERS & STATS</span>
      </div>
      <div className="px-5 py-3 flex flex-col gap-1.5 border-b border-edge">
        {leaders.length === 0 ? (
          <div className="text-dim-2 text-[13px]">No stats yet.</div>
        ) : (
          leaders.map((l) => (
            <div key={l.role} className="flex gap-2.5 items-baseline">
              <span className="w-[42px] font-semi font-semibold text-[10px] tracking-[.12em] text-dim-2">{l.role}</span>
              <span className="flex-1 font-medium text-[14px] leading-tight text-cloud">{l.line}</span>
            </div>
          ))
        )}
      </div>
      <div className="grid grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="px-3 py-2.5 border-r border-[#1b2028] last:border-r-0 text-center">
            <div className="font-cond font-bold text-[18px] leading-none">{s.value}</div>
            <div className="font-semi font-semibold text-[9px] tracking-[.08em] text-dim-2 mt-1.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
