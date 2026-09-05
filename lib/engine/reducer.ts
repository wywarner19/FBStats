import type {
  ControlOp,
  GameState,
  Hash,
  Penalty,
  Player,
  PlayDraft,
  PlayEvent,
  Situation,
  TeamId,
  TryType,
} from "@/lib/types";
import {
  clampSpot,
  deriveSituation,
  direction,
  ordinal,
  resolvePenalty,
  spotLabel,
} from "./rules";

/**
 * Actions the pure game reducer understands. The reducer never touches the
 * DOM, the clock, or storage; it maps a GameState + Action to a new GameState.
 */
export type GameAction =
  | { type: "COMMIT_PLAY"; draft: PlayDraft; clock: string }
  | {
      type: "APPLY_PENALTY";
      penalty: Penalty;
      clock: string;
      enforceOnKickoff?: boolean;
      foulSpot?: number;
    }
  | {
      type: "APPLY_TRY";
      tryType: TryType;
      made: boolean;
      playerId?: number | null;
      targetId?: number | null;
      kicker?: number | null;
      holder?: number | null;
      snapper?: number | null;
      clock: string;
    }
  | { type: "CONTROL"; control: ControlOp }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "EDIT_PLAY"; id: string; patch: Partial<PlayEvent> }
  | { type: "ADJUST_YARDS"; id: string; delta: number }
  | { type: "TOGGLE_FLAG"; id: string }
  | { type: "SET_QB"; team: TeamId; num: number }
  | { type: "SET_CLOUD_ID"; cloudId: string }
  | { type: "SET_ROSTER_PHOTO"; photo: string | null }
  | { type: "UPDATE_INFO"; patch: Partial<import("@/lib/types").GameInfo> }
  | { type: "NUDGE_SPOT"; delta: number }
  | { type: "DELETE_PLAY"; id: string }
  | { type: "ADD_PLAYER"; team: TeamId; player: { num: number; name: string; pos: string } }
  | { type: "UPDATE_PLAYER"; team: TeamId; id: string; patch: Partial<Pick<Player, "num" | "name" | "pos" | "twoWay">> }
  | { type: "REMOVE_PLAYER"; team: TeamId; id: string }
  | { type: "TAKE_TIMEOUT"; team: TeamId }
  | { type: "INJURY_TIMEOUT" }
  | { type: "RESET_TIMEOUTS" }
  | {
      type: "KICKOFF";
      receiving: TeamId;
      kicker: number | null;
      returner?: number | null;
      result: "Touchback" | "Returned" | "Onside" | "Out of bounds" | "TD";
      toSpot?: number | null;
      qtr?: number;
      resetClock?: boolean;
    }
  | { type: "END_QUARTER" }
  | { type: "SET_CLOCK"; sec: number }
  | { type: "TICK" }
  | { type: "SET_RUNNING"; running: boolean }
  | { type: "SET_QUARTER"; qtr: number };

export function currentSituation(g: GameState): Situation {
  return deriveSituation(g.setup, g.plays, g.anchor);
}

function nextId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a Control PlayEvent that carries `control` and is inert on the fold
 * unless the control op changes the situation. */
function controlPlay(g: GameState, control: ControlOp): PlayEvent {
  const sit = currentSituation(g);
  return {
    id: nextId(),
    seq: g.seqCounter + 1,
    kind: "Control",
    qtr: g.qtr,
    clock: "",
    poss: sit.poss,
    down: sit.down,
    dist: sit.dist,
    start: sit.spot,
    end: sit.spot,
    yards: 0,
    result: "—",
    playerId: null,
    targetId: null,
    tacklers: [],
    hash: "M",
    control,
  };
}

/** Build an immutable PlayEvent from the draft against the live situation. */
export function draftToPlay(
  draft: PlayDraft,
  sit: Situation,
  g: GameState,
  clock: string,
): PlayEvent {
  const dir = direction(sit.poss);
  const yards = draft.yards ?? 0;
  const end = clampSpot(sit.spot + dir * yards);
  const type = draft.type ?? "Run";
  // A field-crossing gain on a scrimmage play auto-promotes to a touchdown.
  const rawEnd = sit.spot + dir * yards;
  const crossed = sit.poss === "H" ? rawEnd >= 100 : rawEnd <= 0;
  const scoring = crossed && type !== "Punt" && type !== "FG";
  const result = scoring ? "Touchdown" : (draft.result ?? "—");
  return {
    id: nextId(),
    seq: g.seqCounter + 1,
    kind: type,
    qtr: g.qtr,
    clock,
    poss: sit.poss,
    down: sit.down,
    dist: sit.dist,
    start: sit.spot,
    end,
    yards,
    result,
    playerId: draft.playerId,
    targetId: draft.targetId,
    tacklers: draft.tacklers ?? [],
    form: draft.form,
    hash: draft.hash,
    pers: draft.pers,
    passDetail: type === "Pass" ? draft.passDetail : null,
    kicker: type === "FG" ? draft.kicker : null,
    holder: type === "FG" ? draft.holder : null,
    snapper: type === "FG" ? draft.snapper : null,
    returner: type === "Punt" ? (draft.returner ?? null) : null,
    scoring:
      result === "Touchdown"
        ? // A punt return TD is scored by the receiving team, not the punter's.
          { team: type === "Punt" ? (sit.poss === "H" ? "A" : "H") : sit.poss, kind: "TD", points: 6 }
        : null,
    review: draft.flag ? { flagged: true } : undefined,
  };
}

export function gameReducer(g: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "COMMIT_PLAY": {
      const sit = currentSituation(g);
      const play = draftToPlay(action.draft, sit, g, action.clock);
      return {
        ...g,
        plays: [...g.plays, play],
        redo: [], // committing a new play invalidates the redo stack
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "APPLY_PENALTY": {
      const sit = currentSituation(g);
      const r = resolvePenalty(sit, action.penalty, action.foulSpot);
      const play: PlayEvent = {
        id: nextId(),
        seq: g.seqCounter + 1,
        kind: "Penalty",
        qtr: g.qtr,
        clock: action.clock,
        poss: sit.poss,
        down: sit.down,
        dist: sit.dist,
        start: sit.spot,
        end: r.spot,
        yards: 0,
        result: "—",
        playerId: null,
        targetId: null,
        tacklers: [],
        hash: "M",
        penalty: action.penalty.name,
        penYds: action.penalty.yds,
        enforceOnKickoff: action.enforceOnKickoff,
        foulSpot: action.foulSpot,
      };
      return {
        ...g,
        plays: [...g.plays, play],
        redo: [],
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "APPLY_TRY": {
      const sit = currentSituation(g);
      const points = action.made ? (action.tryType === "kick" ? 1 : 2) : 0;
      const play: PlayEvent = {
        id: nextId(),
        seq: g.seqCounter + 1,
        kind: "Try",
        qtr: g.qtr,
        clock: action.clock,
        poss: sit.poss,
        down: 0,
        dist: 0,
        start: sit.spot,
        end: sit.spot,
        yards: 0,
        result: action.made ? "Made" : "Missed",
        playerId: action.playerId ?? null,
        targetId: action.targetId ?? null,
        tacklers: [],
        hash: "M",
        tryType: action.tryType,
        kicker: action.tryType === "kick" ? (action.kicker ?? null) : null,
        holder: action.tryType === "kick" ? (action.holder ?? null) : null,
        snapper: action.tryType === "kick" ? (action.snapper ?? null) : null,
        scoring: {
          team: sit.poss,
          kind: action.tryType === "kick" ? "PAT" : "TwoPt",
          points,
        },
      };
      return {
        ...g,
        plays: [...g.plays, play],
        redo: [],
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "CONTROL": {
      const play: PlayEvent = {
        id: nextId(),
        seq: g.seqCounter + 1,
        kind: "Control",
        qtr: g.qtr,
        clock: "",
        poss: currentSituation(g).poss,
        down: 0,
        dist: 0,
        start: 0,
        end: 0,
        yards: 0,
        result: "—",
        playerId: null,
        targetId: null,
        tacklers: [],
        hash: "M",
        control: action.control,
      };
      return {
        ...g,
        plays: [...g.plays, play],
        redo: [],
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "UNDO": {
      if (!g.plays.length) return g;
      const last = g.plays[g.plays.length - 1];
      return {
        ...g,
        plays: g.plays.slice(0, -1),
        redo: [...g.redo, last],
        updatedAt: Date.now(),
      };
    }

    case "REDO": {
      if (!g.redo.length) return g;
      const restored = g.redo[g.redo.length - 1];
      return {
        ...g,
        plays: [...g.plays, restored],
        redo: g.redo.slice(0, -1),
        updatedAt: Date.now(),
      };
    }

    case "EDIT_PLAY": {
      return {
        ...g,
        plays: g.plays.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
        redo: [], // an edit invalidates redo
        updatedAt: Date.now(),
      };
    }

    case "ADJUST_YARDS": {
      // Yard-by-yard correction of a committed play. Marks it edited so it
      // surfaces for review (stats may need a second look during a break).
      return {
        ...g,
        plays: g.plays.map((p) =>
          p.id === action.id
            ? {
                ...p,
                yards: p.yards + action.delta,
                end: clampSpot(p.end + direction(p.poss) * action.delta),
                review: { ...(p.review ?? {}), edited: true },
              }
            : p,
        ),
        redo: [],
        updatedAt: Date.now(),
      };
    }

    case "TOGGLE_FLAG": {
      return {
        ...g,
        plays: g.plays.map((p) =>
          p.id === action.id
            ? { ...p, review: { ...(p.review ?? {}), flagged: !p.review?.flagged } }
            : p,
        ),
        updatedAt: Date.now(),
      };
    }

    case "SET_QB": {
      return {
        ...g,
        qb: { ...g.qb, [action.team]: action.num },
        updatedAt: Date.now(),
      };
    }

    case "SET_CLOUD_ID":
      return { ...g, cloudId: action.cloudId, updatedAt: Date.now() };

    case "SET_ROSTER_PHOTO":
      return { ...g, rosterPhoto: action.photo ?? undefined, updatedAt: Date.now() };

    case "UPDATE_INFO": {
      return {
        ...g,
        setup: { ...g.setup, info: { ...(g.setup.info ?? {}), ...action.patch } },
        updatedAt: Date.now(),
      };
    }

    case "NUDGE_SPOT": {
      // Manually move the current line of scrimmage a yard at a time. Recorded
      // as a control event so it undoes and re-derives like everything else.
      const sit = currentSituation(g);
      const spot = clampSpot(sit.spot + action.delta);
      const control: ControlOp = {
        op: "setSituation",
        spot,
        label: `Ball spotted at ${spotLabel(spot, g.setup)}`,
      };
      const play: PlayEvent = {
        id: nextId(),
        seq: g.seqCounter + 1,
        kind: "Control",
        qtr: g.qtr,
        clock: "",
        poss: sit.poss,
        down: sit.down,
        dist: sit.dist,
        start: sit.spot,
        end: spot,
        yards: 0,
        result: "—",
        playerId: null,
        targetId: null,
        tacklers: [],
        hash: "M",
        control,
      };
      return {
        ...g,
        plays: [...g.plays, play],
        redo: [],
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "DELETE_PLAY": {
      return {
        ...g,
        plays: g.plays.filter((p) => p.id !== action.id),
        redo: [],
        updatedAt: Date.now(),
      };
    }

    case "ADD_PLAYER": {
      const p = { id: nextId(), num: action.player.num, name: action.player.name, pos: action.player.pos };
      const key = action.team === "H" ? "home" : "away";
      return {
        ...g,
        setup: {
          ...g.setup,
          [key]: { ...g.setup[key], roster: [...g.setup[key].roster, p] },
        },
        updatedAt: Date.now(),
      };
    }

    case "UPDATE_PLAYER": {
      const key = action.team === "H" ? "home" : "away";
      const roster = g.setup[key].roster.map((p) =>
        p.id === action.id ? { ...p, ...action.patch } : p,
      );
      return {
        ...g,
        setup: { ...g.setup, [key]: { ...g.setup[key], roster } },
        updatedAt: Date.now(),
      };
    }

    case "REMOVE_PLAYER": {
      const key = action.team === "H" ? "home" : "away";
      const roster = g.setup[key].roster.filter((p) => p.id !== action.id);
      return {
        ...g,
        setup: { ...g.setup, [key]: { ...g.setup[key], roster } },
        updatedAt: Date.now(),
      };
    }

    case "TAKE_TIMEOUT": {
      const abbr = action.team === "H" ? g.setup.home.abbr : g.setup.away.abbr;
      const remaining = Math.max(0, (g.timeouts[action.team] ?? 3) - 1);
      const play = controlPlay(g, {
        op: "setSituation",
        label: `Timeout — ${abbr} (${remaining} left)`,
      });
      return {
        ...g,
        timeouts: { ...g.timeouts, [action.team]: remaining },
        running: false,
        plays: [...g.plays, play],
        redo: [],
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "INJURY_TIMEOUT": {
      // Official's / injury timeout — clock stops but no team is charged.
      const play = controlPlay(g, { op: "setSituation", label: "Injury timeout — no charge" });
      return {
        ...g,
        running: false,
        plays: [...g.plays, play],
        redo: [],
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "RESET_TIMEOUTS":
      return { ...g, timeouts: { H: 3, A: 3 }, updatedAt: Date.now() };

    case "KICKOFF": {
      const kicking = action.receiving === "H" ? "A" : "H";
      const kickerLbl = action.kicker != null ? `#${action.kicker}` : "";

      // Return touchdown — the receiving team scores (handled by the fold).
      let control: ControlOp;
      if (action.result === "TD") {
        control = {
          op: "returnTd",
          team: action.receiving,
          label: `Kickoff ${kickerLbl} · returned for TD`.trim(),
        };
      } else {
        // Onside recovery keeps the ball with the kicking team; otherwise the
        // receiving team takes over.
        const poss = action.result === "Onside" ? kicking : action.receiving;
        const ownYard =
          action.result === "Touchback"
            ? 20 // NFHS kickoff touchback → receiving team's own 20
            : action.result === "Onside"
              ? 45 // kicking team recovers near its own 45
              : action.result === "Out of bounds"
                ? 40 // kickoff OOB → receiving team's own 40
                : (action.toSpot ?? 25); // return spot as own-yard, default 25
        const spot = poss === "H" ? ownYard : 100 - ownYard;
        control = {
          op: "setSituation",
          team: poss,
          spot,
          down: 1,
          dist: 10,
          label: `Kickoff ${kickerLbl} · ${action.result}`.trim(),
        };
      }
      const play = controlPlay(g, control);
      play.kicker = action.kicker;
      play.returner = action.returner ?? null;
      return {
        ...g,
        qtr: action.qtr ?? g.qtr,
        clockSec: action.resetClock ? g.setup.quarterLengthSec : g.clockSec,
        running: false,
        plays: [...g.plays, play],
        redo: [],
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "END_QUARTER": {
      // Q1→Q2 and Q3→Q4: teams change ends, clock resets. Possession, down,
      // distance and the yard line all carry over (only the physical end swaps).
      const play = controlPlay(g, {
        op: "setSituation",
        label: `End of Q${g.qtr} — teams change ends`,
      });
      return {
        ...g,
        qtr: g.qtr + 1,
        clockSec: g.setup.quarterLengthSec,
        running: false,
        plays: [...g.plays, play],
        redo: [],
        seqCounter: g.seqCounter + 1,
        updatedAt: Date.now(),
      };
    }

    case "SET_CLOCK":
      return { ...g, clockSec: Math.max(0, action.sec), updatedAt: Date.now() };

    case "TICK": {
      if (!g.running || g.clockSec <= 0) return g;
      return { ...g, clockSec: g.clockSec - 1 };
    }

    case "SET_RUNNING":
      return { ...g, running: action.running };

    case "SET_QUARTER":
      return { ...g, qtr: action.qtr, updatedAt: Date.now() };

    default:
      return g;
  }
}

/** Human-readable label for a resolved penalty, for toasts. */
export function penaltyPreview(g: GameState, penalty: Penalty, foulSpot?: number): string {
  const sit = currentSituation(g);
  const r = resolvePenalty(sit, penalty, foulSpot);
  return `${ordinal(r.down)} & ${r.dist} at ${spotLabel(r.spot, g.setup)}`;
}

/** Convenience: an empty draft. */
export function blankDraft(hash: Hash = "M"): PlayDraft {
  return {
    type: null,
    form: null,
    hash,
    pers: "11",
    playerId: null,
    targetId: null,
    yards: null,
    result: null,
    tacklers: [],
    end: null,
    passDetail: null,
    kicker: null,
    holder: null,
    snapper: null,
    returner: null,
  };
}
