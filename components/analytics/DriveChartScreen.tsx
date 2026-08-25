"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { computeDrives } from "@/lib/engine/boxscore";
import { deriveTimeline, spotLabel } from "@/lib/engine/rules";
import { playText, reviewStatus, sitText } from "@/lib/format";
import { cx } from "@/components/ui";

export function DriveChartScreen() {
  const game = useGameStore((s) => s.game);
  const openFix = useGameStore((s) => s.openFix);
  const [reviewOnly, setReviewOnly] = useState(false);

  const scoring = game.plays.filter((p) => p.kind !== "Control");
  const drives = computeDrives(scoring, game.setup);
  const timeline = deriveTimeline(game.setup, game.plays, game.anchor).filter(
    (t) => t.play.kind !== "Control",
  );

  const driveRows = drives
    .map((dr) => {
      const a = Math.min(dr.startSpot, dr.endSpot);
      const b = Math.max(dr.startSpot, dr.endSpot);
      const first = dr.plays[0];
      return {
        team: `${dr.poss === "H" ? game.setup.home.abbr : game.setup.away.abbr} drive`,
        summary: `${dr.plays.length} plays · ${dr.netYards} yds · ${dr.result}`,
        left: `${a * 0.9 + 3}%`,
        width: `${Math.max(3, (b - a) * 0.9)}%`,
        detail: `From ${spotLabel(dr.startSpot, game.setup)} to ${spotLabel(dr.endSpot, game.setup)} · Q${first.qtr} ${first.clock}`,
        key: first.id,
      };
    })
    .reverse();

  const logRows = timeline
    .map(({ play, atSnap }, i) => ({
      key: play.id,
      n: i + 1,
      qtr: `Q${play.qtr} ${play.clock}`,
      sit: sitText(game.setup, atSnap),
      text: playText(game.setup, play),
      flag: play.kind === "Penalty",
      td: play.result === "Touchdown",
      review: reviewStatus(play),
      onFix: () => openFix(play.id),
    }))
    .reverse();

  const reviewCount = logRows.filter((r) => r.review.needsReview).length;
  const shownRows = reviewOnly ? logRows.filter((r) => r.review.needsReview) : logRows;

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      <div className="w-full md:w-[400px] md:flex-none bg-panel-2 border-b md:border-b-0 md:border-r border-edge md:overflow-auto p-[22px]">
        <h2 className="m-0 mb-4 font-cond font-bold text-[26px] leading-none">Drives</h2>
        <div className="flex flex-col gap-2.5">
          {driveRows.length === 0 && <div className="text-dim-2 text-[14px]">No drives yet.</div>}
          {driveRows.map((d) => (
            <div key={d.key} className="bg-panel border border-edge rounded-[11px] p-3.5">
              <div className="flex justify-between mb-2.5">
                <span className="font-cond font-bold text-[16px] leading-none tracking-[.06em] text-cloud">{d.team}</span>
                <span className="font-semibold text-[12px] leading-none text-dim">{d.summary}</span>
              </div>
              <div className="relative h-[26px] rounded-md bg-[#16221a] border border-[#2c3b31] overflow-hidden">
                <div className="absolute top-0 bottom-0 bg-turf/30 border-l-2 border-turf" style={{ left: d.left, width: d.width }} />
              </div>
              <div className="mt-2 font-medium text-[12px] leading-[1.4] text-dim-2">{d.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 md:overflow-auto px-[26px] py-[22px]">
        <div className="flex items-center gap-3.5 mb-3.5 flex-wrap">
          <h2 className="m-0 font-cond font-bold text-[26px] leading-none">Play log</h2>
          <span className="font-medium text-[13px] leading-none text-dim">
            Tap any play to correct it — stats and the box score recompute instantly.
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setReviewOnly((v) => !v)}
            className={cx(
              "min-h-[38px] px-3.5 rounded-[9px] border font-semibold text-[13px] leading-none cursor-pointer",
              reviewOnly ? "bg-flag-ink border-flag text-flag" : "bg-panel-4 border-edge-2 text-dim hover:text-cloud",
            )}
          >
            ⚑ Needs review ({reviewCount})
          </button>
        </div>
        <div className="flex flex-col gap-px bg-edge border border-edge rounded-[11px] overflow-hidden">
          {shownRows.length === 0 && (
            <div className="bg-panel px-4 py-5 text-[14px] text-dim-2">
              {reviewOnly ? "Nothing needs review — every play has its key info." : "No plays yet."}
            </div>
          )}
          {shownRows.map((p) => (
            <button
              key={p.key}
              onClick={p.onFix}
              className="flex items-center gap-3.5 bg-panel border-0 px-4 py-3 cursor-pointer text-left hover:bg-panel-3"
            >
              <span className="w-[34px] font-cond font-bold text-[17px] leading-none text-dim-2">{p.n}</span>
              <span className="w-[64px] font-semi font-semibold text-[12px] leading-none tracking-[.08em] text-dim">{p.qtr}</span>
              <span className="w-[110px] font-semibold text-[13px] leading-none text-mist">{p.sit}</span>
              <span className="flex-1 font-medium text-[15px] leading-[1.25] text-cloud">{p.text}</span>
              {p.review.needsReview && (
                <span
                  className="px-2 py-1 bg-flag-ink rounded-[5px] font-bold text-[10px] leading-none tracking-[.08em] text-flag"
                  title={p.review.reasons.join(" · ")}
                >
                  REVIEW
                </span>
              )}
              {p.flag && (
                <span className="px-2 py-1 bg-flag-ink rounded-[5px] font-bold text-[10px] leading-none tracking-[.1em] text-flag">FLAG</span>
              )}
              {p.td && (
                <span className="px-2 py-1 bg-turf-ink rounded-[5px] font-bold text-[10px] leading-none tracking-[.1em] text-turf">TD</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
