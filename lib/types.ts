/**
 * Core domain types for FBStats Live.
 *
 * Field model
 * -----------
 * The playing field is a single absolute axis `spot` in [0, 100] yards:
 *   - 0   is HOME's own goal line (HOME's end zone).
 *   - 100 is AWAY's own goal line (AWAY's end zone).
 * HOME's offense attacks toward 100; AWAY's offense attacks toward 0.
 * A team's `direction` is +1 for HOME, -1 for AWAY, so a gain of `y` yards
 * moves the spot by `direction * y`. This is the same convention the design
 * prototype uses and keeps every rule branch symmetric.
 */

export type TeamId = "H" | "A";
export type Hash = "L" | "M" | "R";

export type PlayType = "Run" | "Pass" | "Sack" | "Punt" | "FG" | "Kneel";
/**
 * Penalties, PAT/2-pt tries, and manual corrections are logged as PlayEvents
 * too, so the whole game is one ordered, foldable timeline. Stats aggregators
 * ignore any kind other than the real scrimmage play types.
 */
export type PlayKind = PlayType | "Penalty" | "Control" | "Try";

/** How a point-after-touchdown try was attempted. */
export type TryType = "kick" | "run" | "pass";

/** Optional descriptor of how a pass ended (beyond complete/incomplete). */
export type PassDetail =
  | "Dropped"
  | "Overthrown"
  | "Underthrown"
  | "Thrown away"
  | "Deflected";
export const PASS_DETAILS: PassDetail[] = [
  "Dropped",
  "Overthrown",
  "Underthrown",
  "Thrown away",
  "Deflected",
];

/** A non-play timeline entry: halftime resume, manual possession flip, etc. */
export interface ControlOp {
  op: "flip" | "resume" | "setSituation";
  team?: TeamId;
  qtr?: number;
  spot?: number;
  down?: number;
  dist?: number;
  label: string;
}

export type EntryModel = "A" | "B" | "C";

export type PlayResult =
  | "Tackle"
  | "First down"
  | "Out of bounds"
  | "Touchdown"
  | "Fumble lost"
  | "Complete"
  | "Incomplete"
  | "Interception"
  | "Returned"
  | "Fair catch"
  | "Touchback"
  | "Downed"
  | "Made"
  | "Missed"
  | "Blocked"
  | "Safety"
  | "—";

export type Personnel = "10" | "11" | "12" | "21" | "22";
export type Formation = "Gun" | "Ace" | "Trips" | "Wing" | "Empty";

export interface Player {
  /** Stable identity, independent of jersey number (numbers can change). */
  id: string;
  /** Jersey number. 0 is the reserved "unknown jersey" placeholder. */
  num: number;
  name: string;
  pos: string;
  /** Two-way athletes may be flagged on both units without a duplicate row. */
  twoWay?: boolean;
}

export type Roster = Player[];

export interface Team {
  id: TeamId;
  name: string;
  abbr: string;
  roster: Roster;
}

export interface Penalty {
  name: string;
  yds: number;
  /** Which unit committed the foul. */
  on: "OFF" | "DEF";
  autoFirst?: boolean;
  lossOfDown?: boolean;
  /** False start etc. — down is replayed. */
  replay?: boolean;
  /**
   * True for fouls that NFHS enforces from the spot of the foul rather than the
   * previous spot (e.g. intentional grounding). The entry UI then requires a
   * foul spot; any foul may optionally be marked from a foul spot too.
   */
  spotFoul?: boolean;
}

/**
 * An immutable record of one committed play. The full game situation is a
 * pure fold of the PlayEvent list (see `deriveSituation`), so a PlayEvent
 * never needs to embed a "before" snapshot — undo/redo/edit all recompute.
 */
export interface PlayEvent {
  id: string;
  /** Monotonic sequence, assigned on commit; used for stable ordering. */
  seq: number;
  kind: PlayKind;

  // Situation captured AT SNAP (redundant with the fold, but retained so a
  // single play reads correctly in the log without replaying the whole game).
  qtr: number;
  clock: string; // "m:ss" as it read when the play was logged
  poss: TeamId;
  down: number;
  dist: number;
  start: number; // spot at snap

  // Outcome
  end: number; // spot where the play ended
  yards: number; // net yards for the offense (can be negative)
  result: PlayResult;

  // Attribution (jersey numbers, matching the possessing/defending rosters)
  playerId: number | null; // ball carrier / passer
  targetId: number | null; // receiver, on a pass
  tacklers: number[]; // 0, 1 (solo) or 2 (assist) defenders

  // Optional enrichment
  form?: Formation | null;
  hash: Hash;
  pers?: Personnel | null;

  // Passing detail (optional enrichment; targetId holds the intended receiver
  // whether or not the pass was completed).
  passDetail?: PassDetail | null;

  // Kicking roles (PAT / FG / kickoff). Kicker is required on a kick.
  kicker?: number | null;
  holder?: number | null;
  snapper?: number | null;
  /** Kick returner on a kickoff/punt return. */
  returner?: number | null;

  // Penalty-only
  penalty?: string;
  penYds?: number;
  /** A foul during a try enforced on the ensuing kickoff instead of the try. */
  enforceOnKickoff?: boolean;
  /** Absolute spot of the foul when enforced from the spot rather than the LOS. */
  foulSpot?: number;

  // Control-only
  control?: ControlOp;

  // Try-only (PAT / 2-point conversion)
  tryType?: TryType;

  /** Points scored on this play, credited to `poss`'s opponent for a safety. */
  scoring?: Scoring | null;

  /**
   * Review state. `edited` is set automatically when a committed play's yardage
   * or spot is changed; `flagged` is a manual "come back to this" mark. Missing
   * critical info (tackler / intended receiver) is detected live, not stored.
   */
  review?: PlayReview;

  note?: string;
}

export interface PlayReview {
  edited?: boolean;
  flagged?: boolean;
  note?: string;
}

export interface Scoring {
  team: TeamId;
  kind: "TD" | "FG" | "Safety" | "PAT" | "TwoPt";
  points: number;
}

/** The in-progress play being assembled in the entry pad (UI-owned). */
export interface PlayDraft {
  type: PlayType | null;
  form: Formation | null;
  hash: Hash;
  pers: Personnel | null;
  playerId: number | null;
  targetId: number | null;
  yards: number | null;
  result: PlayResult | null;
  tacklers: number[];
  /** Absolute end spot when set by tapping the field. */
  end: number | null;
  passDetail: PassDetail | null;
  kicker: number | null;
  holder: number | null;
  snapper: number | null;
}

/** The live, fully-derived situation. Never stored — always folded. */
export interface Situation {
  qtr: number;
  poss: TeamId;
  down: number;
  dist: number;
  spot: number;
  scoreH: number;
  scoreA: number;
  /** True when the offense has a goal-to-go series. */
  goalToGo: boolean;
  /**
   * Set to the team that just scored a touchdown and now owes a PAT / 2-point
   * try. While set, the entry UI shows the try prompt instead of normal entry.
   */
  tryPending?: TeamId | null;
  /**
   * Pending yardage to apply to the next kickoff spot from a penalty flagged
   * during the try (positive = the receiving team starts farther upfield).
   */
  kickoffPenalty?: number;
}

/** Free-form game metadata for the report header and season records. */
export interface GameInfo {
  date?: string;
  location?: string;
  weather?: string;
  surface?: string;
  officials?: string;
  attendance?: string;
  notes?: string;
}

/** Setup that does not change during play (or changes rarely, via actions). */
export interface GameSetup {
  home: Team;
  away: Team;
  quarterLengthSec: number;
  kickoff: string;
  meta: string;
  info?: GameInfo;
}

/**
 * The complete, serializable game document. `plays` is the source of truth;
 * `situation` is a memoized fold and `redo` supports continuous redo.
 */
export interface GameState {
  id: string;
  setup: GameSetup;
  /** The situation the fold starts from (state before the first play). */
  anchor: Situation;
  /** Current starting quarterback per team; pre-fills the passer each play. */
  qb: Record<TeamId, number | null>;
  /** Charged timeouts remaining this half per team (NFHS: 3 each). */
  timeouts: Record<TeamId, number>;
  plays: PlayEvent[];
  redo: PlayEvent[];
  // Live clock (not derived — it ticks independently of the play log).
  qtr: number;
  clockSec: number;
  running: boolean;
  seqCounter: number;
  updatedAt: number;
}

// ---- Box score aggregates ----

export interface RushLine {
  att: number;
  yds: number;
  td: number;
  lg: number;
}
export interface PassLine {
  att: number;
  cmp: number;
  yds: number;
  td: number;
  int: number;
}
export interface RecLine {
  tgt: number;
  rec: number;
  yds: number;
  td: number;
}
export interface DefLine {
  tk: number;
  ast: number;
}
export interface KickLine {
  paMade: number;
  paAtt: number;
  fgMade: number;
  fgAtt: number;
}

export interface BoxScore {
  rush: Record<number, RushLine>;
  pass: Record<number, PassLine>;
  rec: Record<number, RecLine>;
  def: Record<number, DefLine>;
  kick: Record<number, KickLine>;
}

export interface Drive {
  poss: TeamId;
  plays: PlayEvent[];
  startSpot: number;
  endSpot: number;
  netYards: number;
  result: string;
}
