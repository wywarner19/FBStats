import type { BoxScore, GameState, PlayEvent, Situation, TeamId } from "@/lib/types";
import { deriveSituation, deriveTimeline, yardsToGoal } from "./rules";
import { computeBoxScore, computeDrives } from "./boxscore";
import { parseClock } from "@/lib/format";

const SCRIMMAGE = new Set(["Run", "Pass", "Sack", "Kneel", "FG", "Punt"]);

/** Absolute seconds of game time elapsed at the moment a play was logged. */
function absElapsed(play: PlayEvent, quarterLen: number): number {
  const remaining = parseClock(play.clock) ?? quarterLen;
  return (Math.max(1, play.qtr) - 1) * quarterLen + (quarterLen - remaining);
}

export interface TimeOfPossession {
  H: number;
  A: number;
}

/**
 * Estimate time of possession per team by summing, for each drive, the game
 * time between its first and last snap. Depends on the statistician logging the
 * clock per play (the entry pad captures it automatically).
 */
export function timeOfPossession(game: GameState): TimeOfPossession {
  const QL = game.setup.quarterLengthSec;
  const plays = game.plays.filter((p) => p.kind !== "Control");
  const drives = computeDrives(plays, game.setup);
  const top: TimeOfPossession = { H: 0, A: 0 };
  for (const d of drives) {
    const first = d.plays[0];
    const last = d.plays[d.plays.length - 1];
    const elapsed = absElapsed(last, QL) - absElapsed(first, QL);
    if (elapsed > 0) top[d.poss] += elapsed;
  }
  return top;
}

export interface ScoringEntry {
  team: TeamId;
  qtr: number;
  clock: string;
  points: number;
  kind: string; // TD, FG, Safety, PAT, 2-PT
  text: string;
  scoreH: number;
  scoreA: number;
}

/** Ordered list of every scoring play with the running score after it. */
export function scoringSummary(game: GameState): ScoringEntry[] {
  const timeline = deriveTimeline(game.setup, game.plays, game.anchor);
  const final = deriveSituation(game.setup, game.plays, game.anchor);
  const out: ScoringEntry[] = [];

  timeline.forEach(({ play, atSnap }, i) => {
    const post: Situation = i + 1 < timeline.length ? timeline[i + 1].atSnap : final;
    const dH = post.scoreH - atSnap.scoreH;
    const dA = post.scoreA - atSnap.scoreA;
    if (dH === 0 && dA === 0) return;
    const team: TeamId = dH !== 0 ? "H" : "A";
    const points = Math.abs(dH !== 0 ? dH : dA);
    out.push({
      team,
      qtr: play.qtr,
      clock: play.clock,
      points,
      kind: scoreKind(play, points),
      text: scoreText(game, play, team, points),
      scoreH: post.scoreH,
      scoreA: post.scoreA,
    });
  });
  return out;
}

function scoreKind(play: PlayEvent, points: number): string {
  if (play.kind === "Try") return play.tryType === "kick" ? "PAT" : "2-PT";
  if (play.kind === "FG") return "FG";
  if (points === 2) return "Safety";
  if (points >= 6) return "TD";
  return "SCORE";
}

function scoreText(game: GameState, play: PlayEvent, team: TeamId, points: number): string {
  const abbr = team === "H" ? game.setup.home.abbr : game.setup.away.abbr;
  return `${abbr} ${scoreKind(play, points)}`;
}

// ---- Situational splits ----

export interface Conversions {
  att: number;
  conv: number;
}
export interface TeamSplits {
  thirdDown: Conversions;
  fourthDown: Conversions;
  redZoneTrips: number;
  redZoneTds: number;
  explosive: number;
  runs: number;
  passes: number;
}
export interface Splits {
  H: TeamSplits;
  A: TeamSplits;
}

function emptyTeamSplits(): TeamSplits {
  return {
    thirdDown: { att: 0, conv: 0 },
    fourthDown: { att: 0, conv: 0 },
    redZoneTrips: 0,
    redZoneTds: 0,
    explosive: 0,
    runs: 0,
    passes: 0,
  };
}

/** Down-conversion %, red-zone efficiency, explosive plays, run/pass counts. */
export function situationalSplits(game: GameState): Splits {
  const timeline = deriveTimeline(game.setup, game.plays, game.anchor);
  const splits: Splits = { H: emptyTeamSplits(), A: emptyTeamSplits() };

  for (const { play, atSnap } of timeline) {
    if (!SCRIMMAGE.has(play.kind)) continue;
    const t = splits[atSnap.poss];
    const converted = play.yards >= atSnap.dist || play.result === "First down" || play.result === "Touchdown";

    if (play.kind === "Run") t.runs++;
    if (play.kind === "Pass") t.passes++;

    if (atSnap.down === 3 && (play.kind === "Run" || play.kind === "Pass" || play.kind === "Sack")) {
      t.thirdDown.att++;
      if (converted) t.thirdDown.conv++;
    }
    if (atSnap.down === 4 && (play.kind === "Run" || play.kind === "Pass" || play.kind === "Sack")) {
      t.fourthDown.att++;
      if (converted) t.fourthDown.conv++;
    }

    if (play.kind === "Run" && play.yards >= 12) t.explosive++;
    if (play.kind === "Pass" && play.result !== "Incomplete" && play.result !== "Interception" && play.yards >= 16) {
      t.explosive++;
    }
  }

  // Red-zone: a drive that snaps inside the opponent's 20; TD if it scores one.
  const plays = game.plays.filter((p) => p.kind !== "Control");
  const drives = computeDrives(plays, game.setup);
  for (const d of drives) {
    const reachedRz = d.plays.some((p) => yardsToGoal(p.start, d.poss) <= 20);
    if (!reachedRz) continue;
    splits[d.poss].redZoneTrips++;
    if (d.plays.some((p) => p.result === "Touchdown")) splits[d.poss].redZoneTds++;
  }

  return splits;
}

export function pct(conv: number, att: number): string {
  if (att === 0) return "—";
  return `${Math.round((conv / att) * 100)}%`;
}

// ---- Tendencies (down / distance / hash) ----

export interface TendencyBucket {
  plays: number;
  run: number;
  pass: number;
  yards: number;
  conv: number; // plays that reached the line to gain
}

export interface Tendencies {
  byDown: Record<1 | 2 | 3 | 4, TendencyBucket>;
  byDistance: { short: TendencyBucket; medium: TendencyBucket; long: TendencyBucket };
  byHash: { L: TendencyBucket; M: TendencyBucket; R: TendencyBucket };
  thirdByDistance: { short: TendencyBucket; medium: TendencyBucket; long: TendencyBucket };
}

function bucket(): TendencyBucket {
  return { plays: 0, run: 0, pass: 0, yards: 0, conv: 0 };
}

function distanceBand(dist: number): "short" | "medium" | "long" {
  if (dist <= 3) return "short";
  if (dist <= 6) return "medium";
  return "long";
}

/**
 * Run/pass and conversion tendencies for one team, split by down, distance
 * band (short 1–3 / medium 4–6 / long 7+), and hash. A sack counts as a pass
 * play for the run/pass split. (Formation is intentionally omitted.)
 */
export function tendencies(game: GameState, team: TeamId): Tendencies {
  const timeline = deriveTimeline(game.setup, game.plays, game.anchor);
  const t: Tendencies = {
    byDown: { 1: bucket(), 2: bucket(), 3: bucket(), 4: bucket() },
    byDistance: { short: bucket(), medium: bucket(), long: bucket() },
    byHash: { L: bucket(), M: bucket(), R: bucket() },
    thirdByDistance: { short: bucket(), medium: bucket(), long: bucket() },
  };

  const add = (b: TendencyBucket, play: PlayEvent, converted: boolean) => {
    b.plays++;
    if (play.kind === "Run") b.run++;
    if (play.kind === "Pass" || play.kind === "Sack") b.pass++;
    b.yards += play.yards;
    if (converted) b.conv++;
  };

  for (const { play, atSnap } of timeline) {
    if (atSnap.poss !== team) continue;
    if (play.kind !== "Run" && play.kind !== "Pass" && play.kind !== "Sack") continue;
    const converted =
      play.yards >= atSnap.dist || play.result === "First down" || play.result === "Touchdown";
    const down = Math.min(4, Math.max(1, atSnap.down)) as 1 | 2 | 3 | 4;
    const band = distanceBand(atSnap.dist);

    add(t.byDown[down], play, converted);
    add(t.byDistance[band], play, converted);
    add(t.byHash[play.hash], play, converted);
    if (down === 3) add(t.thirdByDistance[band], play, converted);
  }

  return t;
}

// ---- Season aggregation across stored games ----

export interface SeasonAgg {
  team: string;
  gamesPlayed: number;
  record: { w: number; l: number; t: number };
  box: BoxScore;
  names: Record<number, { name: string; pos: string }>;
  games: { opp: string; result: "W" | "L" | "T"; score: string; date?: string }[];
}

function mergeBox(into: BoxScore, from: BoxScore) {
  for (const [k, v] of Object.entries(from.rush)) {
    const r = (into.rush[+k] ??= { att: 0, yds: 0, td: 0, lg: 0 });
    r.att += v.att; r.yds += v.yds; r.td += v.td; r.lg = Math.max(r.lg, v.lg);
  }
  for (const [k, v] of Object.entries(from.pass)) {
    const r = (into.pass[+k] ??= { att: 0, cmp: 0, yds: 0, td: 0, int: 0 });
    r.att += v.att; r.cmp += v.cmp; r.yds += v.yds; r.td += v.td; r.int += v.int;
  }
  for (const [k, v] of Object.entries(from.rec)) {
    const r = (into.rec[+k] ??= { tgt: 0, rec: 0, yds: 0, td: 0 });
    r.tgt += v.tgt; r.rec += v.rec; r.yds += v.yds; r.td += v.td;
  }
  for (const [k, v] of Object.entries(from.def)) {
    const r = (into.def[+k] ??= { tk: 0, ast: 0, int: 0, fr: 0 });
    r.tk += v.tk; r.ast += v.ast; r.int += v.int; r.fr += v.fr;
  }
  for (const [k, v] of Object.entries(from.kick)) {
    const r = (into.kick[+k] ??= { paMade: 0, paAtt: 0, fgMade: 0, fgAtt: 0 });
    r.paMade += v.paMade; r.paAtt += v.paAtt; r.fgMade += v.fgMade; r.fgAtt += v.fgAtt;
  }
}

/** Sum one program's stats across every stored game it appears in. */
export function aggregateSeason(games: GameState[], teamName: string): SeasonAgg {
  const agg: SeasonAgg = {
    team: teamName,
    gamesPlayed: 0,
    record: { w: 0, l: 0, t: 0 },
    box: { rush: {}, pass: {}, rec: {}, def: {}, kick: {} },
    names: {},
    games: [],
  };

  for (const g of games) {
    const myId: TeamId | null =
      g.setup.home.name === teamName ? "H" : g.setup.away.name === teamName ? "A" : null;
    if (!myId) continue;

    agg.gamesPlayed++;
    mergeBox(agg.box, computeBoxScore(g.plays, myId));

    const roster = myId === "H" ? g.setup.home.roster : g.setup.away.roster;
    for (const p of roster) agg.names[p.num] ??= { name: p.name, pos: p.pos };

    const final = deriveSituation(g.setup, g.plays, g.anchor);
    const my = myId === "H" ? final.scoreH : final.scoreA;
    const th = myId === "H" ? final.scoreA : final.scoreH;
    const result: "W" | "L" | "T" = my > th ? "W" : my < th ? "L" : "T";
    agg.record[result === "W" ? "w" : result === "L" ? "l" : "t"]++;
    const opp = myId === "H" ? g.setup.away : g.setup.home;
    agg.games.push({ opp: opp.abbr, result, score: `${my}–${th}`, date: g.setup.info?.date });
  }

  return agg;
}
