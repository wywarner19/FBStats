"use client";

import { useGameStore, type Screen } from "@/store/useGameStore";
import { reviewStatus } from "@/lib/format";
import { cx } from "@/components/ui";

const HOME_NAV: [Screen, string][] = [
  ["games", "Games"],
  ["teams", "Teams"],
  ["season", "Season"],
  ["help", "Help"],
];

const GAME_NAV: [Screen, string][] = [
  ["live", "Play entry"],
  ["roster", "Rosters"],
  ["box", "Box score"],
  ["chart", "Drives"],
  ["analytics", "Analytics"],
  ["report", "Report"],
  ["setup", "Setup"],
];

export function AppHeader() {
  const screen = useGameStore((s) => s.screen);
  const inGame = useGameStore((s) => s.inGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const setBroadcast = useGameStore((s) => s.setBroadcast);
  const theme = useGameStore((s) => s.theme);
  const toggleTheme = useGameStore((s) => s.toggleTheme);
  const openFeedback = useGameStore((s) => s.openFeedback);
  const home = useGameStore((s) => s.game.setup.home.abbr);
  const away = useGameStore((s) => s.game.setup.away.abbr);
  const reviewCount = useGameStore(
    (s) => s.game.plays.filter((p) => reviewStatus(p, s.game.setup).needsReview).length,
  );

  const nav = inGame ? GAME_NAV : HOME_NAV;

  return (
    <header
      className="flex flex-none items-center gap-3 px-[18px] bg-panel border-b border-edge"
      // Buffer for the iPad status bar when installed as a full-screen web app.
      style={{ paddingTop: "env(safe-area-inset-top)", minHeight: "calc(58px + env(safe-area-inset-top))" }}
    >
      <button
        onClick={() => setScreen("games")}
        className="flex items-baseline gap-2 bg-transparent border-0 cursor-pointer"
        title="Home"
      >
        <span className="font-cond font-bold text-[22px] leading-none tracking-[.10em] text-turf">FBSTATS</span>
        <span className="hidden sm:inline font-semi font-medium text-[11px] leading-none tracking-[.16em] text-dim">LIVE</span>
      </button>

      {inGame && (
        <button
          onClick={() => setScreen("games")}
          className="flex items-center gap-1.5 min-h-[34px] px-2.5 bg-panel-4 border border-edge-2 rounded-[8px] text-dim font-semibold text-[12px] leading-none cursor-pointer hover:text-cloud"
          title="Back to your games"
        >
          ‹ Games
          <span className="font-cond font-bold text-cloud tracking-[.04em]">{home}·{away}</span>
        </button>
      )}

      <nav className="flex gap-1 overflow-x-auto">
        {nav.map(([key, label]) => {
          const sel = screen === key;
          return (
            <button
              key={key}
              onClick={() => setScreen(key)}
              className={cx(
                "relative px-3 py-2 min-h-[38px] whitespace-nowrap bg-transparent border-0 rounded-lg font-barlow font-semibold text-[13px] leading-none tracking-[.04em] cursor-pointer",
                sel ? "text-cloud" : "text-dim hover:text-slate",
              )}
            >
              {sel && <span className="pointer-events-none absolute inset-0 bg-panel-4 border border-edge-2 rounded-lg" />}
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {inGame && (
        <button
          onClick={() => setBroadcast(true)}
          className="flex items-center gap-1.5 min-h-[34px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-cloud font-semibold text-[12px] leading-none cursor-pointer hover:border-turf"
          title="Open the live broadcast dashboard"
        >
          📺 Broadcast
        </button>
      )}
      {reviewCount > 0 && (
        <button
          onClick={() => setScreen("chart")}
          className="flex items-center gap-1.5 min-h-[34px] px-3 bg-flag-ink border border-flag-edge rounded-[8px] text-flag font-semibold text-[12px] leading-none cursor-pointer"
          title="Plays missing info or flagged — review during a break"
        >
          ⚑ {reviewCount}
        </button>
      )}
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center min-h-[34px] w-9 bg-panel-4 border border-edge-2 rounded-[8px] text-dim text-[14px] leading-none cursor-pointer hover:text-cloud"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle light and dark mode"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      <button
        onClick={openFeedback}
        className="flex items-center gap-1.5 min-h-[34px] px-3 bg-panel-4 border border-edge-2 rounded-[8px] text-dim font-semibold text-[12px] leading-none cursor-pointer hover:text-cloud whitespace-nowrap"
        title="Send feedback"
      >
        Feedback
      </button>
    </header>
  );
}
