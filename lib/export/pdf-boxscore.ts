import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { GameState, TeamId } from "@/lib/types";
import { computeBoxScore } from "@/lib/engine/boxscore";
import { deriveSituation } from "@/lib/engine/rules";
import { clockLabel, who } from "@/lib/format";

/**
 * Build a printable box-score PDF for the coaches' meeting. Runs client-side
 * (jsPDF needs the DOM). Returns the jsPDF doc so callers can `.save()` or
 * `.output('blob')`.
 */
export function buildBoxScorePdf(g: GameState): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const box = computeBoxScore(g.plays);
  const { home, away } = g.setup;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`${home.name} vs ${away.name}`, 40, 48);
  const sit = deriveSituation(g.setup, g.plays, g.anchor);
  const playCount = g.plays.filter((p) => p.kind !== "Control").length;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    `${home.abbr} ${sit.scoreH} – ${away.abbr} ${sit.scoreA}  ·  ${g.setup.kickoff} · ${g.setup.meta}  ·  ${playCount} plays · Q${g.qtr} ${clockLabel(g.clockSec)}`,
    40,
    66,
  );

  let y = 92;
  const section = (title: string, head: string[], rows: (string | number)[][]) => {
    if (!rows.length) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, 40, y);
    autoTable(doc, {
      startY: y + 8,
      head: [head],
      body: rows,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [23, 27, 33], textColor: [233, 236, 239] },
      margin: { left: 40, right: 40 },
    });
    // @ts-expect-error autotable stashes lastAutoTable on the doc
    y = doc.lastAutoTable.finalY + 24;
  };

  section(
    "RUSHING",
    ["#", "Player", "Att", "Yds", "TD", "Lg"],
    Object.keys(box.rush).map((k) => {
      const id = Number(k);
      const v = box.rush[id];
      return [id, who(g.setup, id).replace(/^#\d+\s/, ""), v.att, v.yds, v.td, v.lg];
    }),
  );
  section(
    "PASSING",
    ["#", "Player", "C/Att", "Yds", "TD", "Int"],
    Object.keys(box.pass).map((k) => {
      const id = Number(k);
      const v = box.pass[id];
      return [id, who(g.setup, id).replace(/^#\d+\s/, ""), `${v.cmp}/${v.att}`, v.yds, v.td, v.int];
    }),
  );
  section(
    "RECEIVING",
    ["#", "Player", "Rec", "Yds", "TD"],
    Object.keys(box.rec).map((k) => {
      const id = Number(k);
      const v = box.rec[id];
      return [id, who(g.setup, id).replace(/^#\d+\s/, ""), v.rec, v.yds, v.td];
    }),
  );
  section(
    "DEFENSE",
    ["#", "Player", "Tackles", "Assists"],
    Object.keys(box.def).map((k) => {
      const id = Number(k);
      const v = box.def[id];
      return [id, who(g.setup, id).replace(/^#\d+\s/, ""), v.tk, v.ast];
    }),
  );

  return doc;
}
