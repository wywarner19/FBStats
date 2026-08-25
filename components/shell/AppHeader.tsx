"use client";

import { useGameStore, type Screen } from "@/store/useGameStore";
import { reviewStatus } from "@/lib/format";
import { cx } from "@/components/ui";

const NAV: [Screen, string][] = [
  ["brief", "Brief"],
  ["setup", "Setup"],
  ["roster", "Rosters"],
  ["live", "Play entry"],
  ["box", "Box score"],
  ["chart", "Drives"],
  ["analytics", "Analytics"],
  ["season", "Season"],
  ["report", "Report"],
];

export function AppHeader() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const reviewCount = useGameStore(
    (s) => s.game.plays.filter((p) => reviewStatus(p).needsReview).length,
  );
  const setBroadcast = useGameStore((s) => s.setBroadcast);

  return (
    <header className="flex flex-none items-center gap-[18px] h-[58px] px-[18px] bg-panel border-b border-edge">
      <div className="flex items-baseline gap-2">
        <span className="font-cond font-bold text-[22px] leading-none tracking-[.10em] text-turf">
          FBSTATS
        </span>
        <span className="font-semi font-medium text-[11px] leading-none tracking-[.16em] text-dim">
          LIVE · iPAD
        </span>
      </div>
      <nav className="flex gap-1 ml-1.5 overflow-x-auto">
        {NAV.map(([key, label]) => {
          const sel = screen === key;
          return (
            <button
              key={key}
              onClick={() => setScreen(key)}
              className={cx(
                "relative px-3.5 py-2 min-h-[40px] whitespace-nowrap bg-transparent border-0 rounded-lg font-barlow font-semibold text-[13px] leading-none tracking-[.04em] cursor-pointer",
                sel ? "text-cloud" : "text-dim hover:text-slate",
              )}
            >
              {sel && (
                <span className="pointer-events-none absolute inset-0 bg-panel-4 border border-edge-2 rounded-lg" />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex-1" />
      <button
        onClick={() => setBroadcast(true)}
        className="flex items-center gap-1.5 min-h-[34px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-cloud font-semibold text-[12px] leading-none cursor-pointer hover:border-turf"
        title="Open the live broadcast dashboard"
      >
        📺 Broadcast
      </button>
      {reviewCount > 0 && (
        <button
          onClick={() => setScreen("chart")}
          className="flex items-center gap-1.5 min-h-[34px] px-3 bg-flag-ink border border-flag-edge rounded-[8px] text-flag font-semibold text-[12px] leading-none cursor-pointer"
          title="Plays missing info or flagged — review during a break"
        >
          ⚑ {reviewCount} to review
        </button>
      )}
      <div className="flex items-center gap-2 font-barlow font-medium text-[12px] leading-none text-dim">
        <span className="w-[7px] h-[7px] rounded-full bg-turf animate-pulse2" />
        autosaved · offline ok
      </div>
    </header>
  );
}
