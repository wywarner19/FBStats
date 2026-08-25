import type {
  GameSetup,
  GameState,
  PlayEvent,
  Player,
  Situation,
  TeamId,
} from "@/lib/types";
import { ordinal, spotLabel } from "@/lib/engine/rules";

export function clockLabel(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/** Parse "m:ss", "mss", or a raw seconds count into clamped seconds. */
export function parseClock(str: string, capMin = 15): number | null {
  const t = (str ?? "").trim();
  if (!t) return null;
  const cap = capMin * 60;
  if (t.indexOf(":") >= 0) {
    const [a, b] = t.split(":");
    const m = parseInt(a, 10) || 0;
    const sec = parseInt(b, 10) || 0;
    return Math.max(0, Math.min(cap, m * 60 + Math.min(59, sec)));
  }
  const n = parseInt(t, 10);
  if (isNaN(n)) return null;
  return n > 99
    ? Math.min(cap, Math.floor(n / 100) * 60 + (n % 100))
    : Math.min(cap, n);
}

export function allPlayers(setup: GameSetup): Player[] {
  return [...setup.home.roster, ...setup.away.roster];
}

/** "#22 D. Whitfield" for a jersey number, searching both rosters. */
export function who(setup: GameSetup, num: number | null): string {
  if (num == null) return "";
  if (num === 0) return "#? unnamed";
  const p = allPlayers(setup).find((x) => x.num === num);
  return p ? `#${p.num} ${p.name}` : `#${num}`;
}

export function offenseRoster(setup: GameSetup, poss: TeamId): Player[] {
  return poss === "H" ? setup.home.roster : setup.away.roster;
}
export function defenseRoster(setup: GameSetup, poss: TeamId): Player[] {
  return poss === "H" ? setup.away.roster : setup.home.roster;
}

/** One-line play-by-play text for a play. */
export function playText(setup: GameSetup, p: PlayEvent): string {
  if (p.kind === "Control") {
    return p.control?.label ?? "Correction";
  }
  if (p.kind === "Try") {
    const made = p.result === "Made";
    if (p.tryType === "kick") return made ? "PAT good (+1)" : "PAT no good";
    const label = p.tryType === "pass" ? "2-PT pass" : "2-PT run";
    return made ? `${label} good (+2)` : `${label} failed`;
  }
  if (p.kind === "Penalty") {
    return `PENALTY — ${p.penalty}${p.penYds ? ` (${p.penYds} yds)` : ""}${p.enforceOnKickoff ? " · on kickoff" : ""}`;
  }
  const y = p.yards > 0 ? `+${p.yards}` : `${p.yards}`;
  let t = p.kind.toUpperCase();
  const nm = p.playerId != null ? who(setup, p.playerId) : "";
  const tgt = p.targetId != null ? who(setup, p.targetId) : "";
  if (p.kind === "FG" && p.kicker != null) t += ` ${who(setup, p.kicker)}`;
  else if (nm) t += ` ${nm}`;
  if (p.kind === "Pass" && tgt) {
    const arrow = p.result === "Incomplete" || p.result === "Interception" ? " (for " : " → ";
    t += `${nm ? arrow : " "}${tgt}${arrow === " (for " ? ")" : ""}`;
  }
  t += `, ${y} yds`;
  if (p.result && p.result !== "—" && p.result !== "Tackle") t += ` · ${p.result}`;
  if (p.kind === "Pass" && p.passDetail) t += ` · ${p.passDetail}`;
  if (p.tacklers && p.tacklers.length) t += ` (T: ${p.tacklers.join(", ")})`;
  return t;
}

/** "2nd & 7 · NGT 45" for the situation a play was snapped from. */
export function sitText(setup: GameSetup, s: Situation | PlayEvent): string {
  const down = "down" in s ? s.down : 1;
  const dist = "dist" in s ? s.dist : 10;
  const spot = "spot" in s ? (s as Situation).spot : (s as PlayEvent).start;
  const tryPending = "tryPending" in s && (s as Situation).tryPending;
  const kind = "kind" in s ? (s as PlayEvent).kind : null;
  if (tryPending || kind === "Try") return `Try · ${spotLabel(spot, setup)}`;
  return `${ordinal(down)} & ${dist} · ${spotLabel(spot, setup)}`;
}

export function downLabel(s: Situation): string {
  if (s.tryPending) return "TRY";
  if (s.goalToGo) return `${ordinal(s.down)} & Goal`;
  return `${ordinal(s.down)} & ${s.dist}`;
}

export function possAbbr(g: GameState, s: Situation): string {
  return s.poss === "H" ? g.setup.home.abbr : g.setup.away.abbr;
}

/**
 * Whether a play needs a second look, and why. Combines the manual flag, the
 * auto "edited after commit" mark, and live detection of missing critical
 * info (a tackle with no tackler, a pass with no intended receiver).
 */
export function reviewStatus(p: PlayEvent): { needsReview: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (p.review?.flagged) reasons.push("Flagged for review");
  if (p.review?.edited) reasons.push("Edited after commit");

  const tackled =
    (p.kind === "Run" || p.kind === "Sack") &&
    (p.result === "Tackle" || p.result === "First down");
  if (tackled && (!p.tacklers || p.tacklers.length === 0)) {
    reasons.push("No tackler");
  }
  if (p.kind === "Pass" && p.targetId == null) {
    reasons.push("No intended receiver");
  }

  return { needsReview: reasons.length > 0, reasons };
}
