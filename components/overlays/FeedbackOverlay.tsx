"use client";

import { useState } from "react";
import { useGameStore, type Screen } from "@/store/useGameStore";
import { playText } from "@/lib/format";
import { OverlayShell } from "./OverlayShell";
import { cx } from "@/components/ui";

const REPO = "wywarner19/FBStats";

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

  const plays = game.plays.filter((p) => p.kind !== "Control");
  const lastPlay = plays.length ? playText(game.setup, plays[plays.length - 1]) : undefined;
  const matchup = inGame
    ? `${game.setup.home.abbr} ${game.venue === "away" ? "@" : "vs"} ${game.setup.away.abbr}`
    : undefined;
  const situation = inGame
    ? `Q${sit.qtr} · ${sit.down} & ${sit.dist} · ${game.setup.home.abbr} ${sit.scoreH}–${sit.scoreA} ${game.setup.away.abbr}`
    : undefined;

  /** Build the prefilled GitHub new-issue URL (title + body + labels). */
  const issueUrl = () => {
    const firstLine = text.trim().split("\n")[0].slice(0, 60);
    const title = `Feedback: ${firstLine}`;
    // Only the context lines are conditionally dropped; the blank spacer lines
    // stay so the "---" reads as a rule (not a Markdown heading under the text).
    const ctxLines = [
      `- Screen: ${SCREEN_LABEL[screen]}`,
      lastStep ? `- Just did: ${lastStep}` : null,
      matchup ? `- Game: ${matchup}` : null,
      situation ? `- Situation: ${situation}` : null,
      lastPlay ? `- Last play: ${lastPlay}` : null,
      inGame ? `- Entry model: ${model}` : null,
    ].filter(Boolean) as string[];
    const body = [
      text.trim(),
      "",
      "---",
      "**Context** (auto-captured)",
      ...ctxLines,
      "",
      "— sent from FBStats Live",
    ].join("\n");
    const labels = encodeURIComponent(`feedback,${kind}`);
    return `https://github.com/${REPO}/issues/new?labels=${labels}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  };

  const send = () => {
    if (!text.trim()) return;
    window.open(issueUrl(), "_blank", "noopener");
    setOverlay(null);
    flash("Opening GitHub — tap “Submit new issue” to post it", true);
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
          ADDED TO THE ISSUE AUTOMATICALLY
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>Screen: {SCREEN_LABEL[screen]}</span>
          {lastStep && <span className={chip}>Just did: {lastStep}</span>}
          {matchup && <span className={chip}>{matchup}</span>}
          {situation && <span className={chip}>{situation}</span>}
          {lastPlay && <span className={chip}>Last play: {lastPlay}</span>}
        </div>
      </div>

      <button
        onClick={send}
        disabled={!text.trim()}
        className={cx(
          "w-full min-h-[52px] rounded-[10px] border-0 font-cond font-bold text-[16px] leading-none tracking-[.06em]",
          text.trim() ? "bg-turf text-onaccent cursor-pointer" : "bg-panel-4 text-dim-2 cursor-not-allowed",
        )}
      >
        Post to GitHub
      </button>
      <p className="m-0 mt-2.5 text-center text-[12px] leading-snug text-dim-2">
        Opens a prefilled GitHub issue — just tap “Submit new issue” to send it.
      </p>
    </OverlayShell>
  );
}
