import type { GameState, TeamId } from "@/lib/types";
import { computeBoxScore } from "@/lib/engine/boxscore";
import { allPlayers } from "@/lib/format";

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * MaxPreps-compatible per-player stat CSV. MaxPreps imports a flat row per
 * athlete with the standard football counting stats; unused columns are left
 * blank. One file covers a full game for a single team.
 */
export function toMaxPrepsCsv(g: GameState, team: TeamId = "H"): string {
  const box = computeBoxScore(g.plays);
  const roster = team === "H" ? g.setup.home.roster : g.setup.away.roster;
  const header = [
    "Jersey",
    "Player",
    "Pos",
    "Rush Att",
    "Rush Yds",
    "Rush TD",
    "Rush Long",
    "Pass Comp",
    "Pass Att",
    "Pass Yds",
    "Pass TD",
    "Pass Int",
    "Rec",
    "Rec Yds",
    "Rec TD",
    "Tackles",
    "Assists",
  ];

  const lines = [header.map(esc).join(",")];
  for (const p of roster) {
    const r = box.rush[p.num];
    const ps = box.pass[p.num];
    const rc = box.rec[p.num];
    const d = box.def[p.num];
    // Skip players with no recorded stat to keep the upload clean.
    if (!r && !ps && !rc && !d) continue;
    lines.push(
      [
        p.num,
        p.name,
        p.pos,
        r?.att ?? 0,
        r?.yds ?? 0,
        r?.td ?? 0,
        r?.lg ?? 0,
        ps?.cmp ?? 0,
        ps?.att ?? 0,
        ps?.yds ?? 0,
        ps?.td ?? 0,
        ps?.int ?? 0,
        rc?.rec ?? 0,
        rc?.yds ?? 0,
        rc?.td ?? 0,
        d?.tk ?? 0,
        d?.ast ?? 0,
      ]
        .map(esc)
        .join(","),
    );
  }
  return lines.join("\n");
}
