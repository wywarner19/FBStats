import type {
  GameSetup,
  Penalty,
  PlayEvent,
  PlayResult,
  Situation,
  TeamId,
} from "@/lib/types";
import { PENALTIES } from "./constants";

/** +1 for HOME (attacks 100), -1 for AWAY (attacks 0). */
export function direction(poss: TeamId): 1 | -1 {
  return poss === "H" ? 1 : -1;
}

export function other(poss: TeamId): TeamId {
  return poss === "H" ? "A" : "H";
}

export function ordinal(down: number): string {
  return ["", "1st", "2nd", "3rd", "4th"][down] || "1st";
}

/** Absolute [0,100] spot → readable "NGT 45" / "RVT 30" style label. */
export function spotLabel(spot: number, setup: GameSetup): string {
  const y = Math.round(clampSpot(spot));
  return y <= 50
    ? `${setup.home.abbr} ${y}`
    : `${setup.away.abbr} ${100 - y}`;
}

export function clampSpot(spot: number): number {
  return Math.max(0, Math.min(100, spot));
}

/** Distance from the offense's current spot to the goal it attacks. */
export function yardsToGoal(spot: number, poss: TeamId): number {
  return poss === "H" ? 100 - spot : spot;
}

/** Whether the offense is in a goal-to-go series at a given spot/distance. */
export function isGoalToGo(spot: number, poss: TeamId, dist: number): boolean {
  return yardsToGoal(spot, poss) <= dist;
}

const RESULT_TURNOVER: PlayResult[] = ["Interception", "Fumble lost"];
const KICK_TYPES = new Set(["Punt", "FG"]);

/**
 * The core rule engine: given the situation at snap and a committed play,
 * produce the next situation. Pure — no I/O, no clock. Every automatic rule
 * (down/distance, first down, goal-to-go, TD, safety, touchback, turnover on
 * downs, change of possession) lives here so undo/redo/edit stay deterministic.
 */
export function applyPlay(sit: Situation, play: PlayEvent): Situation {
  // A nullified play (wiped by an accepted penalty) contributes nothing.
  if (play.nullified) return sit;

  // Penalties are handled by their own resolver at commit time; by the time a
  // penalty PlayEvent exists, its `end`/down/dist already reflect enforcement.
  if (play.kind === "Penalty") {
    return applyPenaltyEvent(sit, play);
  }

  if (play.kind === "Control") {
    return applyControlEvent(sit, play);
  }

  if (play.kind === "Try") {
    return applyTryEvent(sit, play);
  }

  const dir = direction(sit.poss);
  const rawEnd = sit.spot + dir * play.yards;

  let scoreH = sit.scoreH;
  let scoreA = sit.scoreA;
  let poss = sit.poss;
  let down = sit.down;
  let dist = sit.dist;
  let spot = clampSpot(rawEnd);

  const crossedOwnGoal = sit.poss === "H" ? rawEnd <= 0 : rawEnd >= 100;
  const crossedAttackGoal = sit.poss === "H" ? rawEnd >= 100 : rawEnd <= 0;

  // Defensive return touchdown (pick-six / scoop-and-score) — the DEFENSE scores.
  if (play.result === "Pick 6" || play.result === "Fumble TD") {
    const def = other(poss);
    if (def === "H") scoreH += 6;
    else scoreA += 6;
    return {
      qtr: sit.qtr,
      poss: def,
      down: 0,
      dist: 0,
      spot: def === "H" ? 97 : 3,
      scoreH,
      scoreA,
      goalToGo: false,
      tryPending: def,
    };
  }

  // Kick/punt return touchdowns are scored by the RECEIVING team, handled in
  // the Punt block below — so kicks never take this offense-TD path.
  const isTouchdown =
    !KICK_TYPES.has(play.kind) && (play.result === "Touchdown" || crossedAttackGoal);

  // --- Scoring outcomes -------------------------------------------------
  if (isTouchdown) {
    // A touchdown is worth 6; the point-after try (PAT/2-pt) is a separate
    // play. Possession stays with the scoring team until the try is resolved.
    if (poss === "H") scoreH += 6;
    else scoreA += 6;
    const trySpot = poss === "H" ? 97 : 3; // NFHS try snapped from the 3
    return {
      qtr: sit.qtr,
      poss,
      down: 0,
      dist: 0,
      spot: trySpot,
      scoreH,
      scoreA,
      goalToGo: false,
      tryPending: poss,
    };
  }

  if (play.result === "Safety" || (crossedOwnGoal && play.kind !== "Punt")) {
    // Ball carrier down in own end zone: 2 points to the defense.
    if (poss === "H") scoreA += 2;
    else scoreH += 2;
    poss = other(poss);
    return kickoffSituation(sit.qtr, poss, scoreH, scoreA, 35);
  }

  if (play.kind === "FG") {
    if (play.result === "Made") {
      if (poss === "H") scoreH += 3;
      else scoreA += 3;
      poss = other(poss);
      return kickoffSituation(sit.qtr, poss, scoreH, scoreA);
    }
    // Missed / blocked: opponent takes over at the spot.
    poss = other(poss);
    return firstAndTen(sit.qtr, poss, clampSpot(spot), scoreH, scoreA);
  }

  // --- Change of possession (no score) ---------------------------------
  if (play.kind === "Punt") {
    const rec = other(poss);
    if (play.result === "Touchdown") {
      // Punt return touchdown — the RECEIVING team scores, PAT owed.
      if (rec === "H") scoreH += 6;
      else scoreA += 6;
      return {
        qtr: sit.qtr,
        poss: rec,
        down: 0,
        dist: 0,
        spot: rec === "H" ? 97 : 3,
        scoreH,
        scoreA,
        goalToGo: false,
        tryPending: rec,
      };
    }
    if (play.result === "Touchback") {
      // Touchback to the receiving team's own 20.
      const tb = rec === "H" ? 20 : 80;
      return firstAndTen(sit.qtr, rec, tb, scoreH, scoreA);
    }
    // Returned / Fair catch / Out of bounds / Downed — receiver takes over at
    // the dead-ball spot (where the field tap / yards put the ball).
    return firstAndTen(sit.qtr, rec, clampSpot(spot), scoreH, scoreA);
  }

  if (RESULT_TURNOVER.includes(play.result)) {
    poss = other(poss);
    return firstAndTen(sit.qtr, poss, clampSpot(spot), scoreH, scoreA);
  }

  // --- Normal down progression -----------------------------------------
  const gained = play.yards;
  // Goal-to-go: the line to gain is at or beyond the goal line, so the only
  // way to a fresh set of downs is to score. Distance tracks yards-to-goal.
  const toGoalAtSnap = yardsToGoal(sit.spot, sit.poss);
  const goalToGoSeries = dist >= toGoalAtSnap;
  const reachedLineToGain =
    !goalToGoSeries && (gained >= dist || play.result === "First down");

  if (reachedLineToGain) {
    return firstAndTen(sit.qtr, poss, spot, scoreH, scoreA);
  }

  down = down + 1;
  dist = goalToGoSeries
    ? Math.max(1, yardsToGoal(spot, poss))
    : Math.max(1, dist - gained);

  if (down > 4) {
    // Turnover on downs — opponent takes over at the dead-ball spot.
    poss = other(poss);
    return firstAndTen(sit.qtr, poss, clampSpot(spot), scoreH, scoreA);
  }

  return {
    qtr: sit.qtr,
    poss,
    down,
    dist,
    spot,
    scoreH,
    scoreA,
    goalToGo: isGoalToGo(spot, poss, dist),
  };
}

function applyTryEvent(sit: Situation, play: PlayEvent): Situation {
  // The scoring team (still in possession during try-pending) adds the try
  // points, then the game returns to a normal kickoff to the other team.
  const team = sit.poss;
  let scoreH = sit.scoreH;
  let scoreA = sit.scoreA;
  const pts = play.scoring?.points ?? 0;
  if (team === "H") scoreH += pts;
  else scoreA += pts;

  const receiving = other(team);
  const base = kickoffSituation(sit.qtr, receiving, scoreH, scoreA);
  // Apply any penalty that was flagged during the try to be enforced on the
  // ensuing kickoff (positive = the receiving team starts farther upfield).
  const adj = sit.kickoffPenalty ?? 0;
  if (adj) {
    const dir = receiving === "H" ? 1 : -1;
    return firstAndTen(sit.qtr, receiving, base.spot + dir * adj, scoreH, scoreA);
  }
  return base;
}

function applyControlEvent(sit: Situation, play: PlayEvent): Situation {
  const c = play.control;
  if (!c) return sit;
  switch (c.op) {
    case "flip": {
      const poss = other(sit.poss);
      return firstAndTen(sit.qtr, poss, 100 - sit.spot, sit.scoreH, sit.scoreA);
    }
    case "resume": {
      const team = c.team ?? sit.poss;
      return kickoffSituation(
        c.qtr ?? sit.qtr,
        team,
        sit.scoreH,
        sit.scoreA,
      );
    }
    case "setSituation": {
      const spot = clampSpot(c.spot ?? sit.spot);
      const down = c.down ?? sit.down;
      const dist = c.dist ?? sit.dist;
      const poss = c.team ?? sit.poss;
      return {
        ...sit,
        poss,
        spot,
        down,
        dist,
        goalToGo: isGoalToGo(spot, poss, dist),
      };
    }
    case "returnTd": {
      // A kickoff return touchdown — the returning team scores (+6, PAT owed).
      const team = c.team ?? sit.poss;
      return {
        ...sit,
        poss: team,
        down: 0,
        dist: 0,
        spot: team === "H" ? 97 : 3,
        scoreH: sit.scoreH + (team === "H" ? 6 : 0),
        scoreA: sit.scoreA + (team === "A" ? 6 : 0),
        goalToGo: false,
        tryPending: team,
      };
    }
    default:
      return sit;
  }
}

function applyPenaltyEvent(sit: Situation, play: PlayEvent): Situation {
  // Re-resolve enforcement from the foul definition against the *folded*
  // situation, so editing an earlier play still re-derives penalty spots.
  const pen = PENALTIES.find((p) => p.name === play.penalty);
  if (!pen) {
    // Unknown / free-form foul logged as a no-play: replay the down.
    return { ...sit, goalToGo: isGoalToGo(sit.spot, sit.poss, sit.dist) };
  }
  const r = resolvePenalty(sit, pen, play.foulSpot);
  // A penalty flagged during a PAT/2-pt try. It can be enforced on the try
  // itself (re-spot, try still owed) or deferred to the ensuing kickoff.
  if (sit.tryPending) {
    if (play.enforceOnKickoff) {
      const adjust = pen.on === "OFF" ? pen.yds : -pen.yds;
      return {
        ...sit,
        tryPending: sit.tryPending,
        kickoffPenalty: (sit.kickoffPenalty ?? 0) + adjust,
      };
    }
    return { ...sit, spot: r.spot, tryPending: sit.tryPending };
  }
  return {
    qtr: sit.qtr,
    poss: sit.poss,
    down: r.down,
    dist: r.dist,
    spot: r.spot,
    scoreH: sit.scoreH,
    scoreA: sit.scoreA,
    goalToGo: isGoalToGo(r.spot, sit.poss, r.dist),
  };
}

export function firstAndTen(
  qtr: number,
  poss: TeamId,
  spot: number,
  scoreH: number,
  scoreA: number,
): Situation {
  const clamped = clampSpot(spot);
  const toGoal = yardsToGoal(clamped, poss);
  const dist = Math.min(10, Math.max(1, toGoal));
  return {
    qtr,
    poss,
    down: 1,
    dist,
    spot: clamped,
    scoreH,
    scoreA,
    goalToGo: toGoal <= 10,
  };
}

/** Receiving team starts a new drive at its own `ownYard` (default 25). */
export function kickoffSituation(
  qtr: number,
  receiving: TeamId,
  scoreH: number,
  scoreA: number,
  ownYard = 25,
): Situation {
  const spot = receiving === "H" ? ownYard : 100 - ownYard;
  return firstAndTen(qtr, receiving, spot, scoreH, scoreA);
}

/**
 * Resolve a penalty against the current situation, returning the enforced
 * post-play situation values. Symmetric in possession direction.
 *
 * The enforcement base is the previous spot (line of scrimmage) unless a
 * `foulSpot` is supplied — NFHS enforces some fouls (intentional grounding,
 * illegal forward pass) from the spot of the foul, and any foul may optionally
 * be marked from a foul spot. Distance is recomputed from the line to gain, so
 * a penalty that carries past the sticks awards a first down by yardage.
 */
export function resolvePenalty(
  sit: Situation,
  pen: Penalty,
  foulSpot?: number,
): { spot: number; down: number; dist: number } {
  const dir = direction(sit.poss);
  const lineToGain = sit.spot + dir * sit.dist;
  const base = foulSpot != null ? clampSpot(foulSpot) : sit.spot;
  let spot: number;
  let down = sit.down;
  let dist: number;

  const toLineToGain = (s: number) => Math.round((lineToGain - s) * dir);

  if (pen.on === "OFF") {
    // Mark BACK toward the offense's own goal from the base spot.
    spot = clampSpot(base - dir * pen.yds);
    if (pen.lossOfDown) down = Math.min(4, down + 1);
    dist = Math.max(1, toLineToGain(spot));
  } else {
    // Mark OFF against the defense, toward their goal, from the base spot.
    spot = clampSpot(base + dir * pen.yds);
    if (pen.autoFirst) {
      down = 1;
      dist = Math.min(10, Math.max(1, yardsToGoal(spot, sit.poss)));
    } else {
      const remaining = toLineToGain(spot);
      if (remaining <= 0) {
        // Penalty yardage reached the line to gain → first down by yardage.
        down = 1;
        dist = Math.min(10, Math.max(1, yardsToGoal(spot, sit.poss)));
      } else {
        dist = Math.max(1, remaining);
      }
    }
  }
  return { spot, down, dist };
}

/** Net yards for the offense from a raw start/end pair in absolute yards. */
export function netYards(start: number, end: number, poss: TeamId): number {
  return Math.round((end - start) * direction(poss));
}

function seedSituation(initial?: Partial<Situation>): Situation {
  return {
    qtr: initial?.qtr ?? 1,
    poss: initial?.poss ?? "H",
    down: initial?.down ?? 1,
    dist: initial?.dist ?? 10,
    spot: initial?.spot ?? 25,
    scoreH: initial?.scoreH ?? 0,
    scoreA: initial?.scoreA ?? 0,
    goalToGo: false,
  };
}

/** Fold the full play list into the live situation. Deterministic. */
export function deriveSituation(
  setup: GameSetup,
  plays: PlayEvent[],
  initial?: Partial<Situation>,
): Situation {
  let sit = seedSituation(initial);
  for (const play of plays) sit = applyPlay(sit, play);
  return sit;
}

/**
 * Re-derive the at-snap situation for every play by folding. Editing an early
 * play recomputes down/distance for all later plays in the log.
 */
export function deriveTimeline(
  setup: GameSetup,
  plays: PlayEvent[],
  initial?: Partial<Situation>,
): { play: PlayEvent; atSnap: Situation }[] {
  let sit = seedSituation(initial);
  const out: { play: PlayEvent; atSnap: Situation }[] = [];
  for (const play of plays) {
    out.push({ play, atSnap: sit });
    sit = applyPlay(sit, play);
  }
  return out;
}
