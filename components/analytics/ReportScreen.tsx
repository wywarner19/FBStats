"use client";

import { useGameStore } from "@/store/useGameStore";
import { computeDrives } from "@/lib/engine/boxscore";
import { exportBoxScorePdf, exportHudl, exportMaxPreps, toMaxPrepsCsv } from "@/lib/export";
import { LABEL } from "@/components/ui";

export function ReportScreen() {
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const flash = useGameStore((s) => s.flash);

  const scoring = game.plays.filter((p) => p.kind !== "Control");
  const totalYds = scoring.reduce((t, p) => t + (p.yards || 0), 0);
  const drives = computeDrives(scoring, game.setup);

  const stats = [
    { label: "TOTAL PLAYS", value: scoring.length },
    { label: "NET YARDS", value: totalYds },
    { label: "YDS / PLAY", value: scoring.length ? (totalYds / scoring.length).toFixed(1) : "0.0" },
    { label: "PENALTIES", value: scoring.filter((p) => p.kind === "Penalty").length },
    { label: "DRIVES", value: drives.length },
    { label: "SCORE", value: `${sit.scoreH}–${sit.scoreA}` },
  ];

  const guarded = (fn: () => void, ok: string) => () => {
    try {
      fn();
      flash(ok);
    } catch (e) {
      console.error(e);
      flash("Export failed — see console");
    }
  };

  const textBoxScore = async () => {
    const csv = toMaxPrepsCsv(game, "H");
    try {
      await navigator.clipboard.writeText(csv);
      flash("Box score copied to clipboard");
    } catch {
      flash("Clipboard blocked — use CSV export");
    }
  };

  const exports = [
    { label: "Coaches PDF", onClick: guarded(() => exportBoxScorePdf(game), "PDF downloaded") },
    { label: "CSV for Hudl", onClick: guarded(() => exportHudl(game), "Hudl CSV downloaded") },
    { label: "MaxPreps upload", onClick: guarded(() => exportMaxPreps(game), "MaxPreps CSV downloaded") },
    { label: "Text the box score", onClick: textBoxScore },
  ];

  return (
    <div className="flex-1 overflow-auto px-[34px] pt-7 pb-[60px]">
      <div className="max-w-[1000px] flex flex-col gap-[22px]">
        <div>
          <h2 className="m-0 mb-1.5 font-cond font-bold text-[34px] leading-none">Post-game report</h2>
          <p className="m-0 text-[15px] leading-[1.5] text-dim">
            {game.setup.home.name} vs {game.setup.away.name} · {scoring.length} plays logged ·
            exports work with no signal, from the local copy.
          </p>
          {(() => {
            const info = game.setup.info ?? {};
            const bits = [
              info.date,
              info.location,
              info.weather,
              info.surface && `${info.surface} surface`,
              info.officials && `Crew: ${info.officials}`,
              info.attendance && `Att: ${info.attendance}`,
            ].filter(Boolean);
            return bits.length ? (
              <p className="m-0 mt-2 text-[13px] leading-[1.5] text-dim-2">{bits.join(" · ")}</p>
            ) : null;
          })()}
        </div>

        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
          {stats.map((s) => (
            <div key={s.label} className="bg-panel border border-edge rounded-xl p-4">
              <div className={`${LABEL} text-[10px] mb-2`}>{s.label}</div>
              <div className="font-cond font-bold text-[30px] leading-none text-cloud">{s.value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>EXPORT</div>
          <div className="flex gap-2.5 flex-wrap">
            {exports.map((e) => (
              <button
                key={e.label}
                onClick={e.onClick}
                className="min-h-[58px] px-[22px] bg-panel-4 border border-edge-2 rounded-[11px] text-cloud font-semibold text-[15px] leading-none cursor-pointer hover:border-turf"
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-panel border border-edge rounded-xl p-5">
          <div className={`${LABEL} text-[11px] tracking-[.2em] mb-3`}>NEXT STEPS I&apos;D TAKE</div>
          <ul className="m-0 pl-5 text-[14px] leading-[1.7] text-slate">
            <li>Portrait one-hand layout: same field strip, entry collapses to a single scrolling column.</li>
            <li>Two-device mode — a spotter on defense, merged by play number with conflict review.</li>
            <li>Special-teams depth: returns, blocks, and onside recovery as first-class play types.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
