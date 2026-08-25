import type { BoxScore, GameState, TeamId } from "@/lib/types";
import { computeBoxScore } from "@/lib/engine/boxscore";
import { deriveSituation } from "@/lib/engine/rules";
import { who } from "@/lib/format";

function top<T>(obj: Record<number, T>, score: (v: T) => number): [number, T] | null {
  let best: [number, T] | null = null;
  let bestScore = -Infinity;
  for (const [k, v] of Object.entries(obj)) {
    const s = score(v);
    if (s > bestScore) {
      bestScore = s;
      best = [Number(k), v];
    }
  }
  return best;
}

function teamLines(game: GameState, box: BoxScore): string[] {
  const nm = (n: number) => who(game.setup, n).replace(/^#\d+\s/, "") || `#${n}`;
  const out: string[] = [];
  const rush = top(box.rush, (v) => v.yds);
  const pass = top(box.pass, (v) => v.yds);
  const rec = top(box.rec, (v) => v.yds);
  const def = top(box.def, (v) => v.tk + v.ast);
  if (rush) out.push(`Rush: ${nm(rush[0])} ${rush[1].att}-${rush[1].yds}${rush[1].td ? `, ${rush[1].td} TD` : ""}`);
  if (pass) out.push(`Pass: ${nm(pass[0])} ${pass[1].cmp}/${pass[1].att}, ${pass[1].yds}${pass[1].td ? `, ${pass[1].td} TD` : ""}${pass[1].int ? `, ${pass[1].int} INT` : ""}`);
  if (rec) out.push(`Rec: ${nm(rec[0])} ${rec[1].rec}-${rec[1].yds}${rec[1].td ? `, ${rec[1].td} TD` : ""}`);
  if (def) out.push(`Tackles: ${nm(def[0])} ${def[1].tk}${def[1].ast ? `+${def[1].ast}` : ""}`);
  return out;
}

/** A concise, on-air-readable box score for the broadcaster (e.g. at halftime). */
export function broadcastBoxText(game: GameState, label = ""): string {
  const sit = deriveSituation(game.setup, game.plays, game.anchor);
  const { home, away } = game.setup;
  const boxH = computeBoxScore(game.plays, "H");
  const boxA = computeBoxScore(game.plays, "A");
  const lines: string[] = [];
  lines.push(`${home.abbr} ${sit.scoreH} – ${away.abbr} ${sit.scoreA}${label ? ` (${label})` : ""}`);
  lines.push("");
  lines.push(`${home.name} (${home.abbr})`);
  const hl = teamLines(game, boxH);
  lines.push(hl.length ? hl.join(" · ") : "—");
  lines.push("");
  lines.push(`${away.name} (${away.abbr})`);
  const al = teamLines(game, boxA);
  lines.push(al.length ? al.join(" · ") : "—");
  return lines.join("\n");
}
