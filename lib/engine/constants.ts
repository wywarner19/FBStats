import type {
  Formation,
  Penalty,
  Personnel,
  PlayResult,
  PlayType,
} from "@/lib/types";

export const PLAY_TYPES: PlayType[] = [
  "Run",
  "Pass",
  "Sack",
  "Punt",
  "FG",
  "Kneel",
];

/** Valid results per play type, in the order they appear in the pad. */
export const RESULTS: Record<PlayType, PlayResult[]> = {
  Run: ["Tackle", "First down", "Out of bounds", "Touchdown", "Fumble lost", "Fumble TD"],
  Pass: ["Complete", "Incomplete", "Sack", "Touchdown", "Interception", "Pick 6", "Fumble lost", "Fumble TD"],
  Sack: ["Tackle", "Fumble lost", "Fumble TD"],
  Punt: ["Returned", "Fair catch", "Out of bounds", "Touchback", "Downed", "Touchdown"],
  FG: ["Made", "Missed", "Blocked"],
  Kneel: ["Tackle"],
};

export const PERSONNEL: Personnel[] = ["10", "11", "12", "21", "22"];
export const FORMATIONS: Formation[] = ["Gun", "Ace", "Trips", "Wing", "Empty"];

/**
 * NFHS football penalties (adopted by the IHSAA for Indiana high school
 * football). Enforcement per NFHS rules — notably: the ONLY fouls that carry an
 * automatic first down are the roughing fouls (passer / kicker / holder /
 * snapper) and defensive pass interference. Personal fouls, face mask, and
 * unsportsmanlike conduct are NOT automatic first downs (unlike NFL rules).
 * `on` is the fouling unit relative to the current offense; `replay` marks a
 * dead-ball foul that does not wipe out a live-ball play. Grouped by yardage.
 */
export const PENALTIES: Penalty[] = [
  // --- 5 yards ---
  { name: "False Start", yds: 5, on: "OFF", replay: true },
  { name: "Encroachment", yds: 5, on: "DEF", replay: true },
  { name: "Offside — defense", yds: 5, on: "DEF" },
  { name: "Delay of Game", yds: 5, on: "OFF", replay: true },
  { name: "Illegal Substitution", yds: 5, on: "OFF" },
  { name: "Illegal Formation", yds: 5, on: "OFF" },
  { name: "Illegal Motion", yds: 5, on: "OFF" },
  { name: "Illegal Shift", yds: 5, on: "OFF" },
  { name: "Illegal Procedure", yds: 5, on: "OFF" },
  { name: "Too Many Players", yds: 5, on: "OFF" },
  { name: "Running Into the Kicker", yds: 5, on: "DEF" },
  { name: "Illegal Forward Pass", yds: 5, on: "OFF", lossOfDown: true, spotFoul: true },
  // --- 10 yards ---
  { name: "Holding — offense", yds: 10, on: "OFF" },
  { name: "Holding — defense", yds: 10, on: "DEF" },
  { name: "Illegal Use of Hands", yds: 10, on: "OFF" },
  { name: "Illegal Block in the Back", yds: 10, on: "OFF" },
  { name: "Tripping", yds: 10, on: "OFF" },
  // --- 15 yards ---
  { name: "Pass Interference — defense", yds: 15, on: "DEF", autoFirst: true },
  { name: "Pass Interference — offense", yds: 15, on: "OFF" },
  { name: "Roughing the Passer", yds: 15, on: "DEF", autoFirst: true },
  { name: "Roughing the Kicker", yds: 15, on: "DEF", autoFirst: true },
  { name: "Roughing the Snapper/Holder", yds: 15, on: "DEF", autoFirst: true },
  { name: "Face Mask (15)", yds: 15, on: "DEF" },
  { name: "Personal Foul", yds: 15, on: "DEF" },
  { name: "Unsportsmanlike Conduct", yds: 15, on: "DEF" },
  { name: "Illegal Helmet Contact / Spearing", yds: 15, on: "DEF" },
  { name: "Horse Collar Tackle", yds: 15, on: "DEF" },
  { name: "Block Below the Waist", yds: 15, on: "OFF" },
  { name: "Chop Block", yds: 15, on: "OFF" },
  { name: "Clipping", yds: 15, on: "OFF" },
  { name: "Kick-Catch Interference", yds: 15, on: "DEF" },
  { name: "Face Mask (incidental)", yds: 5, on: "DEF" },
  // --- loss of down (no yardage) ---
  { name: "Intentional Grounding", yds: 0, on: "OFF", lossOfDown: true, spotFoul: true },
  { name: "Illegal Touching", yds: 0, on: "OFF", lossOfDown: true, spotFoul: true },
];

/** Seed rosters from the prototype, kept for the demo game. */
export const SEED_HOME = [
  { n: 7, name: "J. Alvarez", pos: "QB" },
  { n: 22, name: "D. Whitfield", pos: "RB" },
  { n: 28, name: "K. Osei", pos: "RB" },
  { n: 11, name: "T. Brennan", pos: "WR" },
  { n: 84, name: "M. Duarte", pos: "WR" },
  { n: 19, name: "C. Reyes", pos: "WR" },
  { n: 88, name: "S. Kowalski", pos: "TE" },
  { n: 34, name: "L. Fontaine", pos: "FB" },
  { n: 2, name: "B. Sandoval", pos: "QB" },
  { n: 55, name: "A. Boone", pos: "C" },
  { n: 71, name: "G. Petrov", pos: "LT" },
  { n: 66, name: "H. Nakamura", pos: "RG" },
];

export const SEED_AWAY = [
  { n: 44, name: "R. Mbeki", pos: "LB" },
  { n: 52, name: "W. Tanaka", pos: "LB" },
  { n: 9, name: "E. Cortez", pos: "CB" },
  { n: 21, name: "N. Halvorsen", pos: "S" },
  { n: 33, name: "P. Adeyemi", pos: "S" },
  { n: 97, name: "V. Dumont", pos: "DE" },
  { n: 90, name: "O. Kessler", pos: "DT" },
  { n: 56, name: "F. Villanueva", pos: "LB" },
  { n: 5, name: "Q. Bristow", pos: "CB" },
  { n: 12, name: "Z. Okafor", pos: "QB" },
  { n: 24, name: "M. Lindqvist", pos: "RB" },
  { n: 81, name: "J. Prieto", pos: "WR" },
];

export const QUICK_YARDS = [-5, -2, 0, 2, 4, 6, 8, 12, 20];
export const FIX_YARDS = [-5, -2, -1, 1, 2, 5];
export const CLOCK_NUDGES: [number, string][] = [
  [-5, "−5s"],
  [-10, "−10s"],
  [-25, "−25s"],
  [-40, "−40s"],
  [5, "+5s"],
];
