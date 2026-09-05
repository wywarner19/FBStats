import type {
  BoxScore,
  Drive,
  GameSetup,
  PlayEvent,
  TeamId,
} from "@/lib/types";

/**
 * Aggregate the play list into per-player rushing/passing/receiving/defense
 * lines. Pure over the play array, so it recomputes instantly after any
 * undo/edit/delete.
 */
/**
 * Aggregate the play list. With no `team`, keys everything by jersey number
 * across both teams (the live single-game view). With a `team`, attributes
 * offense/kicking to that team's possessions and defense to when that team was
 * NOT in possession — used for per-team season totals where numbers collide.
 */
export function computeBoxScore(plays: PlayEvent[], team?: TeamId): BoxScore {
  const box: BoxScore = { rush: {}, pass: {}, rec: {}, def: {}, kick: {} };

  for (const p of plays) {
    if (p.nullified) continue; // wiped by penalty — no stats
    const offenseMatch = team == null || p.poss === team;
    const defenseMatch = team == null || p.poss !== team;
    if (!offenseMatch && !defenseMatch) continue;
    if (offenseMatch && p.kind === "Run" && p.playerId != null) {
      const r = (box.rush[p.playerId] ??= { att: 0, yds: 0, td: 0, lg: 0 });
      r.att++;
      r.yds += p.yards;
      if (p.result === "Touchdown") r.td++;
      r.lg = Math.max(r.lg, p.yards);
    }

    if (offenseMatch && (p.kind === "Pass" || p.kind === "Sack") && p.playerId != null) {
      const r = (box.pass[p.playerId] ??= {
        att: 0,
        cmp: 0,
        yds: 0,
        td: 0,
        int: 0,
      });
      if (p.kind === "Pass") {
        r.att++;
        if (p.result !== "Incomplete" && p.result !== "Interception") {
          r.cmp++;
          r.yds += p.yards;
        }
        if (p.result === "Touchdown") r.td++;
        if (p.result === "Interception") r.int++;
      } else {
        // Sacks count against passing yards (net), no attempt.
        r.yds += p.yards;
      }
    }

    if (offenseMatch && p.kind === "Pass" && p.targetId != null) {
      const r = (box.rec[p.targetId] ??= { tgt: 0, rec: 0, yds: 0, td: 0 });
      // Every pass thrown his way is a target, even incompletions.
      r.tgt++;
      if (p.result !== "Incomplete" && p.result !== "Interception") {
        r.rec++;
        r.yds += p.yards;
        if (p.result === "Touchdown") r.td++;
      }
    }

    if (offenseMatch && p.kind === "Try" && p.tryType === "kick" && p.kicker != null) {
      const r = (box.kick[p.kicker] ??= { paMade: 0, paAtt: 0, fgMade: 0, fgAtt: 0 });
      r.paAtt++;
      if (p.result === "Made") r.paMade++;
    }
    if (offenseMatch && p.kind === "FG" && p.kicker != null) {
      const r = (box.kick[p.kicker] ??= { paMade: 0, paAtt: 0, fgMade: 0, fgAtt: 0 });
      r.fgAtt++;
      if (p.result === "Made") r.fgMade++;
    }

    const tk = defenseMatch ? (p.tacklers ?? []) : [];
    for (const t of tk) {
      const r = (box.def[t] ??= { tk: 0, ast: 0, int: 0, fr: 0 });
      // Two names on a play => shared/assisted; one name => solo tackle.
      if (tk.length > 1) r.ast++;
      else r.tk++;
    }

    // Interceptor / fumble recoverer (a defender) — stored in `returner`.
    if (defenseMatch && p.returner != null) {
      const r = (box.def[p.returner] ??= { tk: 0, ast: 0, int: 0, fr: 0 });
      if (p.result === "Interception" || p.result === "Pick 6") r.int++;
      else if (p.result === "Fumble lost" || p.result === "Fumble TD") r.fr++;
    }
  }

  return box;
}

/** Group consecutive same-possession plays into drives. */
export function computeDrives(
  plays: PlayEvent[],
  setup: GameSetup,
): Drive[] {
  const drives: Drive[] = [];
  for (const p of plays) {
    const last = drives[drives.length - 1];
    if (last && last.poss === p.poss) {
      last.plays.push(p);
    } else {
      drives.push({
        poss: p.poss,
        plays: [p],
        startSpot: p.start,
        endSpot: p.end,
        netYards: 0,
        result: "",
      });
    }
  }
  for (const d of drives) {
    const first = d.plays[0];
    const last = d.plays[d.plays.length - 1];
    d.startSpot = first.start;
    d.endSpot = last.end;
    d.netYards = d.plays.reduce((t, p) => t + (p.yards || 0), 0);
    d.result = driveResult(d.plays, d.poss);
  }
  return drives;
}

function driveResult(plays: PlayEvent[], poss: TeamId): string {
  const last = plays[plays.length - 1];
  // A TD may be followed by a PAT/2-pt try in the same drive.
  if (plays.some((p) => p.result === "Touchdown")) return "Touchdown";
  if (last.result === "Touchdown") return "Touchdown";
  if (last.kind === "FG" && last.result === "Made") return "Field goal";
  if (last.result === "Interception") return "Interception";
  if (last.result === "Fumble lost") return "Fumble";
  if (last.kind === "Punt") return "Punt";
  if (last.result === "Safety") return "Safety";
  return "In progress";
}
