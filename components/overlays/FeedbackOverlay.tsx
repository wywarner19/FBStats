"use client";

import { useState } from "react";
import { useGameStore, type Screen } from "@/store/useGameStore";
import { playText } from "@/lib/format";
import { sendFeedback, type FeedbackContext } from "@/lib/sync/feedback";
import { OverlayShell } from "./OverlayShell";
import { cx } from "@/components/ui";

const SCREEN_LABEL: Record<Screen, string> = {
  games: "Games list",
  teams: "Teams",
  setup: "Setup",
  roster: "Rosters",
  live: "Play entry",
  box: "Box score",
  chart: "Drives",
  analytics: "Analytics",
  season: "Season",
  report: "Report",
  help: "Help",
};

const KINDS: { key: "bug" | "idea" | "other"; label: string }[] = [
  { key: "bug", label: "🐞 Bug" },
  { key: "idea", label: "💡 Idea" },
  { key: "other", label: "💬 Other" },
];

export function FeedbackOverlay() {
  const screen = useGameStore((s) => s.screen);
  const inGame = useGameStore((s) => s.inGame);
  const lastStep = useGameStore((s) => s.lastStep);
  const game = useGameStore((s) => s.game);
  const sit = useGameStore((s) => s.situation);
  const model = useGameStore((s) => s.model);
  const setOverlay = useGameStore((s) => s.setOverlay);
  const flash = useGameStore((s) => s.flash);

  const [kind, setKind] = useState<"bug" | "idea" | "other">("idea");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const plays = game.plays.filter((p) => p.kind !== "Control");
  const lastPlay = plays.length ? playText(game.setup, plays[plays.length - 1]) : undefined;
  const matchup = inGame
    ? `${game.setup.home.abbr} ${game.venue === "away" ? "@" : "vs"} ${game.setup.away.abbr}`
    : undefined;
  const situation = inGame
    ? `Q${sit.qtr} · ${sit.down} & ${sit.dist} · ${game.setup.home.abbr} ${sit.scoreH}–${sit.scoreA} ${game.setup.away.abbr}`
    : undefined;

  const context: FeedbackContext = {
    screen: SCREEN_LABEL[screen],
    step: lastStep,
    matchup,
    situation,
    lastPlay,
    model: inGame ? model : undefined,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    ua: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const ok = await sendFeedback({ text: text.trim(), kind, context });
    setSending(false);
    setOverlay(null);
    flash(ok ? "Thanks — feedback sent ✓" : "Saved — will send when you're back online", true);
  };

  const chip =
    "px-2 py-0.5 bg-panel-4 border border-edge-2 rounded-[6px] text-[11px] leading-tight text-slate";

  return (
    <OverlayShell width={560}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="m-0 font-cond font-bold text-[26px] leading-none">Send feedback</h3>
        <div className="flex-1" />
        <button
          onClick={() => setOverlay(null)}
          className="min-h-[40px] px-4 bg-panel-4 border border-edge-2 rounded-[9px] text-cloud font-semibold text-[13px] cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <div className="flex gap-1.5 mb-3">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => setKind(k.key)}
            className={cx(
              "min-h-[40px] px-3.5 rounded-[9px] border font-semibold text-[13px] leading-none cursor-pointer",
              kind === k.key ? "bg-panel-4 border-turf text-cloud" : "bg-panel-5 border-edge text-dim hover:text-cloud",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        rows={4}
        placeholder="What happened, or what you'd like…"
        className="w-full bg-panel-3 border border-edge-3 rounded-[10px] p-3.5 font-medium text-[15px] leading-[1.5] text-cloud outline-none placeholder:text-dim-2 resize-none mb-3"
      />

      {/* Auto-captured context so you don't have to describe where you were. */}
      <div className="bg-panel-3 border border-edge rounded-[10px] p-3.5 mb-4">
        <div className="font-semi font-semibold text-[10px] leading-none tracking-[.16em] text-dim mb-2.5">
          INCLUDED AUTOMATICALLY
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>Screen: {context.screen}</span>
          {context.step && <span className={chip}>Just did: {context.step}</span>}
          {matchup && <span className={chip}>{matchup}</span>}
          {situation && <span className={chip}>{situation}</span>}
          {lastPlay && <span className={chip}>Last play: {lastPlay}</span>}
        </div>
      </div>

      <button
        onClick={send}
        disabled={!text.trim() || sending}
        className={cx(
          "w-full min-h-[52px] rounded-[10px] border-0 font-cond font-bold text-[16px] leading-none tracking-[.06em]",
          text.trim() && !sending ? "bg-turf text-onaccent cursor-pointer" : "bg-panel-4 text-dim-2 cursor-not-allowed",
        )}
      >
        {sending ? "Sending…" : "Send feedback"}
      </button>
    </OverlayShell>
  );
}
