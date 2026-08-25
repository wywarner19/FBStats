"use client";

import { useGameStore } from "@/store/useGameStore";
import {
  pct,
  scoringSummary,
  situationalSplits,
  timeOfPossession,
  type TeamSplits,
} from "@/lib/engine/analytics";
import { LABEL } from "@/components/ui";
import { TendenciesSection } from "./TendenciesSection";

function topLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function AnalyticsScreen() {
  const game = useGameStore((s) => s.game);
  const { home, away } = game.setup;

  const top = timeOfPossession(game);
  const summary = scoringSummary(game);
  const splits = situationalSplits(game);
  const topTotal = top.H + top.A || 1;

  const teamCols = (fn: (t: TeamSplits) => string) => ({
    h: fn(splits.H),
    a: fn(splits.A),
  });

  const rows: { label: string; h: string; a: string }[] = [
    { label: "3rd down", ...teamCols((t) => `${t.thirdDown.conv}/${t.thirdDown.att} · ${pct(t.thirdDown.conv, t.thirdDown.att)}`) },
    { label: "4th down", ...teamCols((t) => `${t.fourthDown.conv}/${t.fourthDown.att} · ${pct(t.fourthDown.conv, t.fourthDown.att)}`) },
    { label: "Red-zone TD", ...teamCols((t) => `${t.redZoneTds}/${t.redZoneTrips} · ${pct(t.redZoneTds, t.redZoneTrips)}`) },
    { label: "Explosive plays", ...teamCols((t) => `${t.explosive}`) },
    { label: "Run / pass", ...teamCols((t) => `${t.runs} / ${t.passes}`) },
    { label: "Time of poss.", h: topLabel(top.H), a: topLabel(top.A) },
  ];

  return (
    <div className="flex-1 overflow-auto px-7 pt-6 pb-[50px]">
      <h2 className="m-0 mb-5 font-cond font-bold text-[30px] leading-none">Analytics</h2>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        {/* Time of possession bar */}
        <div className="bg-panel border border-edge rounded-xl p-5">
          <div className={`${LABEL} text-[11px] mb-3`}>TIME OF POSSESSION</div>
          <div className="flex items-center justify-between mb-2 font-cond font-bold text-[22px] leading-none">
            <span className="text-turf">{home.abbr} {topLabel(top.H)}</span>
            <span className="text-flag">{away.abbr} {topLabel(top.A)}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-panel-3 flex">
            <div className="bg-turf h-full" style={{ width: `${(top.H / topTotal) * 100}%` }} />
            <div className="bg-flag h-full" style={{ width: `${(top.A / topTotal) * 100}%` }} />
          </div>
          <div className="mt-2 text-[12px] leading-none text-dim-2">
            Estimated from logged clock times per drive.
          </div>
        </div>

        {/* Situational splits table */}
        <div className="bg-panel border border-edge rounded-xl overflow-hidden">
          <div className="flex justify-between px-5 py-3 border-b border-edge">
            <span className={`${LABEL} text-[11px]`}>SITUATIONAL SPLITS</span>
            <span className="font-semi font-semibold text-[11px] leading-none tracking-[.14em] text-dim-2">
              {home.abbr} · {away.abbr}
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#1b2028]">
              <span className="flex-1 font-medium text-[14px] leading-none text-slate">{r.label}</span>
              <span className="w-[120px] text-right font-semibold text-[14px] leading-none text-turf">{r.h}</span>
              <span className="w-[120px] text-right font-semibold text-[14px] leading-none text-flag">{r.a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring summary */}
      <div className="mt-4 bg-panel border border-edge rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-edge">
          <span className={`${LABEL} text-[11px]`}>SCORING SUMMARY</span>
        </div>
        {summary.length === 0 ? (
          <div className="px-5 py-6 text-[14px] text-dim-2">No scoring plays yet.</div>
        ) : (
          summary.map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-[#1b2028]">
              <span className="w-[70px] font-semi font-semibold text-[12px] leading-none tracking-[.06em] text-dim">
                Q{e.qtr} {e.clock}
              </span>
              <span
                className={`px-2 py-1 rounded-[5px] font-bold text-[10px] leading-none tracking-[.08em] ${e.team === "H" ? "bg-turf-ink text-turf" : "bg-flag-ink text-flag"}`}
              >
                {e.kind}
              </span>
              <span className="flex-1 font-medium text-[14px] leading-none text-cloud">
                {e.team === "H" ? home.abbr : away.abbr} · {e.points} pt{e.points > 1 ? "s" : ""}
              </span>
              <span className="font-cond font-bold text-[18px] leading-none text-mist">
                {home.abbr} {e.scoreH} · {away.abbr} {e.scoreA}
              </span>
            </div>
          ))
        )}
      </div>

      <TendenciesSection />
    </div>
  );
}
