import type {
  GameSetup,
  GameState,
  PlayEvent,
  Player,
  Team,
  TeamProfile,
} from "@/lib/types";
import { SEED_AWAY, SEED_HOME } from "./constants";
import { COLUMBIA_CITY_ROSTER, NORTHRIDGE_ROSTER } from "./gameSeeds";

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  // Timestamp + counter + randomness so ids never collide across sessions
  // (games and profiles are keyed by these in IndexedDB).
  return `${prefix}-${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 6)}`;
}

function toRoster(rows: { n: number; name: string; pos: string }[]): Player[] {
  return rows.map((r) => ({ id: id("p"), num: r.n, name: r.name, pos: r.pos }));
}

export function makeTeam(
  teamId: "H" | "A",
  name: string,
  abbr: string,
  rows: { n: number; name: string; pos: string }[],
): Team {
  return { id: teamId, name, abbr, roster: toRoster(rows) };
}

export function defaultSetup(): GameSetup {
  return {
    home: makeTeam("H", "Northgate Wolves", "NGT", SEED_HOME),
    away: makeTeam("A", "Riverton Prep", "RVT", SEED_AWAY),
    quarterLengthSec: 12 * 60,
    kickoff: "Fri 7:00 PM",
    meta: "Week 3 · district game",
    info: { date: "", location: "", weather: "", surface: "Turf", officials: "", attendance: "" },
  };
}

/** First QB-position jersey on a roster, used as the default starting QB. */
function firstQb(setup: GameSetup, team: "H" | "A"): number | null {
  const roster = team === "H" ? setup.home.roster : setup.away.roster;
  const qb = roster.find((p) => p.pos === "QB");
  return qb ? qb.num : null;
}

export function defaultQbs(setup: GameSetup): Record<"H" | "A", number | null> {
  return { H: firstQb(setup, "H"), A: firstQb(setup, "A") };
}

/**
 * Backfill fields added after a game was first saved, so documents persisted by
 * an older version of the app still load. Idempotent.
 */
export function normalizeGame(g: GameState): GameState {
  return {
    ...g,
    setup: { ...g.setup, info: g.setup.info ?? {} },
    qb: g.qb ?? defaultQbs(g.setup),
    timeouts: g.timeouts ?? { H: 3, A: 3 },
    redo: g.redo ?? [],
    plays: (g.plays ?? []).map((p) => ({
      passDetail: null,
      kicker: null,
      holder: null,
      snapper: null,
      ...p,
    })),
  };
}

/**
 * A brand-new, scoreless game: HOME receives, 1st & 10 at its own 25.
 */
export function newGame(setup: GameSetup = defaultSetup()): GameState {
  return {
    id: id("game"),
    setup,
    anchor: {
      qtr: 1,
      poss: "H",
      down: 1,
      dist: 10,
      spot: 25,
      scoreH: 0,
      scoreA: 0,
      goalToGo: false,
    },
    qb: defaultQbs(setup),
    timeouts: { H: 3, A: 3 },
    plays: [],
    redo: [],
    qtr: 1,
    clockSec: setup.quarterLengthSec,
    running: false,
    seqCounter: 0,
    updatedAt: Date.now(),
  };
}

/**
 * The demo game from the prototype: mid-third-quarter, 21–17, with six recent
 * plays already logged so every screen has data to render on first load.
 */
export function demoGame(): GameState {
  const setup = defaultSetup();
  const seeds: Omit<PlayEvent, "id" | "seq">[] = [
    { kind: "Run", qtr: 3, clock: "11:04", poss: "H", down: 1, dist: 10, start: 25, end: 31, yards: 6, result: "Tackle", playerId: 22, targetId: null, tacklers: [44], form: "Ace", hash: "M", pers: "21" },
    { kind: "Pass", qtr: 3, clock: "10:31", poss: "H", down: 2, dist: 4, start: 31, end: 31, yards: 0, result: "Incomplete", playerId: 7, targetId: 11, tacklers: [], form: "Trips", hash: "L", pers: "11" },
    { kind: "Pass", qtr: 3, clock: "10:24", poss: "H", down: 3, dist: 4, start: 31, end: 48, yards: 17, result: "Complete", playerId: 7, targetId: 84, tacklers: [21], form: "Trips", hash: "L", pers: "11" },
    { kind: "Run", qtr: 3, clock: "9:48", poss: "H", down: 1, dist: 10, start: 48, end: 52, yards: 4, result: "Tackle", playerId: 28, targetId: null, tacklers: [52, 90], form: "Ace", hash: "R", pers: "12" },
    { kind: "Penalty", qtr: 3, clock: "9:12", poss: "H", down: 2, dist: 6, start: 52, end: 52, yards: 0, result: "—", playerId: null, targetId: null, tacklers: [], hash: "M", penalty: "False Start", penYds: 5 },
    { kind: "Run", qtr: 3, clock: "9:05", poss: "H", down: 2, dist: 11, start: 52, end: 59, yards: 7, result: "Tackle", playerId: 22, targetId: null, tacklers: [44, 33], form: "Gun", hash: "M", pers: "11" },
  ];
  const plays: PlayEvent[] = seeds.map((s, i) => ({
    ...s,
    id: id("seed"),
    seq: i + 1,
    passDetail: null,
    kicker: null,
    holder: null,
    snapper: null,
  }));
  return {
    id: id("game"),
    setup,
    qb: defaultQbs(setup),
    timeouts: { H: 3, A: 3 },
    // State just before the first seeded play: HOME ball, own 25, 21–17.
    anchor: {
      qtr: 3,
      poss: "H",
      down: 1,
      dist: 10,
      spot: 25,
      scoreH: 21,
      scoreA: 17,
      goalToGo: false,
    },
    plays,
    redo: [],
    qtr: 3,
    clockSec: 8 * 60 + 42,
    running: false,
    seqCounter: plays.length,
    updatedAt: Date.now(),
  };
}

/** The built-in example game (the demo), flagged so it reads as a sample. */
export function exampleGame(): GameState {
  const g = demoGame();
  return {
    ...g,
    example: true,
    venue: "home",
    setup: { ...g.setup, info: { ...(g.setup.info ?? {}), date: "Example game" } },
  };
}

/** A starter team profile from the seed roster, offered on first run. */
export function defaultTeamProfile(): TeamProfile {
  return {
    id: id("team"),
    name: "Northgate Wolves",
    abbr: "NGT",
    roster: toRoster(SEED_HOME),
    updatedAt: Date.now(),
    mine: true,
  };
}

/** A blank team profile the user fills in (a your-team by default). */
export function blankTeamProfile(name = "", abbr = "", mine = true): TeamProfile {
  return { id: id("team"), name, abbr, roster: [], updatedAt: Date.now(), mine };
}

export function makeRosterPlayer(num: number, name: string, pos: string): Player {
  return { id: id("p"), num, name, pos };
}

/**
 * Create a fresh, scoreless game for the schedule from one of the user's team
 * profiles (which becomes HOME in the data model) versus a named opponent.
 */
/**
 * Tonight's real game: Columbia City @ Northridge, with both full 26-27 varsity
 * rosters loaded. The user coaches Columbia City, so CC is the "your team" that
 * owns the game (HOME in the data model, season stats roll up to it) even though
 * they play at Northridge — hence venue "away". Northridge is the opponent
 * profile so its roster rolls over if the teams meet again.
 */
export function tonightSeed(): { mine: TeamProfile; opponent: TeamProfile; game: GameState } {
  const mine: TeamProfile = {
    id: id("team"),
    name: "Columbia City Eagles",
    abbr: "CC",
    roster: toRoster(COLUMBIA_CITY_ROSTER),
    updatedAt: Date.now(),
    mine: true,
  };
  const opponent: TeamProfile = {
    id: id("team"),
    name: "Northridge Raiders",
    abbr: "NR",
    roster: toRoster(NORTHRIDGE_ROSTER),
    updatedAt: Date.now(),
    mine: false,
  };
  const game = gameFromProfile(mine, opponent, { date: "Tonight", venue: "away" });
  return { mine, opponent, game };
}

/**
 * Create a fresh, scoreless game for the schedule from one of the user's team
 * profiles (HOME in the data model) versus an opponent. Passing the opponent's
 * `roster` (from its profile or the last meeting) rolls it over so it isn't
 * re-entered; `id` links the game to the opponent profile for future rematches.
 */
export function gameFromProfile(
  profile: TeamProfile,
  opponent: { name: string; abbr: string; roster?: Player[]; id?: string },
  opts: { date?: string; venue?: "home" | "away" | "neutral" } = {},
): GameState {
  const home: Team = {
    id: "H",
    name: profile.name,
    abbr: profile.abbr,
    roster: profile.roster.map((p) => ({ ...p })),
  };
  const away: Team = {
    id: "A",
    name: opponent.name,
    abbr: opponent.abbr,
    roster: (opponent.roster ?? []).map((p) => ({ ...p })),
  };
  const setup: GameSetup = {
    home,
    away,
    quarterLengthSec: 12 * 60,
    kickoff: "",
    meta: "",
    info: {
      date: opts.date ?? "",
      location: opts.venue === "away" ? "Away" : opts.venue === "neutral" ? "Neutral" : "Home",
      weather: "",
      surface: "Turf",
      officials: "",
      attendance: "",
    },
  };
  const g = newGame(setup);
  return {
    ...g,
    teamProfileId: profile.id,
    opponentProfileId: opponent.id,
    venue: opts.venue ?? "home",
  };
}
