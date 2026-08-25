"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { pct, tendencies, type TendencyBucket } from "@/lib/engine/analytics";
import type { TeamId } from "@/lib/types";
import { LABEL, cx } from "@/components/ui";

function runPass(b: TendencyBucket): string {
  if (b.plays === 0) return "—";
  return `${Math.round((b.run / b.plays) * 100)}R / ${Math.round((b.pass / b.plays) * 100)}P`;
}
function avg(b: TendencyBucket): string {
  if (b.plays === 0) return "—";
  return (b.yards / b.plays).toFixed(1);
}

function TendencyTable({
  title,
  rows,
  showConv,
}: {
  title: string;
  rows: { label: string; b: TendencyBucket }[];
  showConv?: boolean;
}) {
  return (
    <div className="bg-panel border border-edge rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-edge">
        <span className={`${LABEL} text-[11px] flex-1`}>{title}</span>
        <span className="w-[64px] text-right font-semi font-semibold text-[10px] tracking-[.12em] text-dim-2">PLAYS</span>
        <span className="w-[92px] text-right font-semi font-semibold text-[10px] tracking-[.12em] text-dim-2">RUN / PASS</span>
        <span className="w-[52px] text-right font-semi font-semibold text-[10px] tracking-[.12em] text-dim-2">AVG</span>
        {showConv && <span className="w-[52px] text-right font-semi font-semibold text-[10px] tracking-[.12em] text-dim-2">CONV</span>}
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1b2028]">
          <span className="flex-1 font-medium text-[14px] leading-none text-cloud">{r.label}</span>
          <span className="w-[64px] text-right font-semibold text-[14px] leading-none text-mist">{r.b.plays}</span>
          <span className="w-[92px] text-right font-semibold text-[13px] leading-none text-slate">{runPass(r.b)}</span>
          <span className="w-[52px] text-right font-semibold text-[13px] leading-none text-slate">{avg(r.b)}</span>
          {showConv && (
            <span className="w-[52px] text-right font-semibold text-[13px] leading-none text-turf">{pct(r.b.conv, r.b.plays)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function TendenciesSection() {
  const game = useGameStore((s) => s.game);
  const [team, setTeam] = useState<TeamId>("H");
  const t = tendencies(game, team);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className={`${LABEL} text-[11px]`}>TENDENCIES</span>
        <div className="flex gap-1.5">
          {(["H", "A"] as TeamId[]).map((tm) => (
            <button
              key={tm}
              onClick={() => setTeam(tm)}
              className={cx(
                "min-h-[34px] px-3.5 rounded-[8px] border font-cond font-bold text-[14px] leading-none cursor-pointer",
                team === tm ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim",
              )}
            >
              {(tm === "H" ? game.setup.home : game.setup.away).abbr}
            </button>
          ))}
        </div>
        <span className="font-medium text-[12px] leading-none text-dim-2">
          run/pass split, avg yards, and conversion % by down, distance & hash
        </span>
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        <TendencyTable
          title="BY DOWN"
          showConv
          rows={[
            { label: "1st down", b: t.byDown[1] },
            { label: "2nd down", b: t.byDown[2] },
            { label: "3rd down", b: t.byDown[3] },
            { label: "4th down", b: t.byDown[4] },
          ]}
        />
        <TendencyTable
          title="BY DISTANCE"
          showConv
          rows={[
            { label: "Short (1–3)", b: t.byDistance.short },
            { label: "Medium (4–6)", b: t.byDistance.medium },
            { label: "Long (7+)", b: t.byDistance.long },
          ]}
        />
        <TendencyTable
          title="BY HASH"
          rows={[
            { label: "Left hash", b: t.byHash.L },
            { label: "Middle", b: t.byHash.M },
            { label: "Right hash", b: t.byHash.R },
          ]}
        />
        <TendencyTable
          title="3RD DOWN BY DISTANCE"
          showConv
          rows={[
            { label: "3rd & short", b: t.thirdByDistance.short },
            { label: "3rd & medium", b: t.thirdByDistance.medium },
            { label: "3rd & long", b: t.thirdByDistance.long },
          ]}
        />
      </div>
    </div>
  );
}
