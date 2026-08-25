import type { GameState, PlayEvent } from "@/lib/types";
import { deriveTimeline } from "@/lib/engine/rules";
import { ordinal, spotLabel } from "@/lib/engine/rules";
import { playText, who } from "@/lib/format";

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Hudl play-by-play CSV. Hudl's game-breakdown import expects one row per play
 * with ODK (Offense/Defense/Kick), down, distance, yard line, hash, play type,
 * result and gain/loss. Control rows (halftime, flips) are omitted.
 */
export function toHudlCsv(g: GameState): string {
  const header = [
    "PLAY #",
    "ODK",
    "QTR",
    "CLOCK",
    "DN",
    "DIST",
    "YARD LN",
    "HASH",
    "OFF TEAM",
    "PLAY TYPE",
    "RESULT",
    "GN/LS",
    "BALL CARRIER",
    "TARGET",
    "TACKLERS",
    "PBP",
  ];
  const rows = [header.map(esc).join(",")];
  const timeline = deriveTimeline(g.setup, g.plays, g.anchor);

  let n = 0;
  for (const { play, atSnap } of timeline) {
    if (play.kind === "Control") continue;
    n += 1;
    const odk =
      play.kind === "Punt" || play.kind === "FG" || (play.kind === "Try" && play.tryType === "kick")
        ? "K"
        : play.kind === "Penalty"
          ? "P"
          : "O";
    rows.push(
      [
        n,
        odk,
        `Q${play.qtr}`,
        play.clock,
        play.kind === "Penalty" ? "" : ordinal(atSnap.down),
        play.kind === "Penalty" ? "" : atSnap.dist,
        spotLabel(play.start, g.setup),
        play.hash,
        atSnap.poss === "H" ? g.setup.home.abbr : g.setup.away.abbr,
        play.kind,
        play.result,
        play.yards,
        play.playerId != null ? who(g.setup, play.playerId) : "",
        play.targetId != null ? who(g.setup, play.targetId) : "",
        (play.tacklers ?? []).map((t) => `#${t}`).join(" "),
        playText(g.setup, play),
      ]
        .map(esc)
        .join(","),
    );
  }
  return rows.join("\n");
}
