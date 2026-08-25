import type { GameState } from "@/lib/types";
import { toMaxPrepsCsv } from "./csv-maxpreps";
import { toHudlCsv } from "./hudl";
import { buildBoxScorePdf } from "./pdf-boxscore";

export { toMaxPrepsCsv, toHudlCsv, buildBoxScorePdf };

/** Trigger a browser download for a text/blob payload. Client-only. */
export function downloadText(filename: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  triggerDownload(filename, blob);
}

export function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(g: GameState): string {
  return `${g.setup.home.abbr}-vs-${g.setup.away.abbr}`.toLowerCase();
}

export function exportMaxPreps(g: GameState) {
  downloadText(`${slug(g)}-maxpreps.csv`, toMaxPrepsCsv(g, "H"));
}

export function exportHudl(g: GameState) {
  downloadText(`${slug(g)}-hudl-pbp.csv`, toHudlCsv(g));
}

export function exportBoxScorePdf(g: GameState) {
  const doc = buildBoxScorePdf(g);
  doc.save(`${slug(g)}-boxscore.pdf`);
}
